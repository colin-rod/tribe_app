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
  tree_id: string
  name: string
  description?: string
  color: string
  type: 'family'
  privacy: 'private' | 'invite_only'
  category?: string
  location?: string
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
      () => query,
      'Failed to fetch branches'
    ).then(result => {
      const data = (result.data?.data || []).map((item: { branch_id: string; branches: Branch | null; role: string; permissions: string[] }) => ({
        branch_id: item.branch_id,
        branches: item.branches,
        role: item.role,
        permissions: item.permissions,
        member_count: item.branches?.member_count || 0
      }))

      const total = result.data?.count || 0

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
      () => this.supabase
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
    ).then(result => result.data)
  }

  /**
   * Create a new branch
   */
  async createBranch(data: CreateBranchData, createdBy: string): Promise<Branch> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('branches')
        .insert({
          ...data,
          created_by: createdBy,
          member_count: 1 // Creator is automatically a member
        })
        .select()
        .single(),
      'Failed to create branch'
    ).then(result => result.data as Branch)
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
      () => this.supabase
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
    ).then(result => result.data as BranchMember)
  }

  /**
   * Remove member from branch
   */
  async removeMember(branchId: string, userId: string): Promise<void> {
    await AsyncUtils.supabaseQuery(
      () => this.supabase
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
      () => this.supabase
        .from('branch_members')
        .update({ role })
        .eq('branch_id', branchId)
        .eq('user_id', userId)
        .select()
        .single(),
      'Failed to update member role'
    ).then(result => result.data as BranchMember)
  }

  /**
   * Get branch members with profile information
   */
  async getMembers(branchId: string): Promise<Array<BranchMember & { profiles: Profile }>> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
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
      () => this.supabase
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
      () => this.supabase
        .from('branch_members')
        .select('role')
        .eq('branch_id', branchId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single(),
      'Failed to get user role in branch'
    )

    return result.data?.role || null
  }
}

export const branchService = new BranchService()