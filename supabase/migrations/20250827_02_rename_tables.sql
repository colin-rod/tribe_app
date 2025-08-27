-- Rename legacy tables to new names (non-breaking; keep data)
-- Note: Most of these renames were already done in previous migrations
-- This migration ensures they exist with proper names

-- If old tables exist, rename them. Otherwise create fresh ones.
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_name='tribes' AND table_schema='public';
  IF FOUND THEN
    ALTER TABLE public.tribes RENAME TO trees;
    -- fix FK constraint names after rename if needed
    -- Note: Supabase auto-generates constraint names, so we may need to handle this
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_name='circles' AND table_schema='public';
  IF FOUND THEN
    ALTER TABLE public.circles RENAME TO branches;
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_name='tribe_members' AND table_schema='public';
  IF FOUND THEN
    ALTER TABLE public.tribe_members RENAME TO tree_members;
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_name='circle_members' AND table_schema='public';
  IF FOUND THEN
    ALTER TABLE public.circle_members RENAME TO branch_members;
  END IF;
END $$;

-- Create tables if they don't exist (fresh installation case)
CREATE TABLE IF NOT EXISTS public.trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tree_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branch_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Rename posts to entries for clarity (optional - keeping as "posts" is fine too)
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_name='posts' AND table_schema='public';
  IF FOUND THEN
    -- Only rename if we want to change to "entries"
    -- For now, keeping as "posts" to maintain consistency with existing codebase
    -- ALTER TABLE public.posts RENAME TO entries;
    NULL;
  END IF;
END $$;