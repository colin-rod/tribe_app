-- Simplify profiles policy to avoid complex joins that cause errors

DROP POLICY IF EXISTS "profiles_rbac_select" ON profiles;

-- Create a much simpler policy for profiles
CREATE POLICY "profiles_rbac_select" ON profiles
    FOR SELECT USING (
        -- Allow users to see their own profile
        id = auth.uid() OR
        -- Allow authenticated users to see basic profile info (needed for dashboard)
        -- We'll handle more granular permissions in application code
        auth.uid() IS NOT NULL
    );

-- Also ensure profiles can be updated by the owner
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());