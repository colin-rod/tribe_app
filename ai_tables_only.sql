-- AI Tables Only - Apply these to fix the AI system
-- This creates just the tables needed for the AI Journal Assistant

-- Create user conversation states table
CREATE TABLE IF NOT EXISTS user_conversation_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    last_interaction TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    conversation_phase TEXT DEFAULT 'initial' CHECK (conversation_phase IN ('initial', 'active', 'followup', 'concluded')),
    current_topic TEXT,
    pending_prompts TEXT[] DEFAULT '{}',
    preferences JSONB DEFAULT '{
        "promptStyle": "casual",
        "reminderFrequency": "medium",
        "preferredTopics": [],
        "bestTimeForPrompts": "anytime"
    }'::jsonb,
    response_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, branch_id)
);

-- Create AI system messages table for storing system-generated prompts and responses
CREATE TABLE IF NOT EXISTS ai_system_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message_type TEXT DEFAULT 'prompt' CHECK (message_type IN ('prompt', 'response', 'system')),
    content TEXT NOT NULL,
    prompt_type TEXT CHECK (prompt_type IN ('checkin', 'milestone', 'memory', 'followup', 'celebration')),
    context_data JSONB DEFAULT '{}'::jsonb,
    ai_metadata JSONB DEFAULT '{
        "provider": "demo",
        "model": "demo",
        "confidence": 0.8,
        "tokens_used": 0
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

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

-- Add the posts columns for message threading (if they don't exist)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS conversation_context JSONB DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'post';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_prompt_id UUID REFERENCES ai_system_messages(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_conversation_states_user_id ON user_conversation_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conversation_states_branch_id ON user_conversation_states(branch_id);
CREATE INDEX IF NOT EXISTS idx_ai_system_messages_branch_id ON ai_system_messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_ai_system_messages_user_id ON ai_system_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_analysis_user_branch ON ai_response_analysis(user_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_ai_prompt_id ON posts(ai_prompt_id) WHERE ai_prompt_id IS NOT NULL;

-- Enable RLS
ALTER TABLE user_conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_analysis ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for user conversation states
CREATE POLICY "user_conversation_states_own_access" ON user_conversation_states
    FOR ALL USING (user_id = auth.uid());

-- Basic RLS policies for AI system messages  
CREATE POLICY "ai_system_messages_branch_members" ON ai_system_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM branch_members bm
            WHERE bm.branch_id = ai_system_messages.branch_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        )
    );

-- Basic RLS policies for AI response analysis
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

CREATE POLICY "System can insert response analysis"
ON ai_response_analysis FOR INSERT
WITH CHECK (true);

-- Create helper function for prompting logic
CREATE OR REPLACE FUNCTION should_prompt_user(check_user_id UUID, check_branch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_interaction_time TIMESTAMPTZ;
    reminder_frequency TEXT;
    hours_threshold INTEGER;
BEGIN
    -- Get user's conversation state
    SELECT 
        last_interaction, 
        preferences->>'reminderFrequency'
    INTO 
        last_interaction_time, 
        reminder_frequency
    FROM user_conversation_states 
    WHERE user_id = check_user_id 
    AND branch_id = check_branch_id;
    
    -- If no state exists, user should be prompted (first time)
    IF last_interaction_time IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Determine hours threshold based on frequency
    hours_threshold := CASE 
        WHEN reminder_frequency = 'high' THEN 8
        WHEN reminder_frequency = 'low' THEN 72
        ELSE 24 -- medium
    END;
    
    -- Check if enough time has passed
    RETURN (EXTRACT(EPOCH FROM (NOW() - last_interaction_time)) / 3600) >= hours_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;