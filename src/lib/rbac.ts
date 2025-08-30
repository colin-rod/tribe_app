import { supabase } from './supabase/client'
import type { 
  UserRole, 
  BranchPermissions, 
  RBACContext, 
  UserPermissions,
  CrossTreeAccess
} from '@/types/database'
import { createComponentLogger } from './logger'

const logger = createComponentLogger('RBACService')

export class RBACService {
  private static instance: RBACService
  private permissionsCache: Map<string, UserPermissions> = new Map()
  private roleCache: Map<string, UserRole> = new Map()

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService()
    }
    return RBACService.instance
  }

  // Clear caches when user context changes
  clearCache(userId?: string): void {
    if (userId) {
      this.permissionsCache.delete(userId)
      this.roleCache.delete(userId)
    } else {
      this.permissionsCache.clear()
      this.roleCache.clear()
    }
  }

  // Get user's role in a specific context (branch, tree, global)
  async getUserRole(
    userId: string, 
    context: RBACContext
  ): Promise<UserRole | 'none'> {
    const cacheKey = `${userId}:${context.type}:${context.id || 'global'}`
    
    if (this.roleCache.has(cacheKey)) {
      return this.roleCache.get(cacheKey)!
    }

    try {
      // First check if user is branch creator (automatic owner)
      if (context.type === 'branch' && context.id) {
        const { data: branch } = await supabase
          .from('branches')
          .select('created_by')
          .eq('id', context.id)
          .single()
        
        if (branch?.created_by === userId) {
          this.roleCache.set(cacheKey, 'owner')
          return 'owner'
        }
      }

      // Check assigned roles
      const query = supabase
        .from('user_roles')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('user_id', userId)
        .eq('context_type', context.type)

      if (context.id) {
        query.eq('context_id', context.id)
      } else {
        query.is('context_id', null)
      }

      const { data: userRoles, error } = await query

      if (error) throw error

      if (!userRoles || userRoles.length === 0) {
        this.roleCache.set(cacheKey, 'none')
        return 'none'
      }

      // Get the highest priority role
      const roleHierarchy = ['owner', 'admin', 'moderator', 'member', 'viewer']
      const highestRole = userRoles
        .map(ur => ur.role?.name)
        .filter(Boolean)
        .sort((a, b) => roleHierarchy.indexOf(a) - roleHierarchy.indexOf(b))[0]

      const role = (highestRole as UserRole) || 'none'
      this.roleCache.set(cacheKey, role)
      return role

    } catch (error) {
      logger.error('Error getting user role', error, { userId, context })
      return 'none'
    }
  }

  // Check if user has specific permission
  async hasPermission(
    userId: string,
    context: RBACContext,
    permissionName: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        check_user_id: userId,
        context_type: context.type,
        context_id: context.id || null,
        permission_name: permissionName
      })

      if (error) throw error
      return data === true

    } catch (error) {
      logger.error('Error checking permission', error, { userId, context, permissionName })
      return false
    }
  }

  // Get all user permissions for a context
  async getUserPermissions(
    userId: string,
    context: RBACContext
  ): Promise<UserPermissions> {
    const cacheKey = `${userId}:${context.type}:${context.id || 'global'}`
    
    if (this.permissionsCache.has(cacheKey)) {
      return this.permissionsCache.get(cacheKey)!
    }

    try {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles!inner(
            *,
            role_permissions!inner(
              *,
              permission:permissions!inner(*)
            )
          )
        `)
        .eq('user_id', userId)
        .eq('context_type', context.type)
        .eq('context_id', context.id)

      if (error) throw error

      const permissions: UserPermissions = {}
      
      userRoles?.forEach(userRole => {
        userRole.role?.role_permissions?.forEach(rp => {
          if (rp.permission?.name) {
            permissions[rp.permission.name] = true
          }
        })
      })

      this.permissionsCache.set(cacheKey, permissions)
      return permissions

    } catch (error) {
      logger.error('Error getting user permissions', error, { userId, context })
      return {}
    }
  }

  // Get comprehensive branch permissions for a user
  async getBranchPermissions(
    userId: string,
    branchId: string
  ): Promise<BranchPermissions> {
    try {
      const context: RBACContext = { type: 'branch', id: branchId }
      const userRole = await this.getUserRole(userId, context)
      
      // Base permissions object
      const permissions: BranchPermissions = {
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canCreatePosts: false,
        canModerate: false,
        canInviteMembers: false,
        canManageMembers: false,
        isOwner: userRole === 'owner',
        isAdmin: ['owner', 'admin'].includes(userRole),
        isModerator: ['owner', 'admin', 'moderator'].includes(userRole),
        userRole
      }

      // If no role in the branch's tree, check for cross-tree access only (no public branches)
      if (userRole === 'none') {
        // Check for cross-tree access
        const hasCrossTreeAccess = await hasUserCrossTreeAccess(userId, branchId)
        if (hasCrossTreeAccess) {
          // Get cross-tree permissions - for now, assume basic permissions
          permissions.canRead = true
          permissions.canCreatePosts = true
          // Cross-tree users typically can't manage or moderate
        }
        
        return permissions
      }

      // Define permissions based on role
      switch (userRole) {
        case 'owner':
          permissions.canRead = true
          permissions.canUpdate = true
          permissions.canDelete = true
          permissions.canCreatePosts = true
          permissions.canModerate = true
          permissions.canInviteMembers = true
          permissions.canManageMembers = true
          break
        
        case 'admin':
          permissions.canRead = true
          permissions.canUpdate = true
          permissions.canDelete = false // Admins can't delete branches
          permissions.canCreatePosts = true
          permissions.canModerate = true
          permissions.canInviteMembers = true
          permissions.canManageMembers = true
          break
        
        case 'moderator':
          permissions.canRead = true
          permissions.canUpdate = false
          permissions.canDelete = false
          permissions.canCreatePosts = true
          permissions.canModerate = true
          permissions.canInviteMembers = false
          permissions.canManageMembers = false
          break
        
        case 'member':
          permissions.canRead = true
          permissions.canUpdate = false
          permissions.canDelete = false
          permissions.canCreatePosts = true
          permissions.canModerate = false
          permissions.canInviteMembers = false
          permissions.canManageMembers = false
          break
        
        case 'viewer':
          permissions.canRead = true
          permissions.canUpdate = false
          permissions.canDelete = false
          permissions.canCreatePosts = false
          permissions.canModerate = false
          permissions.canInviteMembers = false
          permissions.canManageMembers = false
          break
      }

      return permissions

    } catch (error) {
      logger.error('Error getting branch permissions', error, { userId, branchId })
      return {
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canCreatePosts: false,
        canModerate: false,
        canInviteMembers: false,
        canManageMembers: false,
        isOwner: false,
        isAdmin: false,
        isModerator: false,
        userRole: 'none'
      }
    }
  }

  // Assign role to user in context
  async assignRole(
    userId: string,
    roleName: string,
    context: RBACContext,
    grantedBy: string
  ): Promise<boolean> {
    try {
      // Get role ID
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single()

      if (roleError || !role) throw new Error(`Role ${roleName} not found`)

      // Assign role
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role_id: role.id,
          context_type: context.type,
          context_id: context.id || null,
          granted_by: grantedBy
        })

      if (error) throw error

      // Clear cache
      this.clearCache(userId)
      return true

    } catch (error) {
      logger.error('Error assigning role', error, { userId, roleName, context, grantedBy })
      return false
    }
  }

  // Remove role from user in context
  async removeRole(
    userId: string,
    context: RBACContext
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('context_type', context.type)
        .eq('context_id', context.id)

      if (error) throw error

      // Clear cache
      this.clearCache(userId)
      return true

    } catch (error) {
      logger.error('Error removing role', error, { userId, context })
      return false
    }
  }
}

// Convenience functions for common operations
export const rbac = RBACService.getInstance()

export async function getUserBranchRole(userId: string, branchId: string): Promise<UserRole | 'none'> {
  return rbac.getUserRole(userId, { type: 'branch', id: branchId })
}

export async function getUserBranchPermissions(userId: string, branchId: string): Promise<BranchPermissions> {
  return rbac.getBranchPermissions(userId, branchId)
}

export async function canUserCreatePosts(userId: string, branchId: string): Promise<boolean> {
  const permissions = await rbac.getBranchPermissions(userId, branchId)
  return permissions.canCreatePosts
}

export async function canUserModerate(userId: string, branchId: string): Promise<boolean> {
  const permissions = await rbac.getBranchPermissions(userId, branchId)
  return permissions.canModerate
}

export async function isUserBranchAdmin(userId: string, branchId: string): Promise<boolean> {
  const permissions = await rbac.getBranchPermissions(userId, branchId)
  return permissions.isAdmin
}

export async function isUserBranchOwner(userId: string, branchId: string): Promise<boolean> {
  const permissions = await rbac.getBranchPermissions(userId, branchId)
  return permissions.isOwner
}

// Cross-tree access functions
export async function createCrossTreeAccess(
  branchId: string, 
  treeId: string, 
  invitedBy: string,
  permissions: { can_read: boolean; can_comment: boolean; can_like: boolean }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cross_tree_access')
      .insert({
        branch_id: branchId,
        tree_id: treeId,
        invited_by: invitedBy,
        permissions,
        status: 'active'
      })

    return !error
  } catch (error) {
    logger.error('Error creating cross-tree access', error, { branchId, treeId, invitedBy })
    return false
  }
}

export async function getCrossTreeAccess(branchId: string): Promise<CrossTreeAccess[]> {
  try {
    const { data, error } = await supabase
      .from('cross_tree_access')
      .select(`
        *,
        trees (
          id,
          name,
          description
        )
      `)
      .eq('branch_id', branchId)
      .eq('status', 'active')

    if (error) {
      logger.error('Error fetching cross-tree access', error, { branchId })
      return []
    }

    return data || []
  } catch (error) {
    logger.error('Error getting cross-tree access', error, { branchId })
    return []
  }
}

export async function revokeCrossTreeAccess(crossTreeAccessId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cross_tree_access')
      .update({ status: 'revoked' })
      .eq('id', crossTreeAccessId)

    return !error
  } catch (error) {
    logger.error('Error revoking cross-tree access', error, { crossTreeAccessId })
    return false
  }
}

export async function hasUserCrossTreeAccess(userId: string, branchId: string): Promise<boolean> {
  try {
    // Get user's trees
    const { data: userTrees, error: treesError } = await supabase
      .from('tree_members')
      .select('tree_id')
      .eq('user_id', userId)

    if (treesError || !userTrees) return false

    // Check if any of user's trees have cross-tree access to this branch
    const treeIds = userTrees.map(tm => tm.tree_id)
    
    const { data: crossTreeAccess, error: accessError } = await supabase
      .from('cross_tree_access')
      .select('id')
      .eq('branch_id', branchId)
      .in('tree_id', treeIds)
      .eq('status', 'active')

    return !accessError && crossTreeAccess && crossTreeAccess.length > 0
  } catch (error) {
    logger.error('Error checking cross-tree access', error, { userId, branchId })
    return false
  }
}

