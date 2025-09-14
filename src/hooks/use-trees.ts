/**
 * Tree Data Hooks
 * Custom hooks for tree-related data fetching using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { treeService } from '@/lib/data'
import { queryKeys, invalidateQueries } from '@/lib/query-client'
import { Tree, TreeMember } from '@/types/database'
import { TreeWithMembers } from '@/types/common'
import { CreateTreeData, UpdateTreeData } from '@/lib/data/tree-service'
import toast from 'react-hot-toast'

// Query hooks
export const useUserTrees = (userId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.trees.byUser(userId),
    queryFn: () => treeService.findByUser(userId, { page: 1, limit: 50 }),
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - trees don't change often
  })
}

export const useTree = (treeId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.trees.byId(treeId),
    queryFn: () => treeService.findById(treeId),
    enabled: !!treeId && enabled,
  })
}

export const useTreeWithRelations = (treeId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.trees.withRelations(treeId),
    queryFn: () => treeService.findWithRelations(treeId),
    enabled: !!treeId && enabled,
  })
}

export const useTreeStats = (treeId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.trees.stats(treeId),
    queryFn: async () => {
      const { getTreeStats } = await import('@/lib/leaves')
      return getTreeStats(treeId)
    },
    enabled: !!treeId && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - stats can change more frequently
  })
}

// Mutation hooks
export const useCreateTree = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, userId }: { data: CreateTreeData; userId: string }) =>
      treeService.createTree(data, userId),
    onSuccess: (newTree: Tree, { userId }) => {
      // Invalidate and refetch user trees
      queryClient.invalidateQueries({ queryKey: queryKeys.trees.byUser(userId) })
      
      // Optimistically add to cache if we have user trees data
      queryClient.setQueryData(
        queryKeys.trees.byUser(userId),
        (oldData: any) => {
          if (!oldData) return oldData
          
          const newTreeWithMembers: TreeWithMembers = {
            tree_id: newTree.id,
            trees: newTree,
            role: 'owner',
            permissions: ['manage_tree', 'manage_members', 'manage_content'],
            member_count: 1
          }
          
          return {
            ...oldData,
            data: [newTreeWithMembers, ...oldData.data]
          }
        }
      )

      toast.success('Tree created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create tree')
    },
  })
}

export const useUpdateTree = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ treeId, data }: { treeId: string; data: UpdateTreeData }) =>
      treeService.updateTree(treeId, data),
    onSuccess: (updatedTree: Tree) => {
      // Update specific tree cache
      queryClient.setQueryData(queryKeys.trees.byId(updatedTree.id), updatedTree)
      
      // Invalidate related queries
      invalidateQueries.treeById(updatedTree.id)
      
      toast.success('Tree updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update tree')
    },
  })
}

export const useAddTreeMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      treeId, 
      userId, 
      role = 'member' 
    }: { 
      treeId: string
      userId: string
      role?: string 
    }) => treeService.addMember(treeId, userId, role),
    onSuccess: (newMember: TreeMember, { treeId }) => {
      // Invalidate tree with relations to get updated member list
      queryClient.invalidateQueries({ queryKey: queryKeys.trees.withRelations(treeId) })
      
      toast.success('Member added successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add member')
    },
  })
}

export const useRemoveTreeMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ treeId, userId }: { treeId: string; userId: string }) =>
      treeService.removeMember(treeId, userId),
    onSuccess: (_, { treeId }) => {
      // Invalidate tree with relations to get updated member list
      queryClient.invalidateQueries({ queryKey: queryKeys.trees.withRelations(treeId) })
      
      toast.success('Member removed successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove member')
    },
  })
}

export const useUpdateTreeMemberRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      treeId, 
      userId, 
      role 
    }: { 
      treeId: string
      userId: string
      role: string 
    }) => treeService.updateMemberRole(treeId, userId, role),
    onSuccess: (_, { treeId }) => {
      // Invalidate tree with relations to get updated member list
      queryClient.invalidateQueries({ queryKey: queryKeys.trees.withRelations(treeId) })
      
      toast.success('Member role updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update member role')
    },
  })
}