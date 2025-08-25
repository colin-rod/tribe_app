-- Debug queries to check circle creation and access
-- Run these in your Supabase SQL Editor to diagnose the issue

-- 1. Check if your user ID is correct
SELECT auth.uid() as current_user_id;

-- 2. Check what circles exist that you created
SELECT id, name, type, privacy, created_by, created_at 
FROM circles 
WHERE created_by = auth.uid()
ORDER BY created_at DESC;

-- 3. Check your circle memberships
SELECT cm.*, c.name as circle_name, c.type as circle_type
FROM circle_members cm
JOIN circles c ON c.id = cm.circle_id
WHERE cm.user_id = auth.uid()
ORDER BY cm.added_at DESC;

-- 4. Check if there are any circles you should have access to
SELECT c.id, c.name, c.type, c.privacy, c.created_by,
       CASE 
         WHEN c.created_by = auth.uid() THEN 'creator'
         WHEN EXISTS(SELECT 1 FROM circle_members cm WHERE cm.circle_id = c.id AND cm.user_id = auth.uid() AND cm.status = 'active') THEN 'member'
         WHEN c.privacy = 'public' THEN 'public'
         ELSE 'no access'
       END as access_type
FROM circles c
ORDER BY c.created_at DESC;

-- 5. Test the exact query used by the dashboard
SELECT cm.*,
       c.*
FROM circle_members cm
JOIN circles c ON c.id = cm.circle_id
WHERE cm.user_id = auth.uid() 
  AND cm.status = 'active'
ORDER BY cm.added_at DESC;