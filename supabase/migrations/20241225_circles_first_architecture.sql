-- Redesign to Circles-First Architecture
-- This migration transforms the app from tribe-centric to circle-centric

-- First, drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "tribes_insert" ON public.tribes;
DROP POLICY IF EXISTS "tribes_select_as_creator" ON public.tribes;
DROP POLICY IF EXISTS "tribes_update_as_creator" ON public.tribes;
DROP POLICY IF EXISTS "tribe_members_insert_own" ON public.tribe_members;
DROP POLICY IF EXISTS "tribe_members_select_own" ON public.tribe_members;
DROP POLICY IF EXISTS "tribe_members_manage_as_creator" ON public.tribe_members;
DROP POLICY IF EXISTS "tribe_members_select_same_tribe" ON public.tribe_members;
DROP POLICY IF EXISTS "circles_insert" ON public.circles;
DROP POLICY IF EXISTS "circles_select" ON public.circles;
DROP POLICY IF EXISTS "circles_update_delete" ON public.circles;
DROP POLICY IF EXISTS "circle_members_insert" ON public.circle_members;
DROP POLICY IF EXISTS "circle_members_select_own" ON public.circle_members;
DROP POLICY IF EXISTS "circle_members_manage_as_tribe_creator" ON public.circle_members;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_select" ON public.posts;
DROP POLICY IF EXISTS "posts_update_delete_own" ON public.posts;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_update_delete_own" ON public.comments;
DROP POLICY IF EXISTS "likes_insert" ON public.likes;
DROP POLICY IF EXISTS "likes_select" ON public.likes;
DROP POLICY IF EXISTS "likes_delete_own" ON public.likes;
DROP POLICY IF EXISTS "invitations_insert" ON public.invitations;
DROP POLICY IF EXISTS "invitations_select" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update" ON public.invitations;

-- Add new types for circles-first architecture
CREATE TYPE circle_type AS ENUM ('family', 'community', 'topic', 'local');
CREATE TYPE circle_privacy AS ENUM ('private', 'public', 'invite_only');
CREATE TYPE join_method AS ENUM ('invited', 'requested', 'auto_approved', 'admin_added');

-- Update circles table for circles-first architecture
ALTER TABLE public.circles 
  DROP CONSTRAINT IF EXISTS circles_tribe_id_fkey,
  ALTER COLUMN tribe_id DROP NOT NULL,
  ADD COLUMN type circle_type DEFAULT 'family',
  ADD COLUMN privacy circle_privacy DEFAULT 'private',
  ADD COLUMN category TEXT,
  ADD COLUMN location TEXT,
  ADD COLUMN member_count INTEGER DEFAULT 0,
  ADD COLUMN is_discoverable BOOLEAN DEFAULT false,
  ADD COLUMN auto_approve_members BOOLEAN DEFAULT false;

-- Update circle_members table with enhanced membership info
ALTER TABLE public.circle_members
  ADD COLUMN join_method join_method DEFAULT 'invited',
  ADD COLUMN joined_via UUID REFERENCES public.profiles(id), -- who invited/approved them
  ADD COLUMN status TEXT DEFAULT 'active',
  ADD COLUMN requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update tribes table to be optional (keep for family organization)
ALTER TABLE public.tribes
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN settings JSONB DEFAULT '{}';

-- Create new table for circle categories and tags
CREATE TABLE public.circle_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.circle_categories (name, description, icon) VALUES
    ('parenting', 'General parenting discussions and advice', '👶'),
    ('pregnancy', 'Pregnancy journey and expecting parents', '🤱'),
    ('local', 'Local community groups and meetups', '📍'),
    ('age_group', 'Age-specific parenting (newborn, toddler, etc.)', '🎂'),
    ('activities', 'Family activities and outings', '🎨'),
    ('health', 'Health, wellness, and medical discussions', '🏥'),
    ('education', 'School, learning, and educational resources', '📚'),
    ('family', 'Private family circles', '👨‍👩‍👧‍👦');

-- Create circle invitations table (separate from tribe invitations)
CREATE TABLE public.circle_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role user_role DEFAULT 'member' NOT NULL,
    status invitation_status DEFAULT 'pending' NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    message TEXT
);

-- Add indexes for performance
CREATE INDEX idx_circles_type ON public.circles(type);
CREATE INDEX idx_circles_privacy ON public.circles(privacy);
CREATE INDEX idx_circles_category ON public.circles(category);
CREATE INDEX idx_circles_discoverable ON public.circles(is_discoverable);
CREATE INDEX idx_circle_members_status ON public.circle_members(status);
CREATE INDEX idx_circle_members_join_method ON public.circle_members(join_method);
CREATE INDEX idx_circle_invitations_token ON public.circle_invitations(token);
CREATE INDEX idx_circle_invitations_email ON public.circle_invitations(email);

-- Function to update circle member count
CREATE OR REPLACE FUNCTION update_circle_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.circles 
        SET member_count = member_count + 1 
        WHERE id = NEW.circle_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.circles 
        SET member_count = member_count - 1 
        WHERE id = OLD.circle_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update member count
CREATE TRIGGER trigger_update_circle_member_count
    AFTER INSERT OR DELETE ON public.circle_members
    FOR EACH ROW EXECUTE FUNCTION update_circle_member_count();

-- NEW CIRCLE-FIRST RLS POLICIES

-- Profiles policies (unchanged)
CREATE POLICY "profiles_own_access" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Circles policies - circle-centric approach
CREATE POLICY "circles_public_select" ON public.circles
    FOR SELECT USING (
        privacy = 'public' OR 
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.circle_members cm 
            WHERE cm.circle_id = circles.id 
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        )
    );

