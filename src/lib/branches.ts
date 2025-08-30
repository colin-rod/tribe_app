// Re-export from the data layer for backward compatibility
export * from './data/branch-service'
import { branchService } from './data/branch-service'
import { BranchWithDetails } from '@/types/database'
import { createComponentLogger } from './logger'

const logger = createComponentLogger('BranchService')

// Convenience function for getting user branches
export async function getUserBranches(userId: string): Promise<BranchWithDetails[]> {
  try {
    // Use the existing service to get branches for a user
    // This is a simplified implementation - in a real app, you'd want to
    // properly implement this based on your data structure
    const result = await branchService.findPaginated({
      memberId: userId,
      page: 1,
      limit: 100  // Get all branches for this user
    })
    
    return result.data.map(item => ({
      ...item.branches,
      member_count: item.member_count || 0
    })).filter(Boolean) as BranchWithDetails[]
  } catch (error) {
    logger.error('Error fetching user branches', error, { userId })
    return []
  }
}