import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRateLimitMiddleware } from '@/lib/validation/middleware'
import { invitationCreateSchema, branchInvitationCreateSchema } from '@/lib/validation/schemas'
import { sanitizeEmail } from '@/lib/validation/sanitization'
import { ValidationError, SecurityError } from '@/lib/validation/errors'
import { createComponentLogger } from '@/lib/logger'
import { getUserBranchPermissions } from '@/lib/rbac'
import { invitationEmailService } from '@/lib/email/invitation-email-service'

const logger = createComponentLogger('InvitationsAPI')

// Stricter rate limiting for invitations: 5 per minute per user
const rateLimitMiddleware = createRateLimitMiddleware({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (req) => {
    const userId = req.headers.get('x-user-id')
    const ip = req.ip || 'unknown'
    return userId ? `user:${userId}` : `ip:${ip}`
  },
})

/**
 * POST /api/invitations
 * Create a new invitation (tree or branch)
 */
export async function POST(req: NextRequest) {
  return rateLimitMiddleware(async (req: NextRequest) => {
    try {
      const supabase = await createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        logger.warn('Unauthorized invitation attempt', { userError })
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Parse and validate request body
      let requestData: unknown
      try {
        requestData = await req.json()
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON' },
          { status: 400 }
        )
      }

      // Determine invitation type and validate accordingly
      const isBranchInvitation = 'branch_id' in (requestData as Record<string, unknown>)
      const schema = isBranchInvitation ? branchInvitationCreateSchema : invitationCreateSchema

      // Validate request data
      const validationResult = schema.safeParse(requestData)
      if (!validationResult.success) {
        logger.warn('Invitation validation failed', { 
          errors: validationResult.error.errors,
          userId: user.id 
        })
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.errors.map(err => 
              `${err.path.join('.')}: ${err.message}`
            ),
          },
          { status: 400 }
        )
      }

      const validatedData = validationResult.data

      // Sanitize email
      const sanitizedEmail = sanitizeEmail(validatedData.email)
      if (!sanitizedEmail) {
        throw new ValidationError('Invalid email address', { field: 'email' })
      }

      // Security checks
      await performSecurityChecks(supabase, user.id, validatedData, sanitizedEmail)

      // Check permissions
      if (isBranchInvitation) {
        const permissions = await getUserBranchPermissions(user.id, validatedData.branch_id)
        if (!permissions.canInviteMembers) {
          throw new SecurityError('Insufficient permissions to invite members', 'branch_id')
        }
      } else if (validatedData.tree_id) {
        // Check tree permissions (simplified)
        const { data: treeMember } = await supabase
          .from('tree_members')
          .select('role')
          .eq('tree_id', validatedData.tree_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
        
        if (!treeMember || !['owner', 'admin'].includes(treeMember.role)) {
          throw new SecurityError('Insufficient permissions to invite to tree', 'tree_id')
        }
      }

      // Create invitation
      const invitationData = {
        ...validatedData,
        email: sanitizedEmail,
        invited_by: user.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }

      const tableName = isBranchInvitation ? 'branch_invitations' : 'invitations'
      const { data: invitation, error: invitationError } = await supabase
        .from(tableName)
        .insert(invitationData)
        .select()
        .single()

      if (invitationError) {
        logger.error('Failed to create invitation', invitationError, { 
          userId: user.id,
          email: sanitizedEmail,
          type: isBranchInvitation ? 'branch' : 'tree'
        })

        // Handle specific database errors
        if (invitationError.code === '23505') { // Unique constraint violation
          return NextResponse.json(
            { error: 'An invitation for this email already exists' },
            { status: 409 }
          )
        }

        return NextResponse.json(
          { error: 'Failed to create invitation' },
          { status: 500 }
        )
      }

      // Log successful invitation
      logger.info('Invitation created successfully', {
        invitationId: invitation.id,
        inviterId: user.id,
        inviteeEmail: sanitizedEmail,
        type: isBranchInvitation ? 'branch' : 'tree',
        targetId: validatedData.branch_id || validatedData.tree_id,
      })

      // Send email notification
      try {
        // Get additional data for the email
        const emailData = await getInvitationEmailData(supabase, invitation, isBranchInvitation)
        await invitationEmailService.sendInvitationEmail(emailData)
        
        logger.info('Invitation email sent successfully', {
          invitationId: invitation.id,
          email: sanitizedEmail
        })
      } catch (emailError) {
        // Log email error but don't fail the invitation creation
        logger.error('Failed to send invitation email', emailError, {
          invitationId: invitation.id,
          email: sanitizedEmail
        })
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: invitation.id,
            email: sanitizedEmail,
            role: validatedData.role,
            type: isBranchInvitation ? 'branch' : 'tree',
            expires_at: invitation.expires_at,
          },
          message: 'Invitation sent successfully',
        },
        { status: 201 }
      )

    } catch (error) {
      if (error instanceof ValidationError || error instanceof SecurityError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        )
      }

      logger.error('Unexpected error in invitation creation', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })(req)
}

