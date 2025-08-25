export type UserRole = 'admin' | 'member' | 'viewer'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type CircleType = 'family' | 'community' | 'topic' | 'local'
export type CirclePrivacy = 'private' | 'public' | 'invite_only'
export type JoinMethod = 'invited' | 'requested' | 'auto_approved' | 'admin_added'

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Tribe {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  settings: Record<string, any>
}

export interface TribeMember {
  id: string
  tribe_id: string
  user_id: string
  role: UserRole
  joined_at: string
}

export interface Circle {
  id: string
  tribe_id: string | null  // Now optional - circles can exist without tribes
  name: string
  description: string | null
  color: string
  created_by: string
  created_at: string
  updated_at: string
  type: CircleType
  privacy: CirclePrivacy
  category: string | null
  location: string | null
  member_count: number
  is_discoverable: boolean
  auto_approve_members: boolean
}

export interface CircleMember {
  id: string
  circle_id: string
  user_id: string
  role: UserRole
  added_at: string
  join_method: JoinMethod
  joined_via: string | null  // user_id of who invited/approved them
  status: string
  requested_at: string | null
  approved_at: string | null
}

export interface CircleCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string
  created_at: string
}

export interface CircleInvitation {
  id: string
  circle_id: string
  invited_by: string
  email: string
  role: UserRole
  status: InvitationStatus
  token: string
  expires_at: string
  created_at: string
  accepted_at: string | null
  message: string | null
}

export interface Post {
  id: string
  circle_id: string
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
  tribe_id: string
  invited_by: string
  email: string
  role: UserRole
  status: InvitationStatus
  token: string
  expires_at: string
  created_at: string
  accepted_at: string | null
}

// Extended types with relations for circles-first architecture
export interface CircleWithMembers extends Circle {
  circle_members: (CircleMember & { profiles: Profile })[]
  tribe?: Tribe | null  // Now optional since circles can exist without tribes
  category_info?: CircleCategory | null
}

export interface CircleWithDetails extends Circle {
  circle_members: (CircleMember & { profiles: Profile })[]
  posts_count?: number
  recent_activity?: string | null
  user_membership?: CircleMember | null  // Current user's membership in this circle
}

export interface PostWithDetails extends Post {
  profiles: Profile
  comments: (Comment & { profiles: Profile })[]
  likes: Like[]
  circle: Circle
}

// Keep tribe-related types for backward compatibility
export interface TribeWithMembers extends Tribe {
  tribe_members: (TribeMember & { profiles: Profile })[]
  circles: Circle[]
}

// New types for circle discovery and management
export interface CircleDiscovery {
  featured_circles: Circle[]
  categories: CircleCategory[]
  user_circles: CircleWithMembers[]
  suggested_circles: Circle[]
}

export interface CircleJoinRequest {
  id: string
  circle_id: string
  user_id: string
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}