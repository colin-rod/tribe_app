/**
 * Leaf Assignment Service
 * Functions for managing flexible leaf assignments to branches
 */

import { supabase } from '@/lib/supabase/client'
import { LeafWithAssignments, UnassignedLeaf, LeafAssignmentResult } from '@/types/common'
import { Leaf, LeafAssignment } from '@/types/database'
import { AsyncUtils } from '@/lib/errors/async-error-wrapper'
import { createComponentLogger } from './logger'

const logger = createComponentLogger('LeafAssignmentService')

/**
 * Get unassigned leaves for a user
 */
export async function getUserUnassignedLeaves(
  userId: string, 
  limit = 20, 
  offset = 0
): Promise<UnassignedLeaf[]> {
  return AsyncUtils.supabaseQuery(
    () => supabase.rpc('get_user_unassigned_leaves', {
      user_id: userId,
      limit_count: limit,
      offset_count: offset
    }),
    'Failed to fetch unassigned leaves'
  ).then(result => result.data || [])
}

/**
 * Get all leaves for a user (assigned and unassigned)
 */
export async function getAllUserLeaves(
  userId: string,
  limit = 50,
  offset = 0
): Promise<LeafWithAssignments[]> {
  return AsyncUtils.supabaseQuery(
    () => supabase
      .from('leaves_with_assignments')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    'Failed to fetch user leaves'
  ).then(result => result.data || [])
}

/**
 * Assign a leaf to one or more branches
 */
export async function assignLeafToBranches(
  leafId: string,
  branchIds: string[],
  assignedBy: string,
  primaryBranchId?: string
): Promise<LeafAssignmentResult> {
  try {
    const result = await AsyncUtils.supabaseQuery(
      () => supabase.rpc('assign_leaf_to_branches', {
        p_leaf_id: leafId,
        p_branch_ids: branchIds,
        p_assigned_by: assignedBy,
        p_primary_branch_id: primaryBranchId || null
      }),
      'Failed to assign leaf to branches'
    )

    if (result.data) {
      return {
        success: true,
        leaf_id: leafId,
        assignments: branchIds
      }
    } else {
      return {
        success: false,
        leaf_id: leafId,
        assignments: [],
        error: 'Assignment failed'
      }
    }
  } catch (error: unknown) {
    return {
      success: false,
      leaf_id: leafId,
      assignments: [],
      error: error.message || 'Assignment failed'
    }
  }
}

/**
 * Create a leaf without any branch assignment (unassigned)
 */
export async function createUnassignedLeaf(
  leafData: {
    author_id: string
    leaf_type: string
    content?: string
    media_urls?: string[]
    tags?: string[]
    milestone_type?: string
    milestone_date?: string
    season?: string
    ai_caption?: string
    ai_tags?: string[]
  },
  clientOverride?: any
): Promise<Leaf | null> {
  const client = clientOverride || supabase
  
  return AsyncUtils.supabaseQuery(
    () => client
      .from('posts')
      .insert({
        ...leafData,
        branch_id: null,
        assignment_status: 'unassigned',
        tags: leafData.tags || [],
        ai_tags: leafData.ai_tags || [],
        media_urls: leafData.media_urls || [],
        message_type: 'post',
        is_pinned: false
      })
      .select()
      .single(),
    'Failed to create unassigned leaf'
  ).then(result => result.data)
}

/**
 * Get leaf assignments for a specific leaf
 */
export async function getLeafAssignments(leafId: string): Promise<LeafAssignment[]> {
  return AsyncUtils.supabaseQuery(
    () => supabase
      .from('leaf_assignments')
      .select(`
        *,
        branches (
          id,
          name,
          color
        )
      `)
      .eq('leaf_id', leafId)
      .order('assigned_at', { ascending: false }),
    'Failed to fetch leaf assignments'
  ).then(result => result.data || [])
}

/**
 * Remove leaf from branch (delete specific assignment)
 */
export async function removeLeafFromBranch(
  leafId: string, 
  branchId: string
): Promise<boolean> {
  try {
    const result = await AsyncUtils.supabaseQuery(
      () => supabase
        .from('leaf_assignments')
        .delete()
        .eq('leaf_id', leafId)
        .eq('branch_id', branchId),
      'Failed to remove leaf from branch'
    )

    // Check if leaf now has no assignments and update status
    const remainingAssignments = await getLeafAssignments(leafId)
    
    if (remainingAssignments.length === 0) {
      await AsyncUtils.supabaseQuery(
        () => supabase
          .from('posts')
          .update({ 
            assignment_status: 'unassigned',
            branch_id: null 
          })
          .eq('id', leafId),
        'Failed to update leaf assignment status'
      )
    } else if (remainingAssignments.length === 1) {
      await AsyncUtils.supabaseQuery(
        () => supabase
          .from('posts')
          .update({ 
            assignment_status: 'assigned',
            branch_id: remainingAssignments[0].branch_id 
          })
          .eq('id', leafId),
        'Failed to update leaf assignment status'
      )
    }

    return true
  } catch (error) {
    logger.error('Error removing leaf from branch', error, { leafId, branchId })
    return false
  }
}

