-- Fix infinite recursion in circle_members policy with simpler approach

-- Drop the recursive policy
DROP POLICY IF EXISTS "circle_members_rbac_select" ON circle_members;

-- Create a simple, non-recursive policy for circle_members
CREATE POLICY "circle_members_rbac_select" ON circle_members
    FOR SELECT USING (
        -- Allow users to see their own memberships (this is what dashboard needs)
        user_id = auth.uid() OR
        -- Allow circle creators to see all members (direct check, no recursion)
        circle_id IN (
            SELECT id FROM circles 
            WHERE created_by = auth.uid()
        )
    );

-- Also simplify the circles policy to avoid any potential recursion
DROP POLICY IF EXISTS "circles_rbac_select" ON circles;

CREATE POLICY "circles_rbac_select" ON circles
    FOR SELECT USING (
        -- Allow if circle is public
        privacy = 'public' OR 
        -- Allow if user created the circle
        created_by = auth.uid() OR
        -- Allow if user is a member (simple existence check)
        id IN (
            SELECT circle_id FROM circle_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );