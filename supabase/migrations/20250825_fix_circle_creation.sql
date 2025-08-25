-- Fix circle creation RLS policy to allow users to create circles

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "circles_rbac_insert" ON circles;

-- Create a new insert policy that allows authenticated users to create circles
CREATE POLICY "circles_rbac_insert" ON circles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND created_by = auth.uid()
    );

-- Also ensure the select policy allows users to see circles they created
-- (this might be needed for the redirect after creation)
DROP POLICY IF EXISTS "circles_rbac_select" ON circles;

CREATE POLICY "circles_rbac_select" ON circles
    FOR SELECT USING (
        -- Allow if circle is public
        privacy = 'public' OR 
        -- Allow if user created the circle
        created_by = auth.uid() OR
        -- Allow if user is a member (check circle_members table)
        EXISTS (
            SELECT 1 FROM circle_members cm 
            WHERE cm.circle_id = circles.id 
            AND cm.user_id = auth.uid() 
            AND cm.status = 'active'
        )
    );