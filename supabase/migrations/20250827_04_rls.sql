-- RLS policies (replace self-referential ones to avoid recursion)
-- This migration implements secure RLS policies using SECURITY DEFINER helper functions

-- Drop existing policies that may cause recursion issues
DROP POLICY IF EXISTS trees_select ON public.trees;
DROP POLICY IF EXISTS trees_insert ON public.trees;
DROP POLICY IF EXISTS trees_update ON public.trees;
DROP POLICY IF EXISTS trees_delete ON public.trees;
DROP POLICY IF EXISTS tree_members_select ON public.tree_members;
DROP POLICY IF EXISTS tree_members_insert ON public.tree_members;
DROP POLICY IF EXISTS tree_members_update ON public.tree_members;
DROP POLICY IF EXISTS tree_members_delete ON public.tree_members;
DROP POLICY IF EXISTS branches_select ON public.branches;
DROP POLICY IF EXISTS branches_insert ON public.branches;
DROP POLICY IF EXISTS branches_update ON public.branches;
DROP POLICY IF EXISTS branches_delete ON public.branches;
DROP POLICY IF EXISTS branch_members_select ON public.branch_members;
DROP POLICY IF EXISTS branch_members_insert ON public.branch_members;
DROP POLICY IF EXISTS branch_members_update ON public.branch_members;
DROP POLICY IF EXISTS branch_members_delete ON public.branch_members;

-- Enable RLS on all tables
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Trees policies
CREATE POLICY trees_select ON public.trees
  FOR SELECT USING (
    is_tree_member(id, auth.uid()) OR created_by = auth.uid()
  );

CREATE POLICY trees_insert ON public.trees
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY trees_update ON public.trees
  FOR UPDATE USING (is_tree_owner(id, auth.uid()));

CREATE POLICY trees_delete ON public.trees
  FOR DELETE USING (created_by = auth.uid());

-- Tree members policies
CREATE POLICY tree_members_select ON public.tree_members
  FOR SELECT USING (
    is_tree_member(tree_id, auth.uid()) OR user_id = auth.uid()
  );

CREATE POLICY tree_members_insert ON public.tree_members
  FOR INSERT WITH CHECK (
    is_tree_owner(tree_id, auth.uid()) OR user_id = auth.uid()
  );

CREATE POLICY tree_members_update ON public.tree_members
  FOR UPDATE USING (
    is_tree_owner(tree_id, auth.uid()) OR user_id = auth.uid()
  );

CREATE POLICY tree_members_delete ON public.tree_members
  FOR DELETE USING (
    is_tree_owner(tree_id, auth.uid()) OR user_id = auth.uid()
  );

-- Branches policies
CREATE POLICY branches_select ON public.branches
  FOR SELECT USING (
    (privacy = 'public')
    OR is_branch_member(id, auth.uid())
    OR (tree_id IS NOT NULL AND is_tree_member(tree_id, auth.uid()))
    OR created_by = auth.uid()
  );

CREATE POLICY branches_insert ON public.branches
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
      -- Family branch under a tree: must be tree member
      (tree_id IS NOT NULL AND is_tree_member(tree_id, auth.uid()))
      OR (tree_id IS NULL) -- Community branch (no tree required)
    )
  );

CREATE POLICY branches_update ON public.branches
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR (tree_id IS NOT NULL AND is_tree_owner(tree_id, auth.uid()))
  );

CREATE POLICY branches_delete ON public.branches
  FOR DELETE USING (
    created_by = auth.uid() 
    OR (tree_id IS NOT NULL AND is_tree_owner(tree_id, auth.uid()))
  );

-- Branch members policies
CREATE POLICY branch_members_select ON public.branch_members
  FOR SELECT USING (
    is_branch_member(branch_id, auth.uid()) OR user_id = auth.uid()
  );

CREATE POLICY branch_members_insert ON public.branch_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR is_branch_member(branch_id, auth.uid())
  );

CREATE POLICY branch_members_update ON public.branch_members
  FOR UPDATE USING (
    is_branch_member(branch_id, auth.uid()) OR user_id = auth.uid()
  );

CREATE POLICY branch_members_delete ON public.branch_members
  FOR DELETE USING (
    is_branch_member(branch_id, auth.uid()) OR user_id = auth.uid()
  );

