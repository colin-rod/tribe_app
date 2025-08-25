import { supabase } from './supabase/client'
import type { 
  UserRole, 
  CirclePermissions, 
  RBACContext, 
  UserPermissions,
  UserRoleAssignment,
  Role,
  Permission
} from '@/types/database'

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

  // Get user's role in a specific context (circle, tribe, global)
  async getUserRole(
    userId: string, 
    context: RBACContext
  ): Promise<UserRole | 'none'> {
    const cacheKey = `${userId}:${context.type}:${context.id || 'global'}`
    
    if (this.roleCache.has(cacheKey)) {
      return this.roleCache.get(cacheKey)!
    }

    try {
      // First check if user is circle creator (automatic owner)
      if (context.type === 'circle' && context.id) {
        const { data: circle } = await supabase
          .from('circles')
          .select('created_by')
          .eq('id', context.id)
          .single()
        
        if (circle?.created_by === userId) {
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
      console.error('Error getting user role:', error)
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
      console.error('Error checking permission:', error)
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
      console.error('Error getting user permissions:', error)
      return {}
    }
  }

  // Get comprehensive circle permissions for a user
  async getCirclePermissions(
    userId: string,
    circleId: string
  ): Promise<CirclePermissions> {
    try {
      const context: RBACContext = { type: 'circle', id: circleId }
      const userRole = await this.getUserRole(userId, context)
      
      // Base permissions object
      const permissions: CirclePermissions = {
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

      // If no role, check if it's a public circle for read access
      if (userRole === 'none') {
        const { data: circle } = await supabase
          .from('circles')
          .select('privacy')
          .eq('id', circleId)
          .single()
        
        permissions.canRead = circle?.privacy === 'public'
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
          permissions.canDelete = false // Admins can't delete circles
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
      console.error('Error getting circle permissions:', error)
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
      console.error('Error assigning role:', error)
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
      console.error('Error removing role:', error)
      return false
    }
  }
}

// Convenience functions for common operations
export const rbac = RBACService.getInstance()

export async function getUserCircleRole(userId: string, circleId: string): Promise<UserRole | 'none'> {
  return rbac.getUserRole(userId, { type: 'circle', id: circleId })
}

export async function getUserCirclePermissions(userId: string, circleId: string): Promise<CirclePermissions> {
  return rbac.getCirclePermissions(userId, circleId)
}

export async function canUserCreatePosts(userId: string, circleId: string): Promise<boolean> {
  const permissions = await rbac.getCirclePermissions(userId, circleId)
  return permissions.canCreatePosts
}

export async function canUserModerate(userId: string, circleId: string): Promise<boolean> {
  const permissions = await rbac.getCirclePermissions(userId, circleId)
  return permissions.canModerate
}

export async function isUserCircleAdmin(userId: string, circleId: string): Promise<boolean> {
  const permissions = await rbac.getCirclePermissions(userId, circleId)
  return permissions.isAdmin
}

export async function isUserCircleOwner(userId: string, circleId: string): Promise<boolean> {
  const permissions = await rbac.getCirclePermissions(userId, circleId)
  return permissions.isOwner
}