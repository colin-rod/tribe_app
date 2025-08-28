-- Fix missing RLS policies for trees table
-- This addresses the 403 error when trying to create trees

-- Enable RLS on trees table if not already enabled
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to create trees
CREATE POLICY "trees_authenticated_insert" ON trees
  FOR INSERT 
  TO public
  WITH CHECK (
    auth.uid() IS NOT NULL AND created_by = auth.uid()
  );

-- Policy: Users can view trees they are members of
CREATE POLICY "trees_member_select" ON trees
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tree_members tm
      WHERE tm.tree_id = trees.id 
      AND tm.user_id = auth.uid()
    )
  );

-- Policy: Tree owners and admins can update trees
CREATE POLICY "trees_owner_admin_update" ON trees
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tree_members tm
      WHERE tm.tree_id = trees.id 
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tree_members tm
      WHERE tm.tree_id = trees.id 
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Policy: Only tree owners can delete trees
CREATE POLICY "trees_owner_delete" ON trees
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tree_members tm
      WHERE tm.tree_id = trees.id 
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
    )
  );

-- Ensure tree_members policies are correct for new tree creation
-- Policy: Allow users to create their own tree membership (when creating a tree)
DROP POLICY IF EXISTS "tree_members_creator_insert" ON tree_members;
CREATE POLICY "tree_members_creator_insert" ON tree_members
  FOR INSERT
  TO public
  WITH CHECK (
    -- User can add themselves as owner when creating a tree
    (user_id = auth.uid() AND role = 'owner') OR
    -- Tree owners/admins can add other members
    EXISTS (
      SELECT 1 FROM tree_members tm
      WHERE tm.tree_id = tree_members.tree_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Policy: Users can view tree memberships for trees they belong to
DROP POLICY IF EXISTS "tree_members_member_select" ON tree_members;
CREATE POLICY "tree_members_member_select" ON tree_members
  FOR SELECT
  TO public
  USING (
    -- Users can see their own memberships
    user_id = auth.uid() OR
    -- Users can see other memberships in trees they belong to
    EXISTS (
      SELECT 1 FROM tree_members tm
      WHERE tm.tree_id = tree_members.tree_id
      AND tm.user_id = auth.uid()
    )
  );

-- Policy: Tree owners and admins can update memberships
DROP POLICY IF EXISTS "tree_members_owner_admin_update" ON tree_members;
CREATE POLICY "tree_members_owner_admin_update" ON tree_members
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tree_members tm
      WHERE tm.tree_id = tree_members.tree_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Policy: Tree owners and admins can delete memberships (except owners can't delete themselves)
DROP POLICY IF EXISTS "tree_members_owner_admin_delete" ON tree_members;
CREATE POLICY "tree_members_owner_admin_delete" ON tree_members
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tree_members tm
      WHERE tm.tree_id = tree_members.tree_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
    AND NOT (role = 'owner' AND user_id = auth.uid()) -- Owners can't delete their own ownership
  );

-- Create function to auto-add creator as tree owner (if it doesn't exist)
CREATE OR REPLACE FUNCTION create_tree_with_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as the tree owner
  INSERT INTO tree_members (tree_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.created_by, 'owner', NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add creator as owner (if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_create_tree_owner ON trees;
CREATE TRIGGER trigger_create_tree_owner
  AFTER INSERT ON trees
  FOR EACH ROW
  EXECUTE FUNCTION create_tree_with_owner();

-- Make sure trees table has the correct structure
DO $$
BEGIN
  -- Check if created_by column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trees' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE trees ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Check if is_active column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trees' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE trees ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;