-- Posts policies
CREATE POLICY posts_select ON public.posts
  FOR SELECT USING (
    is_branch_member(branch_id, auth.uid()) OR author_id = auth.uid()
  );

CREATE POLICY posts_insert ON public.posts
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND is_branch_member(branch_id, auth.uid())
  );

CREATE POLICY posts_update ON public.posts
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY posts_delete ON public.posts
  FOR DELETE USING (author_id = auth.uid());

-- Children policies (tree members only)
CREATE POLICY children_select ON public.children
  FOR SELECT USING (is_tree_member(tree_id, auth.uid()));

CREATE POLICY children_insert ON public.children
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND is_tree_member(tree_id, auth.uid())
  );

CREATE POLICY children_update ON public.children
  FOR UPDATE USING (
    is_tree_member(tree_id, auth.uid()) AND created_by = auth.uid()
  );

CREATE POLICY children_delete ON public.children
  FOR DELETE USING (
    is_tree_member(tree_id, auth.uid()) AND created_by = auth.uid()
  );

-- Assistant threads policies (tree members only)
CREATE POLICY assistant_threads_select ON public.assistant_threads
  FOR SELECT USING (is_tree_member(tree_id, auth.uid()));

CREATE POLICY assistant_threads_insert ON public.assistant_threads
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND is_tree_member(tree_id, auth.uid())
  );

CREATE POLICY assistant_threads_update ON public.assistant_threads
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY assistant_threads_delete ON public.assistant_threads
  FOR DELETE USING (created_by = auth.uid());

-- Assistant messages policies
CREATE POLICY assistant_messages_select ON public.assistant_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assistant_threads t
      WHERE t.id = thread_id AND is_tree_member(t.tree_id, auth.uid())
    )
  );

CREATE POLICY assistant_messages_insert ON public.assistant_messages
  FOR INSERT WITH CHECK (
    author IN ('parent','assistant') AND
    EXISTS (
      SELECT 1 FROM assistant_threads t
      WHERE t.id = thread_id AND is_tree_member(t.tree_id, auth.uid())
    )
  );

-- Invites policies
CREATE POLICY invites_select ON public.invites
  FOR SELECT USING (
    invited_by = auth.uid()
    OR (tree_id IS NOT NULL AND is_tree_member(tree_id, auth.uid()))
    OR (branch_id IS NOT NULL AND is_branch_member(branch_id, auth.uid()))
  );

CREATE POLICY invites_insert ON public.invites
  FOR INSERT WITH CHECK (invited_by = auth.uid());

CREATE POLICY invites_update ON public.invites
  FOR UPDATE USING (
    invited_by = auth.uid()
    OR (tree_id IS NOT NULL AND is_tree_member(tree_id, auth.uid()))
    OR (branch_id IS NOT NULL AND is_branch_member(branch_id, auth.uid()))
  );

-- Push subscriptions policies (user owns their own subscriptions)
CREATE POLICY push_subscriptions_all ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Outbox policies (branch admins can see outbox for their branches)
CREATE POLICY outbox_select ON public.outbox
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM branch_members bm
      WHERE bm.branch_id = outbox.branch_id 
      AND bm.user_id = auth.uid() 
      AND bm.role IN ('owner','admin')
    )
  );

-- Comments policies
CREATE POLICY comments_select ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id AND is_branch_member(p.branch_id, auth.uid())
    )
  );

CREATE POLICY comments_insert ON public.comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id AND is_branch_member(p.branch_id, auth.uid())
    )
  );

CREATE POLICY comments_update ON public.comments
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY comments_delete ON public.comments
  FOR DELETE USING (author_id = auth.uid());

-- Likes policies
CREATE POLICY likes_select ON public.likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id AND is_branch_member(p.branch_id, auth.uid())
    )
  );

CREATE POLICY likes_insert ON public.likes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id AND is_branch_member(p.branch_id, auth.uid())
    )
  );

CREATE POLICY likes_delete ON public.likes
  FOR DELETE USING (user_id = auth.uid());

-- Subscriptions policies (users can only see their own)
CREATE POLICY subscriptions_all ON public.subscriptions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());