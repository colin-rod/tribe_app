-- Minimal Database Fixes - Only for existing tables
-- Run this in your Supabase SQL Editor

-- 1. Create subscriptions table if it doesn't exist (this is causing the main error)
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

-- 2. Create missing profile trigger (if it doesn't exist)
-- This automatically creates a profile when a user signs up
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
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
    
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

-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Create profiles and subscriptions for existing users who don't have them
-- This fixes the most common issue where users can't access the dashboard
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

-- Create subscriptions for existing users
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

-- 4. Check if tables exist before enabling RLS
DO $$ 
BEGIN
    -- Enable RLS on profiles (this should exist)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on other tables only if they exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trees') THEN
        ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tree_members') THEN
        ALTER TABLE public.tree_members ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
        ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branch_members') THEN
        ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
        ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'likes') THEN
        ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on subscriptions (we just created this)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 5. Create basic RLS policies only for existing tables
-- Profiles: Users can see all profiles, update their own
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

        -- Create new policies
        CREATE POLICY "profiles_select_all" ON public.profiles
            FOR SELECT USING (auth.uid() IS NOT NULL);

        CREATE POLICY "profiles_update_own" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);

        CREATE POLICY "profiles_insert_own" ON public.profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Tree members: Users can see their own memberships
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tree_members') THEN
        DROP POLICY IF EXISTS "tree_members_select_own" ON public.tree_members;
        
        CREATE POLICY "tree_members_select_own" ON public.tree_members
            FOR SELECT USING (
                user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM tree_members tm2 
                    WHERE tm2.tree_id = tree_members.tree_id 
                    AND tm2.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Branch members: Users can see their own memberships
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branch_members') THEN
        DROP POLICY IF EXISTS "branch_members_select_own" ON public.branch_members;
        
        CREATE POLICY "branch_members_select_own" ON public.branch_members
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

-- Trees: Users can see trees they're members of
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trees') 
        AND EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tree_members') THEN
        
        DROP POLICY IF EXISTS "trees_select_member" ON public.trees;
        
        CREATE POLICY "trees_select_member" ON public.trees
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM tree_members 
                    WHERE tree_id = trees.id AND user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Branches: Users can see branches they're members of
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') 
        AND EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branch_members') THEN
        
        DROP POLICY IF EXISTS "branches_select_member" ON public.branches;
        
        CREATE POLICY "branches_select_member" ON public.branches
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM branch_members 
                    WHERE branch_id = branches.id AND user_id = auth.uid()
                ) OR
                (EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tree_members')
                 AND EXISTS (
                    SELECT 1 FROM tree_members 
                    WHERE tree_id = branches.tree_id AND user_id = auth.uid()
                ))
            );
    END IF;
END $$;

-- Subscriptions: Users can see their own subscription
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        DROP POLICY IF EXISTS "subscriptions_own_only" ON public.subscriptions;
        
        CREATE POLICY "subscriptions_own_only" ON public.subscriptions
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Minimal database fixes completed successfully!';
    RAISE NOTICE '- Created subscriptions table';
    RAISE NOTICE '- Created profile trigger for new users';
    RAISE NOTICE '- Created profiles and subscriptions for existing users';  
    RAISE NOTICE '- Enabled RLS on existing tables only';
    RAISE NOTICE '- Created basic RLS policies for existing tables only';
    RAISE NOTICE 'Try logging in again - the dashboard should now work!';
    RAISE NOTICE 'Note: Some features may not work until all tables are created';
END $$;