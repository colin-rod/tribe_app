-- Complete RBAC Implementation
-- This migration removes all existing RLS policies and implements a proper RBAC system

-- First, drop all existing policies
DROP POLICY IF EXISTS "circles_insert_own" ON circles;
DROP POLICY IF EXISTS "circles_update_creator" ON circles;
DROP POLICY IF EXISTS "circles_delete_creator" ON circles;
DROP POLICY IF EXISTS "circles_select_member_access" ON circles;

DROP POLICY IF EXISTS "circle_members_insert_own" ON circle_members;
DROP POLICY IF EXISTS "circle_members_update_own" ON circle_members;
DROP POLICY IF EXISTS "circle_members_delete_own" ON circle_members;
DROP POLICY IF EXISTS "circle_members_select_accessible" ON circle_members;

DROP POLICY IF EXISTS "posts_select_simple" ON posts;
DROP POLICY IF EXISTS "posts_create_in_circles" ON posts;
DROP POLICY IF EXISTS "posts_update_own" ON posts;
DROP POLICY IF EXISTS "posts_delete_own" ON posts;

DROP POLICY IF EXISTS "comments_select_simple" ON comments;
DROP POLICY IF EXISTS "comments_create_with_post_access" ON comments;
DROP POLICY IF EXISTS "comments_update_own" ON comments;
DROP POLICY IF EXISTS "comments_delete_own" ON comments;

DROP POLICY IF EXISTS "likes_select_simple" ON likes;
DROP POLICY IF EXISTS "likes_create_with_post_access" ON likes;
DROP POLICY IF EXISTS "likes_delete_own" ON likes;

DROP POLICY IF EXISTS "profiles_accessible" ON profiles;
DROP POLICY IF EXISTS "tribe_members_select_for_circles" ON tribe_members;
DROP POLICY IF EXISTS "circle_invitations_manage" ON circle_invitations;
DROP POLICY IF EXISTS "circle_categories_view_all" ON circle_categories;
DROP POLICY IF EXISTS "tribes_optional_select" ON tribes;
DROP POLICY IF EXISTS "tribes_create_optional" ON tribes;
DROP POLICY IF EXISTS "tribes_update_own" ON tribes;
DROP POLICY IF EXISTS "tribe_members_manage" ON tribe_members;
DROP POLICY IF EXISTS "invitations_manage_tribe" ON invitations;

-- Create RBAC enums and tables
CREATE TYPE permission_action AS ENUM (
    'create', 'read', 'update', 'delete', 'moderate', 'invite', 'admin'
);

CREATE TYPE resource_type AS ENUM (
    'circle', 'post', 'comment', 'member', 'invitation'
);

-- Permissions table - defines what actions can be performed on what resources
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    resource_type resource_type NOT NULL,
    action permission_action NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table - defines different user roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- User roles - assigns roles to users within specific contexts (circles)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL, -- 'circle', 'tribe', 'global'
    context_id UUID, -- circle_id, tribe_id, or NULL for global
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id, context_type, context_id)
);

-- Insert default permissions
INSERT INTO permissions (name, resource_type, action, description) VALUES
-- Circle permissions
('circle.create', 'circle', 'create', 'Create new circles'),
('circle.read', 'circle', 'read', 'View circle details'),
('circle.update', 'circle', 'update', 'Update circle settings'),
('circle.delete', 'circle', 'delete', 'Delete circles'),
('circle.moderate', 'circle', 'moderate', 'Moderate circle content'),
('circle.invite', 'circle', 'invite', 'Invite members to circle'),
('circle.admin', 'circle', 'admin', 'Full circle administration'),

-- Post permissions
('post.create', 'post', 'create', 'Create posts'),
('post.read', 'post', 'read', 'View posts'),
('post.update', 'post', 'update', 'Edit posts'),
('post.delete', 'post', 'delete', 'Delete posts'),
('post.moderate', 'post', 'moderate', 'Moderate posts'),

-- Comment permissions
('comment.create', 'comment', 'create', 'Create comments'),
('comment.read', 'comment', 'read', 'View comments'),
('comment.update', 'comment', 'update', 'Edit comments'),
('comment.delete', 'comment', 'delete', 'Delete comments'),
('comment.moderate', 'comment', 'moderate', 'Moderate comments'),

-- Member permissions
('member.read', 'member', 'read', 'View member list'),
('member.invite', 'member', 'invite', 'Invite new members'),
('member.moderate', 'member', 'moderate', 'Moderate members'),
('member.admin', 'member', 'admin', 'Full member administration');

-- Insert default roles
INSERT INTO roles (name, description, is_system_role) VALUES
('owner', 'Circle owner with full permissions', true),
('admin', 'Circle administrator', true),
('moderator', 'Circle moderator', true),
('member', 'Regular circle member', true),
('viewer', 'Read-only access', true);

