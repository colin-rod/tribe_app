/**
 * State Management Index
 * Central export point for all state management utilities
 */

// Core store creators
export {
  createStore,
  createPaginatedStore,
  type StoreState,
  type StoreActions,
  type StoreConfig,
  type PaginatedStoreState,
  type PaginatedStoreActions,
  type PaginatedStoreConfig
} from './create-store'

// Branch state management
export {
  createBranchStore,
  createBranchListStore,
  createBranchMembersStore,
  createBranchFormStore
} from './branch-store'

// Tree state management
export {
  createTreeStore,
  createUserTreesStore,
  createTreeMembersStore,
  createTreeStatsStore,
  createTreeFormStore
} from './tree-store'

// State management utilities
export const StateUtils = {
  /**
   * Helper to create optimistic updates
   */
  optimisticUpdate: <T>(
    currentData: T[],
    newItem: T,
    getId: (item: T) => string
  ) => {
    const id = getId(newItem)
    const index = currentData.findIndex(item => getId(item) === id)
    
    if (index >= 0) {
      // Update existing item
      const updated = [...currentData]
      updated[index] = newItem
      return updated
    } else {
      // Add new item
      return [...currentData, newItem]
    }
  },

  /**
   * Helper to remove item optimistically
   */
  optimisticRemove: <T>(
    currentData: T[],
    itemId: string,
    getId: (item: T) => string
  ) => {
    return currentData.filter(item => getId(item) !== itemId)
  },

  /**
   * Helper to reorder items
   */
  reorder: <T>(
    currentData: T[],
    fromIndex: number,
    toIndex: number
  ) => {
    const result = [...currentData]
    const [removed] = result.splice(fromIndex, 1)
    result.splice(toIndex, 0, removed)
    return result
  },

  /**
   * Helper to batch state updates
   */
  batchUpdate: <T>(
    currentData: T[],
    updates: Array<{ id: string; data: Partial<T> }>,
    getId: (item: T) => string
  ) => {
    const updatesMap = new Map(updates.map(u => [u.id, u.data]))
    
    return currentData.map(item => {
      const id = getId(item)
      const update = updatesMap.get(id)
      return update ? { ...item, ...update } : item
    })
  }
}