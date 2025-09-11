-- Migration: Person-Centric Tree Architecture - Phase 1
-- This migration transforms the current family-centric tree model to person-centric
-- Date: 2024-01-XX
-- Description: Add person-centric fields, cross-tree sharing, and email routing

-- ============================================================================
-- STEP 1: Clean up legacy/duplicate tables
-- ============================================================================

-- Drop legacy views that duplicate active tables
DROP VIEW IF EXISTS circles CASCADE;
DROP VIEW IF EXISTS circle_members CASCADE; 
DROP VIEW IF EXISTS circle_invitations CASCADE;
DROP VIEW IF EXISTS tribes CASCADE;
DROP VIEW IF EXISTS tribe_members CASCADE;

-- ============================================================================  
-- STEP 2: Update trees table for person-centric model
-- ============================================================================

-- Add person-centric fields to existing trees table
ALTER TABLE trees 
  ADD COLUMN IF NOT EXISTS person_name VARCHAR,
  ADD COLUMN IF NOT EXISTS person_birth_date DATE,
  ADD COLUMN IF NOT EXISTS managed_by UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS privacy_level VARCHAR DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS relationships JSONB DEFAULT '{}';

-- Add constraint for privacy_level
ALTER TABLE trees 
  ADD CONSTRAINT trees_privacy_level_check 
  CHECK (privacy_level IN ('public', 'shared', 'private'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trees_managed_by ON trees USING GIN (managed_by);
CREATE INDEX IF NOT EXISTS idx_trees_person_name ON trees (person_name);
CREATE INDEX IF NOT EXISTS idx_trees_privacy_level ON trees (privacy_level);

-- ============================================================================
-- STEP 3: Create cross-tree branch sharing infrastructure
-- ============================================================================

-- Create table for cross-tree branch connections
CREATE TABLE IF NOT EXISTS tree_branch_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  connection_type VARCHAR NOT NULL DEFAULT 'shared',
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  connected_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, tree_id)
);

