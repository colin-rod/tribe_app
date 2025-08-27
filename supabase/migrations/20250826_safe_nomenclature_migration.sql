-- Safe incremental migration: Rename tribes to trees and circles to branches
-- This migration handles existing constraints and potential conflicts

BEGIN;

-- Step 1: Drop dependent policies first (in correct order)
DROP POLICY IF EXISTS circle_invitations_rbac ON public.circle_invitations;
DROP POLICY IF EXISTS circle_categories_rbac_select ON public.circle_categories;
DROP POLICY IF EXISTS user_roles_rbac_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_rbac_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_rbac_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_rbac_delete ON public.user_roles;
DROP POLICY IF EXISTS circles_rbac_insert ON public.circles;
DROP POLICY IF EXISTS circle_members_rbac_insert ON public.circle_members;
DROP POLICY IF EXISTS circle_members_own_only ON public.circle_members;
DROP POLICY IF EXISTS circles_owner_and_public ON public.circles;
DROP POLICY IF EXISTS circles_select_policy ON public.circles;
DROP POLICY IF EXISTS circles_insert_policy ON public.circles;
DROP POLICY IF EXISTS circles_update_policy ON public.circles;
DROP POLICY IF EXISTS circles_delete_policy ON public.circles;
DROP POLICY IF EXISTS posts_simple_insert ON public.posts;
DROP POLICY IF EXISTS posts_simple_select ON public.posts;
DROP POLICY IF EXISTS posts_simple_update ON public.posts;
DROP POLICY IF EXISTS posts_simple_delete ON public.posts;
DROP POLICY IF EXISTS cross_tribe_access_select ON public.cross_tribe_access;
DROP POLICY IF EXISTS cross_tribe_access_insert ON public.cross_tribe_access;
DROP POLICY IF EXISTS cross_tribe_access_update ON public.cross_tribe_access;
DROP POLICY IF EXISTS cross_tribe_access_delete ON public.cross_tribe_access;
DROP POLICY IF EXISTS posts_select_policy ON public.posts;
DROP POLICY IF EXISTS circle_members_rbac_update ON public.circle_members;
DROP POLICY IF EXISTS circle_members_rbac_delete ON public.circle_members;
DROP POLICY IF EXISTS comments_select_policy ON public.comments;
DROP POLICY IF EXISTS comments_simple_insert ON public.comments;
DROP POLICY IF EXISTS comments_simple_select ON public.comments;
DROP POLICY IF EXISTS comments_simple_update ON public.comments;
DROP POLICY IF EXISTS comments_simple_delete ON public.comments;
DROP POLICY IF EXISTS likes_simple_insert ON public.likes;
DROP POLICY IF EXISTS likes_simple_select ON public.likes;
DROP POLICY IF EXISTS likes_simple_delete ON public.likes;

-- Storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload to their  circles" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view files from their circles" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;

-- Step 2: Drop functions that might conflict
DROP FUNCTION IF EXISTS user_has_cross_tribe_circle_access(uuid, uuid);
DROP FUNCTION IF EXISTS user_has_permission(uuid, text, uuid, text);

-- Step 3: Check and rename tables only if they exist with old names
DO $$
BEGIN
    -- Rename tribes to trees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tribes' AND table_schema = 'public') THEN
        ALTER TABLE public.tribes RENAME TO trees;
    END IF;
    
    -- Rename tribe_members to tree_members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tribe_members' AND table_schema = 'public') THEN
        ALTER TABLE public.tribe_members RENAME TO tree_members;
    END IF;
    
    -- Rename circles to branches
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'circles' AND table_schema = 'public') THEN
        ALTER TABLE public.circles RENAME TO branches;
    END IF;
    
    -- Rename circle_members to branch_members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'circle_members' AND table_schema = 'public') THEN
        ALTER TABLE public.circle_members RENAME TO branch_members;
    END IF;
    
    -- Rename circle_invitations to branch_invitations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'circle_invitations' AND table_schema = 'public') THEN
        ALTER TABLE public.circle_invitations RENAME TO branch_invitations;
    END IF;
    
    -- Rename circle_categories to branch_categories
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'circle_categories' AND table_schema = 'public') THEN
        ALTER TABLE public.circle_categories RENAME TO branch_categories;
    END IF;
    
    -- Rename cross_tribe_access to cross_tree_access
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cross_tribe_access' AND table_schema = 'public') THEN
        ALTER TABLE public.cross_tribe_access RENAME TO cross_tree_access;
    END IF;
END $$;

