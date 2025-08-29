/**
 * Tree Service
 * Handles all tree-related data operations with consistent error handling
 */

import { BaseService, QueryOptions, PaginatedResult } from './base-service'
import { Tree, TreeMember, Profile } from '@/types/database'
import { TreeWithMembers, TreeWithRelations } from '@/types/common'
import { AsyncUtils } from '@/lib/errors'

export interface TreeQueryOptions extends QueryOptions {
  memberId?: string
  createdBy?: string
}

export interface CreateTreeData {
  name: string
  description?: string
  settings?: Record<string, any>
}

export interface UpdateTreeData {
  name?: string
  description?: string
  settings?: Record<string, any>
  is_active?: boolean
}

class TreeService extends BaseService<Tree> {
  protected tableName = 'trees'

  /**
   * Find trees for a specific user with member information
   */
  async findByUser(userId: string, options: TreeQueryOptions = {}): Promise<PaginatedResult<TreeWithMembers>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    const offset = (page - 1) * limit

    const query = this.supabase
      .from('user_trees')
      .select(`
        tree_id,
        role,
        permissions,
        trees (
          id,
          name,
          description,
          created_by,
          created_at,
          updated_at,
          is_active,
          settings
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('trees.is_active', true)
      .order(`trees.${sortBy}`, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    return AsyncUtils.supabaseQuery(
      () => query,
      'Failed to fetch user trees'
    ).then(result => {
      const data = (result.data?.data || []).map((item: any) => ({
        tree_id: item.tree_id,
        trees: item.trees,
        role: item.role,
        permissions: item.permissions
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
   * Get tree with full member details (for admin/owner views)
   */
  async findWithRelations(treeId: string): Promise<TreeWithRelations | null> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('trees')
        .select(`
          *,
          tree_members (
            id,
            user_id,
            role,
            joined_at,
            profiles (
              id,
              first_name,
              last_name,
              avatar_url,
              family_role
            )
          )
        `)
        .eq('id', treeId)
        .single(),
      'Failed to fetch tree details'
    ).then(result => result.data)
  }

  /**
   * Create a new tree
   */
  async createTree(data: CreateTreeData, createdBy: string): Promise<Tree> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('trees')
        .insert({
          ...data,
          created_by: createdBy,
          is_active: true,
          settings: data.settings || {}
        })
        .select()
        .single(),
      'Failed to create tree'
    ).then(result => result.data as Tree)
  }

  /**
   * Update tree information
   */
  async updateTree(treeId: string, data: UpdateTreeData): Promise<Tree> {
    return this.update(treeId, data)
  }

  /**
   * Add member to tree
   */
  async addMember(
    treeId: string, 
    userId: string, 
    role: string = 'member'
  ): Promise<TreeMember> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('tree_members')
        .insert({
          tree_id: treeId,
          user_id: userId,
          role
        })
        .select()
        .single(),
      'Failed to add member to tree'
    ).then(result => result.data as TreeMember)
  }

  /**
   * Remove member from tree
   */
  async removeMember(treeId: string, userId: string): Promise<void> {
    await AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('tree_members')
        .delete()
        .eq('tree_id', treeId)
        .eq('user_id', userId),
      'Failed to remove member from tree'
    )
  }

  /**
   * Update member role
   */
  async updateMemberRole(treeId: string, userId: string, role: string): Promise<TreeMember> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('tree_members')
        .update({ role })
        .eq('tree_id', treeId)
        .eq('user_id', userId)
        .select()
        .single(),
      'Failed to update member role'
    ).then(result => result.data as TreeMember)
  }

  /**
   * Get tree members with profile information
   */
  async getMembers(treeId: string): Promise<Array<TreeMember & { profiles: Profile }>> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('tree_members')
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
        .eq('tree_id', treeId)
        .order('joined_at', { ascending: false }),
      'Failed to fetch tree members'
    ).then(result => result.data || [])
  }

  /**
   * Check if user is member of tree
   */
  async isMember(treeId: string, userId: string): Promise<boolean> {
    const result = await AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('tree_members')
        .select('id')
        .eq('tree_id', treeId)
        .eq('user_id', userId)
        .single(),
      'Failed to check tree membership'
    )

    return result.data !== null
  }

  /**
   * Get user's role in tree
   */
  async getUserRole(treeId: string, userId: string): Promise<string | null> {
    const result = await AsyncUtils.supabaseQuery(
      () => this.supabase
        .from('tree_members')
        .select('role')
        .eq('tree_id', treeId)
        .eq('user_id', userId)
        .single(),
      'Failed to get user role in tree'
    )

    return result.data?.role || null
  }

  /**
   * Archive/deactivate tree
   */
  async archiveTree(treeId: string): Promise<Tree> {
    return this.updateTree(treeId, { is_active: false })
  }

  /**
   * Restore archived tree
   */
  async restoreTree(treeId: string): Promise<Tree> {
    return this.updateTree(treeId, { is_active: true })
  }

  /**
   * Get tree statistics
   */
  async getStats(treeId: string): Promise<{
    memberCount: number
    branchCount: number
    activeMembers: number
  }> {
    const [memberResult, branchResult] = await Promise.all([
      AsyncUtils.supabaseQuery(
        () => this.supabase
          .from('tree_members')
          .select('id', { count: 'exact' })
          .eq('tree_id', treeId),
        'Failed to count tree members'
      ),
      AsyncUtils.supabaseQuery(
        () => this.supabase
          .from('branches')
          .select('id', { count: 'exact' })
          .eq('tree_id', treeId),
        'Failed to count tree branches'
      )
    ])

    return {
      memberCount: memberResult.data?.count || 0,
      branchCount: branchResult.data?.count || 0,
      activeMembers: memberResult.data?.count || 0 // Could be refined with activity tracking
    }
  }
}

export const treeService = new TreeService()