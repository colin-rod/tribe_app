import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createComponentLogger } from '@/lib/logger'
import { createRateLimitMiddleware } from '@/lib/validation/middleware'

const logger = createComponentLogger('DeleteAccountAPI')

// Rate limiting: 3 attempts per hour per user (strict for security)
const rateLimitMiddleware = createRateLimitMiddleware({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (req) => {
    const userId = req.headers.get('x-user-id')
    const ip = req.ip || 'unknown'
    return userId ? `delete-account:${userId}` : `delete-account-ip:${ip}`
  },
})

/**
 * DELETE /api/auth/delete-account
 * Delete user account and all associated data
 */
export async function DELETE(req: NextRequest) {
  return rateLimitMiddleware(async (req: NextRequest) => {
    try {
      const supabase = await createClient()
      const serviceSupabase = createServiceClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        logger.warn('Unauthorized account deletion attempt')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const userId = user.id

      logger.info('Starting account deletion process', { userId })

      // Start a transaction-like cleanup process
      try {
        // 1. Delete user's leaves/posts
        const { error: leavesError } = await serviceSupabase
          .from('posts')
          .delete()
          .eq('author_id', userId)

        if (leavesError) {
          logger.error('Failed to delete user posts', leavesError, { userId })
        }

        // 2. Remove user from all tree memberships
        const { error: treeMembersError } = await serviceSupabase
          .from('tree_members')
          .delete()
          .eq('user_id', userId)

        if (treeMembersError) {
          logger.error('Failed to remove tree memberships', treeMembersError, { userId })
        }

        // 3. Remove user from all branch memberships
        const { error: branchMembersError } = await serviceSupabase
          .from('branch_members')
          .delete()
          .eq('user_id', userId)

        if (branchMembersError) {
          logger.error('Failed to remove branch memberships', branchMembersError, { userId })
        }

        // 4. Delete invitations sent by user
        const { error: sentInvitationsError } = await serviceSupabase
          .from('invitations')
          .delete()
          .eq('invited_by', userId)

        if (sentInvitationsError) {
          logger.error('Failed to delete sent invitations', sentInvitationsError, { userId })
        }

        // 5. Delete branch invitations sent by user
        const { error: sentBranchInvitationsError } = await serviceSupabase
          .from('branch_invitations')
          .delete()
          .eq('invited_by', userId)

        if (sentBranchInvitationsError) {
          logger.error('Failed to delete sent branch invitations', sentBranchInvitationsError, { userId })
        }

        // 6. Delete pending invitations for user's email
        const { data: profile } = await serviceSupabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single()

        if (profile?.email) {
          // Delete invitations sent to user's email
          const { error: receivedInvitationsError } = await serviceSupabase
            .from('invitations')
            .delete()
            .eq('email', profile.email)

          if (receivedInvitationsError) {
            logger.error('Failed to delete received invitations', receivedInvitationsError, { userId })
          }

          const { error: receivedBranchInvitationsError } = await serviceSupabase
            .from('branch_invitations')
            .delete()
            .eq('email', profile.email)

          if (receivedBranchInvitationsError) {
            logger.error('Failed to delete received branch invitations', receivedBranchInvitationsError, { userId })
          }
        }

        // 7. Handle trees where user is the only owner
        const { data: ownedTrees } = await serviceSupabase
          .from('tree_members')
          .select('tree_id, trees(id, name)')
          .eq('user_id', userId)
          .eq('role', 'owner')

        if (ownedTrees && ownedTrees.length > 0) {
          for (const treeData of ownedTrees) {
            // Check if there are other owners
            const { data: otherOwners } = await serviceSupabase
              .from('tree_members')
              .select('user_id')
              .eq('tree_id', treeData.tree_id)
              .eq('role', 'owner')
              .neq('user_id', userId)

            if (!otherOwners || otherOwners.length === 0) {
              // User is the only owner - delete the entire tree and its data
              logger.info('Deleting tree with no other owners', { 
                treeId: treeData.tree_id, 
                userId 
              })

              // Delete all branches in the tree
              const { error: branchesError } = await serviceSupabase
                .from('branches')
                .delete()
                .eq('tree_id', treeData.tree_id)

              if (branchesError) {
                logger.error('Failed to delete tree branches', branchesError, { 
                  treeId: treeData.tree_id, 
                  userId 
                })
              }

              // Delete the tree itself
              const { error: treeError } = await serviceSupabase
                .from('trees')
                .delete()
                .eq('id', treeData.tree_id)

              if (treeError) {
                logger.error('Failed to delete tree', treeError, { 
                  treeId: treeData.tree_id, 
                  userId 
                })
              }
            }
          }
        }

        // 8. Delete user profile
        const { error: profileError } = await serviceSupabase
          .from('profiles')
          .delete()
          .eq('id', userId)

        if (profileError) {
          logger.error('Failed to delete user profile', profileError, { userId })
        }

        // 9. Delete auth user (this should be done last)
        const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(userId)

        if (authDeleteError) {
          logger.error('Failed to delete auth user', authDeleteError, { userId })
          return NextResponse.json(
            { error: 'Failed to delete account completely. Please contact support.' },
            { status: 500 }
          )
        }

        logger.info('Account deletion completed successfully', { userId })

        return NextResponse.json({
          success: true,
          message: 'Account deleted successfully'
        })

      } catch (cleanupError) {
        logger.error('Error during account cleanup', cleanupError, { userId })
        return NextResponse.json(
          { error: 'Failed to delete account. Some data may not have been removed.' },
          { status: 500 }
        )
      }

    } catch (error) {
      logger.error('Unexpected error in account deletion', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })(req)
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}