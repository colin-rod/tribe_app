# Tribe App Architecture

## Core Concept: Person-Centric Family Memory Management

The Tribe app is designed around **person-centric trees** where each tree represents an individual person (child, family member, etc.) and families can share memories across multiple connected trees.

## Current Implementation Status

### ✅ Fully Implemented Features

#### Email Integration System
- **SendGrid webhook processing** with comprehensive media support
- **Base64 attachment handling** with automatic Supabase Storage upload
- **Multi-format support**: Photos (JPG, PNG, HEIC), Videos (MP4, MOV), Audio (MP3, WAV)
- **Smart content processing** with hashtag extraction and email formatting
- **Person-specific email routing**: `person-{treeId}@domain.com` format
- **Legacy email support**: `u-{userId}@domain.com` still functional

#### Tree and Branch System
- **Person-centric trees**: Each tree represents an individual person
- **Tree management permissions**: `managed_by` array allows parents to manage children's trees
- **Cross-tree branch sharing**: Branches can connect multiple person trees
- **Email address mapping**: Each tree can have dedicated email addresses

#### Media Processing Pipeline
- **Automatic media upload** from email attachments to Supabase Storage
- **Organized storage structure**: `/email-attachments/{userId}/{emailId}/`
- **Multi-media support**: Images, videos, audio with proper MIME type handling
- **Error handling**: Partial success for batch uploads, comprehensive logging

#### Role-Based Access Control (RBAC)
- **User roles**: Owner, Admin, Member with granular permissions
- **Tree-level permissions**: Users can manage multiple trees (parent → children)
- **Branch-level access control**: Fine-grained sharing permissions
- **Cross-tree security**: Proper validation for multi-tree operations

#### Real-time Features
- **Supabase subscriptions** for live updates
- **Real-time notifications** for new content
- **Live comments and reactions** on family memories
- **Instant synchronization** across devices

### 🔄 Partially Implemented Features

#### Person-Centric Database Schema
- **Trees table enhanced** with person fields (`person_name`, `person_birth_date`, `managed_by`, `relationships`)
- **Cross-tree connections** via `tree_branch_connections` table
- **Email routing** via `tree_email_addresses` table
- **Migration completed** but UI still family-centric in some areas

#### User Interface
- **Dashboard supports** tree switching but lacks unified parent dashboard
- **LeafCard displays** person attribution but limited cross-tree visualization
- **Branch creation** works cross-tree but UI could be more intuitive
- **Tree management** functional but could be streamlined for parents

### ❌ Planned But Not Yet Implemented

#### Advanced AI Features
- **Face recognition**: Auto-identify people in photos for smart routing
- **Content categorization**: AI-powered tagging and organization
- **Smart suggestions**: Proactive memory prompts based on patterns
- **Multi-person detection**: Automatically share content with all relevant trees

#### Extended Communication Channels
- **SMS/MMS integration**: Text message to memory conversion
- **WhatsApp integration**: Support for WhatsApp media messages
- **Voice message processing**: Enhanced audio content handling
- **Multi-channel management**: Unified inbox for all communication types

#### Family Relationship Management
- **Visual family tree**: Interactive relationship mapping
- **Relationship-based permissions**: Auto-permissions based on family connections
- **Age-appropriate features**: Different interfaces based on person's age
- **Timeline generation**: Automated life story creation

## Technical Architecture

### Database Schema

#### Core Entities

