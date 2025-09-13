/**
 * Branch State Management
 * Consistent state patterns for branch-related data
 */

import { createStore, createPaginatedStore } from './create-store'
import { branchService } from '@/lib/data'
import { Branch, BranchMember, Profile } from '@/types/database'
import { BranchWithMembers, BranchWithRelations } from '@/types/common'

// Single branch store
export const createBranchStore = (branchId: string) => createStore<BranchWithRelations>({
  fetchFn: () => branchService.findWithRelations(branchId),
  autoFetch: true
})

// Branch list store for a tree
export const createBranchListStore = (treeId: string, userId?: string) => createPaginatedStore<BranchWithMembers>({
  fetchFn: (page, limit) => branchService.findByTree(treeId, {
    page,
    limit,
    memberId: userId
  }),
  autoFetch: true,
  initialLimit: 10
})

// Branch members store
export const createBranchMembersStore = (branchId: string) => createStore<Array<BranchMember & { profiles: Profile }>>({
  fetchFn: () => branchService.getMembers(branchId),
  autoFetch: true
})

// Branch creation/editing state
interface BranchFormData {
  name: string
  description: string
  color: string
  privacy: 'private' | 'invite_only'
  category: string
  location: string
}

export const createBranchFormStore = (initialData?: Partial<BranchFormData>) => {
  const useStore = createStore<BranchFormData>({
    initialData: {
      name: '',
      description: '',
      color: '#3B82F6',
      privacy: 'private',
      category: '',
      location: '',
      ...initialData
    }
  })

  return function useBranchForm() {
    const store = useStore()

    const updateField = (field: keyof BranchFormData, value: string) => {
      if (store.data) {
        store.setData({
          ...store.data,
          [field]: value
        })
      }
    }

    const validateForm = (): boolean => {
      if (!store.data) return false
      
      const { name } = store.data
      
      if (!name.trim()) {
        store.setError('Branch name is required')
        return false
      }

      if (name.length > 100) {
        store.setError('Branch name must be 100 characters or less')
        return false
      }

      store.setError(null)
      return true
    }

    const submitForm = async (treeId: string, userId: string): Promise<Branch | null> => {
      if (!validateForm() || !store.data) {
        return null
      }

      store.setLoading(true)

      try {
        const branch = await branchService.createBranch({
          tree_id: treeId,
          name: store.data.name,
          description: store.data.description || undefined,
          color: store.data.color,
          type: 'family',
          privacy: store.data.privacy,
          category: store.data.category || undefined,
          location: store.data.location || undefined
        }, userId)

        store.setError(null)
        return branch
      } catch (error: unknown) {
        store.setError(error.message || 'Failed to create branch')
        return null
      } finally {
        store.setLoading(false)
      }
    }

    return {
      ...store,
      updateField,
      validateForm,
      submitForm
    }
  }
}