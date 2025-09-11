# Tree App Testing Guide

This document provides comprehensive testing scenarios for the Tree app's tree-first architecture with RBAC permissions.

## 🗂️ **Table of Contents**
- [Prerequisites](#prerequisites)
- [Authentication & Onboarding](#authentication--onboarding)
- [Tree Management](#tree-management)
- [Branch Creation & Management](#branch-creation--management)
- [RBAC Permissions Testing](#rbac-permissions-testing)
- [Cross-Tree Functionality](#cross-tree-functionality)
- [Post Creation & Media](#post-creation--media)
- [Email Integration Testing](#email-integration-testing)
- [Real-time Features](#real-time-features)
- [Profile System](#profile-system)
- [Dashboard & Navigation](#dashboard--navigation)
- [Database Verification](#database-verification)
- [Error Scenarios](#error-scenarios)
- [Browser Testing](#browser-testing)
- [Performance Testing](#performance-testing)

## 📋 **Prerequisites**

### Setup Checklist
- [ ] Supabase project created and configured
- [ ] Environment variables set in `.env.local`
- [ ] SendGrid account and domain configured (for email testing)
- [ ] Database migrations run (especially `20250826_implement_rbac_functions.sql`)
- [ ] Development server running (`npm run dev`)
- [ ] Browser dev tools open (F12) for debugging

### Test User Accounts
Create multiple test accounts:
- `test+tree1@yourdomain.com` (Primary tree owner)
- `test+tree2@yourdomain.com` (Secondary tree owner) 
- `test+member@yourdomain.com` (Tree member)

---

## 🔐 **Authentication & Onboarding**

### Test Case 1: New User Signup & Tree Creation
**Scenario:** First-time user registration with mandatory tree creation

**Steps:**
1. Navigate to `http://localhost:3000`
2. Click "Start your tree"
3. Fill registration form:
   - First name: "Test"
   - Last name: "User"
   - Email: `test+tree1@yourdomain.com`
   - Password: "testpassword123"
4. Click "Create account"
5. Check email for confirmation link
6. Click confirmation link
7. **Onboarding Page**: Fill required tree form:
   - Tree name: "Smith Family"
   - Description: "Our family's home base"
8. Click "Create Tree & Continue"

**Expected Result:**
- [ ] User receives confirmation email
- [ ] Confirmation redirects to onboarding (not dashboard)
- [ ] Tree creation form shows as required (no "Optional" label)
- [ ] Form validation prevents submission without tree name
- [ ] After tree creation, redirects to dashboard
- [ ] Dashboard shows tree-centric layout with "Smith Family" section
- [ ] User automatically has 'owner' role in created tree

### Test Case 2: Returning User Login
**Scenario:** User with existing tree signs in

**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter credentials for `test+tree1@yourdomain.com`
3. Click "Sign in"

**Expected Result:**
- [ ] Console shows: "Attempting sign in with: [email]"
- [ ] Console shows: "Sign in successful, redirecting to dashboard"
- [ ] Redirects to dashboard
- [ ] Shows user's tree(s) with branches organized underneath
- [ ] Dashboard displays tree-centric layout (not branch-type filtering)

---

## 🌳 **Tree Management**

### Test Case 3: Tree Overview Page
**Scenario:** User accesses tree management interface

**Steps:**
1. From dashboard, click "Manage Trees" or navigate to `/trees`
2. View list of user's trees
3. Note role badges (owner/admin/member)
4. Click "Manage" button for owned/admin trees

**Expected Result:**
- [ ] `/trees` page shows all user's trees
- [ ] Each tribe shows correct role badge
- [ ] Created date displayed correctly
- [ ] "Manage" button only visible for owners/admins
- [ ] Empty state shown if no tribes exist
- [ ] Back navigation to dashboard works

### Test Case 4: Tribe Settings Access
**Scenario:** Test tribe-level permissions and settings

**Steps:**
1. As tribe owner, access `/tribes/[tribeId]/settings`
2. Try accessing as non-owner (should redirect)
3. Check available settings tabs
4. Test tribe member management

**Expected Result:**
- [ ] Only tribe owners/admins can access settings
- [ ] Non-authorized users redirected or see permission error
- [ ] Settings show tribe information, members, and permissions
- [ ] Member management reflects RBAC roles correctly

---

## 🎪 **Branch Creation & Management**

### Test Case 5: Create Branch with Tree Selection
**Scenario:** User creates a branch within their tree

**Steps:**
1. From dashboard, click "Create Branch"
2. **Tree Selection**: Choose from dropdown "Smith Family"
3. Fill out form:
   - Name: "Emma's Branch"
   - Description: "Updates and memories about Emma"
   - Privacy: "private"
   - Color: Select blue
4. Click "Create Branch"

**Expected Result:**
- [ ] Tribe selection dropdown populated with user's tribes
- [ ] If user has only one tribe, it's pre-selected
- [ ] Form requires tribe selection (validation error if empty)
- [ ] Console shows successful creation with tribe_id
- [ ] Redirects to dashboard
- [ ] New circle appears under "Smith Family" tribe section
- [ ] User automatically gets 'owner' role in circle

### Test Case 6: Create Public Circle with Discovery Settings
**Scenario:** User creates a public circle within their tribe

**Steps:**
1. Click "Create Circle"
2. Select tribe: "Smith Family"  
3. Fill out form:
   - Name: "Brooklyn New Dads"
   - Description: "Support group for new fathers"
   - Privacy: "public"
   - Category: Select "parenting"
   - Location: "Brooklyn, NY"
   - Check "Auto-approve" and "Show in directory"
4. Click "Create Branch"

**Expected Result:**
- [ ] Public circles still require tribe assignment
- [ ] Privacy options work correctly 
- [ ] Category dropdown populated from database
- [ ] Auto-approve and discoverability options functional
- [ ] New circle appears under selected tribe section
- [ ] Public circles can be discovered by non-tribe members

### Test Case 7: Create Multiple Circles
**Scenario:** User creates multiple circles within tribes

**Steps:**
1. Create private circle: "Baby #2 Circle" (in Smith Family)
2. Create another private circle: "Family Updates" (in Smith Family)  
3. Create public circle: "SF Bay Area Parents" (in Smith Family)
4. Create second tribe: "Extended Family" 
5. Create circle: "Holiday Planning" (in Extended Family)

**Expected Result:**
- [ ] Dashboard shows circles grouped by tribe (not by type)
- [ ] "Smith Family" section shows 3 circles
- [ ] "Extended Family" section shows 1 circle
- [ ] No filter tabs for circle types (tribe-centric view)
- [ ] Each circle shows privacy level indicator

---

## 🔐 **RBAC Permissions Testing**

### Test Case 8: Circle Owner Permissions
**Scenario:** Test full owner permissions in circle

**Steps:**
1. As circle owner, access circle edit page `/circles/[circleId]/edit`
2. Verify all management options available
3. Test member management functions
4. Test cross-tribe invitation features

**Expected Result:**
- [ ] Edit circle settings accessible
- [ ] All circle modification options visible
- [ ] Member management panel shows all controls
- [ ] Cross-tribe invitation system accessible
- [ ] Delete circle option available (only for owners)

### Test Case 9: Circle Member Permission Restrictions  
**Scenario:** Test limited member permissions

**Steps:**
1. Create second user account (`test+member@yourdomain.com`)
2. Invite to existing circle as 'member' role
3. Sign in as member user
4. Try accessing circle edit page
5. Test post creation permissions

**Expected Result:**
- [ ] Circle edit page shows "Permission denied" or redirects
- [ ] Member can view circle content
- [ ] Member can create posts (if permission allows)
- [ ] Member cannot modify circle settings
- [ ] Member cannot manage other members
- [ ] UI appropriately hides unauthorized actions

### Test Case 10: RBAC Function Testing
**Scenario:** Test database-level RBAC functions

**Steps:**
1. Open Supabase SQL Editor
2. Test `user_has_permission` function:
```sql
SELECT user_has_permission(
  '[user-id]'::uuid,
  'circle',
  '[circle-id]'::uuid, 
  'can_update_circle'
);
```
3. Test with different roles and permissions

**Expected Result:**
- [ ] Function returns correct boolean values
- [ ] Permission checks align with user roles
- [ ] Function handles invalid inputs gracefully
- [ ] Performance is acceptable (<100ms per call)

---

## 🔄 **Cross-Tree Functionality**

### Test Case 11: Cross-Tree Access Setup
**Scenario:** Set up cross-tribe circle sharing

**Steps:**
1. Create second tribe with `test+tribe2@yourdomain.com`
2. Create circle "Shared Playgroup" in Tribe 1
3. As Tribe 1 owner, invite Tribe 2 for cross-tribe access
4. Configure permissions (read, comment, like)
5. Accept invitation from Tribe 2

**Expected Result:**
- [ ] Cross-tribe invitation system works
- [ ] Proper permission levels configurable
- [ ] Invited tribe appears in cross-tribe access list
- [ ] Members of Tribe 2 can see shared circle
- [ ] Permissions respected (no unauthorized actions)

### Test Case 12: Cross-Tribe User Experience
**Scenario:** Test cross-tribe user interactions

**Steps:**
1. Sign in as Tribe 2 member
2. Navigate to dashboard
3. View shared circle from Tribe 1
4. Test allowed actions (view, comment, like)
5. Try prohibited actions (edit circle, manage members)

**Expected Result:**
- [ ] Shared circles visible in dashboard
- [ ] Clear indication of cross-tribe access
- [ ] Allowed actions work smoothly
- [ ] Prohibited actions properly blocked
- [ ] Error messages are user-friendly
- [ ] No access to Tribe 1's other private circles

### Test Case 13: Cross-Tribe Permission Management
**Scenario:** Modify cross-tribe access permissions

**Steps:**
1. As Tribe 1 owner, access cross-tribe management
2. Modify permissions for Tribe 2 (revoke commenting)
3. Test updated permissions from Tribe 2 user perspective
4. Revoke access entirely
5. Verify access removal

**Expected Result:**
- [ ] Permission changes take effect immediately
- [ ] Revoked permissions properly blocked
- [ ] Full access revocation removes circle visibility
- [ ] Changes reflected in real-time for affected users

---

## 📝 **Post Creation & Media**

### Test Case 14: Basic Post Creation
**Scenario:** User creates posts with different content types

**Steps:**
1. Select a circle and click "New Post"
2. Create text-only post: "Testing post creation"
3. Create milestone post: Select "first_word" milestone
4. Create empty post (should show validation)

**Expected Result:**
- [ ] Post creation form loads at `/circles/[circleId]/post`
- [ ] Text posts create successfully
- [ ] Milestone types populate correctly
- [ ] Empty posts show validation error
- [ ] Posts appear in feed after creation
- [ ] Auto-save draft functionality works

### Test Case 15: Media Upload Testing
**Scenario:** Test file upload functionality

**Steps:**
1. Create new post
2. **Single Image**: Upload one JPEG image
3. **Multiple Images**: Upload 3 images via drag-and-drop
4. **File Types**: Test PNG, JPEG, WebP formats
5. **File Size**: Try uploading large file (>50MB)
6. **Video Upload**: Upload MP4 video file

**Expected Result:**
- [ ] Drag-and-drop interface highlights on file hover
- [ ] Image previews generate correctly
- [ ] Video files show play icon placeholder
- [ ] Large files show size validation error
- [ ] Upload progress indicators display
- [ ] Media displays correctly in feed after posting

### Test Case 16: Advanced Post Features
**Scenario:** Test enhanced post creation features

**Steps:**
1. Use emoji picker to add family emojis
2. Test auto-save by typing content and waiting
3. Navigate away and return (should restore draft)
4. Upload multiple files and remove some
5. Create post with mixed content (text + images + milestone)

**Expected Result:**
- [ ] Emoji picker opens and inserts emojis
- [ ] Auto-save indicator shows "Saving..." and "Saved X minutes ago"
- [ ] Draft persists across browser sessions
- [ ] File removal works without errors
- [ ] Complex posts display all elements correctly

---

## 📧 **Email Integration Testing**

### Prerequisites for Email Testing
**Setup Required:**
- [ ] SendGrid account created and configured
- [ ] Domain MX records pointing to SendGrid
- [ ] SendGrid Parse webhook configured to your app
- [ ] Environment variables set (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)
- [ ] User account with known user ID for generating test email address

### Test Case 16: Basic Email-to-Memory Creation
**Scenario:** Send plain text email and verify leaf creation

**Steps:**
1. **Get Test Email Address**: From user dashboard, copy unique email address (format: u-{userId}@yourdomain.com)
2. **Send Plain Email**: From any email client, send:
   - To: `u-{userId}@yourdomain.com` 
   - Subject: "Test memory from email"
   - Body: "This is a test memory created via email! #family #test"
3. **Check Dashboard**: Navigate to dashboard and check Inbox tab
4. **Verify Content**: Confirm new leaf appears with correct content

**Expected Result:**
- [ ] Email received by SendGrid and forwarded to webhook
- [ ] New leaf created in user's inbox within 30 seconds
- [ ] Subject appears as main content with "📧 Email" indicator
- [ ] Body text displays below subject
- [ ] Hashtags (#family, #test) extracted and display as tags
- [ ] Leaf type set to 'text' for email without media

### Test Case 17: Photo Email Upload
**Scenario:** Send email with photo attachments and verify media handling

**Steps:**
1. **Send Email with Photos**: Send email with:
   - Subject: "Family dinner tonight"
   - Body: "Great food and even better company! #dinner #family"
   - Attachments: 2-3 JPG/PNG images (under 5MB each)
2. **Verify Upload**: Check dashboard immediately after sending
3. **Test Media Display**: Click on leaf to view full media
4. **Multiple Formats**: Test with different formats (JPG, PNG, GIF, WebP)

**Expected Result:**
- [ ] Photos automatically uploaded to Supabase Storage
- [ ] Leaf type set to 'photo' 
- [ ] Primary photo displays in card preview
- [ ] Multiple photos show thumbnail previews below main image
- [ ] "📧 Email Upload" indicator shows on images
- [ ] Full-size images viewable in expanded view
- [ ] Public URLs generated and accessible
- [ ] Different image formats handled correctly

### Test Case 18: Video Email Upload
**Scenario:** Send email with video attachment and verify playback

**Steps:**
1. **Send Video Email**: Send with:
   - Subject: "Kids playing in the park"
   - Body: "Love watching them have fun #kids #playground"  
   - Attachment: MP4 or MOV video file (under 10MB)
2. **Verify Processing**: Wait for email processing (may take longer for video)
3. **Test Playback**: Click play button in leaf card
4. **Video Controls**: Test pause, seek, volume controls

**Expected Result:**
- [ ] Video uploaded to Supabase Storage successfully
- [ ] Leaf type set to 'video'
- [ ] Native HTML5 video player displays with controls
- [ ] "📧 Email Video" indicator appears on video
- [ ] Video plays without errors across different browsers
- [ ] Multiple video formats supported (MP4, WebM, OGG)

### Test Case 19: Audio Email Upload
**Scenario:** Send email with audio attachment and verify playback

**Steps:**
1. **Send Audio Email**: Send with:
   - Subject: "Baby's first words!"
   - Body: "Recording of Emma saying 'mama' for the first time! #milestone #firstwords"
   - Attachment: Audio file (MP3, WAV, M4A under 5MB)
2. **Verify Audio Processing**: Check dashboard for new leaf
3. **Test Playback**: Use audio controls to play recording
4. **Audio Quality**: Verify clear playback without distortion

**Expected Result:**
- [ ] Audio uploaded to Supabase Storage
- [ ] Leaf type set to 'audio'
- [ ] Native HTML5 audio controls display
- [ ] "📧 Email Audio" indicator appears
- [ ] Audio plays clearly across different devices
- [ ] Multiple audio formats supported (MP3, OGG, WAV)
- [ ] Milestone keywords detected and tagged automatically

### Test Case 20: Multiple Attachments Email
**Scenario:** Send email with mixed media types and verify handling

**Steps:**
1. **Send Mixed Media Email**: Send with:
   - Subject: "Family vacation highlights"
   - Body: "Photos and videos from our amazing trip! #vacation #memories"
   - Attachments: 2 photos, 1 video, 1 audio file
2. **Verify Processing**: Check all media uploads successfully
3. **Test Display**: Verify each media type displays correctly
4. **Attachment Count**: Confirm attachment count indicators

**Expected Result:**
- [ ] All attachments processed and uploaded
- [ ] Primary attachment determines leaf type (photos = photo, etc.)
- [ ] Thumbnail previews show for additional media
- [ ] "+X more" indicators show correct counts
- [ ] Each media type playable/viewable independently
- [ ] Mixed content displays in organized layout

### Test Case 21: Email Error Handling
**Scenario:** Test email processing with various error conditions

**Steps:**
1. **Oversized Attachments**: Send email with files >10MB
2. **Unsupported Formats**: Send with .docx, .pdf, .zip files
3. **Invalid Email Format**: Send to malformed email address
4. **Empty Email**: Send email with no subject or body
5. **Network Issues**: Test during simulated network problems

**Expected Result:**
- [ ] Oversized files rejected with appropriate error logging
- [ ] Unsupported formats ignored gracefully (no crash)
- [ ] Invalid email addresses rejected at SendGrid level
- [ ] Empty emails create basic text leaf with timestamp
- [ ] Network issues retry automatically and succeed
- [ ] Error messages logged but don't prevent successful processing
- [ ] Failed uploads noted in leaf content (e.g., "2 attachments failed")

### Test Case 22: Email Content Processing
**Scenario:** Test smart content processing features

**Steps:**
1. **Hashtag Detection**: Send email with "Great day at the beach! #beach #summer #vacation"
2. **Milestone Keywords**: Send with "Emma took her first steps today! Such a milestone moment #baby"
3. **HTML Email**: Send rich HTML email with formatting
4. **Reply/Forward**: Send forwarded email with RE: or FW: prefixes
5. **Special Characters**: Send with emojis, international characters

**Expected Result:**
- [ ] Hashtags extracted and displayed as tags
- [ ] Milestone keywords trigger milestone leaf type
- [ ] HTML content converted to clean text
- [ ] Reply/forward prefixes handled appropriately
- [ ] Special characters and emojis display correctly
- [ ] Content formatting preserved where possible
- [ ] Email subject and body separated properly

### Test Case 23: Email Authentication & Security
**Scenario:** Test email webhook security and user validation

**Steps:**
1. **Valid User Email**: Send to known user email address
2. **Invalid User Email**: Send to u-nonexistent@yourdomain.com
3. **Wrong Domain**: Send to user@wrongdomain.com (if webhook configured)
4. **Spam/Malicious**: Send email with suspicious content
5. **Rate Limiting**: Send multiple emails rapidly

**Expected Result:**
- [ ] Valid user emails create leaves successfully
- [ ] Invalid user emails rejected gracefully (no leaf created)
- [ ] Wrong domain emails ignored/rejected
- [ ] Malicious content filtered appropriately
- [ ] Rate limiting prevents spam (if configured)
- [ ] All security events logged properly
- [ ] No sensitive information leaked in error responses

---

## ⚡ **Real-time Features**

### Test Case 17: Multi-Client Setup
**Scenario:** Prepare environment for real-time testing

**Steps:**
1. **Browser Setup**: Open 2+ browser windows side-by-side
2. **User Accounts**: Sign in with different users in each window
3. **Circle Access**: Ensure both users are members of same circle
4. **Console Monitoring**: Open dev tools in both windows
5. **Position Windows**: Arrange for easy observation

**Expected Result:**
- [ ] Both users can access same circle
- [ ] Console shows "Setting up real-time subscription for circle: [id]"
- [ ] No connection errors in console
- [ ] Both feeds load existing posts

### Test Case 18: Real-time Posts
**Scenario:** Test live post updates across clients

**Steps:**
1. In **Window A**: Create a text post "Real-time test post"
2. **Observe Window B**: Post should appear instantly at top of feed
3. In **Window B**: Create post with image
4. **Observe Window A**: Image post appears with thumbnail
5. **Rapid Testing**: Create 5 posts quickly in Window A

**Expected Result:**
- [ ] New posts appear in <1 second in other windows
- [ ] Posts appear at top of feed with correct timestamp
- [ ] All content (text, images, metadata) displays correctly
- [ ] Multiple rapid posts all appear correctly
- [ ] Console shows "Real-time posts update: INSERT" messages

### Test Case 19: Real-time Comments
**Scenario:** Test live comment updates

**Steps:**
1. **Window A**: Click on existing post to expand comments
2. **Window B**: Click same post and add comment "Real-time comment test"
3. **Observe Window A**: Comment should appear instantly
4. **Window A**: Add reply comment
5. **Observe Window B**: Reply appears immediately

**Expected Result:**
- [ ] New comments appear instantly in expanded post
- [ ] Comment author profile (name, avatar) displays correctly
- [ ] Comment threading works properly
- [ ] Console shows "Real-time comments update: INSERT"
- [ ] Both windows show same comment count

### Test Case 20: Real-time Likes
**Scenario:** Test live like/unlike updates

**Steps:**
1. **Both Windows**: View same post
2. **Window A**: Click heart icon to like post
3. **Observe Window B**: Heart should fill and count increase
4. **Window B**: Click heart to unlike
5. **Observe Window A**: Heart empties and count decreases
6. **Rapid Testing**: Like/unlike quickly multiple times

**Expected Result:**
- [ ] Like button state updates instantly across windows
- [ ] Like count updates correctly and immediately
- [ ] No duplicate or missed like events
- [ ] Console shows "Real-time likes update: INSERT/DELETE"
- [ ] UI remains smooth during rapid interactions

### Test Case 21: Real-time Notifications
**Scenario:** Test notification system for new posts

**Steps:**
1. **Window A**: User A signed in
2. **Window B**: User B creates new post
3. **Observe Window A**: Notification should slide in from right
4. **Click Notification**: Should scroll to new post
5. **Multiple Posts**: Have User B create several posts quickly

**Expected Result:**
- [ ] Notification slides in smoothly from right edge
- [ ] Shows correct author name and post preview
- [ ] Clicking notification scrolls to and highlights post
- [ ] Notifications auto-dismiss after 5 seconds
- [ ] Multiple notifications stack vertically
- [ ] No notifications appear for user's own posts
- [ ] Manual close (X) button works

### Test Case 22: Connection Reliability
**Scenario:** Test real-time connection stability

**Steps:**
1. **Network Test**: Disconnect internet for 30 seconds, reconnect
2. **Tab Switching**: Put browser tab in background for 2 minutes
3. **Multiple Circles**: Switch between circles and test real-time
4. **Long Session**: Keep app open for 30+ minutes, test updates

**Expected Result:**
- [ ] Real-time reconnects automatically after network restore
- [ ] Updates continue working after tab becomes active
- [ ] Circle switching properly manages subscriptions
- [ ] Long sessions remain stable without memory leaks
- [ ] Console shows connection/disconnection messages

### Test Case 23: Real-time Error Handling
**Scenario:** Test graceful handling of real-time failures

**Steps:**
1. **Invalid Data**: Manually trigger invalid real-time payload (dev tools)
2. **Permission Changes**: Remove user from circle while real-time active
3. **Database Errors**: Simulate database unavailability
4. **Concurrent Users**: Have 5+ users interact simultaneously

**Expected Result:**
- [ ] Invalid payloads don't crash the app
- [ ] Permission changes handled gracefully
- [ ] Database errors show appropriate user messaging
- [ ] Multiple concurrent users don't cause conflicts
- [ ] App remains functional despite real-time issues

---

## 👤 **Profile System**

### Test Case 24: Profile Management
**Scenario:** Test user profile functionality

**Steps:**
1. **Profile Access**: Click avatar in header to go to `/profile`
2. **Profile Editing**: Click "Edit Profile" to go to `/settings`
3. **Avatar Upload**: Upload new profile picture
4. **Information Update**: Change first name, last name
5. **Settings Navigation**: Test all settings tabs

**Expected Result:**
- [ ] Own profile displays user info, circles, and recent posts
- [ ] Settings page loads with tabbed interface
- [ ] Avatar upload works and updates throughout app
- [ ] Name changes reflect in all posts and comments
- [ ] All settings tabs (Profile, Privacy, Notifications, Account) accessible

### Test Case 25: Other User Profiles
**Scenario:** Test viewing other family members' profiles

**Steps:**
1. **Navigate**: Click on another user's name in a post
2. **Profile Access**: Should go to `/profile/[userId]`
3. **Privacy Check**: Try accessing profile of user not in shared circles
4. **Shared Content**: Verify only shared circle content visible

**Expected Result:**
- [ ] Can view profiles of users in shared circles
- [ ] Cannot view profiles of users without shared circles
- [ ] Shows "Profile Not Accessible" message for restricted profiles
- [ ] Displays shared circles and posts from those circles only
- [ ] Profile navigation works from posts and comments

### Test Case 26: Profile Integration
**Scenario:** Test profile integration throughout app

**Steps:**
1. **Post Authorship**: Verify clicking post author goes to their profile
2. **Comment Authors**: Check comment author names are clickable
3. **Avatar Display**: Confirm avatars show throughout app
4. **Name Updates**: Change name and verify updates everywhere

**Expected Result:**
- [ ] All user names in app are clickable and go to profiles
- [ ] Avatar changes propagate to posts, comments, headers
- [ ] Profile photos display consistently across all components
- [ ] Name changes update in real-time across all instances

---

## 📱 **Dashboard & Navigation**

### Test Case 27: Dashboard Navigation
**Scenario:** User navigates through tribe-centric dashboard

**Steps:**
1. Navigate through different tribe sections
2. Select different circles from tribe groupings
3. Test "Create Circle", "Manage Tribes", and "New Post" buttons
4. Try when no circle is selected
5. Test tribe expansion/collapse if implemented

**Expected Result:**
- [ ] Tribes show circles grouped underneath
- [ ] Selecting circle updates main content area
- [ ] "New Post" button only visible when circle selected
- [ ] "Create Circle" always visible
- [ ] "Manage Tribes" navigation works
- [ ] No legacy circle type filter tabs present

### Test Case 28: Empty States
**Scenario:** User with no circles sees appropriate empty states

**Steps:**
1. Delete all circles from database (or create new user)
2. Check dashboard display
3. Try different filter tabs

**Expected Result:**
- [ ] Shows attractive empty state with icon
- [ ] "Create Circle" call-to-action prominent
- [ ] Filter tabs show appropriate empty messages
- [ ] No JavaScript errors in console

---

## 🗃️ **Database Verification**

### Test Case 29: Database Structure
**Scenario:** Verify data is stored correctly

**Steps:**
1. Create circles of different types
2. Check Supabase database tables

**SQL Queries to Run:**
```sql
-- Check circles table (now with required tribe_id)
SELECT id, name, tribe_id, privacy, category, is_discoverable, auto_approve_members 
FROM circles 
WHERE created_by = 'your-user-id';

-- Check circle memberships with RBAC roles
SELECT cm.*, c.name as circle_name, ur.role_id, r.name as role_name
FROM circle_members cm
JOIN circles c ON cm.circle_id = c.id
LEFT JOIN user_roles ur ON ur.user_id = cm.user_id AND ur.context_type = 'circle' AND ur.context_id = c.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE cm.user_id = 'your-user-id';

-- Check tribe membership
SELECT tm.*, t.name as tribe_name, ur.role_id, r.name as role_name
FROM tribe_members tm
JOIN tribes t ON t.id = tm.tribe_id
LEFT JOIN user_roles ur ON ur.user_id = tm.user_id AND ur.context_type = 'tribe' AND ur.context_id = t.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE tm.user_id = 'your-user-id';

-- Check cross-tribe access
SELECT * FROM cross_tribe_access WHERE circle_id IN (
  SELECT id FROM circles WHERE created_by = 'your-user-id'
);
```

**Expected Result:**
- [ ] All circles have valid tribe_id (not null)
- [ ] Circle creator automatically has 'owner' role via RBAC
- [ ] Tribe membership exists for all user's circles
- [ ] RBAC roles properly assigned (owner/admin/member)
- [ ] Cross-tribe access records created when configured

---

## ❌ **Error Scenarios**

### Test Case 30: Form Validation
**Scenario:** Test form validation and error handling

**Steps:**
1. Try submitting form with empty name
2. Create circle with very long name (500+ chars)
3. Test with special characters in name
4. Test network disconnection during submit

**Expected Result:**
- [ ] Empty name prevents submission
- [ ] Form shows appropriate validation messages
- [ ] Long inputs handled gracefully
- [ ] Network errors show user-friendly messages
- [ ] No data corruption in database

### Test Case 31: Authentication Errors
**Scenario:** Test authentication edge cases

**Steps:**
1. Try accessing `/circles/create` without login
2. Sign out while on circle creation page
3. Try creating circle with expired session

**Expected Result:**
- [ ] Unauthenticated users redirected to login
- [ ] Session expiration handled gracefully
- [ ] No 500 errors or crashes

---

## 🌐 **Browser Testing**

### Test Case 32: Cross-Browser Compatibility
**Scenario:** Ensure app works across browsers

**Browsers to Test:**
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Key Features to Test:**
- [ ] Circle creation form layout
- [ ] Dashboard responsive design
- [ ] Button interactions
- [ ] Form submissions

### Test Case 33: Mobile Responsiveness
**Scenario:** Verify mobile user experience

**Steps:**
1. Use browser dev tools to simulate mobile
2. Test both portrait and landscape
3. Check touch interactions

**Expected Result:**
- [ ] Circle creation form fits mobile screen
- [ ] Dashboard sidebar collapses appropriately
- [ ] Buttons are touch-friendly (44px min)
- [ ] Text remains readable
- [ ] No horizontal scrolling needed

---

## 🐛 **Common Issues & Solutions**

### Issue 1: "Infinite recursion detected in policy"
**Cause:** RLS policies not updated
**Solution:** Run the latest migration file

### Issue 2: User can't see created circles
**Cause:** Circle membership not created
**Solution:** Check `circle_members` table has entry

### Issue 3: Categories not loading
**Cause:** `circle_categories` table empty
**Solution:** Ensure migration inserted default categories

### Issue 4: Dashboard shows "No user found"
**Cause:** Server/client session mismatch
**Solution:** Dashboard is now client-side, should work

---

## 📊 **Test Results Template**

```
## Test Run: [Date]
**Tester:** [Name]
**Browser:** [Browser/Version]
**Environment:** [Local/Staging/Production]

### Results Summary
- Authentication: ✅/❌
- Circle Creation: ✅/❌  
- Dashboard Navigation: ✅/❌
- Database Integration: ✅/❌
- Error Handling: ✅/❌
- Mobile Experience: ✅/❌

### Issues Found
1. [Issue description]
   - **Severity:** High/Medium/Low
   - **Steps to reproduce:** 
   - **Expected vs Actual:**

### Notes
[Any additional observations]
```

---

## 🚀 **Performance Testing**

### Test Case 34: Load Testing
**Scenario:** Test app with multiple circles

**Steps:**
1. Create 10+ circles of mixed types
2. Check dashboard load time
3. Monitor memory usage
4. Test circle creation speed

**Expected Result:**
- [ ] Dashboard loads in <2 seconds
- [ ] No memory leaks
- [ ] Circle creation completes in <5 seconds
- [ ] Smooth UI interactions

---

## 🔄 **Regression Testing**

After any code changes, run through:
- [ ] Authentication & tribe creation (Test Cases 1-2)
- [ ] Basic circle creation with tribe (Test Cases 5-6)
- [ ] RBAC permission checks (Test Case 8-9)
- [ ] Post creation (Test Case 14)
- [ ] Real-time posts (Test Case 18)
- [ ] Tribe management (Test Case 3-4)
- [ ] Dashboard navigation (Test Case 27)
- [ ] One error scenario

This ensures core functionality remains working.

---

## ⚡ **Quick Real-time Test Checklist**

**For rapid verification of real-time features:**

### 5-Minute Real-time Test
1. **Setup** (1 min):
   - [ ] Open 2 browser windows
   - [ ] Sign in different users
   - [ ] Join same circle

2. **Posts** (2 min):
   - [ ] Create post in Window A → appears in Window B
   - [ ] Create post with image → displays correctly
   - [ ] Check notifications slide in

3. **Interactions** (2 min):
   - [ ] Add comment in Window B → appears in Window A
   - [ ] Like/unlike post → updates instantly
   - [ ] Check console for real-time messages

**✅ Pass Criteria:** All updates appear within 1 second, no errors in console

### Real-time Database Setup
**Required Supabase Configuration:**
```sql
-- Run this in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
```

**Console Messages to Look For:**
- ✅ `"Setting up real-time subscription for circle: [id]"`
- ✅ `"Real-time posts update: INSERT"`
- ✅ `"Real-time comments update: INSERT"`
- ✅ `"Real-time likes update: INSERT/DELETE"`

**Red Flags:**
- ❌ No console messages about real-time setup
- ❌ WebSocket connection errors
- ❌ Updates taking >3 seconds to appear
- ❌ Duplicate posts/comments appearing

---

## 📋 **Test Results Template**

### Real-time Test Results: [Date]
**Tester:** [Name]  
**Browser:** [Browser/Version]  
**Users:** [Number of test accounts]

**Results:**
- [ ] ✅ Multi-client setup works
- [ ] ✅ Posts sync in real-time  
- [ ] ✅ Comments sync in real-time
- [ ] ✅ Likes sync in real-time
- [ ] ✅ Notifications appear
- [ ] ✅ Network reconnection works
- [ ] ✅ No memory leaks detected

**Performance:**
- Post update latency: ___ms
- Comment update latency: ___ms
- Like update latency: ___ms

**Issues Found:**
1. [Description] - Severity: [High/Medium/Low]

---

**💡 Tip:** Keep this document updated as new features are added. Consider automating critical paths with tools like Playwright or Cypress as the app grows.