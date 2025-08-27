-- Triggers for email/push outbox and other automation
-- This migration creates triggers to automatically queue notifications when posts are created

-- Function to enqueue notifications when a post is created
CREATE OR REPLACE FUNCTION public.enqueue_outbox_on_post()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  member_id uuid;
  branch_name text;
  author_name text;
BEGIN
  -- Get branch name and author name for the notification payload
  SELECT b.name, COALESCE(p.first_name || ' ' || p.last_name, 'Someone')
  INTO branch_name, author_name
  FROM branches b
  LEFT JOIN auth.users au ON au.id = NEW.author_id
  LEFT JOIN profiles p ON p.id = NEW.author_id
  WHERE b.id = NEW.branch_id;

  -- Create notification entries for each branch member (except the author)
  FOR member_id IN 
    SELECT user_id 
    FROM branch_members 
    WHERE branch_id = NEW.branch_id 
    AND user_id != NEW.author_id
    AND status = 'active'
  LOOP
    -- Email notification
    INSERT INTO outbox(branch_id, post_id, channel, payload)
    VALUES (
      NEW.branch_id, 
      NEW.id, 
      'email', 
      jsonb_build_object(
        'to_user_id', member_id,
        'branch_name', branch_name,
        'author_name', author_name,
        'post_content', COALESCE(LEFT(NEW.content, 100), ''),
        'has_media', CASE WHEN array_length(NEW.media_urls, 1) > 0 THEN true ELSE false END,
        'milestone_type', NEW.milestone_type
      )
    );

    -- Push notification  
    INSERT INTO outbox(branch_id, post_id, channel, payload)
    VALUES (
      NEW.branch_id, 
      NEW.id, 
      'push', 
      jsonb_build_object(
        'to_user_id', member_id,
        'title', branch_name || ' - New Post',
        'body', author_name || ' shared something new',
        'branch_id', NEW.branch_id,
        'post_id', NEW.id
      )
    );
  END LOOP;
  
  RETURN NEW;
END $$;

-- Create trigger for post notifications
DROP TRIGGER IF EXISTS trg_posts_outbox ON public.posts;
CREATE TRIGGER trg_posts_outbox
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.enqueue_outbox_on_post();

-- Function to update branch member count when members are added/removed
CREATE OR REPLACE FUNCTION public.update_branch_member_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Update member count for the branch
  UPDATE branches 
  SET member_count = (
    SELECT COUNT(*) 
    FROM branch_members 
    WHERE branch_id = COALESCE(NEW.branch_id, OLD.branch_id)
    AND status = 'active'
  )
  WHERE id = COALESCE(NEW.branch_id, OLD.branch_id);
  
  RETURN COALESCE(NEW, OLD);
END $$;

-- Create triggers for member count updates
DROP TRIGGER IF EXISTS trg_branch_members_insert ON public.branch_members;
CREATE TRIGGER trg_branch_members_insert
AFTER INSERT ON public.branch_members
FOR EACH ROW EXECUTE FUNCTION public.update_branch_member_count();

DROP TRIGGER IF EXISTS trg_branch_members_update ON public.branch_members;
CREATE TRIGGER trg_branch_members_update
AFTER UPDATE ON public.branch_members
FOR EACH ROW EXECUTE FUNCTION public.update_branch_member_count();

DROP TRIGGER IF EXISTS trg_branch_members_delete ON public.branch_members;
CREATE TRIGGER trg_branch_members_delete
AFTER DELETE ON public.branch_members
FOR EACH ROW EXECUTE FUNCTION public.update_branch_member_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- Add update timestamp triggers to relevant tables
DROP TRIGGER IF EXISTS trg_trees_updated_at ON public.trees;
CREATE TRIGGER trg_trees_updated_at
BEFORE UPDATE ON public.trees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_assistant_threads_updated_at ON public.assistant_threads;
CREATE TRIGGER trg_assistant_threads_updated_at
BEFORE UPDATE ON public.assistant_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to handle invite acceptance
CREATE OR REPLACE FUNCTION public.accept_invite_and_add_member()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only trigger on status change to 'accepted'
  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    -- Add to tree if it's a tree invite
    IF NEW.tree_id IS NOT NULL THEN
      INSERT INTO tree_members (tree_id, user_id, role, joined_at)
      VALUES (NEW.tree_id, auth.uid(), 'viewer'::role_tree, now())
      ON CONFLICT (tree_id, user_id) DO NOTHING;
    END IF;
    
    -- Add to branch if it's a branch invite
    IF NEW.branch_id IS NOT NULL THEN
      INSERT INTO branch_members (branch_id, user_id, role, added_at, joined_via, status)
      VALUES (NEW.branch_id, auth.uid(), NEW.role::role_branch, now(), NEW.invited_by, 'active')
      ON CONFLICT (branch_id, user_id) DO UPDATE SET
        status = 'active',
        role = NEW.role::role_branch;
    END IF;
    
    -- Set accepted timestamp
    NEW.accepted_at = now();
  END IF;
  
  RETURN NEW;
END $$;

-- Create trigger for invite acceptance
DROP TRIGGER IF EXISTS trg_invites_acceptance ON public.invites;
CREATE TRIGGER trg_invites_acceptance
BEFORE UPDATE ON public.invites
FOR EACH ROW EXECUTE FUNCTION public.accept_invite_and_add_member();