// RBAC System: Roles are managed through the RBAC system (user_roles table)
// The 'role' fields in legacy tables (branch_members, tree_members) are kept for backward compatibility
// but the RBAC system is the source of truth for permissions
export type UserRole = 'owner' | 'admin' | 'moderator' | 'member' | 'viewer'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type BranchType = 'family' | 'community' | 'topic' | 'local'
export type BranchPrivacy = 'private' | 'public' | 'invite_only'
export type JoinMethod = 'invited' | 'requested' | 'auto_approved' | 'admin_added'
export type FamilyRole = 'parent' | 'child' | 'grandparent' | 'grandchild' | 'sibling' | 'spouse' | 'partner' | 'other'
export type ProfileVisibility = 'public' | 'circles' | 'private'

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  family_role: FamilyRole | null
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  profile_visibility: ProfileVisibility
  show_email: boolean
  show_join_date: boolean
  allow_circle_discovery: boolean
  email_new_posts: boolean
  email_comments: boolean
  email_mentions: boolean
  email_invitations: boolean
  push_notifications: boolean
  created_at: string
  updated_at: string
}

export interface Tree {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  settings: Record<string, any>
}

export interface TreeMember {
  id: string
  tree_id: string
  user_id: string
  role: UserRole  // Kept for backward compatibility, but RBAC is source of truth
  joined_at: string
}

export interface Branch {
  id: string
  tree_id: string  // Required - branches must belong to a tree
  name: string
  description: string | null
  color: string
  created_by: string
  created_at: string
  updated_at: string
  type: BranchType
  privacy: BranchPrivacy
  category: string | null
  location: string | null
  member_count: number
  is_discoverable: boolean
  auto_approve_members: boolean
}

export interface BranchMember {
  id: string
  branch_id: string
  user_id: string
  role: UserRole  // Kept for backward compatibility, but RBAC is source of truth
  added_at: string
  join_method: JoinMethod
  joined_via: string | null  // user_id of who invited/approved them
  status: string
  requested_at: string | null
  approved_at: string | null
}

export interface BranchCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string
  created_at: string
}

export interface BranchInvitation {
  id: string
  branch_id: string
  invited_by: string
  email: string
  role: UserRole  // Role to be assigned via RBAC upon acceptance
  status: InvitationStatus
  token: string
  expires_at: string
  created_at: string
  accepted_at: string | null
  message: string | null
}

export interface CrossTreeAccess {
  id: string
  branch_id: string
  tree_id: string
  invited_by: string
  invited_at: string
  permissions: {
    can_read: boolean
    can_comment: boolean
    can_like: boolean
    [key: string]: boolean
  }
  status: 'active' | 'revoked' | 'pending'
  created_at: string
}

export interface Post {
  id: string
  branch_id: string
  author_id: string
  content: string | null
  media_urls: string[] | null
  milestone_type: string | null
  milestone_date: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Like {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface Invitation {
  id: string
  tree_id: string
  invited_by: string
  email: string
  role: UserRole  // Role to be assigned via RBAC upon acceptance
  status: InvitationStatus
  token: string
  expires_at: string
  created_at: string
  accepted_at: string | null
}

// Extended types with relations for branches-first architecture
export interface BranchWithMembers extends Branch {
  branch_members: (BranchMember & { profiles: Profile })[]
  tree?: Tree  // Optional relation data, but tree_id is required
  category_info?: BranchCategory | null
}

export interface BranchWithDetails extends Branch {
  branch_members: (BranchMember & { profiles: Profile })[]
  posts_count?: number
  recent_activity?: string | null
  user_membership?: BranchMember | null  // Current user's membership in this branch
}

export interface PostWithDetails extends Post {
  profiles: Profile
  comments: (Comment & { profiles: Profile })[]
  likes: Like[]
  branch: Branch
}

// Keep tree-related types for backward compatibility
export interface TreeWithMembers extends Tree {
  tree_members: (TreeMember & { profiles: Profile })[]
  branches: Branch[]
}

// New types for branch discovery and management
export interface BranchDiscovery {
  featured_branches: Branch[]
  categories: BranchCategory[]
  user_branches: BranchWithMembers[]
  suggested_branches: Branch[]
}

export interface BranchJoinRequest {
  id: string
  branch_id: string
  user_id: string
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

// RBAC System Types
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'moderate' | 'invite' | 'admin'
export type ResourceType = 'branch' | 'post' | 'comment' | 'member' | 'invitation'

export interface Permission {
  id: string
  name: string
  resource_type: ResourceType
  action: PermissionAction
  description: string | null
  created_at: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  is_system_role: boolean
  created_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
  role?: Role
  permission?: Permission
}

export interface UserRoleAssignment {
  id: string
  user_id: string
  role_id: string
  context_type: string
  context_id: string | null
  granted_by: string | null
  granted_at: string
  expires_at: string | null
  role?: Role
}

// RBAC Utility Types
export interface RBACContext {
  type: 'branch' | 'tree' | 'global'
  id?: string
}

export interface UserPermissions {
  [key: string]: boolean
}

export interface BranchPermissions {
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canCreatePosts: boolean
  canModerate: boolean
  canInviteMembers: boolean
  canManageMembers: boolean
  isOwner: boolean
  isAdmin: boolean
  isModerator: boolean
  userRole: UserRole | 'none'
}

// Backward compatibility type aliases (to be removed after full migration)
export type Tribe = Tree
export type TribeMember = TreeMember
export type Circle = Branch
export type CircleMember = BranchMember
export type CircleCategory = BranchCategory
export type CircleInvitation = BranchInvitation
export type CircleType = BranchType
export type CirclePrivacy = BranchPrivacy
export type CircleWithMembers = BranchWithMembers
export type CircleWithDetails = BranchWithDetails
export type CircleDiscovery = BranchDiscovery
export type CircleJoinRequest = BranchJoinRequest
export type CirclePermissions = BranchPermissions
export type CrossTribeAccess = CrossTreeAccess
export type TribeWithMembers = TreeWithMembers