// Re-export from the data layer for backward compatibility
export * from './data/branch-service'
import { branchService } from './data/branch-service'
import { BranchWithDetails } from '@/types/database'
import { createComponentLogger } from './logger'
import { supabase } from './supabase/client'

const logger = createComponentLogger('BranchService')

// Convenience function for getting user branches
export async function getUserBranches(userId: string): Promise<BranchWithDetails[]> {
  try {
    // Get branches where the user is a member
    const { data: membershipData } = await supabase
      .from('branch_members')
      .select(`
        branch_id,
        branches (*)
      `)
      .eq('user_id', userId)

    if (!membershipData) {
      return []
    }

    return membershipData
      .map(item => {
        const branch = (item as any).branches
        if (!branch) return null
        return {
          ...branch,
          member_count: branch.member_count || 0
        }
      })
      .filter(Boolean) as BranchWithDetails[]
  } catch (error) {
    logger.error('Error fetching user branches', error, { metadata: { userId } })
    return []
  }
}