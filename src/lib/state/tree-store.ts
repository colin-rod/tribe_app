/**
 * Tree State Management
 * Consistent state patterns for tree-related data
 */

import { createStore, createPaginatedStore } from './create-store'
import { treeService } from '@/lib/data'
import { Tree, TreeMember, Profile } from '@/types/database'
import { TreeWithMembers, TreeWithRelations } from '@/types/common'

// Single tree store
export const createTreeStore = (treeId: string) => createStore<TreeWithRelations | null>({
  fetchFn: () => treeService.findWithRelations(treeId),
  autoFetch: true
})

// User's tree list store
export const createUserTreesStore = (userId: string) => createPaginatedStore<TreeWithMembers>({
  fetchFn: (page, limit) => treeService.findByUser(userId, { page, limit }),
  autoFetch: true,
  initialLimit: 10
})

// Tree members store
export const createTreeMembersStore = (treeId: string) => createStore<Array<TreeMember & { profiles: Profile }>>({
  fetchFn: () => treeService.getMembers(treeId),
  autoFetch: true
})

// Tree statistics store
export const createTreeStatsStore = (treeId: string) => createStore<{
  memberCount: number
  branchCount: number
  activeMembers: number
}>({
  fetchFn: () => treeService.getStats(treeId),
  autoFetch: true
})

// Tree creation/editing state
interface TreeFormData {
  name: string
  description: string
  settings: Record<string, unknown>
}

export const createTreeFormStore = (initialData?: Partial<TreeFormData>) => {
  const useStore = createStore<TreeFormData>({
    initialData: {
      name: '',
      description: '',
      settings: {},
      ...initialData
    }
  })

  return function useTreeForm() {
    const store = useStore()

    const updateField = (field: keyof TreeFormData, value: string | Record<string, unknown>) => {
      if (store.data) {
        store.setData({
          ...store.data,
          [field]: value
        })
      }
    }

    const updateSetting = (key: string, value: unknown) => {
      if (store.data) {
        store.setData({
          ...store.data,
          settings: {
            ...store.data.settings,
            [key]: value
          }
        })
      }
    }

    const validateForm = (): boolean => {
      if (!store.data) return false
      
      const { name } = store.data
      
      if (!name.trim()) {
        store.setError('Tree name is required')
        return false
      }

      if (name.length > 100) {
        store.setError('Tree name must be 100 characters or less')
        return false
      }

      store.setError(null)
      return true
    }

    const submitForm = async (userId: string): Promise<Tree | null> => {
      if (!validateForm() || !store.data) {
        return null
      }

      store.setLoading(true)

      try {
        const tree = await treeService.createTree({
          name: store.data.name,
          description: store.data.description || undefined,
          settings: store.data.settings
        }, userId)

        store.setError(null)
        return tree
      } catch (error: unknown) {
        store.setError(error instanceof Error ? error.message : 'Failed to create tree')
        return null
      } finally {
        store.setLoading(false)
      }
    }

    const updateTree = async (treeId: string): Promise<Tree | null> => {
      if (!validateForm() || !store.data) {
        return null
      }

      store.setLoading(true)

      try {
        const tree = await treeService.updateTree(treeId, {
          name: store.data.name,
          description: store.data.description || undefined,
          settings: store.data.settings
        })

        store.setError(null)
        return tree
      } catch (error: unknown) {
        store.setError(error instanceof Error ? error.message : 'Failed to update tree')
        return null
      } finally {
        store.setLoading(false)
      }
    }

    return {
      ...store,
      updateField,
      updateSetting,
      validateForm,
      submitForm,
      updateTree
    }
  }
}