/**
 * Security checks for invitation creation
 */
async function performSecurityChecks(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  validatedData: Record<string, unknown>,
  sanitizedEmail: string
) {
  // Check if user is trying to invite themselves
  if (sanitizedEmail.toLowerCase() === (await getCurrentUserEmail(supabase, userId))?.toLowerCase()) {
    throw new SecurityError('Cannot invite yourself')
  }

  // Check invitation limits (prevent spam)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentInvitations } = await supabase
    .from('invitations')
    .select('id')
    .eq('invited_by', userId)
    .gte('created_at', oneHourAgo)

  if (recentInvitations && recentInvitations.length >= 10) {
    throw new SecurityError('Too many invitations sent recently. Please wait before sending more.')
  }

  // Check if email is already a member
  if (validatedData.tree_id) {
    const { data: existingMember } = await supabase
      .from('tree_members')
      .select('id')
      .eq('tree_id', validatedData.tree_id)
      .eq('user_id', await getUserIdByEmail(supabase, sanitizedEmail))
      .single()

    if (existingMember) {
      throw new ValidationError('User is already a member of this tree', { field: 'email' })
    }
  }

  if (validatedData.branch_id) {
    const { data: existingMember } = await supabase
      .from('branch_members')
      .select('id')
      .eq('branch_id', validatedData.branch_id)
      .eq('user_id', await getUserIdByEmail(supabase, sanitizedEmail))
      .single()

    if (existingMember) {
      throw new ValidationError('User is already a member of this branch', { field: 'email' })
    }
  }

  // Check for pending invitations to prevent duplicates
  const { data: pendingInvitation } = await supabase
    .from(validatedData.branch_id ? 'branch_invitations' : 'invitations')
    .select('id')
    .eq('email', sanitizedEmail)
    .eq(validatedData.branch_id ? 'branch_id' : 'tree_id', validatedData.branch_id || validatedData.tree_id)
    .eq('status', 'pending')
    .single()

  if (pendingInvitation) {
    throw new ValidationError('A pending invitation already exists for this email', { field: 'email' })
  }
}

/**
 * Helper functions
 */
async function getCurrentUserEmail(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()
  
  return profile?.email || null
}

async function getUserIdByEmail(supabase: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()
  
  return profile?.id || null
}

/**
 * Get additional data needed for invitation email
 */
async function getInvitationEmailData(
  supabase: ReturnType<typeof createClient>, 
  invitation: { inviter_id: string; tree_id?: string; branch_id?: string; email: string; message?: string }, 
  isBranchInvitation: boolean
) {
  // Get inviter name
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', invitation.invited_by)
    .single()

  const inviterName = inviterProfile 
    ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim()
    : 'Someone'

  // Get tree/branch name
  let targetName = ''
  if (isBranchInvitation) {
    const { data: branch } = await supabase
      .from('branches')
      .select('name')
      .eq('id', invitation.branch_id)
      .single()
    targetName = branch?.name || 'Branch'
  } else if (invitation.tree_id) {
    const { data: tree } = await supabase
      .from('trees')
      .select('name')
      .eq('id', invitation.tree_id)
      .single()
    targetName = tree?.name || 'Tree'
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    invited_by: invitation.invited_by,
    tree_id: invitation.tree_id,
    branch_id: invitation.branch_id,
    expires_at: invitation.expires_at,
    tree_name: !isBranchInvitation ? targetName : undefined,
    branch_name: isBranchInvitation ? targetName : undefined,
    inviter_name: inviterName
  }
}

/**
 * GET /api/invitations
 * Get invitations for current user
 */
export async function GET(req: NextRequest) {
  return rateLimitMiddleware(async (req: NextRequest) => {
    try {
      const supabase = await createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const { searchParams } = new URL(req.url)
      const type = searchParams.get('type') // 'sent', 'received', or null for both
      const status = searchParams.get('status') || 'pending'

      let query = supabase
        .from('invitations')
        .select(`
          id,
          email,
          role,
          status,
          created_at,
          expires_at,
          tree_id,
          trees!invitations_tree_id_fkey(id, name),
          inviter:profiles!invitations_invited_by_fkey(id, first_name, last_name)
        `)

      // Filter by type
      if (type === 'sent') {
        query = query.eq('invited_by', user.id)
      } else if (type === 'received') {
        // Get user's email first
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          query = query.eq('email', profile.email)
        }
      }

      // Filter by status
      query = query.eq('status', status)
      
      // Order by creation date
      query = query.order('created_at', { ascending: false })

      const { data: invitations, error } = await query

      if (error) {
        logger.error('Failed to fetch invitations', error, { userId: user.id })
        return NextResponse.json(
          { error: 'Failed to fetch invitations' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: invitations || [],
      })

    } catch (error) {
      logger.error('Unexpected error in invitation fetch', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })(req)
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}