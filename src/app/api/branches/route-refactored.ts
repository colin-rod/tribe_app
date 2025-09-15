// z imported from base-route createAPIRoute
import { createAPIRoute, createPaginationParams, parseQueryFilters, formatPaginatedResponse } from '@/lib/api/base-route'
import { branchCreateSchema } from '@/lib/validation/schemas'
import { getUserBranchPermissions } from '@/lib/rbac'

// API configuration
const api = createAPIRoute({
  name: 'Branches',
  rateLimitConfig: {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  },
  requireAuth: true,
  schema: branchCreateSchema
})

/**
 * POST /api/branches
 * Create a new branch
 */
export const POST = api.POST(async ({ user, supabase, validatedData }) => {
  // Check permissions
  const permissions = await getUserBranchPermissions(user.id, validatedData.tree_id)
  if (!permissions.canCreatePosts) {
    api.logger.warn('User lacks permission to create branch', { 
      userId: user.id, 
      metadata: { tree_id: validatedData.tree_id }
    })
    return api.errorResponse('Insufficient permissions', 403)
  }

  // Create the branch
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .insert({
      ...validatedData,
      created_by: user.id,
      is_discoverable: false,
      auto_approve_members: true,
    })
    .select()
    .single()

  if (branchError) {
    return api.handleDatabaseError(branchError, 'branch creation', api.logger)
  }

  // Assign owner role to creator
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: user.id,
      role_id: 'owner',
      context_type: 'branch',
      context_id: branch.id,
      granted_by: user.id,
    })

  if (roleError) {
    api.logger.error('Failed to assign owner role', roleError, { 
      userId: user.id, 
      metadata: { branch_id: branch.id }
    })
    // Continue anyway - branch was created successfully
  }

  api.logger.info('Branch created successfully', { 
    userId: user.id, 
    metadata: { branch_id: branch.id, tree_id: validatedData.tree_id }
  })

  return api.successResponse(branch, 'Branch created successfully', 201)
})

/**
 * GET /api/branches
 * Get branches with filtering and pagination
 */
export const GET = api.GET(async ({ req, user, supabase }) => {
  const pagination = createPaginationParams(req)
  const filters = parseQueryFilters(req)

  // Build query
  let query = supabase
    .from('branches')
    .select(`
      id,
      name,
      description,
      color,
      type,
      privacy,
      created_at,
      tree_id,
      created_by
    `)

  // Apply filters
  if (filters.tree_id) {
    query = query.eq('tree_id', filters.tree_id)
  }

  // Only show branches user has access to
  query = query.or(`privacy.eq.public,created_by.eq.${user.id}`)

  // Apply pagination and ordering
  query = query
    .range(...pagination.range)
    .order('created_at', { ascending: false })

  const { data: branches, error: branchError } = await query

  if (branchError) {
    return api.handleDatabaseError(branchError, 'branch fetch', api.logger)
  }

  api.logger.info('Branches fetched successfully', {
    userId: user.id,
    metadata: { 
      count: branches?.length || 0,
      filters,
      pagination 
    }
  })

  return api.successResponse(
    formatPaginatedResponse(branches || [], pagination)
  )
})

// Handle unsupported methods automatically
export const PUT = api.PUT(async () => api.errorResponse('Method not allowed', 405))
export const DELETE = api.DELETE(async () => api.errorResponse('Method not allowed', 405))
export const PATCH = api.PATCH(async () => api.errorResponse('Method not allowed', 405))