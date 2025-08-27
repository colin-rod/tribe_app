-- Complete Database Setup Migration
-- This creates all missing tables and sets up the database properly

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    first_name text,
    last_name text,
    bio text,
    avatar_url text,
    location text,
    website text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    is_active boolean DEFAULT true NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Create trees table (previously called circles)
CREATE TABLE IF NOT EXISTS public.trees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    member_count integer DEFAULT 1 NOT NULL
);

-- 4. Create tree_members table
CREATE TABLE IF NOT EXISTS public.tree_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tree_id uuid REFERENCES public.trees(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'member' NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'invited', 'banned')),
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(tree_id, user_id)
);

-- 5. Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tree_id uuid REFERENCES public.trees(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#3B82F6',
    privacy_level text DEFAULT 'tree' NOT NULL CHECK (privacy_level IN ('public', 'tree', 'branch')),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    member_count integer DEFAULT 0 NOT NULL
);

-- 6. Create branch_members table
CREATE TABLE IF NOT EXISTS public.branch_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'member' NOT NULL CHECK (role IN ('admin', 'member')),
    status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'invited', 'banned')),
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(branch_id, user_id)
);

-- 7. Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tree_id uuid REFERENCES public.trees(id) ON DELETE CASCADE NOT NULL,
    branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    images text[],
    like_count integer DEFAULT 0 NOT NULL,
    comment_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 9. Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, comment_id),
    CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL)),
    CHECK (NOT (post_id IS NOT NULL AND comment_id IS NOT NULL))
);

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tree_members_user_id ON public.tree_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tree_members_tree_id ON public.tree_members(tree_id);
CREATE INDEX IF NOT EXISTS idx_branch_members_user_id ON public.branch_members(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_members_branch_id ON public.branch_members(branch_id);
CREATE INDEX IF NOT EXISTS idx_posts_tree_id ON public.posts(tree_id);
CREATE INDEX IF NOT EXISTS idx_posts_branch_id ON public.posts(branch_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON public.likes(comment_id);

-- 11. Create or replace the profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'last_name',
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create subscription record
    INSERT INTO public.subscriptions (user_id, plan, is_active, created_at, updated_at)
    VALUES (
        new.id,
        'free',
        true,
        now(),
        now()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 12. Create profiles and subscriptions for existing users
INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.email, '@', 1)) as first_name,
    au.raw_user_meta_data->>'last_name' as last_name,
    au.created_at,
    now()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan, is_active, created_at, updated_at)
SELECT 
    au.id,
    'free',
    true,
    now(),
    now()
FROM auth.users au
LEFT JOIN public.subscriptions s ON au.id = s.user_id
WHERE s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 13. Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies
-- Profiles: Users can see all profiles, update their own
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Subscriptions: Users can see their own subscription
DROP POLICY IF EXISTS "subscriptions_own_only" ON public.subscriptions;

CREATE POLICY "subscriptions_own_only" ON public.subscriptions
    FOR ALL USING (user_id = auth.uid());

-- Tree members: Users can see their own memberships and memberships in trees they belong to
DROP POLICY IF EXISTS "tree_members_select_own" ON public.tree_members;

CREATE POLICY "tree_members_select_own" ON public.tree_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM tree_members tm2 
            WHERE tm2.tree_id = tree_members.tree_id 
            AND tm2.user_id = auth.uid()
            AND tm2.status = 'active'
        )
    );

-- Trees: Users can see trees they're members of
DROP POLICY IF EXISTS "trees_select_member" ON public.trees;

CREATE POLICY "trees_select_member" ON public.trees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tree_members 
            WHERE tree_id = trees.id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Branch members: Users can see their own memberships
DROP POLICY IF EXISTS "branch_members_select_own" ON public.branch_members;

CREATE POLICY "branch_members_select_own" ON public.branch_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM tree_members tm
            JOIN branches b ON b.tree_id = tm.tree_id
            WHERE b.id = branch_members.branch_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
    );

-- Branches: Users can see branches they're members of or in trees they belong to
DROP POLICY IF EXISTS "branches_select_member" ON public.branches;

CREATE POLICY "branches_select_member" ON public.branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM branch_members 
            WHERE branch_id = branches.id 
            AND user_id = auth.uid()
            AND status = 'active'
        ) OR
        EXISTS (
            SELECT 1 FROM tree_members 
            WHERE tree_id = branches.tree_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Posts: Users can see posts in trees/branches they have access to
DROP POLICY IF EXISTS "posts_select_access" ON public.posts;

CREATE POLICY "posts_select_access" ON public.posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tree_members 
            WHERE tree_id = posts.tree_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Comments: Users can see comments on posts they can see
DROP POLICY IF EXISTS "comments_select_access" ON public.comments;

CREATE POLICY "comments_select_access" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts p
            JOIN tree_members tm ON tm.tree_id = p.tree_id
            WHERE p.id = comments.post_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
    );

-- Likes: Users can see their own likes and likes on posts they can see
DROP POLICY IF EXISTS "likes_select_access" ON public.likes;

CREATE POLICY "likes_select_access" ON public.likes
    FOR SELECT USING (
        user_id = auth.uid() OR
        (post_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM posts p
            JOIN tree_members tm ON tm.tree_id = p.tree_id
            WHERE p.id = likes.post_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'active'
        )) OR
        (comment_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM comments c
            JOIN posts p ON p.id = c.post_id
            JOIN tree_members tm ON tm.tree_id = p.tree_id
            WHERE c.id = likes.comment_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'active'
        ))
    );

-- 15. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Complete database setup completed successfully!';
    RAISE NOTICE '- Created all required tables with proper schema';
    RAISE NOTICE '- Created profile and subscription triggers';
    RAISE NOTICE '- Created profiles and subscriptions for existing users';
    RAISE NOTICE '- Enabled RLS on all tables';
    RAISE NOTICE '- Created comprehensive RLS policies';
    RAISE NOTICE 'The dashboard should now work properly!';
END $$;