```typescript
// Users (Account Holders)
interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  created_at: Date
  // Can manage multiple trees for different people
}

// Trees (Represent People) 
interface Tree {
  id: string
  name: string                  // Tree name (legacy)
  person_name: string           // "Baby Sarah", "Grandma Rose"
  person_birth_date?: Date      // For age-appropriate features
  managed_by: string[]          // User IDs who can manage this tree
  created_by: string            // Original creator
  privacy_level: 'public' | 'shared' | 'private'
  relationships?: {             // Family connections
    parent_of?: string[]        // Tree IDs
    child_of?: string[]         // Tree IDs  
    sibling_of?: string[]       // Tree IDs
    spouse_of?: string          // Tree ID
  }
  settings: object              // Tree-specific configuration
  created_at: Date
}

// Branches (Shared Experiences)
interface Branch {
  id: string
  name: string                  // "Family Vacation 2024"
  description?: string
  tree_id: string              // Primary tree (legacy)
  privacy_level: 'public' | 'shared' | 'private'
  created_by: string
  settings: object
  created_at: Date
}

// Cross-Tree Branch Connections
interface TreeBranchConnection {
  id: string
  branch_id: string            // References branches(id)
  tree_id: string              // References trees(id)
  connection_type: 'owner' | 'shared' | 'viewer'
  connected_at: Date
}

// Email Address Routing
interface TreeEmailAddress {
  id: string
  tree_id: string              // References trees(id)
  email_address: string        // person-{treeId}@domain.com
  is_active: boolean
  created_at: Date
}

// Leaves (Memories)
interface Leaf {
  id: string
  content: string
  media_urls: string[]
  leaf_type: 'photo' | 'video' | 'audio' | 'text' | 'milestone'
  tags: string[]
  author_id: string            // User who created/sent this
  tree_id?: string             // Target tree for person-specific content
  created_at: Date
  email_metadata?: {
    subject?: string
    sender_email?: string
    email_id?: string
  }
}

// Leaf Assignments (Many-to-Many)
interface LeafAssignment {
  id: string
  leaf_id: string              // References leaves(id)
  branch_id: string            // References branches(id)  
  assigned_by: string          // User who made the assignment
  assigned_at: Date
}
```

### API Architecture

#### Email Processing Flow

```
1. Email sent to person-sarah@domain.com
2. SendGrid Parse API forwards to /api/webhooks/sendgrid
3. Extract tree ID from email address
4. Validate user can manage target tree
5. Process attachments and upload to Supabase Storage
6. Create leaf with person context
7. Notify family members of new content
```

#### Authentication & Authorization

```typescript
// Route Protection Middleware
async function authenticateRequest(req: NextRequest) {
  const { user } = await getUser(req)
  if (!user) throw new AuthError('Authentication required')
  return user
}

// Tree Management Authorization
async function canManageTree(userId: string, treeId: string): Promise<boolean> {
  const tree = await getTree(treeId)
  return tree.managed_by.includes(userId) || tree.created_by === userId
}

// Cross-Tree Branch Access
async function canAccessBranch(userId: string, branchId: string): Promise<boolean> {
  // Check if user can access any tree connected to this branch
  const connections = await getTreeBranchConnections(branchId)
  return connections.some(conn => canManageTree(userId, conn.tree_id))
}
```

### Storage Architecture

#### Media Storage (Supabase Storage)

```
media/
├── email-attachments/
│   └── {userId}/
│       └── {emailId}/
│           ├── photo1.jpg
│           ├── video1.mp4
│           └── audio1.mp3
├── user-uploads/
│   └── {userId}/
│       └── {leafId}/
│           └── media files
└── profile-images/
    └── {userId}/
        └── avatar.jpg
```

#### Database Optimizations

```sql
-- Indexes for Performance
CREATE INDEX idx_trees_managed_by ON trees USING GIN (managed_by);
CREATE INDEX idx_tree_branch_connections_tree_id ON tree_branch_connections (tree_id);
CREATE INDEX idx_tree_branch_connections_branch_id ON tree_branch_connections (branch_id);
CREATE INDEX idx_tree_email_addresses_active ON tree_email_addresses (email_address) WHERE is_active = true;
CREATE INDEX idx_leaves_tree_id ON leaves (tree_id);
CREATE INDEX idx_leaf_assignments_branch_id ON leaf_assignments (branch_id);

-- Row Level Security Policies
CREATE POLICY "Users can manage their own trees" ON trees
  FOR ALL USING (created_by = auth.uid() OR auth.uid() = ANY(managed_by));

CREATE POLICY "Users can access connected branches" ON branches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tree_branch_connections tbc
      JOIN trees t ON tbc.tree_id = t.id
      WHERE tbc.branch_id = branches.id
      AND (t.created_by = auth.uid() OR auth.uid() = ANY(t.managed_by))
    )
  );
```

## User Experience Architecture

### Parent User Journey

1. **Account Creation**: Parent signs up with primary email
2. **Tree Creation**: Creates trees for family members (children, spouse, etc.)
3. **Email Setup**: Generates person-specific email addresses
4. **Content Sharing**: Sends/forwards photos to person-specific emails
5. **Memory Management**: Organizes content into branches across family trees
6. **Family Engagement**: Invites extended family to appropriate branches

### Content Flow Architecture

