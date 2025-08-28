/**
 * Leaves Utility Library
 * Helper functions for working with the Leaves memory system
 */

import { supabase } from '@/lib/supabase/client'
import { Leaf, LeafWithDetails, LeafReaction, LeafShare, Milestone, ReactionType } from '@/types/database'

export interface CreateLeafData {
  branch_id: string
  leaf_type: Leaf['leaf_type']
  content?: string
  media_urls?: string[]
  tags?: string[]
  milestone_type?: string
  milestone_date?: string
  season?: string
  ai_caption?: string
  ai_tags?: string[]
}

/**
 * Create a new leaf
 */
export async function createLeaf(leafData: CreateLeafData): Promise<Leaf | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        ...leafData,
        tags: leafData.tags || [],
        ai_tags: leafData.ai_tags || [],
        media_urls: leafData.media_urls || []
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating leaf:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating leaf:', error)
    return null
  }
}

/**
 * Get leaves for a specific tree with all related data
 */
export async function getTreeLeaves(treeId: string, limit = 20, offset = 0): Promise<LeafWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('leaves_with_details')
      .select('*')
      .eq('tree_id', treeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching tree leaves:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching tree leaves:', error)
    return []
  }
}

/**
 * Get leaves for a specific branch with all related data
 */
export async function getBranchLeaves(branchId: string, limit = 20, offset = 0): Promise<LeafWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('leaves_with_details')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching branch leaves:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching branch leaves:', error)
    return []
  }
}

/**
 * Add or update a reaction to a leaf
 */
export async function addLeafReaction(leafId: string, reactionType: ReactionType): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leaf_reactions')
      .upsert({
        leaf_id: leafId,
        reaction_type: reactionType,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }, {
        onConflict: 'leaf_id,user_id'
      })

    if (error) {
      console.error('Error adding leaf reaction:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error adding leaf reaction:', error)
    return false
  }
}

/**
 * Remove a reaction from a leaf
 */
export async function removeLeafReaction(leafId: string, reactionType: ReactionType): Promise<boolean> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return false

    const { error } = await supabase
      .from('leaf_reactions')
      .delete()
      .eq('leaf_id', leafId)
      .eq('user_id', userId)
      .eq('reaction_type', reactionType)

    if (error) {
      console.error('Error removing leaf reaction:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error removing leaf reaction:', error)
    return false
  }
}

/**
 * Share a leaf with specific branches
 */
export async function shareLeafWithBranches(leafId: string, branchIds: string[]): Promise<boolean> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return false

    // Remove existing shares
    await supabase
      .from('leaf_shares')
      .delete()
      .eq('leaf_id', leafId)

    // Add new shares
    const shareData = branchIds.map(branchId => ({
      leaf_id: leafId,
      branch_id: branchId,
      shared_by: userId
    }))

    const { error } = await supabase
      .from('leaf_shares')
      .insert(shareData)

    if (error) {
      console.error('Error sharing leaf:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sharing leaf:', error)
    return false
  }
}

/**
 * Add a comment to a leaf
 */
export async function addLeafComment(leafId: string, content: string): Promise<boolean> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return false

    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: leafId, // Using post_id for backward compatibility
        author_id: userId,
        content
      })

    if (error) {
      console.error('Error adding leaf comment:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error adding leaf comment:', error)
    return false
  }
}

/**
 * Get all available milestones
 */
