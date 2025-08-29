import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useUserTrees, useTreeStats, useCreateTree } from '../use-trees'
import * as treeService from '@/lib/trees'

// Mock the tree service
jest.mock('@/lib/trees', () => ({
  getUserTrees: jest.fn(),
  getTreeStats: jest.fn(),
  createTree: jest.fn(),
}))

const mockTreeService = treeService as jest.Mocked<typeof treeService>

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useUserTrees', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch user trees successfully', async () => {
    const mockTreesData = {
      data: [
        {
          tree_id: 'tree-1',
          trees: {
            id: 'tree-1',
            name: 'Family Tree',
            description: 'Our family tree',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_active: true,
            settings: {
              privacy_level: 'private',
              allow_public_discovery: false,
              require_approval: true,
              auto_accept_family: true,
              email_notifications: true,
            },
          },
          role: 'owner',
          permissions: ['manage_tree'],
          member_count: 2,
        },
      ],
    }

    mockTreeService.getUserTrees.mockResolvedValue(mockTreesData)

    const { result } = renderHook(() => useUserTrees('user-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockTreesData)
    expect(result.current.isError).toBe(false)
    expect(mockTreeService.getUserTrees).toHaveBeenCalledWith('user-1', { page: 1, limit: 50 })
  })

  it('should not fetch when user ID is empty', () => {
    const { result } = renderHook(() => useUserTrees(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(mockTreeService.getUserTrees).not.toHaveBeenCalled()
  })

  it('should handle fetch error', async () => {
    const mockError = new Error('Failed to fetch trees')
    mockTreeService.getUserTrees.mockRejectedValue(mockError)

    const { result } = renderHook(() => useUserTrees('user-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(mockError)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useTreeStats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch tree statistics successfully', async () => {
    const mockStats = {
      totalLeaves: 25,
      milestoneCount: 5,
      recentLeaves: 3,
      leafTypeBreakdown: { photo: 15, text: 8, milestone: 2 },
      seasonBreakdown: { winter: 10, spring: 8, summer: 5, fall: 2 },
      memberCount: 4,
    }

    mockTreeService.getTreeStats.mockResolvedValue(mockStats)

    const { result } = renderHook(() => useTreeStats('tree-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockStats)
    expect(mockTreeService.getTreeStats).toHaveBeenCalledWith('tree-1')
  })

  it('should not fetch when tree ID is empty', () => {
    const { result } = renderHook(() => useTreeStats(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(mockTreeService.getTreeStats).not.toHaveBeenCalled()
  })
})

describe('useCreateTree', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create tree successfully', async () => {
    const mockNewTree = {
      id: 'new-tree-id',
      name: 'New Family Tree',
      description: 'A new tree',
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_active: true,
      settings: {
        privacy_level: 'private',
        allow_public_discovery: false,
        require_approval: true,
        auto_accept_family: true,
        email_notifications: true,
      },
    }

    mockTreeService.createTree.mockResolvedValue(mockNewTree)

    const { result } = renderHook(() => useCreateTree(), {
      wrapper: createWrapper(),
    })

    const createData = {
      name: 'New Family Tree',
      description: 'A new tree',
      is_private: true,
    }

    await waitFor(async () => {
      await result.current.mutateAsync({ data: createData, userId: 'user-1' })
    })

    expect(mockTreeService.createTree).toHaveBeenCalledWith(createData, 'user-1')
  })

  it('should handle create tree error', async () => {
    const mockError = new Error('Failed to create tree')
    mockTreeService.createTree.mockRejectedValue(mockError)

    const { result } = renderHook(() => useCreateTree(), {
      wrapper: createWrapper(),
    })

    const createData = {
      name: 'New Family Tree',
      description: 'A new tree',
      is_private: true,
    }

    await expect(async () => {
      await result.current.mutateAsync({ data: createData, userId: 'user-1' })
    }).rejects.toThrow('Failed to create tree')
  })
})