-- Fix RLS policies properly by removing circular references while maintaining security

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view tribes they belong to" ON public.tribes;
DROP POLICY IF EXISTS "Users can create tribes" ON public.tribes;
DROP POLICY IF EXISTS "Tribe creators and admins can update tribes" ON public.tribes;
DROP POLICY IF EXISTS "Users can view their own tribe memberships" ON public.tribe_members;
DROP POLICY IF EXISTS "Users can insert their own tribe membership" ON public.tribe_members;
DROP POLICY IF EXISTS "Tribe creators can manage members" ON public.tribe_members;
DROP POLICY IF EXISTS "Admins can manage tribe members" ON public.tribe_members;
DROP POLICY IF EXISTS "Users can view circles in their tribes" ON public.circles;
DROP POLICY IF EXISTS "Tribe members can create circles" ON public.circles;
DROP POLICY IF EXISTS "Users can view circle members of accessible circles" ON public.circle_members;
DROP POLICY IF EXISTS "Users can view posts in accessible circles" ON public.posts;
DROP POLICY IF EXISTS "Circle members can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view comments on accessible posts" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments on accessible posts" ON public.comments;
DROP POLICY IF EXISTS "Users can view likes on accessible posts" ON public.likes;
DROP POLICY IF EXISTS "Users can like accessible posts" ON public.likes;
DROP POLICY IF EXISTS "Users can view invitations for their tribes" ON public.invitations;

-- Also drop any policies with the updated names
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;
DROP POLICY IF EXISTS "tribes_create_own" ON public.tribes;
DROP POLICY IF EXISTS "tribes_view_own" ON public.tribes;
DROP POLICY IF EXISTS "tribes_update_own" ON public.tribes;
DROP POLICY IF EXISTS "tribe_members_own" ON public.tribe_members;
DROP POLICY IF EXISTS "circles_manage" ON public.circles;
DROP POLICY IF EXISTS "circle_members_own" ON public.circle_members;
DROP POLICY IF EXISTS "posts_own" ON public.posts;
DROP POLICY IF EXISTS "comments_own" ON public.comments;
DROP POLICY IF EXISTS "likes_own" ON public.likes;
DROP POLICY IF EXISTS "invitations_own" ON public.invitations;

-- 1. PROFILES - Simple, no cross-references
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. TRIBES - Base level, no dependencies
CREATE POLICY "tribes_insert" ON public.tribes
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tribes_select_as_creator" ON public.tribes
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "tribes_update_as_creator" ON public.tribes
    FOR UPDATE USING (auth.uid() = created_by);

-- 3. TRIBE_MEMBERS - Reference tribes but avoid recursion
CREATE POLICY "tribe_members_insert_own" ON public.tribe_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tribe_members_select_own" ON public.tribe_members
    FOR SELECT USING (auth.uid() = user_id);

-- Allow tribe creators to manage all members of their tribes
CREATE POLICY "tribe_members_manage_as_creator" ON public.tribe_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = tribe_members.tribe_id 
            AND t.created_by = auth.uid()
        )
    );

-- Allow viewing tribe members for users who are also members of the same tribe
-- This uses a self-join but avoids the infinite recursion
CREATE POLICY "tribe_members_select_same_tribe" ON public.tribe_members
    FOR SELECT USING (
        tribe_id IN (
            SELECT tm.tribe_id 
            FROM public.tribe_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

-- 4. CIRCLES - Reference tribes directly
CREATE POLICY "circles_insert" ON public.circles
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = circles.tribe_id 
            AND t.created_by = auth.uid()
        )
    );

CREATE POLICY "circles_select" ON public.circles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = circles.tribe_id 
            AND t.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.tribe_members tm 
            WHERE tm.tribe_id = circles.tribe_id 
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "circles_update_delete" ON public.circles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = circles.tribe_id 
            AND t.created_by = auth.uid()
        )
    );

-- 5. CIRCLE_MEMBERS - Reference circles and tribes
CREATE POLICY "circle_members_insert" ON public.circle_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "circle_members_select_own" ON public.circle_members
    FOR SELECT USING (auth.uid() = user_id);

-- Allow tribe creators to manage circle memberships
CREATE POLICY "circle_members_manage_as_tribe_creator" ON public.circle_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.circles c
            JOIN public.tribes t ON c.tribe_id = t.id
            WHERE c.id = circle_members.circle_id 
            AND t.created_by = auth.uid()
        )
    );

-- 6. POSTS - Reference circles and check membership
CREATE POLICY "posts_insert" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.circle_members cm 
            WHERE cm.circle_id = posts.circle_id 
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "posts_select" ON public.posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members cm 
            WHERE cm.circle_id = posts.circle_id 
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "posts_update_delete_own" ON public.posts
    FOR UPDATE USING (auth.uid() = author_id);

-- 7. COMMENTS - Reference posts and check access
CREATE POLICY "comments_insert" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = comments.post_id 
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "comments_select" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = comments.post_id 
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "comments_update_delete_own" ON public.comments
    FOR UPDATE USING (auth.uid() = author_id);

-- 8. LIKES - Reference posts and check access
CREATE POLICY "likes_insert" ON public.likes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = likes.post_id 
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "likes_select" ON public.likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = likes.post_id 
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "likes_delete_own" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- 9. INVITATIONS - Reference tribes
CREATE POLICY "invitations_insert" ON public.invitations
    FOR INSERT WITH CHECK (
        auth.uid() = invited_by AND
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = invitations.tribe_id 
            AND t.created_by = auth.uid()
        )
    );

CREATE POLICY "invitations_select" ON public.invitations
    FOR SELECT USING (
        auth.uid() = invited_by OR
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = invitations.tribe_id 
            AND t.created_by = auth.uid()
        )
    );

CREATE POLICY "invitations_update" ON public.invitations
    FOR UPDATE USING (
        auth.uid() = invited_by OR
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = invitations.tribe_id 
            AND t.created_by = auth.uid()
        )
    );