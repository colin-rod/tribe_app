# Tribe App Architecture

## Core Concept: Person-Centric Family Trees

The Tribe app is designed around **person-centric trees** where each tree represents an individual person (child, family member, etc.) rather than a topic or family unit.

## Architecture Overview

### Trees = People
- **One tree per person**: Each family member has their own tree
- **Parents manage children's trees**: Caregivers can create and manage trees for their dependents
- **Multiple trees per account**: One user can manage multiple people's trees (e.g., parent managing children)
- **Privacy levels**: Public, shared ownership, or private per person's tree

### Branches = Shared Experiences
- **Cross-tree connections**: Branches connect multiple people's trees
- **Shared moments**: Same content can appear in multiple trees via branches
- **Relationship-based sharing**: Family vacation branch connects all family members' trees

### Leaves = Memories & Content
- **Multi-channel ingestion**: Email, SMS, WhatsApp, platform uploads
- **Rich media support**: Photos, videos, audio, text, milestones
- **Smart routing**: Content automatically assigned to appropriate person's tree
- **Metadata rich**: Tags, dates, milestones, AI captions

## Current Implementation Status

### ✅ Already Built
- **Email integration**: SendGrid webhook processing with media support
- **Leaf assignment system**: Unassigned leaves can be assigned to branches
- **Media handling**: Base64 decoding, Supabase Storage, multi-format support
- **Tree/branch database structure**: Basic relationships exist
- **RBAC permissions**: User roles and access control

### 🔄 Needs Architecture Update
- **Tree model**: Currently family-centric, needs person-centric conversion
- **Cross-tree branches**: Current branches belong to trees, need cross-tree capability
- **Person relationships**: Need to define relationships between trees/people
- **Parent management**: Interface for managing multiple people's trees

### ❌ Not Yet Built
- **Person-specific email routing**: `baby-sarah@domain.com` style addresses
- **Multi-person content sharing**: Same photo in multiple trees
- **Age-appropriate features**: Different interfaces based on person's age
- **Face recognition**: Auto-identify which person should receive content
- **Parent dashboard**: Unified view of all managed trees

## Data Architecture

### Core Entities

#### Users (Account Holders)
```typescript
interface User {
  id: string
  email: string
  // Can manage multiple trees (for different people)
}
```

#### Trees (Represent People)
```typescript
interface Tree {
  id: string
  person_name: string        // "Baby Sarah", "Grandma Rose"
  person_birth_date?: Date   // For age-appropriate features
  managed_by: string[]       // User IDs who can manage this tree
  privacy_level: 'public' | 'shared' | 'private'
  relationships?: {          // Relationships to other trees
    parent_of?: string[]     // Tree IDs
    child_of?: string[]      // Tree IDs  
    sibling_of?: string[]    // Tree IDs
    spouse_of?: string       // Tree ID
  }
}
```

#### Branches (Shared Experiences)
```typescript
interface Branch {
  id: string
  name: string              // "Family Vacation 2024"
  description?: string
  connected_trees: string[] // Multiple tree IDs
  privacy_level: 'public' | 'shared' | 'private'
  created_by: string       // User ID
}
```

#### Leaves (Memories)
```typescript
interface Leaf {
  id: string
  content: string
  media_urls: string[]
  leaf_type: 'photo' | 'video' | 'audio' | 'text' | 'milestone'
  tags: string[]
  author_id: string        // User who created/sent this
  primary_tree_id?: string // Main person this relates to
  branch_assignments: {    // Can be in multiple branches
    branch_id: string
    assigned_by: string
    assigned_at: Date
  }[]
  source_channel: 'email' | 'sms' | 'whatsapp' | 'platform'
  metadata: {
    email_subject?: string
    sender_email?: string
    milestone_type?: string
    detected_faces?: string[] // Future: AI face recognition
  }
}
```

## Email Integration Architecture

### Current State
- Single email per user: `u-{userId}@domain.com`
- All emails create unassigned leaves
- Manual assignment to branches

### Target State
- **Person-specific emails**: `person-{treeId}@domain.com`
- **Smart routing**: Auto-assign to person's tree based on email address
- **Cross-tree sharing**: Photos with multiple people auto-shared to relevant trees

### Email Processing Flow
1. **Email received** at `person-sarah@domain.com`
2. **Extract tree ID** from email address
3. **Process attachments** and content
4. **Create leaf** assigned to Sarah's tree
5. **AI analysis** (future): Detect other people in photos
6. **Auto-share** (future): Add to branches connecting to detected people's trees

## User Experience Flows

### Parent User Journey
1. **Create account** with personal email
2. **Create trees** for family members (children, spouse, etc.)
3. **Set up email routing** for each person
4. **Send/forward content** to person-specific emails
5. **Manage trees** from unified parent dashboard
6. **Create branches** to share experiences across family trees

### Content Sharing Journey
1. **Family photo taken** and emailed to multiple addresses
2. **Smart routing** assigns to primary person's tree
3. **AI detection** (future) identifies other family members
4. **Auto-sharing** adds to relevant family branches
5. **Branch notifications** alert other family members
6. **Cross-tree visibility** shows content in all relevant trees

## Technical Implementation Priorities

### Phase 1: Architecture Foundation
1. Update database schema for person-centric trees
2. Create tree relationship mappings
3. Implement cross-tree branch sharing
4. Build parent dashboard for multi-tree management

### Phase 2: Email Enhancement
1. Person-specific email routing
2. Smart content assignment based on email address
3. Cross-tree sharing for multi-person content
4. Enhanced email processing with person context

### Phase 3: Advanced Features
1. Face recognition for auto-routing
2. Age-appropriate interface variations
3. Milestone tracking per person
4. Memory book generation per tree

## Success Metrics
- **Engagement**: Daily active trees (not just users)
- **Content Flow**: Leaves per tree per week
- **Family Connection**: Cross-tree branch activity
- **Retention**: Long-term tree management (months/years)
- **Growth**: Trees created per active parent user

---

This architecture enables rich family storytelling while maintaining the personal focus that makes each family member's journey special and trackable over time.