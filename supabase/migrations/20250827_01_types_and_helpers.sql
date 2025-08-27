-- Types & helper functions for Tree App pivot
-- This migration creates new enums and SECURITY DEFINER functions to avoid RLS recursion

-- Enums (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_tree') THEN
    CREATE TYPE role_tree AS ENUM ('owner','caregiver','viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_branch') THEN
    CREATE TYPE role_branch AS ENUM ('owner','admin','member');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'privacy_level') THEN
    CREATE TYPE privacy_level AS ENUM ('private','invite_only','public');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'branch_kind') THEN
    CREATE TYPE branch_kind AS ENUM ('family','community');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
    CREATE TYPE invite_status AS ENUM ('pending','accepted','expired','revoked');
  END IF;
END $$;

-- RLS helper functions (SECURITY DEFINER to avoid recursive policies)
CREATE OR REPLACE FUNCTION public.is_tree_member(p_tree uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM tree_members tm
    WHERE tm.tree_id = p_tree AND tm.user_id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_branch_member(p_branch uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM branch_members bm
    WHERE bm.branch_id = p_branch AND bm.user_id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tree_owner(p_tree uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM tree_members tm
    WHERE tm.tree_id = p_tree AND tm.user_id = p_user AND tm.role = 'owner'
  );
$$;

-- Limits helpers (for plan gating later; simple stub)
CREATE OR REPLACE FUNCTION public.plan_is_paid(p_user uuid) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT s.is_active
       FROM subscriptions s
      WHERE s.user_id = p_user
      ORDER BY s.created_at DESC
      LIMIT 1), false);
$$;