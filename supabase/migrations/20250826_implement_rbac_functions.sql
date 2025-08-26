-- Implement RBAC functions and fix policy conflicts
-- This enables proper permission-based access control

-- Create user_has_permission function for RBAC policy checking
CREATE OR REPLACE FUNCTION user_has_permission(
    check_user_id UUID,
    context_type TEXT,
    context_id UUID,
    permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN := FALSE;
BEGIN
    -- Check if user has the specified permission through their roles
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = check_user_id
        AND ur.context_type = context_type
        AND (ur.context_id = context_id OR (context_id IS NULL AND ur.context_id IS NULL))
        AND p.name = permission_name
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ) INTO has_perm;
    
    -- If no explicit permission found, check if user is circle creator (automatic owner permissions)
    IF NOT has_perm AND context_type = 'circle' AND context_id IS NOT NULL THEN
        SELECT user_is_circle_creator(check_user_id, context_id) INTO has_perm;
    END IF;
    
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function with CASCADE to handle dependent policies
DROP FUNCTION IF EXISTS user_is_circle_creator(UUID, UUID) CASCADE;

-- Create user_is_circle_creator function
CREATE OR REPLACE FUNCTION user_is_circle_creator(
    check_user_id UUID,
    circle_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM circles 
        WHERE id = circle_id 
        AND created_by = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the dependent policies that were dropped by CASCADE
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

-- Remove conflicting simple policies on circle_invitations
-- Keep only RBAC policies for consistent permission checking
DROP POLICY IF EXISTS "circle_invitations_simple_insert" ON circle_invitations;
DROP POLICY IF EXISTS "circle_invitations_simple_select" ON circle_invitations; 
DROP POLICY IF EXISTS "circle_invitations_simple_update" ON circle_invitations;
DROP POLICY IF EXISTS "circle_invitations_simple_delete" ON circle_invitations;

-- Ensure the RBAC policy exists for circle_invitations
-- This policy uses the user_has_permission function we just created
DO $$
BEGIN
    -- Check if the RBAC policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'circle_invitations' 
        AND policyname = 'circle_invitations_rbac'
    ) THEN
        -- Create the RBAC policy
        CREATE POLICY "circle_invitations_rbac" ON circle_invitations
            FOR ALL USING (
                invited_by = auth.uid() OR 
                user_has_permission(auth.uid(), 'circle', circle_id, 'member.invite')
            );
    END IF;
END $$;