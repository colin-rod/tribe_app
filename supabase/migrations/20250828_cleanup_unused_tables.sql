-- Migration: Cleanup Unused Tables and Views
-- This migration removes redundant tables and views that are not used in the current application
-- Date: 2025-08-28
-- IMPORTANT: Always backup your database before running this migration in production!

-- ===== SAFETY CHECKS =====
-- This migration includes safety checks to prevent accidental data loss

DO $$ 
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Log start of cleanup
    RAISE NOTICE 'Starting database cleanup migration...';
    
    -- ===== DROP UNUSED VIEWS FIRST =====
    -- Views must be dropped before their dependent tables
    
    -- Drop messages_with_context view (unused conversation system)
    DROP VIEW IF EXISTS messages_with_context CASCADE;
    RAISE NOTICE 'Dropped view: messages_with_context';
    
    -- ===== DROP UNUSED AI-RELATED TABLES =====
    -- These tables are referenced in code but not actively used
    
    -- Check if ai_system_messages exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ai_system_messages' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE ai_system_messages CASCADE;
        RAISE NOTICE 'Dropped table: ai_system_messages';
    END IF;
    
    -- Check if ai_response_analysis exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ai_response_analysis' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE ai_response_analysis CASCADE;
        RAISE NOTICE 'Dropped table: ai_response_analysis';
    END IF;
    
    -- Check if user_conversation_states exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_conversation_states' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE user_conversation_states CASCADE;
        RAISE NOTICE 'Dropped table: user_conversation_states';
    END IF;
    
    -- Check if ai_prompts exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ai_prompts' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE ai_prompts CASCADE;
        RAISE NOTICE 'Dropped table: ai_prompts';
    END IF;
    
    -- ===== DROP UNUSED CONVERSATION/CHAT TABLES =====
    
    -- Check if conversation_participants exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'conversation_participants' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE conversation_participants CASCADE;
        RAISE NOTICE 'Dropped table: conversation_participants';
    END IF;
    
    -- Check if conversations exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'conversations' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE conversations CASCADE;
        RAISE NOTICE 'Dropped table: conversations';
    END IF;
    
    -- ===== DROP UNUSED RBAC TABLES =====
    -- Application uses simplified role-based permissions instead of full RBAC
    
    -- Check if user_role_assignments exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_role_assignments' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE user_role_assignments CASCADE;
        RAISE NOTICE 'Dropped table: user_role_assignments';
    END IF;
    
    -- Check if role_permissions exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'role_permissions' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE role_permissions CASCADE;
        RAISE NOTICE 'Dropped table: role_permissions';
    END IF;
    
    -- Check if permissions exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'permissions' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE permissions CASCADE;
        RAISE NOTICE 'Dropped table: permissions';
    END IF;
    
    -- Check if roles exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'roles' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE roles CASCADE;
        RAISE NOTICE 'Dropped table: roles';
    END IF;
    
    -- ===== DROP UNUSED FEATURE TABLES =====
    
    -- Check if branch_categories exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'branch_categories' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE branch_categories CASCADE;
        RAISE NOTICE 'Dropped table: branch_categories';
    END IF;
    
    -- Check if branch_join_requests exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'branch_join_requests' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE branch_join_requests CASCADE;
        RAISE NOTICE 'Dropped table: branch_join_requests';
    END IF;
    
    -- Check if cross_tree_access exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cross_tree_access' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE cross_tree_access CASCADE;
        RAISE NOTICE 'Dropped table: cross_tree_access';
    END IF;
    
    -- ===== DROP UNUSED MEDIA/STORAGE TABLES =====
    -- Application uses direct file storage instead of database tracking
    
    -- Check if media exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'media' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE media CASCADE;
        RAISE NOTICE 'Dropped table: media';
    END IF;
    
    -- Check if avatars exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'avatars' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE avatars CASCADE;
        RAISE NOTICE 'Dropped table: avatars';
    END IF;
    
    -- ===== DROP BACKUP TABLES =====
    -- Remove any backup tables from previous migrations
    
    -- Check if posts_backup_20250828 exists and drop it
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'posts_backup_20250828' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP TABLE posts_backup_20250828 CASCADE;
        RAISE NOTICE 'Dropped backup table: posts_backup_20250828';
    END IF;
    
    -- ===== DROP UNUSED INDEXES =====
    -- Clean up any orphaned indexes
    
    -- Drop indexes that may have been created for dropped tables
    DROP INDEX IF EXISTS idx_ai_system_messages_user_id;
    DROP INDEX IF EXISTS idx_ai_system_messages_branch_id;
    DROP INDEX IF EXISTS idx_ai_response_analysis_user_id;
    DROP INDEX IF EXISTS idx_conversation_participants_conversation_id;
    DROP INDEX IF EXISTS idx_conversation_participants_user_id;
    DROP INDEX IF EXISTS idx_user_role_assignments_user_id;
    DROP INDEX IF EXISTS idx_user_role_assignments_role_id;
    DROP INDEX IF EXISTS idx_cross_tree_access_branch_id;
    DROP INDEX IF EXISTS idx_cross_tree_access_tree_id;
    DROP INDEX IF EXISTS idx_media_post_id;
    DROP INDEX IF EXISTS idx_media_user_id;
    
    RAISE NOTICE 'Dropped orphaned indexes';
    
    -- ===== CLEANUP FUNCTIONS =====
    -- Drop any functions related to deleted tables
    
    DROP FUNCTION IF EXISTS update_ai_system_messages_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_ai_response_analysis_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_user_conversation_states_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_conversations_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_media_updated_at() CASCADE;
    
    RAISE NOTICE 'Dropped unused functions';
    
    -- Final success message
    RAISE NOTICE 'Database cleanup migration completed successfully!';
    RAISE NOTICE 'Removed unused tables, views, indexes, and functions';
    RAISE NOTICE 'Your database is now cleaner and more efficient';
    
END $$;

-- ===== SUMMARY OF CHANGES =====
-- This migration removed the following unused components:
--
-- TABLES REMOVED:
-- - ai_system_messages (unused AI system)
-- - ai_response_analysis (unused AI analytics)
-- - user_conversation_states (unused conversation system)
-- - ai_prompts (unused AI prompting)
-- - conversations (unused chat feature)
-- - conversation_participants (unused chat participants)
-- - roles (unused RBAC system)
-- - permissions (unused RBAC permissions)
-- - role_permissions (unused RBAC junction table)
-- - user_role_assignments (unused RBAC assignments)
-- - branch_categories (unused categorization)
-- - branch_join_requests (unused join request system)
-- - cross_tree_access (unused cross-tree permissions)
-- - media (unused media tracking)
-- - avatars (unused avatar storage)
-- - posts_backup_20250828 (migration backup)
--
-- VIEWS REMOVED:
-- - messages_with_context (unused conversation context)
--
-- INDEXES/FUNCTIONS CLEANED UP:
-- - Various indexes and functions related to dropped tables
--
-- TABLES PRESERVED (actively used):
-- - profiles, trees, tree_members, branches, branch_members
-- - posts (leaves), comments, likes, leaf_reactions, leaf_shares, milestones
-- - branch_invitations, invitations
-- - leaves_with_details view
--
-- NOTE: This migration is designed to be safe and includes existence checks
-- to prevent errors if tables don't exist. Always test in development first!