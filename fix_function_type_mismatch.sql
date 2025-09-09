-- Fix function return type mismatch for get_user_unassigned_leaves
-- The function was declared with VARCHAR but the database column is TEXT

-- Drop existing function first
DROP FUNCTION IF EXISTS get_user_unassigned_leaves(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_user_unassigned_leaves(user_id UUID, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE(
  id UUID,
  content TEXT,
  media_urls TEXT[],
  leaf_type TEXT,
  milestone_type TEXT,
  tags TEXT[],
  ai_caption TEXT,
  ai_tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  author_first_name TEXT,
  author_last_name TEXT,
  author_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.content,
    l.media_urls,
    l.leaf_type,
    l.milestone_type,
    l.tags,
    l.ai_caption,
    l.ai_tags,
    l.created_at,
    l.updated_at,
    p.first_name as author_first_name,
    p.last_name as author_last_name,
    p.avatar_url as author_avatar_url
  FROM posts l
  JOIN profiles p ON l.author_id = p.id
  WHERE l.author_id = user_id 
    AND l.assignment_status = 'unassigned'
  ORDER BY l.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;