CREATE POLICY "circles_create" ON public.circles
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "circles_update_own" ON public.circles
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.circle_members cm 
            WHERE cm.circle_id = circles.id 
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
            AND cm.status = 'active'
        )
    );

CREATE POLICY "circles_delete_own" ON public.circles
    FOR DELETE USING (auth.uid() = created_by);

-- Circle members policies
CREATE POLICY "circle_members_view" ON public.circle_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.circles c 
            WHERE c.id = circle_members.circle_id 
            AND (
                c.created_by = auth.uid() OR
                c.privacy = 'public' OR
                EXISTS (
                    SELECT 1 FROM public.circle_members cm2 
                    WHERE cm2.circle_id = c.id 
                    AND cm2.user_id = auth.uid()
                    AND cm2.status = 'active'
                )
            )
        )
    );

CREATE POLICY "circle_members_join" ON public.circle_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND (
            -- Can join public circles directly
            EXISTS (
                SELECT 1 FROM public.circles c 
                WHERE c.id = circle_members.circle_id 
                AND c.privacy = 'public' 
                AND c.auto_approve_members = true
            ) OR
            -- Circle creators can add anyone
            EXISTS (
                SELECT 1 FROM public.circles c 
                WHERE c.id = circle_members.circle_id 
                AND c.created_by = auth.uid()
            ) OR
            -- Admins can add members
            EXISTS (
                SELECT 1 FROM public.circle_members cm 
                WHERE cm.circle_id = circle_members.circle_id 
                AND cm.user_id = auth.uid()
                AND cm.role = 'admin'
                AND cm.status = 'active'
            )
        )
    );

CREATE POLICY "circle_members_update_own" ON public.circle_members
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.circles c 
            WHERE c.id = circle_members.circle_id 
            AND c.created_by = auth.uid()
        )
    );

CREATE POLICY "circle_members_leave" ON public.circle_members
    FOR DELETE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.circles c 
            WHERE c.id = circle_members.circle_id 
            AND c.created_by = auth.uid()
        )
    );

-- Posts policies - purely circle-based
CREATE POLICY "posts_view_by_circle" ON public.posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.circle_members cm 
            WHERE cm.circle_id = posts.circle_id 
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        ) OR
        EXISTS (
            SELECT 1 FROM public.circles c 
            WHERE c.id = posts.circle_id 
            AND c.privacy = 'public'
        )
    );

CREATE POLICY "posts_create_in_circles" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.circle_members cm 
            WHERE cm.circle_id = posts.circle_id 
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND cm.role IN ('admin', 'member')
        )
    );

CREATE POLICY "posts_update_own" ON public.posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "posts_delete_own" ON public.posts
    FOR DELETE USING (
        auth.uid() = author_id OR
        EXISTS (
            SELECT 1 FROM public.circle_members cm 
            WHERE cm.circle_id = posts.circle_id 
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
            AND cm.status = 'active'
        )
    );

-- Comments policies
CREATE POLICY "comments_view_by_post_access" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = comments.post_id 
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        ) OR
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circles c ON p.circle_id = c.id
            WHERE p.id = comments.post_id 
            AND c.privacy = 'public'
        )
    );

CREATE POLICY "comments_create_with_post_access" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = comments.post_id 
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        )
    );

CREATE POLICY "comments_update_own" ON public.comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "comments_delete_own" ON public.comments
    FOR DELETE USING (
        auth.uid() = author_id OR
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = comments.post_id 
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
            AND cm.status = 'active'
        )
    );

-- Likes policies
CREATE POLICY "likes_view_by_post_access" ON public.likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = likes.post_id 
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        ) OR
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circles c ON p.circle_id = c.id
            WHERE p.id = likes.post_id 
            AND c.privacy = 'public'
        )
    );

CREATE POLICY "likes_create_with_post_access" ON public.likes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE p.id = likes.post_id 
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        )
    );

CREATE POLICY "likes_delete_own" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- Circle invitations policies
CREATE POLICY "circle_invitations_manage" ON public.circle_invitations
    FOR ALL USING (
        auth.uid() = invited_by OR
        EXISTS (
            SELECT 1 FROM public.circles c 
            WHERE c.id = circle_invitations.circle_id 
            AND c.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.circle_members cm 
            WHERE cm.circle_id = circle_invitations.circle_id 
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
            AND cm.status = 'active'
        )
    );

-- Categories policies (read-only for all authenticated users)
CREATE POLICY "circle_categories_view_all" ON public.circle_categories
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Keep existing tribe-related policies for backward compatibility but make them optional
CREATE POLICY "tribes_optional_select" ON public.tribes
    FOR SELECT USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.tribe_members tm 
            WHERE tm.tribe_id = tribes.id 
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "tribes_create_optional" ON public.tribes
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tribes_update_own" ON public.tribes
    FOR UPDATE USING (auth.uid() = created_by);

-- Tribe members policies (now optional)
CREATE POLICY "tribe_members_manage" ON public.tribe_members
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = tribe_members.tribe_id 
            AND t.created_by = auth.uid()
        )
    );

-- Original tribe invitations (keep for family organization)
CREATE POLICY "invitations_manage_tribe" ON public.invitations
    FOR ALL USING (
        auth.uid() = invited_by OR
        EXISTS (
            SELECT 1 FROM public.tribes t 
            WHERE t.id = invitations.tribe_id 
            AND t.created_by = auth.uid()
        )
    );