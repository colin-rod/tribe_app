/**
 * TanStack Query Client Configuration
 * Centralized configuration for React Query with optimized defaults
 */

import { QueryClient, QueryClientConfig } from '@tanstack/react-query'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('QueryClient')

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time updates
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Refetch on mount if data is stale
      refetchOnMount: 'if-stale',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Global error handling for mutations
      onError: (error: any) => {
        logger.error('Mutation error', error, {
          action: 'mutation_error',
          status: error?.status,
          message: error?.message
        })
      },
    },
  },
}

export const queryClient = new QueryClient(queryClientConfig)

// Query key factories for consistent query keys
export const queryKeys = {
  // Tree-related queries
  trees: {
    all: ['trees'] as const,
    byUser: (userId: string) => ['trees', 'user', userId] as const,
    byId: (treeId: string) => ['trees', 'detail', treeId] as const,
    withRelations: (treeId: string) => ['trees', 'relations', treeId] as const,
    stats: (treeId: string) => ['trees', 'stats', treeId] as const,
  },
  // Branch-related queries
  branches: {
    all: ['branches'] as const,
    byTree: (treeId: string) => ['branches', 'tree', treeId] as const,
    byUser: (userId: string, treeId?: string) => 
      treeId ? ['branches', 'user', userId, 'tree', treeId] : ['branches', 'user', userId] as const,
    byId: (branchId: string) => ['branches', 'detail', branchId] as const,
    withRelations: (branchId: string) => ['branches', 'relations', branchId] as const,
    members: (branchId: string) => ['branches', 'members', branchId] as const,
  },
  // Leaf-related queries
  leaves: {
    all: ['leaves'] as const,
    byTree: (treeId: string) => ['leaves', 'tree', treeId] as const,
    byBranch: (branchId: string) => ['leaves', 'branch', branchId] as const,
    byUser: (userId: string) => ['leaves', 'user', userId] as const,
    unassigned: (userId: string) => ['leaves', 'unassigned', userId] as const,
    withAssignments: (userId: string) => ['leaves', 'assignments', userId] as const,
    byId: (leafId: string) => ['leaves', 'detail', leafId] as const,
    assignments: (leafId: string) => ['leaves', 'assignments', leafId] as const,
  },
  // User-related queries
  users: {
    all: ['users'] as const,
    profile: (userId: string) => ['users', 'profile', userId] as const,
    settings: (userId: string) => ['users', 'settings', userId] as const,
    permissions: (userId: string, branchId: string) => 
      ['users', 'permissions', userId, 'branch', branchId] as const,
    assignmentStats: (userId: string) => ['users', 'assignment-stats', userId] as const,
  },
  // Milestone-related queries
  milestones: {
    all: ['milestones'] as const,
    active: ['milestones', 'active'] as const,
  },
} as const

// Utility functions for query invalidation
export const invalidateQueries = {
  // Invalidate all tree-related data
  trees: () => queryClient.invalidateQueries({ queryKey: queryKeys.trees.all }),
  treeById: (treeId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.trees.byId(treeId) }),
  
  // Invalidate all branch-related data
  branches: () => queryClient.invalidateQueries({ queryKey: queryKeys.branches.all }),
  branchById: (branchId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.branches.byId(branchId) }),
  
  // Invalidate all leaf-related data
  leaves: () => queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all }),
  leafById: (leafId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.leaves.byId(leafId) }),
  
  // Invalidate user data
  userProfile: (userId: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(userId) }),
}

// Prefetch utility functions
export const prefetchQueries = {
  treeDetails: async (treeId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.trees.withRelations(treeId),
      queryFn: async () => {
        const { treeService } = await import('@/lib/data')
        return treeService.findWithRelations(treeId)
      },
    })
  },
  
  branchDetails: async (branchId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.branches.withRelations(branchId),
      queryFn: async () => {
        const { branchService } = await import('@/lib/data')
        return branchService.findWithRelations(branchId)
      },
    })
  },
}