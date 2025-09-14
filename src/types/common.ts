/**
 * Common TypeScript interfaces and types
 */

import { Tree, Branch, Profile, LeafWithDetails, Leaf, LeafType, LeafAssignment, BranchMember, TreeMember } from './database'

// User-related types
export interface UserProfile extends Profile {
  role?: string
  joined_at?: string
}

// API response types with computed user-specific fields
// These represent data as returned from API endpoints, including user permissions and aggregated counts

export interface TreeWithMembers {
  tree_id: string
  trees: Tree | null
  member_count: number
  role: string  // Current user's role in this tree
  permissions: string[]  // Current user's permissions for this tree
}

export interface BranchWithMembers {
  branch_id: string
  branches: Branch | null
  member_count: number
  role: string  // Current user's role in this branch
  permissions: string[]  // Current user's permissions for this branch
  tree?: TreeWithMembers  // Associated tree info if needed
}

export interface BranchWithRelations extends Branch {
  branch_members: (BranchMember & { profiles: Profile })[]
}

export interface TreeWithRelations extends Tree {
  tree_members: (TreeMember & { profiles: Profile })[]
}

// Member data with profile information (commonly used in UI components)
export interface BranchMemberWithProfile {
  id: string
  user_id: string
  role: string
  joined_at: string
  added_at: string
  status: string
  profiles: {
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url: string | null
  }
}

export interface TreeMemberWithProfile {
  id: string
  user_id: string
  role: string
  joined_at: string
  profiles: {
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url: string | null
  }
}

// Simplified tree info for UI components (subset of full Tree entity)
export interface TreeInfo {
  id: string
  name: string
  description?: string | null
}

// Navigation and UI types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FilterOption {
  key: string
  label: string
  count: number
  active?: boolean
}

// Page props and component props
export interface PageProps {
  params: Record<string, string>
  searchParams?: Record<string, string | string[] | undefined>
}

export interface TreePageProps extends PageProps {
  params: { treeId: string }
}

export interface BranchPageProps extends PageProps {
  params: { branchId: string }
}

export interface UserPageProps extends PageProps {
  params: { userId: string }
}

export interface InvitePageProps extends PageProps {
  params: { token: string }
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

// Form types
export interface CreateBranchForm {
  name: string
  description: string
  privacy: 'public' | 'private'
  tree_id: string
}

export interface EditBranchForm extends Partial<CreateBranchForm> {
  id: string
}

export interface CreateTreeForm {
  name: string
  description: string
  is_private: boolean
}

export interface InviteForm {
  email: string
  role: 'member' | 'moderator' | 'admin'
  message?: string
}

// Component state types
export interface LoadingState {
  loading: boolean
  error: string | null
}

export interface TreeExplorerState extends LoadingState {
  leaves: LeafWithDetails[]
  selectedTree: TreeWithMembers | null
  filter: 'all' | 'milestones' | 'recent'
}

// Invitation types
export interface BranchInvitation {
  id: string
  branch_id: string
  email: string
  role: string
  token: string
  status: 'pending' | 'accepted' | 'declined'
  expires_at: string
  created_at: string
  branch?: BranchWithMembers
}

export interface TreeInvitation {
  id: string
  tree_id: string
  email: string
  role: string
  token: string
  status: 'pending' | 'accepted' | 'declined'
  expires_at: string
  created_at: string
  tree?: TreeWithMembers
}

// Cross-tree access types
export interface CrossTreeAccess {
  id: string
  tree_id: string
  branch_id: string
  permissions: string[]
  granted_by: string
  created_at: string
  tree?: TreeWithMembers
  branch?: BranchWithMembers
}

// Member types
export interface BranchMember {
  id: string
  branch_id: string
  user_id: string
  role: string
  joined_at: string
  profile?: UserProfile
}

export interface TreeMember {
  id: string
  tree_id: string
  user_id: string
  role: string
  joined_at: string
  profile?: UserProfile
}

// Statistics types
export interface TreeStats {
  totalLeaves: number
  milestoneCount: number
  recentLeaves: number
  leafTypeBreakdown: Record<string, number>
  seasonBreakdown: Record<string, number>
  memberCount: number
}

export interface BranchStats {
  totalLeaves: number
  memberCount: number
  recentActivity: number
  leafTypeBreakdown: Record<string, number>
}

// UI Settings and preferences (client-side only)
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    mentions: boolean
    reactions: boolean
    comments: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private' | 'friends'
    show_activity: boolean
    show_email: boolean
  }
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Nullable<T> = T | null
export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never

// Event handler types
export type EventHandler<T = void> = (event?: React.SyntheticEvent) => T
export type AsyncEventHandler<T = void> = (event?: React.SyntheticEvent) => Promise<T>

export type ChangeHandler<T = string> = (value: T) => void
export type AsyncChangeHandler<T = string> = (value: T) => Promise<void>

// Leaf assignment types
export interface LeafWithAssignments extends Leaf {
  assignments: {
    assignment_id: string
    branch_id: string
    branch_name: string
    branch_color: string
    is_primary: boolean
    assigned_at: string
    assigned_by: string
  }[]
  assignment_count: number
}

// Unassigned leaf for user dashboard
export interface UnassignedLeaf {
  id: string
  content: string | null
  media_urls: string[] | null
  leaf_type: LeafType
  milestone_type: string | null
  tags: string[]
  ai_caption: string | null
  ai_tags: string[]
  created_at: string
  updated_at: string
  author_first_name: string | null
  author_last_name: string | null
  author_avatar_url: string | null
}

// Leaf assignment operation result
export interface LeafAssignmentResult {
  success: boolean
  leaf_id: string
  assignments: string[] // branch IDs
  error?: string
}