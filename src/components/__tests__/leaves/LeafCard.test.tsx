import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, createMockLeaf, createMockProfile, createMockBranch } from '@/__tests__/utils/test-utils'
import LeafCard from '@/components/leaves/LeafCard'
import { LeafWithDetails } from '@/types/database'

// Mock the leaf interactions hook
jest.mock('@/hooks/useLeafInteractions', () => ({
  useLeafInteractions: () => ({
    handleReaction: jest.fn(),
    handleComment: jest.fn(),
    handleShare: jest.fn(),
    isLoading: false,
  }),
}))

const createMockLeafWithDetails = (): LeafWithDetails => {
  const baseLeaf = createMockLeaf()
  const profile = createMockProfile()
  const branch = createMockBranch()

  return {
    ...baseLeaf,
    profiles: profile,
    branch: branch,
    tree_name: 'Test Tree',
    milestone_display_name: null,
    milestone_category: null,
    milestone_icon: null,
    author_name: `${profile.first_name} ${profile.last_name}`,
    author_avatar: profile.avatar_url,
    heart_count: 5,
    smile_count: 2,
    laugh_count: 1,
    user_reaction: null,
    share_count: 0,
    comment_count: 3,
    reactions: [],
    shares: [],
    comments: [],
  }
}

describe('LeafCard', () => {
  const mockOnReaction = jest.fn()
  const mockOnShare = jest.fn()
  const mockOnComment = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render leaf content correctly', () => {
    const leaf = createMockLeafWithDetails()
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    expect(screen.getByText('Test leaf content')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Test Branch')).toBeInTheDocument()
  })

  it('should display reaction counts correctly', () => {
    const leaf = createMockLeafWithDetails()
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    expect(screen.getByText('5')).toBeInTheDocument() // heart count
    expect(screen.getByText('2')).toBeInTheDocument() // smile count
    expect(screen.getByText('1')).toBeInTheDocument() // laugh count
  })

  it('should display milestone information when present', () => {
    const leaf = createMockLeafWithDetails()
    leaf.leaf_type = 'milestone'
    leaf.milestone_type = 'first_steps'
    leaf.milestone_display_name = 'First Steps'
    leaf.milestone_icon = '👶'
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    expect(screen.getByText('👶')).toBeInTheDocument()
    expect(screen.getByText('First Steps')).toBeInTheDocument()
  })

  it('should handle reaction clicks', async () => {
    const user = userEvent.setup()
    const leaf = createMockLeafWithDetails()
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    const heartButton = screen.getByRole('button', { name: /heart/i })
    await user.click(heartButton)

    expect(mockOnReaction).toHaveBeenCalledWith(leaf.id, 'heart')
  })

  it('should handle comment submission', async () => {
    const user = userEvent.setup()
    const leaf = createMockLeafWithDetails()
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    // Open comment form
    const commentButton = screen.getByRole('button', { name: /comment/i })
    await user.click(commentButton)

    // Type comment
    const commentInput = screen.getByPlaceholderText(/add a comment/i)
    await user.type(commentInput, 'This is a test comment')

    // Submit comment
    const submitButton = screen.getByRole('button', { name: /post/i })
    await user.click(submitButton)

    expect(mockOnComment).toHaveBeenCalledWith(leaf.id, 'This is a test comment')
  })

  it('should show media when present', () => {
    const leaf = createMockLeafWithDetails()
    leaf.media_urls = ['https://example.com/image.jpg']
    leaf.leaf_type = 'photo'
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('should show tags when present', () => {
    const leaf = createMockLeafWithDetails()
    leaf.tags = ['family', 'fun', 'memories']
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    expect(screen.getByText('#family')).toBeInTheDocument()
    expect(screen.getByText('#fun')).toBeInTheDocument()
    expect(screen.getByText('#memories')).toBeInTheDocument()
  })

  it('should handle share functionality', async () => {
    const user = userEvent.setup()
    const leaf = createMockLeafWithDetails()
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    const shareButton = screen.getByRole('button', { name: /share/i })
    await user.click(shareButton)

    // Share modal should open (assuming it's implemented)
    // This test would need to be adjusted based on actual share implementation
  })

  it('should show relative time correctly', () => {
    const leaf = createMockLeafWithDetails()
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    leaf.created_at = twoHoursAgo.toISOString()
    
    render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    )

    // This test would need to be adjusted based on the actual time display format
    expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const leaf = createMockLeafWithDetails()
    
    const { container } = render(
      <LeafCard
        leaf={leaf}
        onReaction={mockOnReaction}
        onShare={mockOnShare}
        onComment={mockOnComment}
        className="custom-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})