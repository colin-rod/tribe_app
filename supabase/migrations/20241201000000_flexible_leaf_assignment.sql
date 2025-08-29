-- Migration: Add flexible leaf assignment support
-- This enables leaves to be unassigned or assigned to multiple branches

-- Add assignment status to existing leaves table
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS assignment_status VARCHAR DEFAULT 'assigned' 
  CHECK (assignment_status IN ('assigned', 'unassigned', 'multi-assigned'));

-- Create leaf assignments junction table for many-to-many relationships
CREATE TABLE IF NOT EXISTS leaf_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaf_id UUID NOT NULL REFERENCES leaves(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique leaf-branch combinations
  UNIQUE(leaf_id, branch_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaf_assignments_leaf_id ON leaf_assignments(leaf_id);
CREATE INDEX IF NOT EXISTS idx_leaf_assignments_branch_id ON leaf_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_leaf_assignments_assigned_by ON leaf_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_leaves_assignment_status ON leaves(assignment_status);

-- Create updated_at trigger for leaf_assignments
CREATE OR REPLACE FUNCTION update_leaf_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leaf_assignments_updated_at ON leaf_assignments;
CREATE TRIGGER trigger_leaf_assignments_updated_at
  BEFORE UPDATE ON leaf_assignments
  FOR EACH ROW EXECUTE FUNCTION update_leaf_assignments_updated_at();

-- Create view for leaves with assignment details
CREATE OR REPLACE VIEW leaves_with_assignments AS
SELECT 
  l.*,
  COALESCE(
    json_agg(
      json_build_object(
        'assignment_id', la.id,
        'branch_id', la.branch_id,
        'branch_name', b.name,
        'branch_color', b.color,
        'is_primary', la.is_primary,
        'assigned_at', la.assigned_at,
        'assigned_by', la.assigned_by
      )
    ) FILTER (WHERE la.id IS NOT NULL),
    '[]'::json
  ) as assignments,
  COUNT(la.id) as assignment_count
FROM leaves l
LEFT JOIN leaf_assignments la ON l.id = la.leaf_id
LEFT JOIN branches b ON la.branch_id = b.id
GROUP BY l.id;

-- Function to get unassigned leaves for a user
CREATE OR REPLACE FUNCTION get_user_unassigned_leaves(user_id UUID, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE(
  id UUID,
  content TEXT,
  media_urls TEXT[],
  leaf_type VARCHAR,
  milestone_type VARCHAR,
  tags TEXT[],
  ai_caption TEXT,
  ai_tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  author_first_name VARCHAR,
  author_last_name VARCHAR,
  author_avatar_url VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.content,
    l.media_urls,
    l.leaf_type,
    l.milestone_type,
    l.tags,
    l.ai_caption,
    l.ai_tags,
    l.created_at,
    l.updated_at,
    p.first_name as author_first_name,
    p.last_name as author_last_name,
    p.avatar_url as author_avatar_url
  FROM leaves l
  JOIN profiles p ON l.author_id = p.id
  WHERE l.author_id = user_id 
    AND l.assignment_status = 'unassigned'
  ORDER BY l.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign leaf to branch(es)
CREATE OR REPLACE FUNCTION assign_leaf_to_branches(
  p_leaf_id UUID,
  p_branch_ids UUID[],
  p_assigned_by UUID,
  p_primary_branch_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  branch_id UUID;
  assignment_count INTEGER;
BEGIN
  -- Delete existing assignments
  DELETE FROM leaf_assignments WHERE leaf_id = p_leaf_id;
  
  -- Insert new assignments
  FOREACH branch_id IN ARRAY p_branch_ids LOOP
    INSERT INTO leaf_assignments (leaf_id, branch_id, assigned_by, is_primary)
    VALUES (
      p_leaf_id, 
      branch_id, 
      p_assigned_by,
      (branch_id = COALESCE(p_primary_branch_id, p_branch_ids[1]))
    );
  END LOOP;
  
  -- Update leaf assignment status
  SELECT array_length(p_branch_ids, 1) INTO assignment_count;
  
  UPDATE leaves 
  SET 
    assignment_status = CASE 
      WHEN assignment_count = 0 THEN 'unassigned'
      WHEN assignment_count = 1 THEN 'assigned'
      ELSE 'multi-assigned'
    END,
    -- Keep branch_id for backward compatibility (use primary branch)
    branch_id = COALESCE(p_primary_branch_id, p_branch_ids[1])
  WHERE id = p_leaf_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for leaf_assignments table
ALTER TABLE leaf_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments for branches they're members of
CREATE POLICY "Users can view leaf assignments for their branches" ON leaf_assignments
  FOR SELECT USING (
    branch_id IN (
      SELECT branch_id FROM user_branches WHERE user_id = auth.uid()
    )
  );

-- Users can create assignments for branches they have permission to manage
CREATE POLICY "Users can create leaf assignments for manageable branches" ON leaf_assignments
  FOR INSERT WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM user_branches 
      WHERE user_id = auth.uid() 
      AND ('manage_content' = ANY(permissions) OR role IN ('owner', 'admin'))
    )
  );

-- Users can update assignments they created or have permission to manage
CREATE POLICY "Users can update their leaf assignments" ON leaf_assignments
  FOR UPDATE USING (
    assigned_by = auth.uid() 
    OR branch_id IN (
      SELECT branch_id FROM user_branches 
      WHERE user_id = auth.uid() 
      AND ('manage_content' = ANY(permissions) OR role IN ('owner', 'admin'))
    )
  );

-- Users can delete assignments they created or have permission to manage
CREATE POLICY "Users can delete their leaf assignments" ON leaf_assignments
  FOR DELETE USING (
    assigned_by = auth.uid()
    OR branch_id IN (
      SELECT branch_id FROM user_branches 
      WHERE user_id = auth.uid() 
      AND ('manage_content' = ANY(permissions) OR role IN ('owner', 'admin'))
    )
  );

-- Update existing leaves to have proper assignment status based on current branch_id
UPDATE leaves 
SET assignment_status = CASE 
  WHEN branch_id IS NOT NULL THEN 'assigned'
  ELSE 'unassigned'
END;

-- Migrate existing leaves to leaf_assignments table
INSERT INTO leaf_assignments (leaf_id, branch_id, assigned_by, is_primary, assigned_at)
SELECT 
  l.id as leaf_id,
  l.branch_id,
  l.author_id as assigned_by,
  TRUE as is_primary,
  l.created_at as assigned_at
FROM leaves l
WHERE l.branch_id IS NOT NULL
ON CONFLICT (leaf_id, branch_id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON leaf_assignments TO authenticated;
GRANT USAGE ON SEQUENCE leaf_assignments_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_unassigned_leaves(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_leaf_to_branches(UUID, UUID[], UUID, UUID) TO authenticated;