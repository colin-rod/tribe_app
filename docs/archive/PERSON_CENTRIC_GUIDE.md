# Person-Centric Architecture Implementation Guide

## 🎉 Migration Complete!

The Tribe app has been successfully migrated from a family-centric to a person-centric architecture. Here's everything you need to know about the new system.

## 🏗️ What Changed

### Database Schema Updates ✅
- **Trees now represent people** instead of families
- **Added person-centric fields**: `person_name`, `person_birth_date`, `managed_by`, `privacy_level`, `relationships`
- **Cross-tree branch sharing**: New `tree_branch_connections` table enables branches to connect multiple trees
- **Person-specific email routing**: `tree_email_addresses` table maps emails to specific people

### Email Integration Enhanced ✅
- **Legacy support**: `u-{userId}@domain.com` still works
- **Person-specific routing**: New `person-{treeId}@domain.com` format
- **Smart content enrichment**: Emails include person context automatically

### TypeScript Types Updated ✅
- Updated `Tree` interface with person-centric fields
- Added new types: `TreeBranchConnection`, `TreeEmailAddress`, `TreeRelationships`
- Enhanced interfaces for person-centric workflows

## 🚀 How to Use the New System

### 1. Creating Person Trees

Trees now represent individual people (children, family members):

```typescript
// Example: Creating a tree for a child
const babyTree = await createPersonTree({
  person_name: "Baby Sarah", 
  person_birth_date: "2023-06-15",
  privacy_level: "private",
  managed_by: [parentUserId], // Parent can manage child's tree
  relationships: {
    child_of: [dadTreeId, momTreeId],
    sibling_of: [brotherTreeId]
  }
});
```

### 2. Person-Specific Email Addresses

Each tree gets its own email address for content routing:

```typescript
// Email format: person-{treeId}@colinrodrigues.com
const emailAddress = `person-${babyTree.id}@colinrodrigues.com`;

// Send photos to this address and they'll automatically:
// 1. Route to Baby Sarah's tree
// 2. Include "📧 Email for: Baby Sarah" context
// 3. Be authored by the managing parent
```

### 3. Cross-Tree Branch Sharing

Branches can now connect multiple people's trees:

```typescript
// Example: "Family Vacation 2024" branch connects everyone
await createCrossTreeBranch({
  name: "Family Vacation 2024",
  connected_trees: [
    { tree_id: babyTreeId, connection_type: "shared" },
    { tree_id: dadTreeId, connection_type: "shared" },  
    { tree_id: momTreeId, connection_type: "owner" }
  ]
});
```

### 4. Parent Dashboard

Parents can now manage multiple children's trees from one interface:

```typescript
// Get all trees user can manage
const managedTrees = await getUserManagedTrees(userId);
// Returns trees for: Baby Sarah, Big Brother, etc.

// Quick context switching
const currentPersonContext = managedTrees.find(t => t.id === selectedTreeId);
```

## 📧 Email Routing Examples

### Legacy User Email (Still Works)
```
To: u-abc123@colinrodrigues.com
Result: Creates leaf authored by user abc123, unassigned
```

### Person-Specific Email (New!)
```  
To: person-def456@colinrodrigues.com
Result: 
- Looks up tree def456
- Creates leaf authored by managing parent
- Includes "📧 Email for: [Person Name]" context
- Auto-routes to that person's content
```

## 🔧 API Endpoints Updated

### SendGrid Webhook Enhanced
- `POST /api/webhooks/sendgrid` now handles both routing types
- Response includes `routingType` and `targetTreeId` for person emails
- Improved logging and error handling

### Database Functions Added
```sql
-- Check if user can manage a tree
user_can_manage_tree(user_id UUID, tree_id UUID)

-- Get all trees a user manages
get_user_managed_trees(user_id UUID)  

-- Enhanced cross-tree branch access
user_has_cross_tree_branch_access(user_id UUID, branch_id UUID)
```

## 🧪 Testing the New System

### 1. Run the Test Script
```bash
node test-person-email.js
```