-- Assign permissions to roles
WITH role_permission_mapping AS (
  SELECT 
    r.id as role_id,
    p.id as permission_id
  FROM roles r
  CROSS JOIN permissions p
  WHERE 
    -- Owner gets all permissions
    (r.name = 'owner') OR
    
    -- Admin gets most permissions except circle delete
    (r.name = 'admin' AND p.name NOT IN ('circle.delete')) OR
    
    -- Moderator gets moderation permissions
    (r.name = 'moderator' AND p.action IN ('read', 'moderate', 'create') AND p.name NOT IN ('circle.update', 'circle.delete', 'circle.admin')) OR
    
    -- Member gets basic permissions
    (r.name = 'member' AND p.action IN ('read', 'create') AND p.name NOT IN ('circle.create', 'circle.update', 'circle.delete', 'circle.admin', 'member.invite', 'member.moderate', 'member.admin')) OR
    
    -- Viewer gets read-only permissions
    (r.name = 'viewer' AND p.action = 'read')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_permission_mapping;

-- Create permission checking functions
CREATE OR REPLACE FUNCTION user_has_permission(
    check_user_id UUID,
    context_type TEXT,
    context_id UUID,
    permission_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = check_user_id
        AND ur.context_type = context_type
        AND (ur.context_id = context_id OR (ur.context_type = 'global' AND ur.context_id IS NULL))
        AND p.name = permission_name
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    );
END;
$$;

-- Helper function to check if user is circle owner/creator
CREATE OR REPLACE FUNCTION user_is_circle_creator(
    check_user_id UUID,
    check_circle_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM circles 
        WHERE id = check_circle_id 
        AND created_by = check_user_id
    );
END;
$$;

-- Helper function to get user's role in circle
CREATE OR REPLACE FUNCTION get_user_circle_role(
    check_user_id UUID,
    check_circle_id UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Check if user is the circle creator (automatic owner)
    IF user_is_circle_creator(check_user_id, check_circle_id) THEN
        RETURN 'owner';
    END IF;
    
    -- Check assigned role
    SELECT r.name INTO user_role
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id
    AND ur.context_type = 'circle'
    AND ur.context_id = check_circle_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
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
    
    RETURN COALESCE(user_role, 'none');
END;
$$;

-- Function to automatically assign owner role when circle is created
CREATE OR REPLACE FUNCTION assign_circle_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    owner_role_id UUID;
BEGIN
    -- Get the owner role ID
    SELECT id INTO owner_role_id FROM roles WHERE name = 'owner' LIMIT 1;
    
    -- Assign owner role to creator
    INSERT INTO user_roles (user_id, role_id, context_type, context_id, granted_by)
    VALUES (NEW.created_by, owner_role_id, 'circle', NEW.id, NEW.created_by);
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic owner assignment
DROP TRIGGER IF EXISTS assign_circle_owner_role_trigger ON circles;
CREATE TRIGGER assign_circle_owner_role_trigger
    AFTER INSERT ON circles
    FOR EACH ROW
    EXECUTE FUNCTION assign_circle_owner_role();

-- Function to auto-assign member role when joining circle
CREATE OR REPLACE FUNCTION assign_circle_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    member_role_id UUID;
BEGIN
    -- Only assign if status is active and no existing role
    IF NEW.status = 'active' AND NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = NEW.user_id 
        AND context_type = 'circle' 
        AND context_id = NEW.circle_id
    ) THEN
        -- Get the member role ID
        SELECT id INTO member_role_id FROM roles WHERE name = 'member' LIMIT 1;
        
        -- Assign member role
        INSERT INTO user_roles (user_id, role_id, context_type, context_id)
        VALUES (NEW.user_id, member_role_id, 'circle', NEW.circle_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic member assignment
DROP TRIGGER IF EXISTS assign_circle_member_role_trigger ON circle_members;
CREATE TRIGGER assign_circle_member_role_trigger
    AFTER INSERT ON circle_members
    FOR EACH ROW
    EXECUTE FUNCTION assign_circle_member_role();

-- Now create new RBAC-based RLS policies

-- Circles policies
CREATE POLICY "circles_rbac_select" ON circles
    FOR SELECT USING (
        privacy = 'public' OR
        user_has_permission(auth.uid(), 'circle', id, 'circle.read') OR
        user_is_circle_creator(auth.uid(), id)
    );

CREATE POLICY "circles_rbac_insert" ON circles
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY "circles_rbac_update" ON circles
    FOR UPDATE USING (
        user_has_permission(auth.uid(), 'circle', id, 'circle.update') OR
        user_is_circle_creator(auth.uid(), id)
    );

CREATE POLICY "circles_rbac_delete" ON circles
    FOR DELETE USING (
        user_has_permission(auth.uid(), 'circle', id, 'circle.delete') OR
        user_is_circle_creator(auth.uid(), id)
    );

-- Circle members policies
CREATE POLICY "circle_members_rbac_select" ON circle_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        user_has_permission(auth.uid(), 'circle', circle_id, 'member.read')
    );

CREATE POLICY "circle_members_rbac_insert" ON circle_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        user_has_permission(auth.uid(), 'circle', circle_id, 'member.invite')
    );

