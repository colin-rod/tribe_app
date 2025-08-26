-- Fix posts RLS policy to allow post creation

-- Drop the restrictive RBAC post policy
DROP POLICY IF EXISTS "posts_rbac_insert" ON posts;

-- Create a simpler posts insert policy that allows post creation
CREATE POLICY "posts_simple_insert" ON posts
    FOR INSERT WITH CHECK (
        -- User can insert if they are the author
        author_id = auth.uid() AND
        -- And they are a member of the circle
        EXISTS (
            SELECT 1 FROM circle_members 
            WHERE circle_id = posts.circle_id 
            AND user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Also ensure posts can be selected properly
DROP POLICY IF EXISTS "posts_rbac_select" ON posts;

CREATE POLICY "posts_simple_select" ON posts
    FOR SELECT USING (
        -- User can see posts if they are a member of the circle
        EXISTS (
            SELECT 1 FROM circle_members 
            WHERE circle_id = posts.circle_id 
            AND user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Also ensure posts can be updated and deleted by authors
DROP POLICY IF EXISTS "posts_rbac_update" ON posts;
DROP POLICY IF EXISTS "posts_rbac_delete" ON posts;

CREATE POLICY "posts_simple_update" ON posts
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "posts_simple_delete" ON posts
    FOR DELETE USING (author_id = auth.uid());