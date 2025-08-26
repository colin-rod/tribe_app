-- Migration: Rename tribes->trees and circles->branches
-- This migration renames tables and all related columns/references

-- First, drop existing RLS policies that reference old table names
DROP POLICY IF EXISTS "Users can view their own tribes" ON tribes;
DROP POLICY IF EXISTS "Users can create tribes" ON tribes;
DROP POLICY IF EXISTS "Users can update tribes they own" ON tribes;
DROP POLICY IF EXISTS "Users can view circles they have access to" ON circles;
DROP POLICY IF EXISTS "Users can create circles in their tribes" ON circles;
DROP POLICY IF EXISTS "Users can update circles they own or admin" ON circles;
DROP POLICY IF EXISTS "Users can view cross-tribe access for their circles" ON cross_tribe_access;
DROP POLICY IF EXISTS "Users can manage cross-tribe access for circles they own" ON cross_tribe_access;

-- Drop existing indexes that reference old table names
DROP INDEX IF EXISTS idx_tribe_members_user_tribe;
DROP INDEX IF EXISTS idx_tribe_members_tribe_id;
DROP INDEX IF EXISTS idx_circles_tribe_id;
DROP INDEX IF EXISTS idx_circles_created_by;
DROP INDEX IF EXISTS idx_circle_members_user_circle;
DROP INDEX IF EXISTS idx_circle_members_circle_id;
DROP INDEX IF EXISTS idx_cross_tribe_access_circle_id;
DROP INDEX IF EXISTS idx_cross_tribe_access_tribe_id;

-- Rename tables
ALTER TABLE tribes RENAME TO trees;
ALTER TABLE tribe_members RENAME TO tree_members;
ALTER TABLE circles RENAME TO branches;
ALTER TABLE circle_members RENAME TO branch_members;
ALTER TABLE circle_categories RENAME TO branch_categories;
ALTER TABLE cross_tribe_access RENAME TO cross_tree_access;

-- Rename columns in renamed tables
ALTER TABLE trees RENAME COLUMN created_by TO created_by; -- No change needed

ALTER TABLE tree_members RENAME COLUMN tribe_id TO tree_id;
ALTER TABLE tree_members RENAME COLUMN user_id TO user_id; -- No change needed

ALTER TABLE branches RENAME COLUMN tribe_id TO tree_id;
ALTER TABLE branches RENAME COLUMN created_by TO created_by; -- No change needed

ALTER TABLE branch_members RENAME COLUMN circle_id TO branch_id;
ALTER TABLE branch_members RENAME COLUMN user_id TO user_id; -- No change needed

-- cross_tree_access table column renames
ALTER TABLE cross_tree_access RENAME COLUMN circle_id TO branch_id;
ALTER TABLE cross_tree_access RENAME COLUMN tribe_id TO tree_id;
ALTER TABLE cross_tree_access RENAME COLUMN invited_by TO invited_by; -- No change needed

-- Update user_roles table context_type values
UPDATE user_roles SET context_type = 'tree' WHERE context_type = 'tribe';
UPDATE user_roles SET context_type = 'branch' WHERE context_type = 'circle';

-- Update any posts table references (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'circle_id') THEN
        ALTER TABLE posts RENAME COLUMN circle_id TO branch_id;
    END IF;
END $$;

-- Update any comments table references (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'circle_id') THEN
        ALTER TABLE comments RENAME COLUMN circle_id TO branch_id;
    END IF;
END $$;

-- Update any likes table references (if they exist)  
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'likes' AND column_name = 'circle_id') THEN
        ALTER TABLE likes RENAME COLUMN circle_id TO branch_id;
    END IF;
END $$;

-- Recreate indexes with new names
CREATE INDEX idx_tree_members_user_tree ON tree_members(user_id, tree_id);
CREATE INDEX idx_tree_members_tree_id ON tree_members(tree_id);
CREATE INDEX idx_branches_tree_id ON branches(tree_id);
CREATE INDEX idx_branches_created_by ON branches(created_by);
CREATE INDEX idx_branch_members_user_branch ON branch_members(user_id, branch_id);
CREATE INDEX idx_branch_members_branch_id ON branch_members(branch_id);
CREATE INDEX idx_cross_tree_access_branch_id ON cross_tree_access(branch_id);
CREATE INDEX idx_cross_tree_access_tree_id ON cross_tree_access(tree_id);

-- Update foreign key constraints (rename them)
ALTER TABLE tree_members DROP CONSTRAINT IF EXISTS tribe_members_tribe_id_fkey;
ALTER TABLE tree_members ADD CONSTRAINT tree_members_tree_id_fkey 
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE;

ALTER TABLE tree_members DROP CONSTRAINT IF EXISTS tribe_members_user_id_fkey;
ALTER TABLE tree_members ADD CONSTRAINT tree_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE branches DROP CONSTRAINT IF EXISTS circles_tribe_id_fkey;
ALTER TABLE branches ADD CONSTRAINT branches_tree_id_fkey 
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE;

