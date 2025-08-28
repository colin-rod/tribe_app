-- Migration: Transform Posts to Leaves Memory System
-- This migration transforms the existing posts table into a leaves-based memory system

-- First, let's backup the current posts table structure
-- ALTER TABLE posts RENAME TO posts_backup_20250828;

-- Add new columns to the posts table to support leaves functionality
ALTER TABLE posts ADD COLUMN IF NOT EXISTS leaf_type TEXT DEFAULT 'memory'::text 
  CHECK (leaf_type IN ('photo', 'video', 'audio', 'text', 'milestone', 'memory'));

ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS season TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_caption TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT '{}';

-- Handle view dependency for milestone_type column changes
-- First, drop the dependent view
DROP VIEW IF EXISTS messages_with_context CASCADE;

-- Update milestone_type to use standardized values
ALTER TABLE posts ALTER COLUMN milestone_type TYPE TEXT;
UPDATE posts SET milestone_type = LOWER(REPLACE(milestone_type, ' ', '_')) WHERE milestone_type IS NOT NULL;

-- Recreate the view after column changes
CREATE VIEW messages_with_context AS
SELECT 
  p.*,
  c.title as conversation_title,
  c.conversation_type,
  reply_to.content as reply_to_content,
  reply_to.author_id as reply_to_author_id,
  reply_to_profile.first_name as reply_to_first_name,
  reply_to_profile.last_name as reply_to_last_name
FROM posts p
LEFT JOIN conversations c ON p.conversation_context->>'conversation_id' = c.id::text
LEFT JOIN posts reply_to ON p.reply_to_id = reply_to.id
LEFT JOIN profiles reply_to_profile ON reply_to.author_id = reply_to_profile.id;

-- Add indexes for new leaf functionality
CREATE INDEX IF NOT EXISTS idx_posts_leaf_type ON posts(leaf_type);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_posts_season ON posts(season);
CREATE INDEX IF NOT EXISTS idx_posts_milestone_type ON posts(milestone_type) WHERE milestone_type IS NOT NULL;

-- Create leaf_reactions table for enhanced reactions beyond just likes
CREATE TABLE IF NOT EXISTS leaf_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leaf_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'smile', 'laugh', 'wow', 'care', 'love')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(leaf_id, user_id, reaction_type)
);

-- Create indexes for leaf_reactions
CREATE INDEX IF NOT EXISTS idx_leaf_reactions_leaf_id ON leaf_reactions(leaf_id);
CREATE INDEX IF NOT EXISTS idx_leaf_reactions_user_id ON leaf_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_leaf_reactions_type ON leaf_reactions(reaction_type);

-- Create leaf_shares table for branch-specific sharing
CREATE TABLE IF NOT EXISTS leaf_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leaf_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(leaf_id, branch_id)
);

-- Create indexes for leaf_shares
CREATE INDEX IF NOT EXISTS idx_leaf_shares_leaf_id ON leaf_shares(leaf_id);
CREATE INDEX IF NOT EXISTS idx_leaf_shares_branch_id ON leaf_shares(branch_id);
CREATE INDEX IF NOT EXISTS idx_leaf_shares_shared_by ON leaf_shares(shared_by);

-- Create milestones reference table
CREATE TABLE IF NOT EXISTS milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  typical_age_months INTEGER, -- Typical age in months for this milestone
  icon TEXT, -- Icon identifier for UI
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert common milestones
INSERT INTO milestones (name, display_name, description, category, typical_age_months, icon) VALUES
-- Physical milestones
('first_steps', 'First Steps', 'Child takes their first independent steps', 'physical', 12, '👶'),
('first_tooth', 'First Tooth', 'First tooth breaks through', 'physical', 6, '🦷'),
('crawling', 'Crawling', 'Child begins to crawl', 'physical', 9, '🚼'),
('walking', 'Walking', 'Child walks confidently', 'physical', 15, '🚶'),
('potty_trained', 'Potty Trained', 'Successfully potty trained', 'physical', 30, '🚽'),

-- Communication milestones
('first_word', 'First Word', 'Child says their first recognizable word', 'communication', 12, '💬'),
('first_sentence', 'First Sentence', 'Child forms their first complete sentence', 'communication', 24, '🗣️'),
('reading', 'Reading', 'Child begins reading independently', 'communication', 60, '📚'),

-- Social milestones
('first_smile', 'First Smile', 'First social smile', 'social', 2, '😊'),
('first_laugh', 'First Laugh', 'First genuine laugh', 'social', 4, '😂'),
('playing_alone', 'Independent Play', 'Plays independently for extended periods', 'social', 18, '🧸'),
('sharing', 'Sharing', 'Learns to share with others', 'social', 36, '🤝'),

