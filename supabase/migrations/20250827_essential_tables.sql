-- Essential Tree App Migration
-- This sets up the core tables needed for the dashboard to work

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'caregiver', 'member');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE circle_privacy AS ENUM ('public', 'private', 'tree_only');
CREATE TYPE circle_type AS ENUM ('family', 'community');
CREATE TYPE join_method AS ENUM ('invited', 'requested', 'direct');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    first_name text,
    last_name text,
    avatar_url text,
    bio text,
    family_role text CHECK (family_role = ANY (ARRAY['parent'::text, 'child'::text, 'grandparent'::text, 'grandchild'::text, 'sibling'::text, 'spouse'::text, 'partner'::text, 'other'::text])),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create trees table (family households)
CREATE TABLE public.trees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create tree_members table
CREATE TABLE public.tree_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    joined_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tree_id, user_id)
);

-- Create branches table (sharing groups within trees)
CREATE TABLE public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    color text DEFAULT '#3B82F6',
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type circle_type DEFAULT 'family',
    privacy circle_privacy DEFAULT 'private',
    member_count integer DEFAULT 0,
    is_discoverable boolean DEFAULT false,
    auto_approve_members boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create branch_members table
CREATE TABLE public.branch_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    status text DEFAULT 'active',
    join_method join_method DEFAULT 'invited',
    joined_via uuid REFERENCES public.profiles(id),
    added_at timestamptz NOT NULL DEFAULT now(),
    requested_at timestamptz,
    approved_at timestamptz DEFAULT now(),
    UNIQUE(branch_id, user_id)
);

-- Create posts table
CREATE TABLE public.posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text,
    media_urls text[],
    milestone_type text,
    milestone_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create likes table
CREATE TABLE public.likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Create subscriptions table for billing
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    plan text NOT NULL DEFAULT 'free',
    is_active boolean DEFAULT false,
    stripe_customer_id text UNIQUE,
    stripe_subscription_id text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create invitations table
CREATE TABLE public.invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email text NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    status invitation_status NOT NULL DEFAULT 'pending',
    token text NOT NULL DEFAULT gen_random_uuid()::text UNIQUE,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz
);

-- Create branch_invitations table
CREATE TABLE public.branch_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email text NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    status invitation_status NOT NULL DEFAULT 'pending',
    token text NOT NULL DEFAULT gen_random_uuid()::text UNIQUE,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_invitations ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies

-- Profiles: Users can see all profiles, but only update their own
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trees: Users can see trees they're members of
CREATE POLICY "trees_select_member" ON public.trees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tree_members 
            WHERE tree_id = trees.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "trees_insert_own" ON public.trees
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trees_update_owner" ON public.trees
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tree_members 
            WHERE tree_id = trees.id AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Tree members: Users can see members of trees they belong to
CREATE POLICY "tree_members_select" ON public.tree_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM tree_members tm2 
            WHERE tm2.tree_id = tree_members.tree_id AND tm2.user_id = auth.uid()
        )
    );

CREATE POLICY "tree_members_insert" ON public.tree_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM trees 
            WHERE id = tree_id AND created_by = auth.uid()
        )
    );

-- Branches: Users can see branches in trees they're members of
CREATE POLICY "branches_select_member" ON public.branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tree_members 
            WHERE tree_id = branches.tree_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM branch_members 
            WHERE branch_id = branches.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "branches_insert" ON public.branches
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM tree_members 
            WHERE tree_id = branches.tree_id AND user_id = auth.uid()
        )
    );

-- Branch members: Users can see members of branches they belong to
CREATE POLICY "branch_members_select" ON public.branch_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM branch_members bm2 
            WHERE bm2.branch_id = branch_members.branch_id AND bm2.user_id = auth.uid()
        )
    );

CREATE POLICY "branch_members_insert" ON public.branch_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Posts: Users can see posts in branches they're members of
CREATE POLICY "posts_select_member" ON public.posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM branch_members 
            WHERE branch_id = posts.branch_id AND user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "posts_insert_member" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM branch_members 
            WHERE branch_id = posts.branch_id AND user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "posts_update_author" ON public.posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "posts_delete_author" ON public.posts
    FOR DELETE USING (auth.uid() = author_id);

-- Comments: Users can see comments on posts they can see
CREATE POLICY "comments_select_member" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts p
            JOIN branch_members bm ON p.branch_id = bm.branch_id
            WHERE p.id = comments.post_id AND bm.user_id = auth.uid() AND bm.status = 'active'
        )
    );

CREATE POLICY "comments_insert_member" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM posts p
            JOIN branch_members bm ON p.branch_id = bm.branch_id
            WHERE p.id = comments.post_id AND bm.user_id = auth.uid() AND bm.status = 'active'
        )
    );

-- Likes: Users can see likes on posts they can see
CREATE POLICY "likes_select_member" ON public.likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts p
            JOIN branch_members bm ON p.branch_id = bm.branch_id
            WHERE p.id = likes.post_id AND bm.user_id = auth.uid() AND bm.status = 'active'
        )
    );

CREATE POLICY "likes_insert_member" ON public.likes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM posts p
            JOIN branch_members bm ON p.branch_id = bm.branch_id
            WHERE p.id = likes.post_id AND bm.user_id = auth.uid() AND bm.status = 'active'
        )
    );

CREATE POLICY "likes_delete_own" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions: Users can only see their own subscription
CREATE POLICY "subscriptions_own_only" ON public.subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'last_name'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create a trigger to update branch member counts
CREATE OR REPLACE FUNCTION public.update_branch_member_count()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.branches 
        SET member_count = (
            SELECT COUNT(*) FROM public.branch_members 
            WHERE branch_id = NEW.branch_id AND status = 'active'
        )
        WHERE id = NEW.branch_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.branches 
        SET member_count = (
            SELECT COUNT(*) FROM public.branch_members 
            WHERE branch_id = OLD.branch_id AND status = 'active'
        )
        WHERE id = OLD.branch_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.branches 
        SET member_count = (
            SELECT COUNT(*) FROM public.branch_members 
            WHERE branch_id = NEW.branch_id AND status = 'active'
        )
        WHERE id = NEW.branch_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branch_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.branch_members
    FOR EACH ROW EXECUTE PROCEDURE public.update_branch_member_count();