-- Add constraint for connection_type
ALTER TABLE tree_branch_connections 
  ADD CONSTRAINT tree_branch_connections_type_check 
  CHECK (connection_type IN ('owner', 'shared', 'viewer'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tree_branch_connections_branch ON tree_branch_connections (branch_id);
CREATE INDEX IF NOT EXISTS idx_tree_branch_connections_tree ON tree_branch_connections (tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_branch_connections_type ON tree_branch_connections (connection_type);

-- ============================================================================
-- STEP 4: Create email routing infrastructure
-- ============================================================================

-- Create table for person-specific email addresses
CREATE TABLE IF NOT EXISTS tree_email_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  email_address VARCHAR NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tree_email_addresses_tree ON tree_email_addresses (tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_email_addresses_email ON tree_email_addresses (email_address);
CREATE INDEX IF NOT EXISTS idx_tree_email_addresses_active ON tree_email_addresses (is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STEP 5: Data migration for existing trees
-- ============================================================================

-- Migrate existing trees to person-centric model
UPDATE trees 
SET 
  person_name = name,
  managed_by = ARRAY[created_by],
  privacy_level = 'private'
WHERE person_name IS NULL;

-- Create tree-branch connections for existing branches
INSERT INTO tree_branch_connections (branch_id, tree_id, connection_type, connected_by)
SELECT 
  b.id as branch_id,
  b.tree_id,
  'owner' as connection_type,
  b.created_by as connected_by
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM tree_branch_connections tbc 
  WHERE tbc.branch_id = b.id AND tbc.tree_id = b.tree_id
);

-- Generate person-specific email addresses for existing trees
INSERT INTO tree_email_addresses (tree_id, email_address, created_by)
SELECT 
  t.id as tree_id,
  'person-' || t.id || '@yourdomain.com' as email_address,
  t.created_by
FROM trees t
WHERE NOT EXISTS (
  SELECT 1 FROM tree_email_addresses tea 
  WHERE tea.tree_id = t.id
);

-- ============================================================================
-- STEP 6: Update RLS policies for cross-tree access
-- ============================================================================

-- Update branch select policy to handle cross-tree sharing
DROP POLICY IF EXISTS "branches_select_policy" ON branches;
CREATE POLICY "branches_select_policy" ON branches
  FOR SELECT USING (
    -- Original tree member access
    EXISTS (
      SELECT 1 FROM tree_members tm 
      WHERE tm.tree_id = branches.tree_id 
        AND tm.user_id = auth.uid()
    )
    OR
    -- Cross-tree branch access via connections
    EXISTS (
      SELECT 1 FROM tree_branch_connections tbc
      JOIN tree_members tm ON tm.tree_id = tbc.tree_id
      WHERE tbc.branch_id = branches.id 
        AND tm.user_id = auth.uid()
    )
    OR
    -- User can manage the tree that owns this branch
    EXISTS (
      SELECT 1 FROM trees t
      WHERE t.id = branches.tree_id
        AND auth.uid() = ANY(t.managed_by)
    )
    OR
    -- Public branches
    branches.privacy = 'public'
  );

-- Update tree member select policy for managed trees
DROP POLICY IF EXISTS "trees_member_select" ON trees;
CREATE POLICY "trees_member_select" ON trees
  FOR SELECT USING (
    -- Original tree membership
    EXISTS (
      SELECT 1 FROM tree_members tm 
      WHERE tm.tree_id = trees.id AND tm.user_id = auth.uid()
    )
    OR
    -- Trees user can manage (for parents managing children's trees)
    auth.uid() = ANY(trees.managed_by)
    OR
    -- Public trees
    trees.privacy_level = 'public'
  );

-- Update tree update policy for managed trees
DROP POLICY IF EXISTS "trees_owner_admin_update" ON trees;
CREATE POLICY "trees_owner_admin_update" ON trees
  FOR UPDATE USING (
    -- Original owner/admin access
    EXISTS (
      SELECT 1 FROM tree_members tm 
      WHERE tm.tree_id = trees.id 
        AND tm.user_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
    )
    OR
    -- Users who can manage this tree
    auth.uid() = ANY(trees.managed_by)
  ) WITH CHECK (
    -- Same conditions for WITH CHECK
    EXISTS (
      SELECT 1 FROM tree_members tm 
      WHERE tm.tree_id = trees.id 
        AND tm.user_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
    )
    OR
    auth.uid() = ANY(trees.managed_by)
  );

-- Add RLS policies for new tables
-- Tree-Branch Connections policies
ALTER TABLE tree_branch_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tree_branch_connections_select" ON tree_branch_connections
  FOR SELECT USING (
    -- Users can see connections for trees they're members of
    EXISTS (
      SELECT 1 FROM tree_members tm 
      WHERE tm.tree_id = tree_branch_connections.tree_id 
        AND tm.user_id = auth.uid()
    )
    OR
    -- Users can see connections for trees they manage
    EXISTS (
      SELECT 1 FROM trees t
      WHERE t.id = tree_branch_connections.tree_id
        AND auth.uid() = ANY(t.managed_by)
    )
    OR
    -- Users who created the connection
    connected_by = auth.uid()
  );

CREATE POLICY "tree_branch_connections_insert" ON tree_branch_connections
  FOR INSERT WITH CHECK (
    -- Users can create connections for trees they manage or own
    EXISTS (
      SELECT 1 FROM trees t
      WHERE t.id = tree_branch_connections.tree_id
        AND (auth.uid() = ANY(t.managed_by) OR t.created_by = auth.uid())
    )
    AND
    -- Must set connected_by to current user
    connected_by = auth.uid()
  );

-- Tree Email Addresses policies  
ALTER TABLE tree_email_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tree_email_addresses_select" ON tree_email_addresses
  FOR SELECT USING (
    -- Users can see email addresses for trees they manage
    EXISTS (
      SELECT 1 FROM trees t
      WHERE t.id = tree_email_addresses.tree_id
        AND auth.uid() = ANY(t.managed_by)
    )
    OR
    -- Tree members can see the email address
    EXISTS (
      SELECT 1 FROM tree_members tm 
      WHERE tm.tree_id = tree_email_addresses.tree_id 
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "tree_email_addresses_insert" ON tree_email_addresses
  FOR INSERT WITH CHECK (
    -- Users can create email addresses for trees they manage
    EXISTS (
      SELECT 1 FROM trees t
      WHERE t.id = tree_email_addresses.tree_id
        AND auth.uid() = ANY(t.managed_by)
    )
    AND
    -- Must set created_by to current user
    created_by = auth.uid()
  );

-- ============================================================================
-- STEP 7: Create helper functions
-- ============================================================================

-- Function to check if user can manage a specific tree
CREATE OR REPLACE FUNCTION user_can_manage_tree(user_id UUID, tree_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trees t
    WHERE t.id = tree_id
      AND (
        -- User is in managed_by array
        user_id = ANY(t.managed_by)
        OR
        -- User is owner/admin of the tree
        EXISTS (
          SELECT 1 FROM tree_members tm
          WHERE tm.tree_id = t.id
            AND tm.user_id = user_id
            AND tm.role IN ('owner', 'admin')
        )
      )
  );
$$;

-- Function to get trees a user can manage
CREATE OR REPLACE FUNCTION get_user_managed_trees(user_id UUID)
RETURNS TABLE(tree_id UUID, person_name VARCHAR, privacy_level VARCHAR)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT t.id, t.person_name, t.privacy_level
  FROM trees t
  WHERE user_id = ANY(t.managed_by)
     OR EXISTS (
       SELECT 1 FROM tree_members tm
       WHERE tm.tree_id = t.id
         AND tm.user_id = user_id
         AND tm.role IN ('owner', 'admin')
     );
$$;

-- ============================================================================
-- STEP 8: Update existing database functions for cross-tree support
-- ============================================================================

-- Need to drop policies that depend on the function first, then recreate
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "comments_select_policy" ON comments;

-- Now we can drop and recreate the function
DROP FUNCTION IF EXISTS user_has_cross_tree_branch_access(uuid, uuid);

CREATE OR REPLACE FUNCTION user_has_cross_tree_branch_access(user_id UUID, branch_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    -- Original tree member access
    SELECT 1 
    FROM branches b
    JOIN tree_members tm ON tm.tree_id = b.tree_id
    WHERE b.id = branch_id
      AND tm.user_id = user_id
  )
  OR EXISTS (
    -- Cross-tree branch access via connections
    SELECT 1
    FROM tree_branch_connections tbc
    JOIN tree_members tm ON tm.tree_id = tbc.tree_id
    WHERE tbc.branch_id = branch_id
      AND tm.user_id = user_id
  )
  OR EXISTS (
    -- User can manage the tree that owns this branch
    SELECT 1
    FROM branches b
    JOIN trees t ON t.id = b.tree_id
    WHERE b.id = branch_id
      AND user_id = ANY(t.managed_by)
  );
$$;

-- Recreate the policies that were dropped
CREATE POLICY "posts_select_policy" ON posts
  FOR SELECT USING (
    user_has_cross_tree_branch_access(auth.uid(), branch_id)
  );

CREATE POLICY "comments_select_policy" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM posts p
      WHERE p.id = comments.post_id 
        AND user_has_cross_tree_branch_access(auth.uid(), p.branch_id)
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify migration success
SELECT 
  'Trees with person info' as check_name,
  COUNT(*) as count
FROM trees 
WHERE person_name IS NOT NULL;

SELECT 
  'Tree-branch connections' as check_name,
  COUNT(*) as count
FROM tree_branch_connections;

SELECT 
  'Email addresses created' as check_name,
  COUNT(*) as count  
FROM tree_email_addresses;

SELECT 
  'Active email addresses' as check_name,
  COUNT(*) as count
FROM tree_email_addresses 
WHERE is_active = TRUE;

-- ============================================================================
-- ROLLBACK PLAN (commented out, uncomment if rollback needed)
-- ============================================================================

/*
-- To rollback this migration:

-- 1. Drop new tables
DROP TABLE IF EXISTS tree_email_addresses CASCADE;
DROP TABLE IF EXISTS tree_branch_connections CASCADE;

-- 2. Remove added columns from trees
ALTER TABLE trees 
  DROP COLUMN IF EXISTS person_name,
  DROP COLUMN IF EXISTS person_birth_date,
  DROP COLUMN IF EXISTS managed_by,
  DROP COLUMN IF EXISTS privacy_level,
  DROP COLUMN IF EXISTS relationships;

-- 3. Restore original RLS policies
-- (Would need to restore from backup or recreate manually)

-- 4. Drop helper functions
DROP FUNCTION IF EXISTS user_can_manage_tree(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_managed_trees(UUID);
DROP FUNCTION IF EXISTS user_has_cross_tree_branch_access(UUID, UUID);
*/

-- Migration completed successfully
SELECT 'Person-centric tree migration completed' as status;