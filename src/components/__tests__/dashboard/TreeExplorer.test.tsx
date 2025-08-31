import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, createMockBranch, createMockTree } from '@/__tests__/utils/test-utils'
import TreeExplorer from '@/components/dashboard/TreeExplorer'
import { TreeWithMembers, BranchWithMembers } from '@/types/common'

// Mock the hooks
jest.mock('@/hooks/use-leaves', () => ({
  useTreeLeaves: jest.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
  useAddLeafReaction: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useAddLeafComment: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useShareLeafWithBranches: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}))

jest.mock('@/hooks/use-trees', () => ({
  useTreeStats: jest.fn(() => ({
    data: {
      totalLeaves: 25,
      milestoneCount: 5,
      recentLeaves: 3,
      leafTypeBreakdown: { photo: 15, text: 8, milestone: 2 },
      seasonBreakdown: { winter: 10, spring: 8, summer: 5, fall: 2 },
      memberCount: 4,
    },
    isLoading: false,
  })),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

const createMockTreeWithMembers = (): TreeWithMembers => ({
  tree_id: 'tree-1',
  trees: {
    ...createMockTree(),
    id: 'tree-1',
  },
  role: 'owner',
  permissions: ['manage_tree'],
  member_count: 4,
})

const createMockBranchWithMembers = (): BranchWithMembers => ({
  branch_id: 'branch-1',
  branches: {
    ...createMockBranch(),
    id: 'branch-1',
    tree_id: 'tree-1',
  },
  role: 'owner',
  permissions: ['manage_branch'],
  member_count: 2,
})

describe('TreeExplorer', () => {
  const mockBranch = createMockBranch()
  const mockTree = createMockTreeWithMembers()
  const mockUserBranch = createMockBranchWithMembers()
  
  const mockProps = {
    selectedBranch: mockBranch,
    trees: [mockTree],
    userBranches: [mockUserBranch],
    userId: 'user-1',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render welcome state when no branch is selected', () => {
    render(
      <TreeExplorer
        selectedBranch={null}
        trees={mockProps.trees}
        userBranches={mockProps.userBranches}
        userId={mockProps.userId}
      />
    )

    expect(screen.getByText('Welcome to your Family Trees')).toBeInTheDocument()
    expect(screen.getByText('Select a branch from the sidebar to explore your family leaves.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage trees/i })).toBeInTheDocument()
  })

  it('should render tree header with correct information', async () => {
    const { useTreeStats } = jest.requireMock('@/hooks/use-trees')
    useTreeStats.mockReturnValue({
      data: {
        totalLeaves: 25,
        milestoneCount: 5,
        recentLeaves: 3,
        leafTypeBreakdown: { photo: 15, text: 8, milestone: 2 },
        seasonBreakdown: { winter: 10, spring: 8, summer: 5, fall: 2 },
        memberCount: 4,
      },
      isLoading: false,
    })

    render(<TreeExplorer {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('Test Family Tree')).toBeInTheDocument()
    })
    
    expect(screen.getByText('A test tree')).toBeInTheDocument()
  })

  it('should display tree statistics correctly', async () => {
    render(<TreeExplorer {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument() // Total Leaves
      expect(screen.getByText('5')).toBeInTheDocument()  // Milestones
      expect(screen.getByText('3')).toBeInTheDocument()  // This Week
      expect(screen.getByText('4')).toBeInTheDocument()  // Seasons
    })

    expect(screen.getByText('Total Leaves')).toBeInTheDocument()
    expect(screen.getByText('Milestones')).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('Seasons')).toBeInTheDocument()
  })

  it('should render filter buttons', async () => {
    render(<TreeExplorer {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all leaves/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /this week/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /milestones/i })).toBeInTheDocument()
    })
  })

  it('should handle filter changes', async () => {
    const user = userEvent.setup()
    render(<TreeExplorer {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /milestones/i })).toBeInTheDocument()
    })

    const milestonesButton = screen.getByRole('button', { name: /milestones/i })
    await user.click(milestonesButton)

    // Check if the button has active styling (this would depend on the actual implementation)
    expect(milestonesButton).toHaveClass('bg-green-100', 'text-green-700')
  })

  it('should show empty state when no leaves match filter', async () => {
    // Mock empty leaves data
    const { useTreeLeaves } = jest.requireMock('@/hooks/use-leaves')
    useTreeLeaves.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })

    render(<TreeExplorer {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('No leaves yet')).toBeInTheDocument()
      expect(screen.getByText('Start capturing precious leaves to grow this tree!')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create first leaf/i })).toBeInTheDocument()
    })
  })

  it('should show loading state', () => {
    const { useTreeLeaves, useTreeStats } = jest.requireMock('@/hooks/use-leaves')
    useTreeLeaves.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    })

    const { useTreeStats: mockUseTreeStats } = jest.requireMock('@/hooks/use-trees')
    mockUseTreeStats.mockReturnValue({
      data: null,
      isLoading: true,
    })

    render(<TreeExplorer {...mockProps} />)

    expect(screen.getByText('Loading leaves...')).toBeInTheDocument()
  })

  it('should render new leaf button', async () => {
    render(<TreeExplorer {...mockProps} />)

    await waitFor(() => {
      const newLeafButton = screen.getByRole('button', { name: /new leaf/i })
      expect(newLeafButton).toBeInTheDocument()
    })
  })

  it('should handle view full timeline click', async () => {
    const user = userEvent.setup()
    const { useTreeStats } = jest.requireMock('@/hooks/use-trees')
    useTreeStats.mockReturnValue({
      data: {
        totalLeaves: 25,
        milestoneCount: 5,
        recentLeaves: 3,
        leafTypeBreakdown: { photo: 15, text: 8, milestone: 2 },
        seasonBreakdown: { winter: 10, spring: 8, summer: 5, fall: 2 },
        memberCount: 4,
      },
      isLoading: false,
    })

    render(<TreeExplorer {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view full timeline/i })).toBeInTheDocument()
    })

    const viewTimelineButton = screen.getByRole('button', { name: /view full timeline/i })
    await user.click(viewTimelineButton)

    // Router push would be called (mocked in our setup)
  })

  it('should show correct empty state messages for different filters', async () => {
    const user = userEvent.setup()
    const { useTreeLeaves } = jest.requireMock('@/hooks/use-leaves')
    const { useTreeStats } = jest.requireMock('@/hooks/use-trees')
    
    useTreeLeaves.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })

    useTreeStats.mockReturnValue({
      data: {
        totalLeaves: 0,
        milestoneCount: 0,
        recentLeaves: 0,
        leafTypeBreakdown: {},
        seasonBreakdown: {},
        memberCount: 1,
      },
      isLoading: false,
    })

    render(<TreeExplorer {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /milestones/i })).toBeInTheDocument()
    })

    // Test milestones filter empty state
    const milestonesButton = screen.getByRole('button', { name: /milestones/i })
    await user.click(milestonesButton)

    await waitFor(() => {
      expect(screen.getByText('No milestones yet')).toBeInTheDocument()
    })

    // Test recent filter empty state
    const recentButton = screen.getByRole('button', { name: /this week/i })
    await user.click(recentButton)

    await waitFor(() => {
      expect(screen.getByText('No leaves this week')).toBeInTheDocument()
    })
  })
})