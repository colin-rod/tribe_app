-- Create/extend new columns & indexes for Tree App pivot
-- This migration adds new columns to existing tables and creates new tables

-- Trees (add missing columns)
ALTER TABLE public.trees
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;

-- Update trees to have created_by as NOT NULL (set default for existing rows)
UPDATE public.trees SET created_by = (
  SELECT user_id FROM tree_members WHERE tree_id = trees.id AND role = 'owner' LIMIT 1
) WHERE created_by IS NULL;

-- Now make created_by NOT NULL
ALTER TABLE public.trees ALTER COLUMN created_by SET NOT NULL;

-- Branches (tree_id nullable to support community branches)
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS tree_id uuid REFERENCES public.trees(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kind branch_kind NOT NULL DEFAULT 'family',
  ADD COLUMN IF NOT EXISTS privacy privacy_level NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS member_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_discoverable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_approve_members boolean DEFAULT false;

-- Update branches to have created_by (set from existing data if available)
UPDATE public.branches SET created_by = (
  SELECT user_id FROM branch_members WHERE branch_id = branches.id LIMIT 1
) WHERE created_by IS NULL;

-- Make created_by NOT NULL
ALTER TABLE public.branches ALTER COLUMN created_by SET NOT NULL;

-- Branch indexes
CREATE INDEX IF NOT EXISTS idx_branches_tree_id ON public.branches(tree_id);
CREATE INDEX IF NOT EXISTS idx_branches_privacy ON public.branches(privacy);
CREATE INDEX IF NOT EXISTS idx_branches_kind ON public.branches(kind);

-- Tree members (add role column with new enum)
ALTER TABLE public.tree_members
  ADD COLUMN IF NOT EXISTS role role_tree NOT NULL DEFAULT 'viewer',
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS ux_tree_members ON public.tree_members(tree_id, user_id);

-- Branch members (add role column with new enum)
ALTER TABLE public.branch_members
  ADD COLUMN IF NOT EXISTS role role_branch NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS added_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS join_method text DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS joined_via uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS ux_branch_members ON public.branch_members(branch_id, user_id);

-- Posts (add missing columns)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS milestone_type text,
  ADD COLUMN IF NOT EXISTS milestone_date date;

-- Make required columns NOT NULL
UPDATE public.posts SET author_id = (
  SELECT user_id FROM branch_members bm 
  JOIN branches b ON b.id = bm.branch_id 
  WHERE b.id = posts.branch_id LIMIT 1
) WHERE author_id IS NULL;

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_branch ON public.posts(branch_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);

-- Children (for prompts & milestone tracking)
CREATE TABLE IF NOT EXISTS public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  name text NOT NULL,
  dob date,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_children_tree ON public.children(tree_id);

-- Invites (can target a tree or a branch)
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  email text,
  phone text,
  role text DEFAULT 'member',
  status invite_status NOT NULL DEFAULT 'pending',
  token text NOT NULL UNIQUE DEFAULT (gen_random_uuid())::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  message text,
  CONSTRAINT invites_target_check CHECK (
    (tree_id IS NOT NULL AND branch_id IS NULL) OR
    (tree_id IS NULL AND branch_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);

-- Chatbot message store (parent-only)
CREATE TABLE IF NOT EXISTS public.assistant_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_threads_tree ON public.assistant_threads(tree_id);
CREATE INDEX IF NOT EXISTS idx_assistant_threads_user ON public.assistant_threads(created_by);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  author text NOT NULL CHECK (author IN ('parent','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_thread ON public.assistant_messages(thread_id);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- Outbox for multi-channel delivery
CREATE TABLE IF NOT EXISTS public.outbox (
  id bigint generated by default as identity primary key,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  post_id uuid NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','push')),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','sent','failed')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON public.outbox(status);
CREATE INDEX IF NOT EXISTS idx_outbox_channel ON public.outbox(channel);
CREATE INDEX IF NOT EXISTS idx_outbox_created ON public.outbox(created_at);

-- Simple subscriptions table (stub; replace with Stripe integration later)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);

-- Comments table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);

-- Likes table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);