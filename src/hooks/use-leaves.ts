/**
 * Leaf Data Hooks
 * Custom hooks for leaf-related data fetching using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, invalidateQueries } from '@/lib/query-client'
import { Leaf, LeafWithDetails, ReactionType, LeafAssignment } from '@/types/database'
import { LeafWithAssignments, UnassignedLeaf, LeafAssignmentResult } from '@/types/common'
import { 
  getTreeLeaves, 
  getBranchLeaves, 
  addLeafReaction, 
  addLeafComment,
  shareLeafWithBranches,
  createLeaf,
  getMilestones,
  CreateLeafData
} from '@/lib/leaves'
import { 
  getUserUnassignedLeaves,
  getAllUserLeaves,
  assignLeafToBranches,
  createUnassignedLeaf,
  getLeafAssignments,
  removeLeafFromBranch,
  getBranchLeaves as getBranchLeavesAssignment,
  getUserAssignmentStats
} from '@/lib/leaf-assignments'
import toast from 'react-hot-toast'

// Query hooks - Tree and Branch leaves
export const useTreeLeaves = (treeId: string, options?: { limit?: number; offset?: number }, enabled = true) => {
  const { limit = 50, offset = 0 } = options || {}
  
  return useQuery({
    queryKey: queryKeys.leaves.byTree(treeId),
    queryFn: () => getTreeLeaves(treeId, limit, offset),
    enabled: !!treeId && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - leaves change frequently
  })
}

export const useBranchLeaves = (branchId: string, options?: { limit?: number; offset?: number }, enabled = true) => {
  const { limit = 20, offset = 0 } = options || {}
  
  return useQuery({
    queryKey: queryKeys.leaves.byBranch(branchId),
    queryFn: () => getBranchLeavesAssignment(branchId, limit, offset),
    enabled: !!branchId && enabled,
    staleTime: 1 * 60 * 1000,
  })
}

export const useUserLeaves = (userId: string, options?: { limit?: number; offset?: number }, enabled = true) => {
  const { limit = 50, offset = 0 } = options || {}
  
  return useQuery({
    queryKey: queryKeys.leaves.byUser(userId),
    queryFn: () => getAllUserLeaves(userId, limit, offset),
    enabled: !!userId && enabled,
  })
}

// Query hooks - Unassigned leaves
export const useUnassignedLeaves = (userId: string, options?: { limit?: number; offset?: number }, enabled = true) => {
  const { limit = 20, offset = 0 } = options || {}
  
  return useQuery({
    queryKey: queryKeys.leaves.unassigned(userId),
    queryFn: () => getUserUnassignedLeaves(userId, limit, offset),
    enabled: !!userId && enabled,
    staleTime: 30 * 1000, // 30 seconds - unassigned leaves change more frequently
  })
}

export const useUserLeavesWithAssignments = (userId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.leaves.withAssignments(userId),
    queryFn: () => getAllUserLeaves(userId),
    enabled: !!userId && enabled,
  })
}

// Query hooks - Leaf details and assignments
export const useLeafAssignments = (leafId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.leaves.assignments(leafId),
    queryFn: () => getLeafAssignments(leafId),
    enabled: !!leafId && enabled,
  })
}

export const useUserAssignmentStats = (userId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.users.assignmentStats(userId),
    queryFn: () => getUserAssignmentStats(userId),
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Query hooks - Milestones
export const useMilestones = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.milestones.active,
    queryFn: getMilestones,
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - milestones rarely change
  })
}

// Mutation hooks - Leaf creation
export const useCreateLeaf = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLeafData) => createLeaf(data),
    onSuccess: (newLeaf: Leaf | null, variables) => {
      if (!newLeaf) return

      // Invalidate relevant queries based on leaf assignment
      if (newLeaf.branch_id) {
        // Leaf is assigned to a branch
        queryClient.invalidateQueries({ queryKey: queryKeys.leaves.byBranch(newLeaf.branch_id) })
        
        // Find tree ID from branch and invalidate tree leaves
        // Note: We might need the treeId from the component context
        invalidateQueries.leaves()
      } else {
        // Unassigned leaf
        queryClient.invalidateQueries({ queryKey: queryKeys.leaves.unassigned(newLeaf.author_id) })
      }

      // Invalidate user leaves
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.byUser(newLeaf.author_id) })
      
      toast.success('Leaf created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create leaf')
    },
  })
}

export const useCreateUnassignedLeaf = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (leafData: Parameters<typeof createUnassignedLeaf>[0]) => 
      createUnassignedLeaf(leafData),
    onSuccess: (newLeaf: Leaf | null) => {
      if (!newLeaf) return

      // Invalidate unassigned leaves
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.unassigned(newLeaf.author_id) })
      
      // Invalidate user leaves
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.byUser(newLeaf.author_id) })
      
      toast.success('Leaf created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create leaf')
    },
  })
}

// Mutation hooks - Leaf interactions
export const useAddLeafReaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leafId, reactionType }: { leafId: string; reactionType: ReactionType }) =>
      addLeafReaction(leafId, reactionType),
    onMutate: async ({ leafId, reactionType }) => {
      // Optimistic update - add reaction immediately
      await queryClient.cancelQueries({ queryKey: queryKeys.leaves.all })
      
      // Get previous data for rollback
      const previousData = queryClient.getQueriesData({ queryKey: queryKeys.leaves.all })
      
      // Update all leaf queries that might contain this leaf
      queryClient.setQueriesData(
        { queryKey: queryKeys.leaves.all },
        (oldData: any) => {
          if (!oldData?.data) return oldData
          
          const updateLeaf = (leaf: LeafWithDetails) => {
            if (leaf.id === leafId) {
              return {
                ...leaf,
                reactions: [...(leaf.reactions || []), { type: reactionType, user_id: 'temp' }]
              }
            }
            return leaf
          }
          
          if (Array.isArray(oldData.data)) {
            return { ...oldData, data: oldData.data.map(updateLeaf) }
          } else if (Array.isArray(oldData)) {
            return oldData.map(updateLeaf)
          }
          
          return oldData
        }
      )
      
      return { previousData }
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error(error.message || 'Failed to add reaction')
    },
    onSuccess: () => {
      // Refetch to get accurate data
      invalidateQueries.leaves()
    },
  })
}

export const useAddLeafComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leafId, comment }: { leafId: string; comment: string }) =>
      addLeafComment(leafId, comment),
    onSuccess: () => {
      // Invalidate all leaf queries to refresh comments
      invalidateQueries.leaves()
      toast.success('Comment added successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment')
    },
  })
}

// Mutation hooks - Leaf assignment
export const useAssignLeafToBranches = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      leafId, 
      branchIds, 
      assignedBy, 
      primaryBranchId 
    }: { 
      leafId: string
      branchIds: string[]
      assignedBy: string
      primaryBranchId?: string 
    }) => assignLeafToBranches(leafId, branchIds, assignedBy, primaryBranchId),
    onSuccess: (result: LeafAssignmentResult, { leafId, assignedBy, branchIds }) => {
      // Invalidate leaf assignments
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.assignments(leafId) })
      
      // Invalidate unassigned leaves
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.unassigned(assignedBy) })
      
      // Invalidate branch leaves for all affected branches
      branchIds.forEach(branchId => {
        queryClient.invalidateQueries({ queryKey: queryKeys.leaves.byBranch(branchId) })
      })
      
      // Invalidate user assignment stats
      queryClient.invalidateQueries({ queryKey: queryKeys.users.assignmentStats(assignedBy) })
      
      toast.success('Leaf assigned successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign leaf')
    },
  })
}

export const useRemoveLeafFromBranch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leafId, branchId }: { leafId: string; branchId: string }) =>
      removeLeafFromBranch(leafId, branchId),
    onSuccess: (_, { leafId, branchId }) => {
      // Invalidate leaf assignments
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.assignments(leafId) })
      
      // Invalidate branch leaves
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.byBranch(branchId) })
      
      // Invalidate all leaves to refresh assignment status
      invalidateQueries.leaves()
      
      toast.success('Leaf removed from branch successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove leaf from branch')
    },
  })
}

export const useShareLeafWithBranches = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leafId, branchIds }: { leafId: string; branchIds: string[] }) =>
      shareLeafWithBranches(leafId, branchIds),
    onSuccess: (_, { branchIds }) => {
      // Invalidate branch leaves for all affected branches
      branchIds.forEach(branchId => {
        queryClient.invalidateQueries({ queryKey: queryKeys.leaves.byBranch(branchId) })
      })
      
      // Invalidate all leaves
      invalidateQueries.leaves()
      
      toast.success('Leaf shared successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to share leaf')
    },
  })
}