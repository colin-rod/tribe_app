-- Add table for storing AI response analysis
CREATE TABLE IF NOT EXISTS ai_response_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  categories JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')) DEFAULT 'neutral',
  topics TEXT[] DEFAULT '{}',
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')) DEFAULT 'low',
  milestone TEXT,
  people TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  time_references TEXT[] DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_response_analysis_user_branch 
ON ai_response_analysis(user_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_ai_response_analysis_sentiment 
ON ai_response_analysis(sentiment);

CREATE INDEX IF NOT EXISTS idx_ai_response_analysis_urgency 
ON ai_response_analysis(urgency);

CREATE INDEX IF NOT EXISTS idx_ai_response_analysis_milestone 
ON ai_response_analysis(milestone) WHERE milestone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_response_analysis_created_at 
ON ai_response_analysis(created_at DESC);

-- Create GIN index for tag and topic searches
CREATE INDEX IF NOT EXISTS idx_ai_response_analysis_tags 
ON ai_response_analysis USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_ai_response_analysis_topics 
ON ai_response_analysis USING GIN (topics);

-- Add RLS policies
ALTER TABLE ai_response_analysis ENABLE ROW LEVEL SECURITY;

-- Users can only access analysis for branches they belong to
CREATE POLICY "Users can view response analysis for their branches"
ON ai_response_analysis FOR SELECT
USING (
  branch_id IN (
    SELECT bm.branch_id 
    FROM branch_members bm 
    WHERE bm.user_id = auth.uid() 
    AND bm.status = 'active'
  )
);

-- Only the system (or AI service) should insert analysis
CREATE POLICY "System can insert response analysis"
ON ai_response_analysis FOR INSERT
WITH CHECK (true); -- We'll handle permissions in application logic

-- Add helper view for user pattern analysis
CREATE OR REPLACE VIEW user_response_patterns AS
WITH tag_topics_flattened AS (
  SELECT 
    ara.user_id,
    ara.branch_id,
    ara.sentiment,
    ara.milestone,
    ara.confidence_score,
    ara.created_at,
    unnest(ara.tags) as tag,
    unnest(ara.topics) as topic
  FROM ai_response_analysis ara
  WHERE array_length(ara.tags, 1) > 0 OR array_length(ara.topics, 1) > 0
),
aggregated_data AS (
  SELECT 
    user_id,
    branch_id,
    ARRAY_AGG(DISTINCT tag) FILTER (WHERE tag IS NOT NULL) as all_tags,
    ARRAY_AGG(DISTINCT topic) FILTER (WHERE topic IS NOT NULL) as all_topics
  FROM tag_topics_flattened
  GROUP BY user_id, branch_id
)
SELECT 
  ara.user_id,
  ara.branch_id,
  p.first_name,
  p.last_name,
  COUNT(*) as total_responses,
  AVG(ara.confidence_score) as avg_confidence,
  MODE() WITHIN GROUP (ORDER BY ara.sentiment) as most_common_sentiment,
  COALESCE(ad.all_tags, '{}') as all_tags,
  COALESCE(ad.all_topics, '{}') as all_topics,
  COUNT(*) FILTER (WHERE ara.milestone IS NOT NULL) as milestone_count,
  MAX(ara.created_at) as last_response_date
FROM ai_response_analysis ara
JOIN profiles p ON ara.user_id = p.id
LEFT JOIN aggregated_data ad ON ara.user_id = ad.user_id AND ara.branch_id = ad.branch_id
GROUP BY ara.user_id, ara.branch_id, p.first_name, p.last_name, ad.all_tags, ad.all_topics;

-- Grant access to the view
GRANT SELECT ON user_response_patterns TO authenticated;