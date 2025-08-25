-- Ultra-simple RLS policies with zero cross-table references

-- Drop all existing policies
DROP POLICY IF EXISTS "circle_members_rbac_select" ON circle_members;
DROP POLICY IF EXISTS "circle_members_simple_select" ON circle_members;
DROP POLICY IF EXISTS "circles_rbac_select" ON circles;
DROP POLICY IF EXISTS "circles_simple_select" ON circles;
DROP POLICY IF EXISTS "circles_member_access" ON circles;

-- Circle members: Absolute simplest policy
CREATE POLICY "circle_members_own_only" ON circle_members
    FOR SELECT USING (user_id = auth.uid());

-- Circles: Allow creators and public circles only (no member checks)
CREATE POLICY "circles_owner_and_public" ON circles
    FOR SELECT USING (
        created_by = auth.uid() OR 
        privacy = 'public'
    );