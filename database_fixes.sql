-- Database Fixes for Common Login/Dashboard Issues
-- Run this in your Supabase SQL Editor to fix common problems

-- 1. Create missing profile trigger (if it doesn't exist)
-- This automatically creates a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Create profiles for existing users who don't have them
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

-- 3. Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 4. Create basic RLS policies if they don't exist
-- These are permissive policies to get basic functionality working

-- Profiles: Users can see all profiles, update their own
DO $$ 
BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN 
        -- Policies already exist, skip
        NULL;
END $$;

-- Tree members: Users can see their own memberships
DO $$ 
BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Branch members: Users can see their own memberships
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "branch_members_select_own" ON public.branch_members;
    
    CREATE POLICY "branch_members_select_own" ON public.branch_members
        FOR SELECT USING (user_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Trees: Users can see trees they're members of
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "trees_select_member" ON public.trees;
    
    CREATE POLICY "trees_select_member" ON public.trees
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM tree_members 
                WHERE tree_id = trees.id AND user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Branches: Users can see branches they're members of
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "branches_select_member" ON public.branches;
    
    CREATE POLICY "branches_select_member" ON public.branches
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM branch_members 
                WHERE branch_id = branches.id AND user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM tree_members 
                WHERE tree_id = branches.tree_id AND user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Subscriptions: Users can see their own subscription
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "subscriptions_own_only" ON public.subscriptions;
    
    CREATE POLICY "subscriptions_own_only" ON public.subscriptions
        FOR ALL USING (user_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. Create default subscriptions for existing users (optional)
-- This ensures all users have a subscription record
INSERT INTO public.subscriptions (user_id, plan, is_active, created_at, updated_at)
SELECT 
    id as user_id,
    'free' as plan,
    false as is_active,
    now() as created_at,
    now() as updated_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 6. Update member counts for branches
UPDATE public.branches 
SET member_count = (
    SELECT COUNT(*) 
    FROM public.branch_members 
    WHERE branch_id = branches.id AND status = 'active'
);

-- 7. Grant necessary permissions
-- Make sure the authenticated role can access the tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Database fixes completed successfully!';
    RAISE NOTICE '- Created profile trigger for new users';
    RAISE NOTICE '- Created profiles for existing users without profiles';  
    RAISE NOTICE '- Enabled RLS on all tables';
    RAISE NOTICE '- Created basic RLS policies';
    RAISE NOTICE '- Created default subscriptions';
    RAISE NOTICE '- Updated branch member counts';
    RAISE NOTICE 'Try logging in again - the dashboard should now work!';
END $$;