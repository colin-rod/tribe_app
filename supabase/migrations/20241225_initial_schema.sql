-- Enable RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Users table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tribes table (family units)
CREATE TABLE public.tribes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tribe members (users belonging to tribes)
CREATE TABLE public.tribe_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tribe_id UUID REFERENCES public.tribes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role user_role DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(tribe_id, user_id)
);

-- Circles table (child/topic specific groups within tribes)
CREATE TABLE public.circles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tribe_id UUID REFERENCES public.tribes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6', -- Default blue color
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Circle members (which tribe members can access which circles)
CREATE TABLE public.circle_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role user_role DEFAULT 'member' NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(circle_id, user_id)
);

-- Posts table
CREATE TABLE public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    media_urls TEXT[], -- Array of media file URLs
    milestone_type TEXT, -- e.g., 'first_steps', 'first_word', 'birthday'
    milestone_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Comments table
CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Likes table
CREATE TABLE public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Invitations table
CREATE TABLE public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tribe_id UUID REFERENCES public.tribes(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role user_role DEFAULT 'member' NOT NULL,
    status invitation_status DEFAULT 'pending' NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_tribe_members_tribe_id ON public.tribe_members(tribe_id);
CREATE INDEX idx_tribe_members_user_id ON public.tribe_members(user_id);
CREATE INDEX idx_circles_tribe_id ON public.circles(tribe_id);
CREATE INDEX idx_circle_members_circle_id ON public.circle_members(circle_id);
CREATE INDEX idx_circle_members_user_id ON public.circle_members(user_id);
CREATE INDEX idx_posts_circle_id ON public.posts(circle_id);
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_likes_post_id ON public.likes(post_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribe_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Tribes policies
CREATE POLICY "Users can view tribes they belong to" ON public.tribes
    FOR SELECT USING (
        id IN (
            SELECT tribe_id FROM public.tribe_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create tribes" ON public.tribes
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tribe admins can update tribes" ON public.tribes
    FOR UPDATE USING (
        id IN (
            SELECT tribe_id FROM public.tribe_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Tribe members policies
CREATE POLICY "Users can view tribe members of their tribes" ON public.tribe_members
    FOR SELECT USING (
        tribe_id IN (
            SELECT tribe_id FROM public.tribe_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tribe admins can manage members" ON public.tribe_members
    FOR ALL USING (
        tribe_id IN (
            SELECT tribe_id FROM public.tribe_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Circles policies
CREATE POLICY "Users can view circles in their tribes" ON public.circles
    FOR SELECT USING (
        tribe_id IN (
            SELECT tribe_id FROM public.tribe_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tribe members can create circles" ON public.circles
    FOR INSERT WITH CHECK (
        tribe_id IN (
            SELECT tribe_id FROM public.tribe_members 
            WHERE user_id = auth.uid()
        )
        AND auth.uid() = created_by
    );

-- Circle members policies
CREATE POLICY "Users can view circle members of accessible circles" ON public.circle_members
    FOR SELECT USING (
        circle_id IN (
            SELECT c.id FROM public.circles c
            JOIN public.tribe_members tm ON c.tribe_id = tm.tribe_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- Posts policies
CREATE POLICY "Users can view posts in accessible circles" ON public.posts
    FOR SELECT USING (
        circle_id IN (
            SELECT cm.circle_id FROM public.circle_members cm
            WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Circle members can create posts" ON public.posts
    FOR INSERT WITH CHECK (
        circle_id IN (
            SELECT cm.circle_id FROM public.circle_members cm
            WHERE cm.user_id = auth.uid()
        )
        AND auth.uid() = author_id
    );

-- Comments policies
CREATE POLICY "Users can view comments on accessible posts" ON public.comments
    FOR SELECT USING (
        post_id IN (
            SELECT p.id FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comments on accessible posts" ON public.comments
    FOR INSERT WITH CHECK (
        post_id IN (
            SELECT p.id FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE cm.user_id = auth.uid()
        )
        AND auth.uid() = author_id
    );

-- Likes policies
CREATE POLICY "Users can view likes on accessible posts" ON public.likes
    FOR SELECT USING (
        post_id IN (
            SELECT p.id FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can like accessible posts" ON public.likes
    FOR INSERT WITH CHECK (
        post_id IN (
            SELECT p.id FROM public.posts p
            JOIN public.circle_members cm ON p.circle_id = cm.circle_id
            WHERE cm.user_id = auth.uid()
        )
        AND auth.uid() = user_id
    );

-- Invitations policies
CREATE POLICY "Users can view invitations for their tribes" ON public.invitations
    FOR SELECT USING (
        tribe_id IN (
            SELECT tribe_id FROM public.tribe_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'member')
        )
    );

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_tribes
    BEFORE UPDATE ON public.tribes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_circles
    BEFORE UPDATE ON public.circles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_posts
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_comments
    BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();