/**
 * Delete an unassigned leaf permanently
 */
export async function deleteUnassignedLeaf(leafId: string, userId: string): Promise<boolean> {
  try {
    // First verify the leaf is unassigned and belongs to the user
    const { data: leaf, error: leafError } = await supabase
      .from('posts')
      .select('id, assignment_status, author_id')
      .eq('id', leafId)
      .eq('author_id', userId)
      .eq('assignment_status', 'unassigned')
      .single()

    if (leafError || !leaf) {
      logger.error('Leaf not found or not eligible for deletion', leafError, { leafId, userId })
      return false
    }

    // Delete the leaf
    const result = await AsyncUtils.supabaseQuery(
      () => supabase
        .from('posts')
        .delete()
        .eq('id', leafId)
        .eq('author_id', userId)
        .eq('assignment_status', 'unassigned'),
      'Failed to delete unassigned leaf'
    )

    return true
  } catch (error) {
    logger.error('Error deleting unassigned leaf', error, { leafId, userId })
    return false
  }
}

/**
 * Get leaves for a branch (including multi-assigned ones)
 */
export async function getBranchLeaves(
  branchId: string,
  limit = 20,
  offset = 0
): Promise<LeafWithAssignments[]> {
  return AsyncUtils.supabaseQuery(
    () => supabase
      .from('leaves_with_assignments')
      .select('*')
      .eq('assignments->branch_id', branchId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    'Failed to fetch branch leaves'
  ).then(result => result.data || [])
}

/**
 * Check if user can assign leaves to a branch
 */
export async function canUserAssignTosBranch(
  userId: string,
  branchId: string
): Promise<boolean> {
  try {
    const result = await AsyncUtils.supabaseQuery(
      () => supabase
        .from('user_branches')
        .select('permissions, role')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .single(),
      'Failed to check branch permissions'
    )

    if (!result.data) return false

    const { permissions, role } = result.data
    return (
      ['owner', 'admin'].includes(role) ||
      (permissions && permissions.includes('manage_content'))
    )
  } catch (error) {
    logger.error('Error checking assignment permissions', error, { userId, branchId })
    return false
  }
}

/**
 * Get assignment statistics for a user
 */
export async function getUserAssignmentStats(userId: string): Promise<{
  totalLeaves: number
  assignedLeaves: number
  unassignedLeaves: number
  multiAssignedLeaves: number
}> {
  try {
    const results = await Promise.all([
      // Total leaves
      AsyncUtils.supabaseQuery(
        () => supabase
          .from('posts')
          .select('id', { count: 'exact' })
          .eq('author_id', userId),
        'Failed to count total leaves'
      ),
      // Assigned leaves
      AsyncUtils.supabaseQuery(
        () => supabase
          .from('posts')
          .select('id', { count: 'exact' })
          .eq('author_id', userId)
          .eq('assignment_status', 'assigned'),
        'Failed to count assigned leaves'
      ),
      // Unassigned leaves
      AsyncUtils.supabaseQuery(
        () => supabase
          .from('posts')
          .select('id', { count: 'exact' })
          .eq('author_id', userId)
          .eq('assignment_status', 'unassigned'),
        'Failed to count unassigned leaves'
      ),
      // Multi-assigned leaves
      AsyncUtils.supabaseQuery(
        () => supabase
          .from('posts')
          .select('id', { count: 'exact' })
          .eq('author_id', userId)
          .eq('assignment_status', 'multi-assigned'),
        'Failed to count multi-assigned leaves'
      )
    ])

    return {
      totalLeaves: results[0].data?.count || 0,
      assignedLeaves: results[1].data?.count || 0,
      unassignedLeaves: results[2].data?.count || 0,
      multiAssignedLeaves: results[3].data?.count || 0
    }
  } catch (error) {
    logger.error('Error getting assignment stats', error, { userId })
    return {
      totalLeaves: 0,
      assignedLeaves: 0,
      unassignedLeaves: 0,
      multiAssignedLeaves: 0
    }
  }
}