-- Academic milestones
('counting_to_ten', 'Counting to 10', 'Can count to ten', 'academic', 48, '🔢'),
('writing_name', 'Writing Name', 'Can write their own name', 'academic', 60, '✏️'),
('first_day_school', 'First Day of School', 'First day at school/preschool', 'academic', 48, '🎒'),

-- Special events
('birthday', 'Birthday', 'Birthday celebration', 'celebration', null, '🎂'),
('holiday_celebration', 'Holiday Celebration', 'Special holiday or cultural celebration', 'celebration', null, '🎉'),
('family_trip', 'Family Trip', 'Special family vacation or trip', 'experience', null, '✈️'),
('new_sibling', 'New Sibling', 'Welcome of a new brother or sister', 'family', null, '👶'),
('grandparent_visit', 'Grandparent Visit', 'Special visit with grandparents', 'family', null, '👴')

ON CONFLICT (name) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE leaf_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaf_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for leaf_reactions
CREATE POLICY "Users can view reactions on leaves they have access to" ON leaf_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN branch_members bm ON bm.branch_id = p.branch_id
      WHERE p.id = leaf_reactions.leaf_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
    )
  );

CREATE POLICY "Users can add reactions to leaves they can access" ON leaf_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM posts p
      JOIN branch_members bm ON bm.branch_id = p.branch_id
      WHERE p.id = leaf_reactions.leaf_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
    )
  );

CREATE POLICY "Users can update their own reactions" ON leaf_reactions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" ON leaf_reactions
  FOR DELETE USING (user_id = auth.uid());

-- RLS policies for leaf_shares
CREATE POLICY "Users can view shares for branches they're in" ON leaf_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM branch_members bm
      WHERE bm.branch_id = leaf_shares.branch_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
    )
  );

CREATE POLICY "Leaf authors can manage shares" ON leaf_shares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = leaf_shares.leaf_id
      AND p.author_id = auth.uid()
    )
  );

-- RLS policies for milestones (public read access)
CREATE POLICY "Anyone can view milestones" ON milestones
  FOR SELECT USING (true);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_leaf_reactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_leaf_reactions_updated_at ON leaf_reactions;
CREATE TRIGGER trigger_update_leaf_reactions_updated_at
  BEFORE UPDATE ON leaf_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_leaf_reactions_updated_at();

-- Comments for documentation
COMMENT ON TABLE posts IS 'Memory leaves - individual memories/content items that belong to a child''s tree and can be shared with specific branches';
COMMENT ON COLUMN posts.leaf_type IS 'Type of memory leaf: photo, video, audio, text, milestone, or general memory';
COMMENT ON COLUMN posts.tags IS 'User-defined tags for organizing and searching leaves';
COMMENT ON COLUMN posts.season IS 'Season or time period for grouping leaves (e.g., "first_year", "toddler", "preschool")';
COMMENT ON COLUMN posts.ai_caption IS 'AI-generated caption or description for the leaf';
COMMENT ON COLUMN posts.ai_tags IS 'AI-suggested tags based on content analysis';

COMMENT ON TABLE leaf_reactions IS 'Enhanced reactions for leaves beyond simple likes';
COMMENT ON TABLE leaf_shares IS 'Controls which branches can see specific leaves';
COMMENT ON TABLE milestones IS 'Reference table for standardized milestone types with metadata';

-- Create view for leaves with all related data
CREATE OR REPLACE VIEW leaves_with_details AS
SELECT 
  p.*,
  pr.first_name || ' ' || pr.last_name AS author_name,
  pr.avatar_url AS author_avatar,
  b.name AS branch_name,
  b.tree_id,
  t.name AS tree_name,
  m.display_name AS milestone_display_name,
  m.category AS milestone_category,
  m.icon AS milestone_icon,
  -- Reaction counts
  (SELECT COUNT(*) FROM leaf_reactions lr WHERE lr.leaf_id = p.id AND lr.reaction_type = 'heart') as heart_count,
  (SELECT COUNT(*) FROM leaf_reactions lr WHERE lr.leaf_id = p.id AND lr.reaction_type = 'smile') as smile_count,
  (SELECT COUNT(*) FROM leaf_reactions lr WHERE lr.leaf_id = p.id AND lr.reaction_type = 'laugh') as laugh_count,
  -- User's reaction
  (SELECT lr.reaction_type FROM leaf_reactions lr WHERE lr.leaf_id = p.id AND lr.user_id = auth.uid()) as user_reaction,
  -- Share count
  (SELECT COUNT(*) FROM leaf_shares ls WHERE ls.leaf_id = p.id) as share_count,
  -- Comments count  
  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
FROM posts p
LEFT JOIN profiles pr ON pr.id = p.author_id
LEFT JOIN branches b ON b.id = p.branch_id
LEFT JOIN trees t ON t.id = b.tree_id
LEFT JOIN milestones m ON m.name = p.milestone_type;

COMMENT ON VIEW leaves_with_details IS 'Comprehensive view of leaves with author, branch, tree, milestone, and engagement data';