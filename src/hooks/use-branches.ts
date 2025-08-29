/**
 * Branch Data Hooks
 * Custom hooks for branch-related data fetching using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { branchService } from '@/lib/data'
import { queryKeys, invalidateQueries } from '@/lib/query-client'
import { Branch, BranchMember, BranchPermissions } from '@/types/database'
import { BranchWithMembers, BranchWithRelations } from '@/types/common'
import { CreateBranchData, UpdateBranchData } from '@/lib/data/branch-service'
import { getUserBranchPermissions } from '@/lib/rbac'
import toast from 'react-hot-toast'

// Query hooks
export const useBranchesByTree = (treeId: string, options?: { userId?: string }, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.branches.byTree(treeId),
    queryFn: () => branchService.findByTree(treeId, {
      page: 1,
      limit: 50,
      memberId: options?.userId
    }),
    enabled: !!treeId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useUserBranches = (userId: string, treeId?: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.branches.byUser(userId, treeId),
    queryFn: async () => {
      const { getUserBranches } = await import('@/lib/branches')
      return getUserBranches(userId, treeId)
    },
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export const useBranch = (branchId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.branches.byId(branchId),
    queryFn: () => branchService.findById(branchId),
    enabled: !!branchId && enabled,
  })
}

export const useBranchWithRelations = (branchId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.branches.withRelations(branchId),
    queryFn: () => branchService.findWithRelations(branchId),
    enabled: !!branchId && enabled,
  })
}

export const useBranchMembers = (branchId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.branches.members(branchId),
    queryFn: () => branchService.getMembers(branchId),
    enabled: !!branchId && enabled,
  })
}

export const useBranchPermissions = (userId: string, branchId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.users.permissions(userId, branchId),
    queryFn: () => getUserBranchPermissions(userId, branchId),
    enabled: !!userId && !!branchId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - permissions don't change often
  })
}

// Mutation hooks
export const useCreateBranch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, userId }: { data: CreateBranchData; userId: string }) =>
      branchService.createBranch(data, userId),
    onSuccess: (newBranch: Branch, { data, userId }) => {
      // Invalidate branches for the tree
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.byTree(data.tree_id) })
      
      // Invalidate user branches
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.byUser(userId) })
      
      // Optimistically add to cache if we have tree branches data
      queryClient.setQueryData(
        queryKeys.branches.byTree(data.tree_id),
        (oldData: any) => {
          if (!oldData) return oldData
          
          const newBranchWithMembers: BranchWithMembers = {
            branch_id: newBranch.id,
            branches: newBranch,
            role: 'owner',
            permissions: ['manage_branch', 'manage_members', 'manage_content'],
            member_count: 1
          }
          
          return {
            ...oldData,
            data: [newBranchWithMembers, ...oldData.data]
          }
        }
      )

      toast.success('Branch created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create branch')
    },
  })
}

export const useUpdateBranch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: UpdateBranchData }) =>
      branchService.updateBranch(branchId, data),
    onSuccess: (updatedBranch: Branch) => {
      // Update specific branch cache
      queryClient.setQueryData(queryKeys.branches.byId(updatedBranch.id), updatedBranch)
      
      // Invalidate related queries
      invalidateQueries.branchById(updatedBranch.id)
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.byTree(updatedBranch.tree_id) })
      
      toast.success('Branch updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update branch')
    },
  })
}

export const useAddBranchMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      branchId, 
      userId, 
      role = 'member' 
    }: { 
      branchId: string
      userId: string
      role?: string 
    }) => branchService.addMember(branchId, userId, role),
    onSuccess: (newMember: BranchMember, { branchId }) => {
      // Invalidate branch members and relations
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.members(branchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.withRelations(branchId) })
      
      toast.success('Member added successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add member')
    },
  })
}

export const useRemoveBranchMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ branchId, userId }: { branchId: string; userId: string }) =>
      branchService.removeMember(branchId, userId),
    onSuccess: (_, { branchId }) => {
      // Invalidate branch members and relations
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.members(branchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.withRelations(branchId) })
      
      toast.success('Member removed successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove member')
    },
  })
}

export const useUpdateBranchMemberRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      branchId, 
      userId, 
      role 
    }: { 
      branchId: string
      userId: string
      role: string 
    }) => branchService.updateMemberRole(branchId, userId, role),
    onSuccess: (_, { branchId, userId }) => {
      // Invalidate branch members and relations
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.members(branchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.withRelations(branchId) })
      
      // Invalidate user permissions for this branch
      queryClient.invalidateQueries({ queryKey: queryKeys.users.permissions(userId, branchId) })
      
      toast.success('Member role updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update member role')
    },
  })
}

export const useDeleteBranch = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (branchId: string) => branchService.delete(branchId),
    onSuccess: (_, branchId) => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: queryKeys.branches.byId(branchId) })
      queryClient.removeQueries({ queryKey: queryKeys.branches.withRelations(branchId) })
      queryClient.removeQueries({ queryKey: queryKeys.branches.members(branchId) })
      
      // Invalidate branch lists
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all })
      
      toast.success('Branch deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete branch')
    },
  })
}