export async function getMilestones(): Promise<Milestone[]> {
  try {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .order('category', { ascending: true })
      .order('typical_age_months', { ascending: true })

    if (error) {
      console.error('Error fetching milestones:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return []
  }
}

/**
 * Get milestones by category
 */
export async function getMilestonesByCategory(category: string): Promise<Milestone[]> {
  try {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('category', category)
      .order('typical_age_months', { ascending: true })

    if (error) {
      console.error('Error fetching milestones by category:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching milestones by category:', error)
    return []
  }
}

/**
 * Search leaves by content, tags, or milestones
 */
export async function searchLeaves(
  query: string, 
  treeId?: string, 
  branchId?: string,
  filters?: {
    leafType?: string[]
    season?: string[]
    milestoneType?: string[]
    tags?: string[]
    dateFrom?: string
    dateTo?: string
  }
): Promise<LeafWithDetails[]> {
  try {
    let queryBuilder = supabase
      .from('leaves_with_details')
      .select('*')

    // Text search
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`content.ilike.%${query}%,ai_caption.ilike.%${query}%`)
    }

    // Tree/Branch filters
    if (treeId) {
      queryBuilder = queryBuilder.eq('tree_id', treeId)
    }
    if (branchId) {
      queryBuilder = queryBuilder.eq('branch_id', branchId)
    }

    // Apply filters
    if (filters) {
      if (filters.leafType?.length) {
        queryBuilder = queryBuilder.in('leaf_type', filters.leafType)
      }
      if (filters.season?.length) {
        queryBuilder = queryBuilder.in('season', filters.season)
      }
      if (filters.milestoneType?.length) {
        queryBuilder = queryBuilder.in('milestone_type', filters.milestoneType)
      }
      if (filters.tags?.length) {
        queryBuilder = queryBuilder.overlaps('tags', filters.tags)
      }
      if (filters.dateFrom) {
        queryBuilder = queryBuilder.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        queryBuilder = queryBuilder.lte('created_at', filters.dateTo)
      }
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error searching leaves:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error searching leaves:', error)
    return []
  }
}

/**
 * Get leaf statistics for a tree
 */
export async function getTreeStats(treeId: string): Promise<{
  totalLeaves: number
  milestoneCount: number
  recentLeaves: number
  leafTypeBreakdown: { [key: string]: number }
  seasonBreakdown: { [key: string]: number }
}> {
  try {
    const { data, error } = await supabase
      .from('leaves_with_details')
      .select('leaf_type, season, milestone_type, created_at')
      .eq('tree_id', treeId)

    if (error) {
      console.error('Error fetching tree stats:', error)
      return {
        totalLeaves: 0,
        milestoneCount: 0,
        recentLeaves: 0,
        leafTypeBreakdown: {},
        seasonBreakdown: {}
      }
    }

    const leaves = data || []
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const stats = {
      totalLeaves: leaves.length,
      milestoneCount: leaves.filter(leaf => leaf.milestone_type).length,
      recentLeaves: leaves.filter(leaf => new Date(leaf.created_at) > weekAgo).length,
      leafTypeBreakdown: {} as { [key: string]: number },
      seasonBreakdown: {} as { [key: string]: number }
    }

    // Calculate breakdowns
    leaves.forEach(leaf => {
      // Leaf type breakdown
      stats.leafTypeBreakdown[leaf.leaf_type] = (stats.leafTypeBreakdown[leaf.leaf_type] || 0) + 1
      
      // Season breakdown
      if (leaf.season) {
        stats.seasonBreakdown[leaf.season] = (stats.seasonBreakdown[leaf.season] || 0) + 1
      }
    })

    return stats
  } catch (error) {
    console.error('Error calculating tree stats:', error)
    return {
      totalLeaves: 0,
      milestoneCount: 0,
      recentLeaves: 0,
      leafTypeBreakdown: {},
      seasonBreakdown: {}
    }
  }
}

/**
 * Upload media files for a leaf
 */
export async function uploadLeafMedia(files: File[], leafId: string): Promise<string[]> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return []

    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${leafId}_${index}.${fileExt}`
      const filePath = `${userId}/${leafId}/${fileName}`

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file)

      if (error) {
        console.error('Error uploading file:', error)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      return publicUrl
    })

    const results = await Promise.all(uploadPromises)
    return results.filter((url): url is string => url !== null)
  } catch (error) {
    console.error('Error uploading leaf media:', error)
    return []
  }
}