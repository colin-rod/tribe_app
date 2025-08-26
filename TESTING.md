# Tribe App Testing Guide

This document provides comprehensive testing scenarios for the Tribe app's core functionality.

## 🗂️ **Table of Contents**
- [Prerequisites](#prerequisites)
- [Authentication Flow](#authentication-flow)
- [Circle Creation](#circle-creation)
- [Post Creation & Media](#post-creation--media)
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
- [ ] Database migration run (`20241225_circles_first_architecture.sql`)
- [ ] Development server running (`npm run dev`)
- [ ] Browser dev tools open (F12) for debugging

### Test User Account
Create a test account with: `test+circles@yourdomain.com`

---

## 🔐 **Authentication Flow**

### Test Case 1: New User Signup
**Scenario:** First-time user registration

**Steps:**
1. Navigate to `http://localhost:3000`
2. Click "Start your tribe"
3. Fill registration form:
   - First name: "Test"
   - Last name: "User"
   - Email: `test+circles@yourdomain.com`
   - Password: "testpassword123"
4. Click "Create account"
5. Check email for confirmation link
6. Click confirmation link

**Expected Result:**
- [ ] User receives confirmation email
- [ ] Confirmation redirects to dashboard
- [ ] Console shows: "Loading dashboard data..." then "Dashboard data loaded successfully"
- [ ] User sees empty state with "Create Circle" button

### Test Case 2: Returning User Login
**Scenario:** User with existing account signs in

**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter credentials
3. Click "Sign in"

**Expected Result:**
- [ ] Console shows: "Attempting sign in with: [email]"
- [ ] Console shows: "Sign in successful, redirecting to dashboard"
- [ ] Redirects to dashboard
- [ ] Shows user's existing circles (if any)

---

## 🎪 **Circle Creation**

### Test Case 3: Create Family Circle
**Scenario:** User creates a private family circle

**Steps:**
1. From dashboard, click "Create Circle" (purple button)
2. Select "Family Circle" card
3. Fill out form:
   - Name: "Emma's Circle"
   - Description: "Updates and memories about Emma"
   - Color: Select blue
4. Click "Create Circle"

**Expected Result:**
- [ ] Form shows family-specific UI (privacy locked to private)
- [ ] Community settings section not visible
- [ ] Console shows successful creation
- [ ] Redirects to dashboard
- [ ] New circle appears in "Family Circles" section
- [ ] Circle has blue color indicator

### Test Case 4: Create Community Circle
**Scenario:** User creates a discoverable community circle

**Steps:**
1. Click "Create Circle"
2. Select "Community Circle" card
3. Fill out form:
   - Name: "New Dads Brooklyn"
   - Description: "Support group for new fathers in Brooklyn"
   - Category: Select "parenting"
   - Location: "Brooklyn, NY"
   - Privacy: Keep "Public"
   - Check both "Auto-approve" and "Show in directory"
4. Click "Create Circle"

**Expected Result:**
- [ ] Form shows community-specific settings
- [ ] Privacy options visible and functional
- [ ] Category dropdown populated from database
- [ ] Auto-approve and discoverability options work
- [ ] New circle appears in "Community Circles" section

### Test Case 5: Create Multiple Circles
**Scenario:** User creates both family and community circles

**Steps:**
1. Create a family circle: "Baby #2 Circle"
2. Create another family circle: "Family Updates"
3. Create a community circle: "SF Bay Area Parents"

**Expected Result:**
- [ ] Dashboard sidebar shows circles grouped by type
- [ ] Family circles appear under "👨‍👩‍👧‍👦 Family Circles"
- [ ] Community circles appear under "🌍 Community Circles"
- [ ] Filter tabs work (All, Family, Community)

---

## 📝 **Post Creation & Media**

### Test Case 13: Basic Post Creation
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

### Test Case 14: Media Upload Testing
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

### Test Case 15: Advanced Post Features
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

## ⚡ **Real-time Features**

### Test Case 16: Multi-Client Setup
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

### Test Case 17: Real-time Posts
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

### Test Case 18: Real-time Comments
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

### Test Case 19: Real-time Likes
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

### Test Case 20: Real-time Notifications
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

### Test Case 21: Connection Reliability
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

### Test Case 22: Real-time Error Handling
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

### Test Case 23: Profile Management
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

### Test Case 24: Other User Profiles
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

### Test Case 25: Profile Integration
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

### Test Case 26: Dashboard Navigation
**Scenario:** User navigates through dashboard features

**Steps:**
1. Click between Family and Community filter tabs
2. Select different circles from sidebar
3. Test "Create Circle", "Invite", and "New Post" buttons
4. Try when no circle is selected

**Expected Result:**
- [ ] Filter tabs show/hide appropriate circles
- [ ] Selecting circle updates main content area
- [ ] "New Post" button only visible when circle selected
- [ ] "Create Circle" always visible
- [ ] "Invite" button always visible

### Test Case 27: Empty States
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

### Test Case 8: Database Structure
**Scenario:** Verify data is stored correctly

**Steps:**
1. Create circles of different types
2. Check Supabase database tables

**SQL Queries to Run:**
```sql
-- Check circles table
SELECT id, name, type, privacy, category, is_discoverable, auto_approve_members 
FROM circles 
WHERE created_by = 'your-user-id';

-- Check circle memberships  
SELECT cm.*, c.name as circle_name
FROM circle_members cm
JOIN circles c ON cm.circle_id = c.id
WHERE cm.user_id = 'your-user-id';

-- Check circle categories
SELECT * FROM circle_categories;
```

**Expected Result:**
- [ ] Circles table has all expected fields
- [ ] Family circles: `type='family'`, `privacy='private'`, `is_discoverable=false`
- [ ] Community circles: fields match form selections
- [ ] User automatically added as admin member
- [ ] Circle categories populated

---

## ❌ **Error Scenarios**

### Test Case 9: Form Validation
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

### Test Case 10: Authentication Errors
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

### Test Case 11: Cross-Browser Compatibility
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

### Test Case 12: Mobile Responsiveness
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

### Test Case 28: Load Testing
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
- [ ] Authentication flow (Test Cases 1-2)
- [ ] Basic circle creation (Test Cases 3-4) 
- [ ] Post creation (Test Case 13)
- [ ] Real-time posts (Test Case 17)
- [ ] Profile system (Test Case 23)
- [ ] Dashboard navigation (Test Case 26)
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