-- Step 4: Rename columns safely
DO $$
BEGIN
    -- Rename tribe_id to tree_id in branches table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'tribe_id' AND table_schema = 'public') THEN
        ALTER TABLE public.branches RENAME COLUMN tribe_id TO tree_id;
    END IF;
    
    -- Rename tribe_id to tree_id in tree_members table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tree_members' AND column_name = 'tribe_id' AND table_schema = 'public') THEN
        ALTER TABLE public.tree_members RENAME COLUMN tribe_id TO tree_id;
    END IF;
    
    -- Rename circle_id to branch_id in posts table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'circle_id' AND table_schema = 'public') THEN
        ALTER TABLE public.posts RENAME COLUMN circle_id TO branch_id;
    END IF;
    
    -- Rename circle_id to branch_id in branch_members table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_members' AND column_name = 'circle_id' AND table_schema = 'public') THEN
        ALTER TABLE public.branch_members RENAME COLUMN circle_id TO branch_id;
    END IF;
    
    -- Rename circle_id to branch_id in branch_invitations table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branch_invitations' AND column_name = 'circle_id' AND table_schema = 'public') THEN
        ALTER TABLE public.branch_invitations RENAME COLUMN circle_id TO branch_id;
    END IF;
    
    -- Rename circle_id to branch_id in cross_tree_access table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cross_tree_access' AND column_name = 'circle_id' AND table_schema = 'public') THEN
        ALTER TABLE public.cross_tree_access RENAME COLUMN circle_id TO branch_id;
    END IF;
    
    -- Rename tribe_id to tree_id in cross_tree_access table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cross_tree_access' AND column_name = 'tribe_id' AND table_schema = 'public') THEN
        ALTER TABLE public.cross_tree_access RENAME COLUMN tribe_id TO tree_id;
    END IF;
    
    -- Rename tribe_id to tree_id in invitations table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitations' AND column_name = 'tribe_id' AND table_schema = 'public') THEN
        ALTER TABLE public.invitations RENAME COLUMN tribe_id TO tree_id;
    END IF;
END $$;

-- Step 5: Drop and recreate foreign key constraints
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS circles_tribe_id_fkey;
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS fk_circles_tribe_id;
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_tree_id_fkey;
ALTER TABLE public.branches ADD CONSTRAINT branches_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES public.trees(id);

ALTER TABLE public.branch_members DROP CONSTRAINT IF EXISTS circle_members_circle_id_fkey;
ALTER TABLE public.branch_members DROP CONSTRAINT IF EXISTS branch_members_branch_id_fkey;
ALTER TABLE public.branch_members ADD CONSTRAINT branch_members_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE public.tree_members DROP CONSTRAINT IF EXISTS tribe_members_tribe_id_fkey;
ALTER TABLE public.tree_members DROP CONSTRAINT IF EXISTS tree_members_tree_id_fkey;
ALTER TABLE public.tree_members ADD CONSTRAINT tree_members_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES public.trees(id);

ALTER TABLE public.branch_invitations DROP CONSTRAINT IF EXISTS circle_invitations_circle_id_fkey;
ALTER TABLE public.branch_invitations DROP CONSTRAINT IF EXISTS branch_invitations_branch_id_fkey;
ALTER TABLE public.branch_invitations ADD CONSTRAINT branch_invitations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_circle_id_fkey;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_branch_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);

ALTER TABLE public.cross_tree_access DROP CONSTRAINT IF EXISTS cross_tribe_access_circle_id_fkey;
ALTER TABLE public.cross_tree_access DROP CONSTRAINT IF EXISTS cross_tribe_access_tribe_id_fkey;
ALTER TABLE public.cross_tree_access DROP CONSTRAINT IF EXISTS cross_tree_access_branch_id_fkey;
ALTER TABLE public.cross_tree_access DROP CONSTRAINT IF EXISTS cross_tree_access_tree_id_fkey;
ALTER TABLE public.cross_tree_access ADD CONSTRAINT cross_tree_access_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);
ALTER TABLE public.cross_tree_access ADD CONSTRAINT cross_tree_access_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES public.trees(id);

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_tribe_id_fkey;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_tree_id_fkey;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES public.trees(id);