CREATE POLICY "circle_members_rbac_update" ON circle_members
    FOR UPDATE USING (
        user_id = auth.uid() OR
        user_has_permission(auth.uid(), 'circle', circle_id, 'member.moderate')
    );

CREATE POLICY "circle_members_rbac_delete" ON circle_members
    FOR DELETE USING (
        user_id = auth.uid() OR
        user_has_permission(auth.uid(), 'circle', circle_id, 'member.moderate')
    );

-- Posts policies
CREATE POLICY "posts_rbac_select" ON posts
    FOR SELECT USING (
        user_has_permission(auth.uid(), 'circle', circle_id, 'post.read')
    );

CREATE POLICY "posts_rbac_insert" ON posts
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        user_has_permission(auth.uid(), 'circle', circle_id, 'post.create')
    );

CREATE POLICY "posts_rbac_update" ON posts
    FOR UPDATE USING (
        (author_id = auth.uid() AND user_has_permission(auth.uid(), 'circle', circle_id, 'post.update')) OR
        user_has_permission(auth.uid(), 'circle', circle_id, 'post.moderate')
    );

CREATE POLICY "posts_rbac_delete" ON posts
    FOR DELETE USING (
        (author_id = auth.uid() AND user_has_permission(auth.uid(), 'circle', circle_id, 'post.delete')) OR
        user_has_permission(auth.uid(), 'circle', circle_id, 'post.moderate')
    );

-- Comments policies
CREATE POLICY "comments_rbac_select" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = post_id 
            AND user_has_permission(auth.uid(), 'circle', p.circle_id, 'comment.read')
        )
    );

CREATE POLICY "comments_rbac_insert" ON comments
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = post_id 
            AND user_has_permission(auth.uid(), 'circle', p.circle_id, 'comment.create')
        )
    );

CREATE POLICY "comments_rbac_update" ON comments
    FOR UPDATE USING (
        (author_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = post_id 
            AND user_has_permission(auth.uid(), 'circle', p.circle_id, 'comment.moderate')
        )
    );

CREATE POLICY "comments_rbac_delete" ON comments
    FOR DELETE USING (
        (author_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = post_id 
            AND user_has_permission(auth.uid(), 'circle', p.circle_id, 'comment.moderate')
        )
    );

-- Likes policies
CREATE POLICY "likes_rbac_select" ON likes
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = post_id 
            AND user_has_permission(auth.uid(), 'circle', p.circle_id, 'post.read')
        )
    );

CREATE POLICY "likes_rbac_insert" ON likes
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = post_id 
            AND user_has_permission(auth.uid(), 'circle', p.circle_id, 'post.read')
        )
    );

CREATE POLICY "likes_rbac_delete" ON likes
    FOR DELETE USING (user_id = auth.uid());

-- Profiles policy (simplified)
CREATE POLICY "profiles_rbac_select" ON profiles
    FOR SELECT USING (
        id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.user_id = profiles.id
            AND user_has_permission(auth.uid(), 'circle', cm.circle_id, 'member.read')
        )
    );

-- Circle invitations policy
CREATE POLICY "circle_invitations_rbac" ON circle_invitations
    FOR ALL USING (
        invited_by = auth.uid() OR
        user_has_permission(auth.uid(), 'circle', circle_id, 'member.invite')
    );

-- Circle categories (public read)
CREATE POLICY "circle_categories_rbac_select" ON circle_categories
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- User roles policies
CREATE POLICY "user_roles_rbac_select" ON user_roles
    FOR SELECT USING (
        user_id = auth.uid() OR
        (context_type = 'circle' AND user_has_permission(auth.uid(), 'circle', context_id, 'member.read'))
    );

CREATE POLICY "user_roles_rbac_insert" ON user_roles
    FOR INSERT WITH CHECK (
        context_type = 'circle' AND
        user_has_permission(auth.uid(), 'circle', context_id, 'member.admin')
    );

CREATE POLICY "user_roles_rbac_update" ON user_roles
    FOR UPDATE USING (
        context_type = 'circle' AND
        user_has_permission(auth.uid(), 'circle', context_id, 'member.admin')
    );

CREATE POLICY "user_roles_rbac_delete" ON user_roles
    FOR DELETE USING (
        context_type = 'circle' AND
        user_has_permission(auth.uid(), 'circle', context_id, 'member.admin')
    );

-- Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- System tables policies (admin read-only)
CREATE POLICY "permissions_system_read" ON permissions FOR SELECT USING (true);
CREATE POLICY "roles_system_read" ON roles FOR SELECT USING (true);
CREATE POLICY "role_permissions_system_read" ON role_permissions FOR SELECT USING (true);

-- Grant necessary permissions
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT ALL ON user_roles TO authenticated;