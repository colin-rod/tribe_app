// RBAC System: Roles are managed through the RBAC system (user_roles table)
// The 'role' fields in legacy tables (branch_members, tree_members) are kept for backward compatibility
// but the RBAC system is the source of truth for permissions
export type UserRole = 'owner' | 'admin' | 'moderator' | 'member' | 'viewer'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type BranchType = 'family'
export type BranchPrivacy = 'private' | 'invite_only'
export type JoinMethod = 'invited' | 'requested' | 'auto_approved' | 'admin_added'
export type FamilyRole = 'parent' | 'child' | 'grandparent' | 'grandchild' | 'sibling' | 'spouse' | 'partner' | 'other'
export type ProfileVisibility = 'branches' | 'private'

// AI Enhancement types for Leaf Creator
export interface LeafEnhancementRequest {
  content: string
  mediaUrls: string[]
  leafType: LeafType
  context?: string
}

export interface LeafEnhancementResult {
  aiCaption: string
  aiTags: string[]
  milestoneType?: string
  season?: string
}

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
  email_new_posts: boolean
  email_comments: boolean
  email_mentions: boolean
  email_invitations: boolean
  push_notifications: boolean
  created_at: string
  updated_at: string
}

export interface TreeSettings {
  privacy_level: 'public' | 'private' | 'family_only'
  allow_public_discovery: boolean
  require_approval: boolean
  auto_accept_family: boolean
  email_notifications: boolean
  member_limit?: number
  custom_fields?: Record<string, string | number | boolean>
}

export interface Tree {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  settings: TreeSettings
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

// Leaf types for the family tree system
export type LeafType = 'photo' | 'video' | 'audio' | 'text' | 'milestone'
export type ReactionType = 'heart' | 'smile' | 'laugh' | 'wow' | 'care' | 'love'
export type MilestoneCategory = 'physical' | 'communication' | 'social' | 'academic' | 'celebration' | 'experience' | 'family' | 'general'

export interface ConversationContext {
  thread_title?: string
  participants: string[]
  reply_count: number
  last_activity: string
  mentioned_users?: string[]
  referenced_leaves?: string[]
  conversation_type: 'thread' | 'direct' | 'group'
  metadata?: Record<string, string | number | boolean>
}

export interface Leaf {
  id: string
  branch_id: string | null
  author_id: string
  content: string | null
  media_urls: string[] | null
  leaf_type: LeafType
  milestone_type: string | null
  milestone_date: string | null
  tags: string[]
  season: string | null
  ai_caption: string | null
  ai_tags: string[]
  thread_id: string | null
  reply_to_id: string | null
  conversation_context: ConversationContext | null
  message_type: 'post' | 'message' | 'reply' | 'system'
  is_pinned: boolean
  edited_at: string | null
  assignment_status: 'assigned' | 'unassigned' | 'multi-assigned'
  created_at: string
  updated_at: string
}

export interface LeafReaction {
  id: string
  leaf_id: string
  user_id: string
  reaction_type: ReactionType
  created_at: string
  updated_at: string
}

export interface LeafShare {
  id: string
  leaf_id: string
  branch_id: string
  shared_by: string
  created_at: string
}

export interface LeafAssignment {
  id: string
  leaf_id: string
  branch_id: string
  assigned_by: string
  assigned_at: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  name: string
  display_name: string
  description: string | null
  category: MilestoneCategory
  typical_age_months: number | null
  icon: string | null
  color: string
  created_at: string
}

// Keep Post as alias for backward compatibility during migration
export type Post = Leaf

export interface LeafWithDetails extends Leaf {
  profiles: Profile
  branch: Branch
  tree_name: string | null
  milestone_display_name: string | null
  milestone_category: MilestoneCategory | null
  milestone_icon: string | null
  author_name: string | null
  author_avatar: string | null
  heart_count: number
  smile_count: number
  laugh_count: number
  user_reaction: ReactionType | null
  share_count: number
  comment_count: number
  reactions: LeafReaction[]
  shares: LeafShare[]
  comments: (Comment & { profiles: Profile })[]
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

// Database relation types (for direct DB operations with joined data)
export interface BranchWithRelations extends Branch {
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

export interface PostWithDetails extends LeafWithDetails {
  likes: Like[]  // Keep for backward compatibility
}

// Database relation types (for direct DB operations with joined data)
export interface TreeWithRelations extends Tree {
  tree_members: (TreeMember & { profiles: Profile })[]
  branches: Branch[]
}

// Branch management types for family branches
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

// Chat and Conversation Types
export interface ConversationMetadata {
  pinned_message_id?: string
  topic_tags?: string[]
  reminder_date?: string
  milestone_date?: string
  custom_properties?: Record<string, string | number | boolean>
}

export interface Conversation {
  id: string
  branch_id: string
  title: string | null
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  conversation_type: 'general' | 'announcement' | 'milestone' | 'topic'
  metadata: ConversationMetadata
  last_message_at: string
  message_count: number
  participant_count: number
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  last_read_at: string | null
  is_muted: boolean
  notification_level: 'all' | 'mentions' | 'none'
}

export interface AIPromptContext {
  user_preferences?: {
    preferred_tone: 'casual' | 'formal' | 'friendly'
    topics_of_interest: string[]
    frequency: 'daily' | 'weekly' | 'occasional'
  }
  previous_responses?: {
    response_id: string
    sentiment: 'positive' | 'neutral' | 'negative'
    engagement_level: number
  }[]
  branch_context?: {
    recent_activity: string[]
    active_members: string[]
    trending_topics: string[]
  }
  timing_context?: {
    time_zone: string
    preferred_hours: number[]
    seasonal_preferences: string[]
  }
  custom_data?: Record<string, string | number | boolean>
}

export interface AIPrompt {
  id: string
  user_id: string
  branch_id: string
  conversation_id: string | null
  prompt_text: string
  response_text: string | null
  prompt_type: 'journal' | 'milestone' | 'memory' | 'checkin' | 'custom'
  context_data: AIPromptContext
  completed: boolean
  created_at: string
  completed_at: string | null
}

// Enhanced message types with conversation context
export interface MessageWithContext extends Post {
  conversation_title?: string | null
  conversation_type?: string | null
  reply_to_content?: string | null
  reply_to_author_id?: string | null
  reply_to_first_name?: string | null
  reply_to_last_name?: string | null
}

export interface ConversationWithMessages extends Conversation {
  messages: (Post & { profiles: Profile })[]
  participants: (ConversationParticipant & { profiles: Profile })[]
}

// Message type guards and utilities
export type MessageType = Post['message_type']
export type NotificationLevel = ConversationParticipant['notification_level']
export type PromptType = AIPrompt['prompt_type']
export type ConversationType = Conversation['conversation_type']

