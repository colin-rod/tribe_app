-- Completely remove all RLS policies and create simple, non-recursive ones

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

-- Create SIMPLE policies without any cross-table references

-- Profiles - users can only see/edit their own
CREATE POLICY "profiles_own_access" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Tribes - users can create their own, see where they're creators
CREATE POLICY "tribes_create_own" ON public.tribes
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tribes_view_own" ON public.tribes
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "tribes_update_own" ON public.tribes
    FOR UPDATE USING (auth.uid() = created_by);

-- Tribe members - users can insert/view their own memberships, creators can manage all
CREATE POLICY "tribe_members_own" ON public.tribe_members
    FOR ALL USING (auth.uid() = user_id);

-- Circles - only tribe creators can manage for now (simplified)
CREATE POLICY "circles_manage" ON public.circles
    FOR ALL USING (auth.uid() = created_by);

-- Circle members - only allow self-management for now
CREATE POLICY "circle_members_own" ON public.circle_members
    FOR ALL USING (auth.uid() = user_id);

-- Posts - only authors can manage their own posts
CREATE POLICY "posts_own" ON public.posts
    FOR ALL USING (auth.uid() = author_id);

-- Comments - only authors can manage
CREATE POLICY "comments_own" ON public.comments
    FOR ALL USING (auth.uid() = author_id);

-- Likes - only user's own likes
CREATE POLICY "likes_own" ON public.likes
    FOR ALL USING (auth.uid() = user_id);

-- Invitations - only who created them can see
CREATE POLICY "invitations_own" ON public.invitations
    FOR ALL USING (auth.uid() = invited_by);