```
Photo of Baby Sarah + Big Brother
        ↓
Emailed to person-sarah@domain.com
        ↓
Routes to Sarah's tree, authored by parent
        ↓
AI detection (future): Identifies Big Brother
        ↓
Auto-shared to "Siblings" branch
        ↓
Appears in both Sarah's and Brother's timelines
        ↓
Family notifications sent to all branch members
```

## Security Architecture

### Privacy by Design

- **No public content**: Everything is private by default
- **Invite-only access**: Only explicitly invited users can see content
- **Granular permissions**: Fine control over viewing, posting, and management
- **Isolated storage**: Each family's media is completely separate

### Technical Security

- **Row Level Security (RLS)**: Database-level access control
- **JWT authentication**: Secure session management via Supabase Auth
- **API route protection**: Server-side authentication on all endpoints
- **Input validation**: Comprehensive sanitization using Zod schemas
- **File validation**: MIME type and size checking for uploads
- **HTTPS everywhere**: All communication encrypted in transit

### Future Security Enhancements

- **Multi-Factor Authentication (2FA)**: SMS and authenticator app support
- **End-to-End Encryption**: For highly sensitive family content
- **Advanced audit logging**: Complete activity tracking
- **GDPR compliance tools**: Data export and deletion capabilities

## Performance Architecture

### Current Optimizations

- **Next.js App Router**: Automatic code splitting and optimization
- **Image optimization**: Next.js Image component with automatic compression
- **Real-time subscriptions**: Efficient Supabase real-time listeners
- **Database indexing**: Optimized queries for common access patterns
- **CDN integration**: Vercel Edge Network for global content delivery

### Scalability Considerations

- **Horizontal scaling**: Stateless architecture supports multiple instances
- **Database partitioning**: Ready for family-based data partitioning
- **Media CDN**: Supabase Storage with global CDN
- **Background job processing**: Email webhook processing is async-ready
- **Caching strategy**: React Query for client-side data caching

## Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety throughout application
- **Tailwind CSS**: Utility-first styling with custom design system
- **Framer Motion**: Smooth animations and interactions
- **React Query**: Data fetching and state management
- **Lucide React**: Consistent icon system

### Backend & Infrastructure
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Supabase Auth**: User authentication and session management
- **Supabase Storage**: Secure media file storage with CDN
- **SendGrid**: Email parsing and webhook processing
- **Vercel**: Hosting and deployment with edge functions

### Development & Quality
- **Jest**: Unit and integration testing
- **React Testing Library**: Component testing
- **ESLint**: Code linting and consistency
- **Prettier**: Code formatting
- **Zod**: Runtime type validation and schema definitions

## Migration History

### Person-Centric Migration (September 2024)

The app was successfully migrated from a family-centric to person-centric architecture:

#### Database Changes
- ✅ Added person fields to trees table
- ✅ Created tree_branch_connections for cross-tree sharing
- ✅ Implemented tree_email_addresses for person-specific routing
- ✅ Updated RLS policies for new architecture
- ✅ Migrated existing data to new structure

#### Application Changes
- ✅ Enhanced email webhook for person-specific routing
- ✅ Updated TypeScript interfaces for new schema
- ✅ Implemented tree management permissions
- ✅ Added person context to email processing

#### Preserved Functionality
- ✅ All existing email integration continues working
- ✅ Legacy `u-{userId}@domain.com` emails still supported
- ✅ Existing tree/branch relationships maintained
- ✅ All media and content preserved during migration

## Future Architecture Roadmap

### Phase 1: Enhanced UI (Next 2-3 months)
- Unified parent dashboard for multi-tree management
- Improved tree switching and context awareness
- Better cross-tree content visualization
- Streamlined branch creation for multiple trees

### Phase 2: AI Integration (3-6 months)
- Face recognition for automatic content routing
- Smart content categorization and tagging
- Proactive memory prompts and suggestions
- Multi-person detection in photos

### Phase 3: Multi-Channel (6-12 months)  
- SMS/MMS integration for text-to-memory
- WhatsApp Business API integration
- Voice message processing and transcription
- Unified communication channel management

### Phase 4: Advanced Features (12+ months)
- Timeline generation and life story creation
- Memory book publishing and printing
- Advanced family relationship management
- Guest sharing for users without accounts
- Mobile app with offline capabilities

---

This architecture enables rich, private family storytelling while maintaining the personal focus that makes each family member's journey special and trackable over time.