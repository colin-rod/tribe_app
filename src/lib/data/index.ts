/**
 * Data Layer Index
 * Central export point for all data services and utilities
 */

// Base service and types
export { BaseService, type QueryOptions, type PaginatedResult } from './base-service'

// Service implementations
export { branchService, type CreateBranchData, type UpdateBranchData, type BranchQueryOptions } from './branch-service'
export { treeService, type CreateTreeData, type UpdateTreeData, type TreeQueryOptions } from './tree-service'

// Convenience re-exports from error handling
export { AsyncUtils } from '@/lib/errors'

// Data layer utilities
export const DataUtils = {
  /**
   * Generic pagination helper
   */
  paginate: <T>(data: T[], page: number, limit: number) => {
    const offset = (page - 1) * limit
    const paginatedData = data.slice(offset, offset + limit)
    
    return {
      data: paginatedData,
      total: data.length,
      page,
      limit,
      hasMore: offset + paginatedData.length < data.length
    }
  },

  /**
   * Sort data by field
   */
  sortBy: <T>(data: T[], field: keyof T, order: 'asc' | 'desc' = 'asc') => {
    return [...data].sort((a, b) => {
      const aVal = a[field]
      const bVal = b[field]
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
      return 0
    })
  },

  /**
   * Filter data by multiple criteria
   */
  filterBy: <T>(data: T[], filters: Partial<T>) => {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true
        return item[key as keyof T] === value
      })
    })
  },

  /**
   * Search data by text in multiple fields
   */
  search: <T>(data: T[], query: string, searchFields: (keyof T)[]) => {
    if (!query.trim()) return data
    
    const normalizedQuery = query.toLowerCase().trim()
    
    return data.filter(item => {
      return searchFields.some(field => {
        const fieldValue = item[field]
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(normalizedQuery)
        }
        return false
      })
    })
  }
}