### 2. Manual Testing Steps
1. **Check migration results**: Verify existing trees have person fields populated
2. **Create a new person tree**: Use the updated tree creation flow  
3. **Generate email address**: Each tree should have a person-specific email
4. **Send test email**: Email a photo to `person-{treeId}@domain.com`
5. **Verify routing**: Check that content appears with person context

### 3. Verification Queries
```sql
-- Check migration success
SELECT person_name, managed_by, privacy_level FROM trees LIMIT 5;

-- Verify email addresses created  
SELECT t.person_name, tea.email_address 
FROM trees t 
JOIN tree_email_addresses tea ON tea.tree_id = t.id
WHERE tea.is_active = true;

-- Check cross-tree connections
SELECT COUNT(*) FROM tree_branch_connections;
```

## 🎯 User Experience Improvements

### For Parents
- **Unified management**: Manage all family members' trees from one dashboard
- **Person-specific emails**: Each child gets their own email for easy content routing
- **Relationship mapping**: Visually see family connections and shared content
- **Privacy controls**: Set different privacy levels per person

### For Content Organization  
- **Person-focused memories**: Each person's timeline tells their individual story
- **Cross-tree sharing**: Family moments appear in all relevant person trees
- **Smart routing**: Content automatically goes to the right person's collection
- **Rich context**: Email content includes person attribution and relationships

### For Email Integration
- **Backward compatible**: Existing `u-{userId}@domain.com` emails still work
- **Person routing**: `person-{treeId}@domain.com` routes directly to specific people
- **Enhanced content**: Emails include person context and smart formatting
- **Better organization**: Content appears in person-specific inboxes

## 🔮 Future Enhancements

### Phase 2: Advanced Email Features (Next Sprint)
- **Multi-person detection**: Auto-share photos with multiple people to all their trees
- **Relationship-based sharing**: Smart suggestions based on family relationships  
- **Age-appropriate features**: Different interfaces based on person's age
- **Email templates**: Custom email formats for different types of content

### Phase 3: AI & Automation
- **Face recognition**: Automatically detect which family members are in photos
- **Smart tagging**: AI-powered content categorization per person
- **Timeline generation**: Auto-create life milestone timelines
- **Memory suggestions**: Remind parents to document important moments

### Phase 4: External Sharing
- **SMS/WhatsApp integration**: Multi-channel content ingestion
- **Guest sharing**: Share branches with users who don't have accounts
- **Memory books**: Generate beautiful photo books per person
- **Timeline exports**: Create growth stories and milestone collections

## 🚨 Breaking Changes & Migration Notes

### What's Preserved
- ✅ All existing data migrated safely
- ✅ Current email integration continues working  
- ✅ Existing UI components work without changes
- ✅ All RLS policies updated automatically

### What's Changed
- 🔄 Trees now have person-centric fields (auto-populated)
- 🔄 Email webhook supports new routing format
- 🔄 TypeScript types updated for new schema
- 🔄 Database functions enhanced for cross-tree access

### Action Required
1. **Update environment**: No new environment variables needed
2. **Test email routing**: Verify both old and new email formats work
3. **Update documentation**: Team should understand new person-centric model
4. **Plan UI updates**: Consider creating person-focused dashboard views

## 📚 Technical Reference

### Key Files Changed
- `migrations/001_person_centric_schema.sql` - Database migration
- `src/types/database.ts` - Updated TypeScript types
- `src/app/api/webhooks/sendgrid/route.ts` - Enhanced email routing
- `test-person-email.js` - Testing utilities

### Database Schema Summary
```sql
-- Updated trees table
trees: + person_name, person_birth_date, managed_by[], privacy_level, relationships

-- New tables  
tree_branch_connections: Cross-tree branch sharing
tree_email_addresses: Person-specific email routing

-- Enhanced functions
user_has_cross_tree_branch_access() - Cross-tree permissions
user_can_manage_tree() - Tree management permissions  
get_user_managed_trees() - User's manageable trees
```

---

**🎉 Congratulations!** Your Tribe app now supports true person-centric family memory management. Each family member gets their own digital space while maintaining the ability to share special moments across the family network.

The foundation is now ready for advanced features like AI-powered content routing, multi-channel integration, and sophisticated family relationship management.