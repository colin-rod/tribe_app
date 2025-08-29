/**
 * Base Data Service
 * Provides consistent patterns for data fetching and state management
 */

import { createClient } from '@/lib/supabase/client'
import { withSupabaseErrorHandling, AsyncUtils } from '@/lib/errors'

export interface BaseEntity {
  id: string
  created_at?: string
  updated_at?: string
}

export interface QueryOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export abstract class BaseService<T extends BaseEntity> {
  protected supabase = createClient()
  protected abstract tableName: string

  /**
   * Find a single entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single(),
      `Failed to fetch ${this.tableName.slice(0, -1)}`
    ).then(result => result.data)
  }

  /**
   * Find entities with optional filtering and pagination
   */
  async findMany(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      filters = {}
    } = options

    const offset = (page - 1) * limit

    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    }

    return AsyncUtils.supabaseQuery(
      () => query,
      `Failed to fetch ${this.tableName}`
    ).then(result => {
      const data = result.data?.data || []
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
   * Create a new entity
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single(),
      `Failed to create ${this.tableName.slice(0, -1)}`
    ).then(result => result.data as T)
  }

  /**
   * Update an existing entity
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T> {
    return AsyncUtils.supabaseQuery(
      () => this.supabase
        .from(this.tableName)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single(),
      `Failed to update ${this.tableName.slice(0, -1)}`
    ).then(result => result.data as T)
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<void> {
    await AsyncUtils.supabaseQuery(
      () => this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id),
      `Failed to delete ${this.tableName.slice(0, -1)}`
    )
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await AsyncUtils.supabaseQuery(
      () => this.supabase
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single(),
      `Failed to check if ${this.tableName.slice(0, -1)} exists`
    )

    return result.data !== null
  }

  /**
   * Count entities with optional filters
   */
  async count(filters: Record<string, any> = {}): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    }

    const result = await AsyncUtils.supabaseQuery(
      () => query,
      `Failed to count ${this.tableName}`
    )

    return result.data?.count || 0
  }
}