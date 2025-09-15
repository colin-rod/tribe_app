-- Notification System Migration
-- Creates tables and functions for comprehensive user notification management

-- 1. User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Memory-related notifications
  email_new_memories BOOLEAN DEFAULT true,
  email_memory_assignments BOOLEAN DEFAULT true,
  email_memory_processing BOOLEAN DEFAULT true,
  
  -- Email-to-memory notifications
  email_processing_success BOOLEAN DEFAULT true,
  email_processing_failed BOOLEAN DEFAULT true,
  
  -- Branch and tree notifications
  email_branch_invitations BOOLEAN DEFAULT true,
  email_tree_invitations BOOLEAN DEFAULT true,
  email_branch_activity BOOLEAN DEFAULT false,
  
  -- System notifications
  email_system_updates BOOLEAN DEFAULT true,
  
  -- Digest options
  email_daily_digest BOOLEAN DEFAULT false,
  email_weekly_digest BOOLEAN DEFAULT true,
  
  -- In-app notifications
  inapp_new_memories BOOLEAN DEFAULT true,
  inapp_memory_assignments BOOLEAN DEFAULT true,
  inapp_branch_invitations BOOLEAN DEFAULT true,
  inapp_tree_invitations BOOLEAN DEFAULT true,
  inapp_system_updates BOOLEAN DEFAULT true,
  
  -- Notification frequency
  digest_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (digest_frequency IN ('daily', 'weekly', 'never')),
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 2. Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Context and metadata
  context_type VARCHAR(50), -- 'memory', 'branch', 'tree', 'system'
  context_id UUID, -- ID of related object
  metadata JSONB DEFAULT '{}',
  
  -- Delivery channels
  send_email BOOLEAN DEFAULT false,
  send_inapp BOOLEAN DEFAULT false,
  
  -- Status and timing
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Notification History Table
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Context and metadata
  context_type VARCHAR(50),
  context_id UUID,
  metadata JSONB DEFAULT '{}',
  
  -- Delivery details
  delivery_channel VARCHAR(20) NOT NULL CHECK (delivery_channel IN ('email', 'inapp')),
  delivery_status VARCHAR(20) NOT NULL CHECK (delivery_status IN ('delivered', 'failed', 'bounced')),
  
  -- User interaction
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. In-App Notifications Table
CREATE TABLE IF NOT EXISTS inapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  icon VARCHAR(50),
  
  -- Context and actions
  context_type VARCHAR(50),
  context_id UUID,
  action_url VARCHAR(500),
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Priority and grouping
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  group_key VARCHAR(100), -- For grouping similar notifications
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON notification_history(created_at);
CREATE INDEX IF NOT EXISTS idx_inapp_notifications_user_id ON inapp_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_inapp_notifications_is_read ON inapp_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_inapp_notifications_created_at ON inapp_notifications(created_at);

-- 6. Create updated_at trigger for preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_notification_preferences_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at 
    BEFORE UPDATE ON notification_queue 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Row Level Security (RLS) Policies
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inapp_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only access their own notification preferences
CREATE POLICY "Users can view own notification preferences" ON user_notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON user_notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON user_notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own notification history
CREATE POLICY "Users can view own notification history" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view and update their own in-app notifications
CREATE POLICY "Users can view own inapp notifications" ON inapp_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own inapp notifications" ON inapp_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage notification queue (for background processing)
CREATE POLICY "Service role can manage notification queue" ON notification_queue
    FOR ALL USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- 8. Functions for notification management

-- Function to get or create user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(user_uuid UUID)
RETURNS user_notification_preferences AS $$
DECLARE
    prefs user_notification_preferences;
BEGIN
    -- Try to get existing preferences
    SELECT * INTO prefs FROM user_notification_preferences WHERE user_id = user_uuid;
    
    -- If no preferences exist, create default ones
    IF NOT FOUND THEN
        INSERT INTO user_notification_preferences (user_id) 
        VALUES (user_uuid) 
        RETURNING * INTO prefs;
    END IF;
    
    RETURN prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue a notification
CREATE OR REPLACE FUNCTION queue_notification(
    target_user_id UUID,
    notif_type VARCHAR(50),
    notif_title VARCHAR(255),
    notif_message TEXT,
    ctx_type VARCHAR(50) DEFAULT NULL,
    ctx_id UUID DEFAULT NULL,
    metadata_json JSONB DEFAULT '{}',
    schedule_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    user_prefs user_notification_preferences;
    send_email BOOLEAN := false;
    send_inapp BOOLEAN := false;
BEGIN
    -- Get user preferences
    SELECT * INTO user_prefs FROM get_user_notification_preferences(target_user_id);
    
    -- Determine delivery channels based on notification type and preferences
    CASE notif_type
        WHEN 'memory_created' THEN
            send_email := user_prefs.email_new_memories;
            send_inapp := user_prefs.inapp_new_memories;
        WHEN 'memory_assigned' THEN
            send_email := user_prefs.email_memory_assignments;
            send_inapp := user_prefs.inapp_memory_assignments;
        WHEN 'email_processing_success' THEN
            send_email := user_prefs.email_processing_success;
            send_inapp := user_prefs.inapp_new_memories;
        WHEN 'email_processing_failed' THEN
            send_email := user_prefs.email_processing_failed;
            send_inapp := user_prefs.inapp_new_memories;
        WHEN 'branch_invitation' THEN
            send_email := user_prefs.email_branch_invitations;
            send_inapp := user_prefs.inapp_branch_invitations;
        WHEN 'tree_invitation' THEN
            send_email := user_prefs.email_tree_invitations;
            send_inapp := user_prefs.inapp_tree_invitations;
        WHEN 'system_update' THEN
            send_email := user_prefs.email_system_updates;
            send_inapp := user_prefs.inapp_system_updates;
        ELSE
            send_email := false;
            send_inapp := true;
    END CASE;
    
    -- Insert into notification queue
    INSERT INTO notification_queue (
        user_id, notification_type, title, message,
        context_type, context_id, metadata,
        send_email, send_inapp, scheduled_for
    ) VALUES (
        target_user_id, notif_type, notif_title, notif_message,
        ctx_type, ctx_id, metadata_json,
        send_email, send_inapp, schedule_for
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark in-app notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE inapp_notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_notification_preferences TO authenticated;
GRANT SELECT ON notification_history TO authenticated;
GRANT SELECT, UPDATE ON inapp_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;

-- Service role permissions for background processing
GRANT ALL ON notification_queue TO service_role;
GRANT ALL ON notification_history TO service_role;
GRANT ALL ON inapp_notifications TO service_role;
GRANT EXECUTE ON FUNCTION queue_notification(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, UUID, JSONB, TIMESTAMP WITH TIME ZONE) TO service_role;

-- 10. Create sample notification types enum for reference
COMMENT ON TABLE notification_queue IS 'Queue for managing notification delivery';
COMMENT ON COLUMN notification_queue.notification_type IS 'Types: memory_created, memory_assigned, email_processing_success, email_processing_failed, branch_invitation, tree_invitation, system_update';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification delivery channels and types';
COMMENT ON TABLE notification_history IS 'Historical record of all sent notifications';
COMMENT ON TABLE inapp_notifications IS 'In-app notifications displayed to users';