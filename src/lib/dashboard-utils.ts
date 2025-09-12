/**
 * Dashboard utility functions
 * Common data transformations and helpers for dashboard components
 */

import { TreeWithMembers, BranchWithMembers } from '@/types/common'

/**
 * Group user branches by their parent tree
 */
export function groupBranchesByTree(
  userBranches: BranchWithMembers[],
  trees: TreeWithMembers[]
) {
  return userBranches?.reduce((acc, ub) => {
    const treeId = ub.branches?.tree_id
    if (!treeId) return acc
    
    const treeName = trees.find(t => t.tree_id === treeId)?.trees?.name || 'Unknown Tree'
    
    if (!acc[treeId]) {
      acc[treeId] = {
        tree: trees.find(t => t.tree_id === treeId)?.trees || { name: treeName, id: treeId },
        branches: []
      }
    }
    acc[treeId].branches.push(ub)
    return acc
  }, {} as Record<string, { tree: any, branches: BranchWithMembers[] }>) || {}
}

/**
 * Format memory assignment for logging/analytics
 */
export function logMemoryAssignment(leafId: string, branchIds: string[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Memory Assignment]', {
      memoryId: leafId,
      assignedToBranches: branchIds,
      branchCount: branchIds.length,
      timestamp: new Date().toISOString()
    })
  }
  
  // In production, this could send to analytics service
  // analytics.track('memory_assigned', { leafId, branchIds })
}

/**
 * Format content creation event for logging/analytics  
 */
export function logContentCreation(type: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Content Creation]', {
      contentType: type,
      timestamp: new Date().toISOString()
    })
  }
  
  // In production, this could send to analytics service
  // analytics.track('content_creation_started', { type })
}

/**
 * Common dashboard event handlers
 */
export const createDashboardHandlers = (callbacks: {
  onMemoryAssigned?: (leafId: string, branchIds: string[]) => void
  onContentCreation?: (type: string) => void
}) => ({
  handleMemoryAssigned: (leafId: string, branchIds: string[]) => {
    logMemoryAssignment(leafId, branchIds)
    callbacks.onMemoryAssigned?.(leafId, branchIds)
  },
  
  handleContentCreation: (type: string) => {
    logContentCreation(type)
    callbacks.onContentCreation?.(type)
  }
})