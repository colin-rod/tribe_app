-- Fix dashboard queries by updating circle_members and related policies

-- Fix circle_members select policy to allow users to see their own memberships
DROP POLICY IF EXISTS "circle_members_rbac_select" ON circle_members;

CREATE POLICY "circle_members_rbac_select" ON circle_members
    FOR SELECT USING (
        -- Allow users to see their own memberships
        user_id = auth.uid() OR
        -- Allow circle creators to see all members
        EXISTS (
            SELECT 1 FROM circles c 
            WHERE c.id = circle_members.circle_id 
            AND c.created_by = auth.uid()
        ) OR
        -- Allow members of the same circle to see each other
        EXISTS (
            SELECT 1 FROM circle_members cm 
            WHERE cm.circle_id = circle_members.circle_id 
            AND cm.user_id = auth.uid() 
            AND cm.status = 'active'
        )
    );

-- Also fix circle_members insert policy to allow joining circles
DROP POLICY IF EXISTS "circle_members_rbac_insert" ON circle_members;

CREATE POLICY "circle_members_rbac_insert" ON circle_members
    FOR INSERT WITH CHECK (
        -- Allow users to add themselves
        user_id = auth.uid() OR
        -- Allow circle creators to add members
        EXISTS (
            SELECT 1 FROM circles c 
            WHERE c.id = circle_id 
            AND c.created_by = auth.uid()
        )
    );

-- Fix profiles policy to allow viewing profiles of circle members
DROP POLICY IF EXISTS "profiles_rbac_select" ON profiles;

CREATE POLICY "profiles_rbac_select" ON profiles
    FOR SELECT USING (
        -- Allow users to see their own profile
        id = auth.uid() OR
        -- Allow seeing profiles of users in same circles
        EXISTS (
            SELECT 1 FROM circle_members cm1
            JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
            WHERE cm1.user_id = auth.uid() 
            AND cm2.user_id = profiles.id
            AND cm1.status = 'active' 
            AND cm2.status = 'active'
        )
    );