/**
 * Branch Service
 * Handles all branch-related data operations with consistent error handling
 */

import { BaseService, QueryOptions, PaginatedResult } from './base-service'
import { Branch, BranchMember, Profile } from '@/types/database'
import { BranchWithMembers, BranchWithRelations } from '@/types/common'
import { AsyncUtils } from '@/lib/errors'

export interface BranchQueryOptions extends QueryOptions {
  treeId?: string
  memberId?: string
  type?: string
  privacy?: string
}

export interface CreateBranchData {
  tree_id: string  // Primary tree (first selected person's tree)
  name: string
  description?: string
  color: string
  type: 'family'
  privacy: 'private' | 'invite_only'
  category?: string
  location?: string
  connected_trees?: Array<{
    tree_id: string
    connection_type: 'owner' | 'shared' | 'viewer'
  }>  // Additional trees for cross-tree branches
}

export interface UpdateBranchData {
  name?: string
  description?: string
  color?: string
  privacy?: 'private' | 'invite_only'
  category?: string
  location?: string
}

class BranchService extends BaseService<Branch> {
  protected tableName = 'branches'

  /**
   * Find branches for a specific tree with member information
   */
  async findByTree(treeId: string, options: BranchQueryOptions = {}): Promise<PaginatedResult<BranchWithMembers>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      memberId
    } = options

    const offset = (page - 1) * limit

    const query = this.supabase
      .from('user_branches')
      .select(`
        branch_id,
        role,
        permissions,
        branches (
          id,
          tree_id,
          name,
          description,
          color,
          created_by,
          created_at,
          updated_at,
          type,
          privacy,
          category,
          location,
          member_count
        )
      `, { count: 'exact' })
      .eq('branches.tree_id', treeId)
      .order(`branches.${sortBy}`, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (memberId) {
      query.eq('user_id', memberId)
    }

    return AsyncUtils.supabaseQuery(
      async () => query,
      'Failed to fetch branches'
    ).then(result => {
      const data = (Array.isArray(result.data) ? result.data : []).map((item: any) => ({
        branch_id: item.branch_id,
        branches: Array.isArray(item.branches) ? item.branches[0] : item.branches,
        role: item.role,
        permissions: item.permissions,
        member_count: (Array.isArray(item.branches) ? item.branches[0]?.member_count : item.branches?.member_count) || 0
      }))

      const total = (result as any)?.count || 0

      return {
        data,
        total,
        page,
        limit,
        hasMore: offset + data.length < total
      }
    })
  }

  /**
   * Get branch with full member details (for admin/owner views)
   */
  async findWithRelations(branchId: string): Promise<BranchWithRelations | null> {
    return AsyncUtils.supabaseQuery(
      async () => this.supabase
        .from('branches')
        .select(`
          *,
          branch_members (
            id,
            user_id,
            role,
            added_at,
            join_method,
            status,
            profiles (
              id,
              first_name,
              last_name,
              avatar_url,
              family_role
            )
          ),
          trees (
            id,
            name
          )
        `)
        .eq('id', branchId)
        .single(),
      'Failed to fetch branch details'
    ).then(result => result.data as unknown as BranchWithRelations | null)
  }

  /**
   * Create a new branch with optional cross-tree connections
   */
  async createBranch(data: CreateBranchData, createdBy: string): Promise<Branch> {
    // First create the branch
    const branchResult = await AsyncUtils.supabaseQuery(
      async () => this.supabase
        .from('branches')
        .insert({
          tree_id: data.tree_id,
          name: data.name,
          description: data.description,
          color: data.color,
          type: data.type,
          privacy: data.privacy,
          category: data.category,
          location: data.location,
          created_by: createdBy,
          member_count: 1 // Creator is automatically a member
        })
        .select()
        .single(),
      'Failed to create branch'
    )

    const branch = branchResult.data as unknown as Branch

    // If connected_trees are specified, create cross-tree connections
    if (data.connected_trees && data.connected_trees.length > 0) {
      const connections = data.connected_trees.map(conn => ({
        branch_id: branch.id,
        tree_id: conn.tree_id,
        connection_type: conn.connection_type,
        connected_by: createdBy,
        connected_at: new Date().toISOString()
      }))

      await AsyncUtils.supabaseQuery(
        async () => this.supabase
          .from('tree_branch_connections')
          .insert(connections),
        'Failed to create cross-tree connections'
      )
    }

    return branch
  }

  /**
   * Update branch information
   */
  async updateBranch(branchId: string, data: UpdateBranchData): Promise<Branch> {
    return this.update(branchId, data)
  }

  /**
   * Add member to branch
   */
  async addMember(
    branchId: string, 
    userId: string, 
    role: string = 'member',
    joinMethod: 'invited' | 'requested' | 'admin_added' = 'admin_added',
    addedBy?: string
  ): Promise<BranchMember> {
    return AsyncUtils.supabaseQuery(
      async () => this.supabase
        .from('branch_members')
        .insert({
          branch_id: branchId,
          user_id: userId,
          role,
          join_method: joinMethod,
          joined_via: addedBy,
          status: 'active',
          approved_at: new Date().toISOString()
        })
        .select()
        .single(),
      'Failed to add member to branch'
    ).then(result => result.data as unknown as BranchMember)
  }

  /**
   * Remove member from branch
   */
  async removeMember(branchId: string, userId: string): Promise<void> {
    await AsyncUtils.supabaseQuery(
      async () => this.supabase
        .from('branch_members')
        .delete()
        .eq('branch_id', branchId)
        .eq('user_id', userId),
      'Failed to remove member from branch'
    )
  }

  /**
   * Update member role
   */
  async updateMemberRole(branchId: string, userId: string, role: string): Promise<BranchMember> {
    return AsyncUtils.supabaseQuery(
      async () => this.supabase
        .from('branch_members')
        .update({ role })
        .eq('branch_id', branchId)
        .eq('user_id', userId)
        .select()
        .single(),
      'Failed to update member role'
    ).then(result => result.data as unknown as BranchMember)
  }

  /**
   * Get branch members with profile information
   */
  async getMembers(branchId: string): Promise<Array<BranchMember & { profiles: Profile }>> {
    return AsyncUtils.supabaseQuery(
      async () => this.supabase
        .from('branch_members')
        .select(`
          *,
          profiles (
            id,
            first_name,
            last_name,
            avatar_url,
            family_role,
            email
          )
        `)
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('added_at', { ascending: false }),
      'Failed to fetch branch members'
    ).then(result => result.data || [])
  }

  /**
   * Check if user is member of branch
   */
  async isMember(branchId: string, userId: string): Promise<boolean> {
    const result = await AsyncUtils.supabaseQuery(
      async () => this.supabase
        .from('branch_members')
        .select('id')
        .eq('branch_id', branchId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single(),
      'Failed to check branch membership'
    )

    return result.data !== null
  }

  /**
   * Get user's role in branch
   */
  async getUserRole(branchId: string, userId: string): Promise<string | null> {
    const result = await AsyncUtils.supabaseQuery(
      async () => this.supabase
        .from('branch_members')
        .select('role')
        .eq('branch_id', branchId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single(),
      'Failed to get user role in branch'
    )

    return (result.data as any)?.role || null
  }
}

export const branchService = new BranchService()