ALTER TABLE branches DROP CONSTRAINT IF EXISTS circles_created_by_fkey;
ALTER TABLE branches ADD CONSTRAINT branches_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE branch_members DROP CONSTRAINT IF EXISTS circle_members_circle_id_fkey;
ALTER TABLE branch_members ADD CONSTRAINT branch_members_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE branch_members DROP CONSTRAINT IF EXISTS circle_members_user_id_fkey;
ALTER TABLE branch_members ADD CONSTRAINT branch_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE cross_tree_access DROP CONSTRAINT IF EXISTS cross_tribe_access_circle_id_fkey;
ALTER TABLE cross_tree_access ADD CONSTRAINT cross_tree_access_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE cross_tree_access DROP CONSTRAINT IF EXISTS cross_tribe_access_tribe_id_fkey;
ALTER TABLE cross_tree_access ADD CONSTRAINT cross_tree_access_tree_id_fkey 
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE;

-- Update posts foreign key if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'posts_circle_id_fkey') THEN
        ALTER TABLE posts DROP CONSTRAINT posts_circle_id_fkey;
        ALTER TABLE posts ADD CONSTRAINT posts_branch_id_fkey 
            FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update RBAC function to handle new table names
CREATE OR REPLACE FUNCTION user_has_permission(
    check_user_id UUID,
    context_type TEXT,
    context_id UUID,
    permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN := FALSE;
    user_role_name TEXT;
BEGIN
    -- Handle tree context
    IF context_type = 'tree' THEN
        -- Check if user is tree creator (automatic owner)
        SELECT EXISTS (
            SELECT 1 FROM trees 
            WHERE id = context_id AND created_by = check_user_id
        ) INTO has_perm;
        
        IF has_perm THEN
            RETURN TRUE;
        END IF;
        
        -- Check assigned roles in tree
        SELECT r.name INTO user_role_name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = check_user_id
        AND ur.context_type = 'tree'
        AND ur.context_id = context_id
        ORDER BY 
            CASE r.name 
                WHEN 'owner' THEN 1
                WHEN 'admin' THEN 2  
                WHEN 'moderator' THEN 3
                WHEN 'member' THEN 4
                WHEN 'viewer' THEN 5
                ELSE 6
            END
        LIMIT 1;

    -- Handle branch context  
    ELSIF context_type = 'branch' THEN
        -- Check if user is branch creator (automatic owner)
        SELECT EXISTS (
            SELECT 1 FROM branches 
            WHERE id = context_id AND created_by = check_user_id
        ) INTO has_perm;
        
        IF has_perm THEN
            RETURN TRUE;
        END IF;
        
        -- Check assigned roles in branch
        SELECT r.name INTO user_role_name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = check_user_id
        AND ur.context_type = 'branch'
        AND ur.context_id = context_id
        ORDER BY 
            CASE r.name 
                WHEN 'owner' THEN 1
                WHEN 'admin' THEN 2
                WHEN 'moderator' THEN 3  
                WHEN 'member' THEN 4
                WHEN 'viewer' THEN 5
                ELSE 6
            END
        LIMIT 1;

        -- If no direct role in branch, check tree-level permissions
        IF user_role_name IS NULL THEN
            -- Get the tree_id for this branch
            SELECT r.name INTO user_role_name
            FROM branches b
            JOIN user_roles ur ON ur.context_id = b.tree_id
            JOIN roles r ON r.id = ur.role_id  
            WHERE b.id = context_id
            AND ur.user_id = check_user_id
            AND ur.context_type = 'tree'
            ORDER BY 
                CASE r.name 
                    WHEN 'owner' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'moderator' THEN 3
                    WHEN 'member' THEN 4
                    WHEN 'viewer' THEN 5
                    ELSE 6
                END
            LIMIT 1;
        END IF;

        -- Check for cross-tree access
        IF user_role_name IS NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM cross_tree_access cta
                JOIN tree_members tm ON tm.tree_id = cta.tree_id
                WHERE cta.branch_id = context_id
                AND tm.user_id = check_user_id
                AND cta.status = 'active'
                AND (
                    (permission_name = 'can_read' AND cta.permissions->>'can_read' = 'true')
                    OR (permission_name = 'can_comment' AND cta.permissions->>'can_comment' = 'true')  
                    OR (permission_name = 'can_like' AND cta.permissions->>'can_like' = 'true')
                )
            ) INTO has_perm;
            
            RETURN has_perm;
        END IF;
    END IF;
    
    -- If no role found, return false
    IF user_role_name IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if role has the requested permission
    SELECT EXISTS (
        SELECT 1 FROM roles r
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = user_role_name
        AND p.name = permission_name
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate RLS policies with new table names
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_tree_access ENABLE ROW LEVEL SECURITY;

-- Trees policies
CREATE POLICY "Users can view trees they belong to" ON trees
    FOR SELECT USING (
        id IN (
            SELECT tree_id FROM tree_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create trees" ON trees
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update trees they own" ON trees
    FOR UPDATE USING (
        user_has_permission(auth.uid(), 'tree', id, 'can_update_tree')
    );

-- Tree members policies  
CREATE POLICY "Users can view tree memberships for their trees" ON tree_members
    FOR SELECT USING (
        tree_id IN (
            SELECT tree_id FROM tree_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tree admins can manage members" ON tree_members
    FOR ALL USING (
        user_has_permission(auth.uid(), 'tree', tree_id, 'can_manage_members')
    );

-- Branches policies
CREATE POLICY "Users can view branches they have access to" ON branches
    FOR SELECT USING (
        -- Own branches
        created_by = auth.uid()
        -- Tree member access
        OR tree_id IN (
            SELECT tree_id FROM tree_members WHERE user_id = auth.uid()
        )
        -- Cross-tree access
        OR id IN (
            SELECT cta.branch_id FROM cross_tree_access cta
            JOIN tree_members tm ON tm.tree_id = cta.tree_id
            WHERE tm.user_id = auth.uid() AND cta.status = 'active'
        )
        -- Public branches
        OR privacy = 'public'
    );

CREATE POLICY "Users can create branches in their trees" ON branches
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND user_has_permission(auth.uid(), 'tree', tree_id, 'can_create_branch')
    );

CREATE POLICY "Users can update branches they own or admin" ON branches
    FOR UPDATE USING (
        user_has_permission(auth.uid(), 'branch', id, 'can_update_branch')
    );

-- Branch members policies
CREATE POLICY "Users can view branch memberships for accessible branches" ON branch_members
    FOR SELECT USING (
        branch_id IN (
            SELECT id FROM branches WHERE 
            created_by = auth.uid()
            OR tree_id IN (SELECT tree_id FROM tree_members WHERE user_id = auth.uid())
            OR id IN (
                SELECT cta.branch_id FROM cross_tree_access cta
                JOIN tree_members tm ON tm.tree_id = cta.tree_id  
                WHERE tm.user_id = auth.uid() AND cta.status = 'active'
            )
            OR privacy = 'public'
        )
    );

CREATE POLICY "Branch admins can manage members" ON branch_members
    FOR ALL USING (
        user_has_permission(auth.uid(), 'branch', branch_id, 'can_manage_members')
    );

-- Cross-tree access policies
CREATE POLICY "Users can view cross-tree access for their branches" ON cross_tree_access
    FOR SELECT USING (
        branch_id IN (
            SELECT id FROM branches WHERE created_by = auth.uid()
        )
        OR tree_id IN (
            SELECT tree_id FROM tree_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage cross-tree access for branches they own" ON cross_tree_access
    FOR ALL USING (
        branch_id IN (
            SELECT id FROM branches WHERE 
            user_has_permission(auth.uid(), 'branch', id, 'can_manage_cross_tree_access')
        )
    );

-- Grant necessary permissions
GRANT ALL ON trees TO authenticated;
GRANT ALL ON tree_members TO authenticated; 
GRANT ALL ON branches TO authenticated;
GRANT ALL ON branch_members TO authenticated;
GRANT ALL ON branch_categories TO authenticated;
GRANT ALL ON cross_tree_access TO authenticated;

-- Update realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE trees;
ALTER PUBLICATION supabase_realtime ADD TABLE tree_members;
ALTER PUBLICATION supabase_realtime ADD TABLE branches;
ALTER PUBLICATION supabase_realtime ADD TABLE branch_members;

-- Remove old tables from realtime if they were added
DO $$
BEGIN
    -- This will fail silently if tables don't exist in publication
    ALTER PUBLICATION supabase_realtime DROP TABLE tribes;
    ALTER PUBLICATION supabase_realtime DROP TABLE tribe_members;
    ALTER PUBLICATION supabase_realtime DROP TABLE circles;  
    ALTER PUBLICATION supabase_realtime DROP TABLE circle_members;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors for non-existent tables
    NULL;
END $$;

-- Create helpful views for migration period (optional)
-- These can be removed later once all code is updated
CREATE VIEW tribes AS SELECT * FROM trees;
CREATE VIEW tribe_members AS SELECT 
    user_id,
    tree_id as tribe_id,
    role,
    joined_at,
    created_at,
    updated_at
FROM tree_members;

CREATE VIEW circles AS SELECT 
    id,
    name,
    description,
    tree_id as tribe_id,
    privacy,
    created_by,
    created_at,
    updated_at,
    category,
    location,
    is_discoverable,
    auto_approve_members,
    color
FROM branches;

CREATE VIEW circle_members AS SELECT
    user_id, 
    branch_id as circle_id,
    role,
    joined_at,
    created_at,
    updated_at
FROM branch_members;

COMMENT ON MIGRATION IS 'Rename tribes->trees and circles->branches throughout the database schema';