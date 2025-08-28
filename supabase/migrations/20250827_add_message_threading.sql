-- Add message threading support to posts table
-- This migration adds chat-like functionality while maintaining backward compatibility

-- Add columns for message threading and conversation context
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS conversation_context JSONB DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'post' CHECK (message_type IN ('post', 'message', 'reply', 'system'));
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- Add indexes for better chat performance
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_reply_to_id ON posts(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_posts_branch_created_desc ON posts(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_message_type ON posts(message_type);

-- Add conversation metadata table for storing chat-specific information
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    conversation_type TEXT DEFAULT 'general' CHECK (conversation_type IN ('general', 'announcement', 'milestone', 'topic')),
    metadata JSONB DEFAULT '{}'::jsonb,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0
);

-- Add RLS policies for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_branch_members_read" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM branch_members bm
            WHERE bm.branch_id = conversations.branch_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        )
    );

CREATE POLICY "conversations_branch_members_insert" ON conversations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM branch_members bm
            WHERE bm.branch_id = conversations.branch_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "conversations_branch_members_update" ON conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM branch_members bm
            WHERE bm.branch_id = conversations.branch_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        )
        AND (created_by = auth.uid() OR 
             user_has_permission(auth.uid(), 'branch', branch_id, 'branch.moderate'))
    );

-- Add conversation participants table for tracking who's in each conversation
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT FALSE,
    notification_level TEXT DEFAULT 'all' CHECK (notification_level IN ('all', 'mentions', 'none')),
    UNIQUE(conversation_id, user_id)
);

-- Add RLS policies for conversation participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_participants_own_read" ON conversation_participants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "conversation_participants_branch_members_read" ON conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            JOIN branch_members bm ON bm.branch_id = c.branch_id
            WHERE c.id = conversation_participants.conversation_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        )
    );

-- Add AI prompt tracking table for journal assistance
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    response_text TEXT,
    prompt_type TEXT DEFAULT 'journal' CHECK (prompt_type IN ('journal', 'milestone', 'memory', 'checkin', 'custom')),
    context_data JSONB DEFAULT '{}'::jsonb,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL
);

-- Add RLS policies for AI prompts
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prompts_own_access" ON ai_prompts
    FOR ALL USING (user_id = auth.uid());

-- Create function to update conversation metadata when messages are added
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update message count and last message time for the conversation
    IF NEW.thread_id IS NOT NULL THEN
        UPDATE conversations 
        SET 
            message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.thread_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation stats
DROP TRIGGER IF EXISTS trigger_update_conversation_stats ON posts;
CREATE TRIGGER trigger_update_conversation_stats
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_stats();

-- Create function to automatically create conversation for first message in a branch
CREATE OR REPLACE FUNCTION ensure_branch_conversation()
RETURNS TRIGGER AS $$
DECLARE
    default_conversation_id UUID;
BEGIN
    -- Only create conversation for message types (not traditional posts)
    IF NEW.message_type IN ('message', 'reply') AND NEW.thread_id IS NULL THEN
        -- Check if branch has a default conversation
        SELECT id INTO default_conversation_id 
        FROM conversations 
        WHERE branch_id = NEW.branch_id 
        AND conversation_type = 'general' 
        AND is_active = TRUE
        LIMIT 1;
        
        -- Create default conversation if it doesn't exist
        IF default_conversation_id IS NULL THEN
            INSERT INTO conversations (branch_id, title, conversation_type, created_by)
            VALUES (NEW.branch_id, 'General', 'general', NEW.author_id)
            RETURNING id INTO default_conversation_id;
        END IF;
        
        -- Set the thread_id to the default conversation
        NEW.thread_id := default_conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure conversation exists
DROP TRIGGER IF EXISTS trigger_ensure_branch_conversation ON posts;
CREATE TRIGGER trigger_ensure_branch_conversation
    BEFORE INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_branch_conversation();

-- Create view for enhanced messages with conversation context
CREATE OR REPLACE VIEW messages_with_context AS
SELECT 
    p.*,
    c.title as conversation_title,
    c.conversation_type,
    parent.content as reply_to_content,
    parent.author_id as reply_to_author_id,
    parent_profile.first_name as reply_to_first_name,
    parent_profile.last_name as reply_to_last_name
FROM posts p
LEFT JOIN conversations c ON p.thread_id = c.id
LEFT JOIN posts parent ON p.reply_to_id = parent.id
LEFT JOIN profiles parent_profile ON parent.author_id = parent_profile.id
WHERE p.message_type IN ('message', 'reply', 'system');

-- Update existing posts to be compatible with new schema
-- All existing posts will remain as 'post' type for backward compatibility
UPDATE posts SET message_type = 'post' WHERE message_type IS NULL;

-- Add comment to document the schema changes
COMMENT ON COLUMN posts.thread_id IS 'References the conversation this message belongs to (for chat functionality)';
COMMENT ON COLUMN posts.reply_to_id IS 'References the message this is a reply to (for threaded conversations)';
COMMENT ON COLUMN posts.conversation_context IS 'Stores AI prompt context and conversation metadata';
COMMENT ON COLUMN posts.message_type IS 'Distinguishes between traditional posts and chat messages';
COMMENT ON COLUMN posts.is_pinned IS 'Whether this message is pinned in the conversation';
COMMENT ON COLUMN posts.edited_at IS 'Timestamp of last edit (for message editing functionality)';

COMMENT ON TABLE conversations IS 'Stores conversation metadata for chat-like functionality in branches';
COMMENT ON TABLE conversation_participants IS 'Tracks user participation and preferences in conversations';
COMMENT ON TABLE ai_prompts IS 'Stores AI-driven prompts for journal entries and milestone tracking';