-- Step 6: Create updated functions
CREATE OR REPLACE FUNCTION user_has_cross_tree_branch_access(user_uuid uuid, branch_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user is a member of the branch
  IF EXISTS (
    SELECT 1 FROM branch_members 
    WHERE branch_id = branch_uuid 
    AND user_id = user_uuid 
    AND status = 'active'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has cross-tree access to this branch
  IF EXISTS (
    SELECT 1 FROM cross_tree_access cta
    JOIN tree_members tm ON tm.tree_id = cta.tree_id
    WHERE cta.branch_id = branch_uuid 
    AND tm.user_id = user_uuid 
    AND cta.status = 'active'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated permission function
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid uuid, resource_type text, resource_id uuid, permission_name text)
RETURNS boolean AS $$
BEGIN
  -- Check if user has the specific permission through role assignments
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid
    AND ur.context_type = resource_type
    AND ur.context_id = resource_id
    AND p.name = permission_name
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Recreate RLS policies with new table names
-- Branch Categories
CREATE POLICY branch_categories_rbac_select ON public.branch_categories
FOR SELECT TO public USING (auth.uid() IS NOT NULL);

-- Branch Invitations  
CREATE POLICY branch_invitations_rbac ON public.branch_invitations
FOR ALL TO public USING (
  invited_by = auth.uid() OR 
  user_has_permission(auth.uid(), 'branch', branch_id, 'member.invite')
);

-- User Roles (updated to use 'branch' instead of 'circle')
CREATE POLICY user_roles_rbac_select ON public.user_roles
FOR SELECT TO public USING (
  user_id = auth.uid() OR 
  (context_type = 'branch' AND user_has_permission(auth.uid(), 'branch', context_id, 'member.read'))
);

CREATE POLICY user_roles_rbac_insert ON public.user_roles
FOR INSERT TO public WITH CHECK (
  context_type = 'branch' AND user_has_permission(auth.uid(), 'branch', context_id, 'member.admin')
);

CREATE POLICY user_roles_rbac_update ON public.user_roles
FOR UPDATE TO public USING (
  context_type = 'branch' AND user_has_permission(auth.uid(), 'branch', context_id, 'member.admin')
);

CREATE POLICY user_roles_rbac_delete ON public.user_roles
FOR DELETE TO public USING (
  context_type = 'branch' AND user_has_permission(auth.uid(), 'branch', context_id, 'member.admin')
);

-- Branches (formerly circles)
CREATE POLICY branches_rbac_insert ON public.branches
FOR INSERT TO public WITH CHECK (
  auth.uid() IS NOT NULL AND created_by = auth.uid()
);

CREATE POLICY branches_owner_and_public ON public.branches
FOR SELECT TO public USING (
  created_by = auth.uid() OR privacy = 'public'
);

CREATE POLICY branches_select_policy ON public.branches
FOR SELECT TO public USING (
  user_has_cross_tree_branch_access(auth.uid(), id)
);

CREATE POLICY branches_insert_policy ON public.branches
FOR INSERT TO public WITH CHECK (
  EXISTS (
    SELECT 1 FROM tree_members tm
    WHERE tm.tree_id = branches.tree_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY branches_update_policy ON public.branches
FOR UPDATE TO public USING (
  EXISTS (
    SELECT 1 FROM tree_members tm
    WHERE tm.tree_id = branches.tree_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  ) OR created_by = auth.uid()
);

CREATE POLICY branches_delete_policy ON public.branches
FOR DELETE TO public USING (
  EXISTS (
    SELECT 1 FROM tree_members tm
    WHERE tm.tree_id = branches.tree_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  ) OR created_by = auth.uid()
);

-- Branch Members (formerly circle_members)
CREATE POLICY branch_members_rbac_insert ON public.branch_members
FOR INSERT TO public WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = branch_members.branch_id 
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY branch_members_own_only ON public.branch_members
FOR SELECT TO public USING (user_id = auth.uid());

CREATE POLICY branch_members_rbac_update ON public.branch_members
FOR UPDATE TO public USING (
  user_id = auth.uid() OR 
  user_has_permission(auth.uid(), 'branch', branch_id, 'member.moderate')
);

CREATE POLICY branch_members_rbac_delete ON public.branch_members
FOR DELETE TO public USING (
  user_id = auth.uid() OR 
  user_has_permission(auth.uid(), 'branch', branch_id, 'member.moderate')
);

-- Posts (updated to use branch_id)
CREATE POLICY posts_simple_insert ON public.posts
FOR INSERT TO public WITH CHECK (
  author_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM branch_members
    WHERE branch_members.branch_id = posts.branch_id 
    AND branch_members.user_id = auth.uid() 
    AND branch_members.status = 'active'
  )
);

CREATE POLICY posts_simple_select ON public.posts
FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM branch_members
    WHERE branch_members.branch_id = posts.branch_id 
    AND branch_members.user_id = auth.uid() 
    AND branch_members.status = 'active'
  )
);

CREATE POLICY posts_select_policy ON public.posts
FOR SELECT TO public USING (
  user_has_cross_tree_branch_access(auth.uid(), branch_id)
);

CREATE POLICY posts_simple_update ON public.posts
FOR UPDATE TO public USING (author_id = auth.uid());

CREATE POLICY posts_simple_delete ON public.posts
FOR DELETE TO public USING (author_id = auth.uid());

-- Cross Tree Access (formerly cross_tribe_access)  
CREATE POLICY cross_tree_access_select ON public.cross_tree_access
FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM tree_members tm
    WHERE tm.tree_id = cross_tree_access.tree_id 
    AND tm.user_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = cross_tree_access.branch_id 
    AND b.created_by = auth.uid()
  )
);

