-- Add user conversation state tracking for AI journal assistant
-- This stores user preferences, conversation history, and context

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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_conversation_states_user_id ON user_conversation_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conversation_states_branch_id ON user_conversation_states(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_conversation_states_last_interaction ON user_conversation_states(last_interaction);
CREATE INDEX IF NOT EXISTS idx_user_conversation_states_conversation_phase ON user_conversation_states(conversation_phase);

-- Enable RLS
ALTER TABLE user_conversation_states ENABLE ROW LEVEL SECURITY;

-- RLS policies for user conversation states
CREATE POLICY "user_conversation_states_own_access" ON user_conversation_states
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "user_conversation_states_branch_members_read" ON user_conversation_states
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM branch_members bm
            WHERE bm.branch_id = user_conversation_states.branch_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        )
    );

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_conversation_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_conversation_states_updated_at ON user_conversation_states;
CREATE TRIGGER trigger_update_user_conversation_states_updated_at
    BEFORE UPDATE ON user_conversation_states
    FOR EACH ROW
    EXECUTE FUNCTION update_user_conversation_states_updated_at();

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
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') -- Auto-expire old AI messages
);

-- Add indexes for AI system messages
CREATE INDEX IF NOT EXISTS idx_ai_system_messages_branch_id ON ai_system_messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_ai_system_messages_user_id ON ai_system_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_system_messages_created_at ON ai_system_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_system_messages_message_type ON ai_system_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_ai_system_messages_prompt_type ON ai_system_messages(prompt_type);
CREATE INDEX IF NOT EXISTS idx_ai_system_messages_expires_at ON ai_system_messages(expires_at);

-- Enable RLS for AI system messages
ALTER TABLE ai_system_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for AI system messages
CREATE POLICY "ai_system_messages_branch_members" ON ai_system_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM branch_members bm
            WHERE bm.branch_id = ai_system_messages.branch_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        )
    );

-- Note: ai_prompts table does not exist in current schema
-- This line has been removed to prevent migration errors
-- ALTER TABLE ai_prompts ADD COLUMN IF NOT EXISTS system_message_id UUID REFERENCES ai_system_messages(id) ON DELETE SET NULL;

-- Create function to clean up expired AI messages
CREATE OR REPLACE FUNCTION cleanup_expired_ai_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_system_messages 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to generate AI prompt for user
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

-- Create view for recent AI conversations per branch
CREATE OR REPLACE VIEW recent_ai_conversations AS
SELECT 
    asm.branch_id,
    asm.user_id,
    asm.prompt_type,
    asm.content,
    asm.created_at,
    ucs.conversation_phase,
    ucs.preferences,
    p.first_name,
    p.last_name,
    b.name as branch_name
FROM ai_system_messages asm
LEFT JOIN user_conversation_states ucs ON asm.user_id = ucs.user_id AND asm.branch_id = ucs.branch_id
LEFT JOIN profiles p ON asm.user_id = p.id
LEFT JOIN branches b ON asm.branch_id = b.id
WHERE asm.created_at > NOW() - INTERVAL '7 days'
ORDER BY asm.created_at DESC;

-- Comments for documentation
COMMENT ON TABLE user_conversation_states IS 'Stores AI conversation context and user preferences for personalized prompting';
COMMENT ON TABLE ai_system_messages IS 'Stores AI-generated messages, prompts, and responses with metadata';
COMMENT ON FUNCTION should_prompt_user IS 'Determines if a user should receive a proactive AI prompt based on their preferences and last interaction';
COMMENT ON VIEW recent_ai_conversations IS 'Recent AI conversations across all branches for monitoring and analysis';