CREATE POLICY cross_tree_access_insert ON public.cross_tree_access
FOR INSERT TO public WITH CHECK (
  EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = cross_tree_access.branch_id 
    AND b.created_by = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM branches b
    JOIN tree_members tm ON b.tree_id = tm.tree_id
    WHERE b.id = cross_tree_access.branch_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY cross_tree_access_update ON public.cross_tree_access
FOR UPDATE TO public USING (
  invited_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM branches b
    JOIN tree_members tm ON b.tree_id = tm.tree_id
    WHERE b.id = cross_tree_access.branch_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY cross_tree_access_delete ON public.cross_tree_access
FOR DELETE TO public USING (
  invited_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM branches b
    JOIN tree_members tm ON b.tree_id = tm.tree_id
    WHERE b.id = cross_tree_access.branch_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  )
);

-- Comments (updated to use branch_id through posts)
CREATE POLICY comments_select_policy ON public.comments
FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = comments.post_id 
    AND user_has_cross_tree_branch_access(auth.uid(), p.branch_id)
  )
);

CREATE POLICY comments_simple_insert ON public.comments
FOR INSERT TO public WITH CHECK (
  author_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM posts p, branch_members bm
    WHERE p.id = comments.post_id 
    AND bm.branch_id = p.branch_id 
    AND bm.user_id = auth.uid() 
    AND bm.status = 'active'
  )
);

CREATE POLICY comments_simple_select ON public.comments
FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM posts p, branch_members bm
    WHERE p.id = comments.post_id 
    AND bm.branch_id = p.branch_id 
    AND bm.user_id = auth.uid() 
    AND bm.status = 'active'
  )
);

CREATE POLICY comments_simple_update ON public.comments
FOR UPDATE TO public USING (author_id = auth.uid());

CREATE POLICY comments_simple_delete ON public.comments
FOR DELETE TO public USING (author_id = auth.uid());

-- Likes (updated to use branch_id through posts)
CREATE POLICY likes_simple_insert ON public.likes
FOR INSERT TO public WITH CHECK (
  user_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM posts p, branch_members bm
    WHERE p.id = likes.post_id 
    AND bm.branch_id = p.branch_id 
    AND bm.user_id = auth.uid() 
    AND bm.status = 'active'
  )
);

CREATE POLICY likes_simple_select ON public.likes
FOR SELECT TO public USING (
  EXISTS (
    SELECT 1 FROM posts p, branch_members bm
    WHERE p.id = likes.post_id 
    AND bm.branch_id = p.branch_id 
    AND bm.user_id = auth.uid() 
    AND bm.status = 'active'
  )
);

CREATE POLICY likes_simple_delete ON public.likes
FOR DELETE TO public USING (user_id = auth.uid());

-- Storage policies (updated to use branch_id)
CREATE POLICY "Allow authenticated users to upload to their branches" ON storage.objects
FOR INSERT TO public WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM branch_members
    WHERE branch_members.branch_id = ((storage.foldername(objects.name))[2])::uuid
    AND branch_members.user_id = auth.uid()
    AND branch_members.status = 'active'
  )
);

CREATE POLICY "Allow users to view files from their branches" ON storage.objects
FOR SELECT TO public USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM branch_members
    WHERE branch_members.branch_id = ((storage.foldername(objects.name))[2])::uuid
    AND branch_members.user_id = auth.uid()
    AND branch_members.status = 'active'
  )
);

CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE TO public USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE TO public USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 8: Create compatibility views for smooth transition
CREATE OR REPLACE VIEW public.tribes AS SELECT * FROM public.trees;
CREATE OR REPLACE VIEW public.tribe_members AS SELECT * FROM public.tree_members;
CREATE OR REPLACE VIEW public.circles AS SELECT * FROM public.branches;
CREATE OR REPLACE VIEW public.circle_members AS SELECT * FROM public.branch_members;
CREATE OR REPLACE VIEW public.circle_invitations AS SELECT * FROM public.branch_invitations;
CREATE OR REPLACE VIEW public.circle_categories AS SELECT * FROM public.branch_categories;
CREATE OR REPLACE VIEW public.cross_tribe_access AS SELECT * FROM public.cross_tree_access;

-- Step 9: Create compatibility function aliases
CREATE OR REPLACE FUNCTION user_has_cross_tribe_circle_access(user_uuid uuid, branch_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN user_has_cross_tree_branch_access(user_uuid, branch_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;