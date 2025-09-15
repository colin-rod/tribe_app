# Tribe App Testing Guide - Updated Version
*Last Updated: September 2025*

This document provides comprehensive testing scenarios for the Tribe app's current memory-centric architecture with email integration, branch assignment, and advanced UI features.

## 🗂️ **Table of Contents**
- [Prerequisites](#prerequisites)
- [Authentication & Onboarding](#authentication--onboarding)
- [Tree Management](#tree-management)
- [Branch Creation & Management](#branch-creation--management)
- [Memory System (Leaves) Testing](#memory-system-leaves-testing)
- [Email-to-Memory Integration](#email-to-memory-integration)
- [UI Components & Interactions](#ui-components--interactions)
- [Dashboard & Navigation](#dashboard--navigation)
- [Profile System](#profile-system)
- [Real-time Features](#real-time-features)
- [Performance & Media Testing](#performance--media-testing)
- [Error Scenarios](#error-scenarios)
- [Browser & Mobile Testing](#browser--mobile-testing)

## 📋 **Prerequisites**

### Setup Checklist
- [ ] Supabase project created and configured
- [ ] Environment variables set in `.env.local`
- [ ] SendGrid account and domain configured (for email testing)
- [ ] Database migrations run (including latest RBAC and memory system migrations)
- [ ] Development server running (`npm run dev`) - typically on port 3003
- [ ] Browser dev tools open (F12) for debugging
- [ ] Image optimization configured in `next.config.ts`

### Current Architecture Overview
The app now uses a **memory-centric architecture** where:
- **Trees**: Family/group containers
- **Branches**: Topic-specific collections within trees
- **Leaves/Memories**: Individual content items (photos, videos, audio, text)
- **Email Integration**: Automatic memory creation from email attachments
- **Inbox System**: Pinterest-style interface for unassigned memories

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
1. Navigate to `http://localhost:3003`
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
- [ ] Tree creation form shows as required
- [ ] After tree creation, redirects to dashboard
- [ ] Dashboard shows memory-centric layout with "Inbox" view
- [ ] User automatically has 'owner' role in created tree

### Test Case 2: Dashboard First Load Experience
**Scenario:** New user sees dashboard for first time

**Steps:**
1. Complete onboarding and arrive at dashboard
2. Observe default view and available options
3. Note empty states and call-to-action buttons

**Expected Result:**
- [ ] Dashboard loads with "Inbox" tab active by default
- [ ] Shows empty state with compelling imagery
- [ ] Floating action menu visible with "New Memory" option
- [ ] Email integration info displayed (unique email address)
- [ ] Tree/branch navigation visible but minimal initially

---

## 🌳 **Tree Management**

### Test Case 3: Tree Management Interface
**Scenario:** User accesses tree overview and management

**Steps:**
1. From dashboard, click "Trees" or navigate to `/trees`
2. View list of user's trees
3. Note role badges and management options
4. Test tree creation from this page

**Expected Result:**
- [ ] `/trees` page shows all user's trees in card layout
- [ ] Each tree shows correct role badge and member count
- [ ] "Create New Tree" option available
- [ ] Tree management options available for owned trees
- [ ] Navigation back to dashboard works smoothly

---

## 🎪 **Branch Creation & Management**

### Test Case 4: Create Branch with Tree Selection
**Scenario:** User creates a branch within their tree

**Steps:**
1. From dashboard, click "Create Branch" button
2. **Tree Selection**: Choose from dropdown "Smith Family"
3. Fill out form:
   - Name: "Emma's Photos"
   - Description: "All of Emma's precious moments"
   - Privacy: "private"
   - Color: Select blue
4. Click "Create Branch"

**Expected Result:**
- [ ] Tree selection dropdown populated with user's trees
- [ ] Form validation prevents submission without required fields
- [ ] Console shows successful creation with tree_id
- [ ] Redirects to dashboard
- [ ] New branch appears in tree navigation
- [ ] User automatically gets 'owner' role in branch

### Test Case 5: Branch Management Features
**Scenario:** Test branch editing and member management

**Steps:**
1. Navigate to `/branches/[branchId]/edit` for owned branch
2. Test editing branch properties
3. Access member management panel
4. Test invitation system

**Expected Result:**
- [ ] Branch edit page loads with current settings
- [ ] All editable properties can be modified
- [ ] Member management shows current members with roles
- [ ] Invitation system accessible and functional
- [ ] Changes save and reflect immediately

---

## 📸 **Memory System (Leaves) Testing**

### Test Case 6: Memory Creation via Upload
**Scenario:** User creates memories by uploading media directly

**Steps:**
1. Click floating action button → "New Memory"
2. **Single Photo Upload**: Drag and drop one JPEG image
3. Add content text: "Beautiful sunset from our vacation #sunset #family"
4. Select branch: "Emma's Photos"
5. Click "Create Memory"
6. **Multiple Photos**: Create another memory with 3 photos
7. **Video Upload**: Upload MP4 video with description

**Expected Result:**
- [ ] Global memory creator opens as modal/popup
- [ ] Drag-and-drop interface highlights properly
- [ ] Image previews generate correctly
- [ ] Video shows thumbnail with play icon
- [ ] Text content and hashtag extraction works
- [ ] Branch selection dropdown populated
- [ ] Memory appears in selected branch and inbox
- [ ] Media displays correctly in memory cards

### Test Case 7: Memory Card Interactions (NEW)
**Scenario:** Test the new clickable memory card system

**Steps:**
1. Navigate to dashboard inbox or branch view
2. **Memory Card Click**: Click on a memory card (not hover buttons)
3. **Memory Detail Popup**: Verify popup opens with full details
4. **Content Editing**: Click "Edit" and modify memory content
5. **Tag Management**: Add and remove tags using the interface
6. **Branch Assignment**: Use the "Assign" tab to assign to different branches
7. **Multiple Media**: Test popup with memories containing multiple photos

**Expected Result:**
- [ ] Memory cards are fully clickable (no hover-required buttons)
- [ ] Memory detail popup opens smoothly with animation
- [ ] Two-tab interface (Details/Assign) works properly
- [ ] Content editing saves and updates immediately
- [ ] Tag management with auto-detection from content
- [ ] Branch assignment allows multi-select
- [ ] Multiple media displays in organized gallery grid
- [ ] Image optimization and fallback system works for external URLs
- [ ] Popup closes properly and updates are reflected in card

### Test Case 8: Memory Assignment & Organization
**Scenario:** Test memory assignment to branches and organization

**Steps:**
1. Create several unassigned memories in inbox
2. **Single Assignment**: Open memory popup and assign to one branch
3. **Multi-Assignment**: Assign same memory to multiple branches
4. **Drag & Drop**: Test any drag-and-drop assignment features
5. **Bulk Operations**: Test selecting multiple memories for batch operations

**Expected Result:**
- [ ] Memories appear in inbox when unassigned
- [ ] Assignment popup shows all available branches
- [ ] Single assignment moves memory to branch
- [ ] Multi-assignment creates copies in multiple branches
- [ ] Assignment status updates reflect immediately
- [ ] Bulk operations work smoothly without errors

### Test Case 9: Memory Types & Special Content
**Scenario:** Test different memory types and special content handling

**Steps:**
1. **Milestone Memory**: Create memory with milestone keywords ("first steps", "birthday")
2. **Audio Memory**: Upload audio file with description
3. **Text-only Memory**: Create memory with just text content
4. **Mixed Content**: Create memory with text + multiple media types

**Expected Result:**
- [ ] Milestone memories get special icon/badge treatment
- [ ] Audio memories show audio player controls
- [ ] Text-only memories display properly without media placeholders
- [ ] Mixed content displays organized layout with primary media
- [ ] Memory type indicators (photo/video/audio/text/milestone) show correctly

---

## 📧 **Email-to-Memory Integration**

### Test Case 10: Email System Setup Verification
**Scenario:** Verify email integration is properly configured

**Steps:**
1. **Check Email Address**: From dashboard, locate unique email address display
2. **Verify Format**: Confirm format is `u-{userId}@yourdomain.com`
3. **Test SendGrid**: Check SendGrid webhook configuration
4. **DNS Verification**: Verify MX records are configured

**Expected Result:**
- [ ] Unique email address clearly displayed in dashboard
- [ ] Email address format is correct and functional
- [ ] SendGrid webhook points to correct endpoint
- [ ] DNS MX records resolve to SendGrid servers

### Test Case 11: Basic Email-to-Memory Creation
**Scenario:** Send plain text email and verify memory creation

**Steps:**
1. **Get Test Email**: Copy unique email address from dashboard
2. **Send Plain Email**: From any email client, send:
   - To: `u-{userId}@yourdomain.com` 
   - Subject: "Test memory from email"
   - Body: "This is a test memory created via email! #family #test"
3. **Check Dashboard**: Navigate to inbox within 30 seconds
4. **Verify Content**: Confirm new memory appears

**Expected Result:**
- [ ] Email received and processed within 30 seconds
- [ ] New memory appears in inbox with "📧 Email" indicator
- [ ] Subject appears as main content
- [ ] Body text displays below subject
- [ ] Hashtags (#family, #test) extracted and display as tags
- [ ] Memory type set to 'text' for email without media

### Test Case 12: Photo Email Upload with New UI
**Scenario:** Send email with photo attachments and test new popup system

**Steps:**
1. **Send Email with Photos**: Send email with:
   - Subject: "Family dinner tonight"
   - Body: "Great food and even better company! #dinner #family"
   - Attachments: 2-3 JPG/PNG images (under 5MB each)
2. **Verify Upload**: Check dashboard immediately after sending
3. **Test New Popup**: Click on the memory card to open detail popup
4. **Test Image Display**: Verify OptimizedImage component works
5. **Test Assignment**: Use popup to assign to branches

**Expected Result:**
- [ ] Photos automatically uploaded to Supabase Storage
- [ ] Memory type set to 'photo' with primary photo display
- [ ] Multiple photos show "+X more" indicator
- [ ] Clicking card opens memory detail popup (not hover overlay)
- [ ] Images display properly with fallback handling
- [ ] Assignment interface works within popup
- [ ] "📧 Email" indicator shows on images

### Test Case 13: Video and Audio Email Processing
**Scenario:** Test multimedia email processing

**Steps:**
1. **Send Video Email**: Send with MP4 attachment
2. **Send Audio Email**: Send with MP3 attachment
3. **Mixed Media Email**: Send with photo + video + audio
4. **Test Playback**: Use memory cards and popups to test media playback

**Expected Result:**
- [ ] Video uploaded and displays with native HTML5 controls
- [ ] Audio uploaded and shows audio player interface
- [ ] Mixed media determines primary type correctly
- [ ] All media types playable within popup interface
- [ ] Different formats supported (MP4, WebM, MP3, WAV, etc.)

### Test Case 14: Email Error Handling & Edge Cases
**Scenario:** Test email processing robustness

**Steps:**
1. **Oversized Files**: Send email with files >10MB
2. **Unsupported Formats**: Send with .docx, .pdf files
3. **Empty Email**: Send email with no subject or body
4. **Invalid Recipient**: Send to non-existent user email
5. **Malformed Email**: Test with various email formatting issues

**Expected Result:**
- [ ] Oversized files rejected gracefully with error logging
- [ ] Unsupported formats ignored without breaking processing
- [ ] Empty emails create basic memory with timestamp
- [ ] Invalid recipients rejected at webhook level
- [ ] Malformed emails handled without crashing system
- [ ] Error conditions logged but don't prevent valid processing

---

## 🎨 **UI Components & Interactions**

### Test Case 15: Memory Detail Popup System (NEW)
**Scenario:** Test the comprehensive memory detail popup

**Steps:**
1. **Open Popup**: Click any memory card to open detail popup
2. **Tab Navigation**: Switch between "Details" and "Assign" tabs
3. **Content Editing**: 
   - Click "Edit" button on content
   - Modify text content
   - Test save/cancel functionality
4. **Tag Management**:
   - Add new tags using input field
   - Remove existing tags with X button
   - Verify auto-detected tags from content
5. **Media Gallery**:
   - Test with single image memory
   - Test with multiple media files
   - Verify video/audio playback controls
6. **Branch Assignment**:
   - Switch to "Assign" tab
   - Select multiple branches
   - Test assignment completion

**Expected Result:**
- [ ] Popup opens smoothly with blur background overlay
- [ ] Tab switching works without losing state
- [ ] Content editing saves immediately and updates display
- [ ] Tag management allows add/remove with validation
- [ ] Auto-detected tags show differently than manual tags
- [ ] Media gallery displays properly with aspect ratios
- [ ] Video/audio controls functional within popup
- [ ] Branch assignment multi-select works correctly
- [ ] Assignment success reflected immediately in UI

### Test Case 16: OptimizedImage Component (NEW)
**Scenario:** Test the image optimization and fallback system

**Steps:**
1. **Normal Images**: View memories with standard Supabase storage images
2. **External Images**: Create memory with external image URL
3. **Broken Images**: Test with intentionally broken image URLs
4. **Large Images**: Test with high-resolution images
5. **Different Formats**: Test JPEG, PNG, WebP, GIF support

**Expected Result:**
- [ ] Supabase storage images load through Next.js optimization
- [ ] External images fall back to regular img tag when Next.js fails
- [ ] Broken images show informative placeholder with URL
- [ ] Large images load with appropriate size optimization
- [ ] Different formats handled correctly
- [ ] Console shows fallback messages for debugging
- [ ] Loading states display during image fetching

### Test Case 17: Floating Action Menu
**Scenario:** Test the enhanced floating action interface

**Steps:**
1. **Menu Access**: Click floating action button in dashboard
2. **Memory Creation**: Select "New Memory" option
3. **Other Actions**: Test additional menu items
4. **Context Sensitivity**: Test menu in different views (inbox, branch, tree)

**Expected Result:**
- [ ] Floating action menu opens with animation
- [ ] Menu items clearly labeled and accessible
- [ ] "New Memory" opens global memory creator
- [ ] Menu adapts to current context appropriately
- [ ] Menu closes properly when action selected or clicked outside

### Test Case 18: Dashboard Layout & Navigation
**Scenario:** Test the overall dashboard experience

**Steps:**
1. **View Switching**: Test switching between Inbox, Tree, and Branch views
2. **Responsive Layout**: Test on different screen sizes
3. **Tree/Branch Navigation**: Test collapsible tree navigation
4. **Search/Filter**: Test any search or filtering functionality
5. **Empty States**: Test views with no content

**Expected Result:**
- [ ] View switching smooth and maintains state appropriately
- [ ] Layout responsive on mobile, tablet, desktop sizes
- [ ] Tree navigation intuitive and functional
- [ ] Search/filter features work accurately
- [ ] Empty states provide clear guidance and call-to-action

---

## 👤 **Profile System**

### Test Case 19: Profile Management
**Scenario:** Test user profile functionality

**Steps:**
1. **Profile Access**: Navigate to `/profile`
2. **Profile Editing**: Go to `/profile/manage` or `/settings`
3. **Avatar Upload**: Test profile picture upload
4. **Information Update**: Modify first name, last name
5. **Settings Tabs**: Test all available settings sections

**Expected Result:**
- [ ] Profile displays user info and associated content
- [ ] Settings interface loads with proper navigation
- [ ] Avatar upload works and updates throughout app
- [ ] Name changes propagate to all memories and comments
- [ ] All settings sections accessible and functional

### Test Case 20: Other User Profiles
**Scenario:** Test viewing other family members' profiles

**Steps:**
1. **Profile Access**: Click other user's name in memory or comment
2. **Permission Check**: Verify profile access permissions
3. **Shared Content**: View content from shared trees/branches

**Expected Result:**
- [ ] Can view profiles of users in shared trees/branches
- [ ] Cannot view restricted profiles (proper privacy controls)
- [ ] Shows appropriate shared content only
- [ ] Profile navigation works from all contexts

---

## ⚡ **Real-time Features**

### Test Case 21: Real-time Memory Updates
**Scenario:** Test live updates across multiple clients

**Steps:**
1. **Multi-Client Setup**: Open 2+ browser windows with different users
2. **Memory Creation**: Create memory in Window A
3. **Observe Updates**: Check if memory appears in Window B
4. **Assignment Changes**: Assign memory to branch in Window A
5. **Observe Changes**: Verify updates in Window B

**Expected Result:**
- [ ] New memories appear in real-time across clients
- [ ] Assignment changes propagate immediately
- [ ] UI updates smooth without page refresh
- [ ] Console shows real-time subscription messages
- [ ] No conflicts or duplicate entries

### Test Case 22: Real-time Comments & Interactions
**Scenario:** Test live comment and interaction updates

**Steps:**
1. **Comment Creation**: Add comment to memory in Window A
2. **Observe**: Comment appears in Window B immediately
3. **Like/Unlike**: Test like interactions across clients
4. **Memory Updates**: Edit memory content and observe updates

**Expected Result:**
- [ ] Comments appear instantly in other windows
- [ ] Like states update in real-time
- [ ] Memory content changes propagate immediately
- [ ] All interactions smooth and responsive

---

## 🚀 **Performance & Media Testing**

### Test Case 23: Large Media Handling
**Scenario:** Test performance with large media files

**Steps:**
1. **Large Images**: Upload high-resolution photos (10+ MB)
2. **Video Files**: Upload HD video files
3. **Multiple Files**: Create memories with 10+ attachments
4. **Batch Upload**: Create multiple memories simultaneously

**Expected Result:**
- [ ] Large files processed without timeout
- [ ] Image compression and optimization works
- [ ] Video processing completes successfully
- [ ] Multiple files upload in parallel efficiently
- [ ] UI remains responsive during processing

### Test Case 24: Dashboard Performance
**Scenario:** Test dashboard performance with large datasets

**Steps:**
1. **Create Data**: Create 50+ memories across multiple branches
2. **Load Testing**: Refresh dashboard and measure load time
3. **Scrolling**: Test infinite scroll or pagination performance
4. **Search**: Test search performance with large dataset

**Expected Result:**
- [ ] Dashboard loads in <3 seconds with large dataset
- [ ] Scrolling smooth and responsive
- [ ] Search returns results in <1 second
- [ ] Memory thumbnails load progressively
- [ ] No memory leaks during extended use

---

## ❌ **Error Scenarios**

### Test Case 25: Network & Connection Issues
**Scenario:** Test app behavior during connectivity issues

**Steps:**
1. **Offline Mode**: Disconnect internet during memory creation
2. **Slow Connection**: Simulate slow network conditions
3. **Intermittent Connection**: Toggle connection during upload
4. **Server Errors**: Simulate API server unavailability

**Expected Result:**
- [ ] Offline memory creation queued for later sync
- [ ] Slow connections show appropriate loading states
- [ ] Intermittent connections retry automatically
- [ ] Server errors display user-friendly messages
- [ ] Data integrity maintained during failures

### Test Case 26: Form Validation & Edge Cases
**Scenario:** Test form validation and edge case handling

**Steps:**
1. **Empty Forms**: Submit forms with no required data
2. **Invalid Data**: Enter invalid email formats, extremely long text
3. **Special Characters**: Test Unicode, emojis, special symbols
4. **File Validation**: Upload unsupported file types
5. **Size Limits**: Test file size limit enforcement

**Expected Result:**
- [ ] Empty forms show clear validation messages
- [ ] Invalid data rejected with helpful feedback
- [ ] Special characters handled properly throughout app
- [ ] File type validation prevents unsupported uploads
- [ ] Size limits enforced with clear error messages

---

## 🌐 **Browser & Mobile Testing**

### Test Case 27: Cross-Browser Compatibility
**Scenario:** Ensure app works across different browsers

**Browsers to Test:**
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Key Features to Test:**
- [ ] Memory detail popup opens/closes properly
- [ ] Image optimization and fallback works
- [ ] Video/audio playback functional
- [ ] File upload drag-and-drop interface
- [ ] Real-time updates work consistently

### Test Case 28: Mobile Responsiveness
**Scenario:** Verify mobile user experience

**Steps:**
1. **Layout Testing**: Test on various mobile screen sizes
2. **Touch Interface**: Verify touch interactions work properly
3. **Mobile Popup**: Test memory detail popup on mobile
4. **Mobile Upload**: Test file upload from mobile devices
5. **Performance**: Check mobile performance and loading

**Expected Result:**
- [ ] Layout adapts properly to mobile screens
- [ ] Touch targets appropriately sized (44px minimum)
- [ ] Popup interface works well on mobile
- [ ] Mobile file selection and upload functional
- [ ] App remains performant on mobile devices
- [ ] No horizontal scrolling required

---

## 🧪 **Test Results Template**

```
## Test Run: [Date]
**Tester:** [Name]
**Browser:** [Browser/Version]
**Environment:** [Local/Staging/Production]
**App Version:** [Git commit/version]

### Architecture Overview Verified
- [ ] Memory-centric dashboard structure
- [ ] Email-to-memory integration functional
- [ ] New popup-based memory interaction system
- [ ] OptimizedImage component with fallbacks
- [ ] Real-time updates working

### Core Functionality Results
- [ ] Authentication & Onboarding: ✅/❌
- [ ] Tree & Branch Management: ✅/❌
- [ ] Memory Creation & Management: ✅/❌
- [ ] Email Integration: ✅/❌
- [ ] Memory Detail Popup System: ✅/❌
- [ ] Image Optimization & Display: ✅/❌
- [ ] Mobile Responsiveness: ✅/❌
- [ ] Performance: ✅/❌

### New Features Tested
- [ ] Memory Detail Popup (clickable cards): ✅/❌
- [ ] OptimizedImage component: ✅/❌
- [ ] Email-to-memory workflow: ✅/❌
- [ ] Branch assignment interface: ✅/❌
- [ ] Tag management system: ✅/❌

### Issues Found
1. [Issue description]
   - **Severity:** High/Medium/Low
   - **Component:** [Specific component/feature]
   - **Steps to reproduce:** 
   - **Expected vs Actual:**
   - **Browser/Device:** 

### Performance Metrics
- Dashboard load time: ___ms
- Memory popup open time: ___ms
- Image load time: ___ms
- Email processing time: ___s

### Notes
[Any additional observations about the new features or improvements]
```

---

## 📋 **Quick Regression Test Checklist**

**For rapid verification after changes (10-minute test):**

### Core Flow (5 minutes)
1. **Login & Dashboard** (1 min):
   - [ ] Log in successfully
   - [ ] Dashboard loads with inbox view
   - [ ] Floating action menu accessible

2. **Memory Creation** (2 min):
   - [ ] Create memory via upload → appears in inbox
   - [ ] Click memory card → popup opens correctly
   - [ ] Edit content in popup → saves properly

3. **Email Integration** (2 min):
   - [ ] Send email with photo → memory appears
   - [ ] Email memory displays with email indicator
   - [ ] Image displays properly in memory card

### Advanced Features (5 minutes)
4. **Memory Management** (2 min):
   - [ ] Assign memory to branch via popup
   - [ ] Add/remove tags in memory popup
   - [ ] Multi-media memory displays correctly

5. **UI Components** (2 min):
   - [ ] Memory popup opens/closes smoothly
   - [ ] Image optimization/fallback works
   - [ ] Mobile layout responsive

6. **Error Handling** (1 min):
   - [ ] Broken image URLs show fallback
   - [ ] Form validation prevents invalid submission

**✅ Pass Criteria:** All core functionality works, new UI components functional, no console errors

---

## 🔄 **Continuous Integration Test Suite**

**Recommended automated test priorities:**

### High Priority (must pass for deployment)
- [ ] Authentication flow
- [ ] Memory creation and assignment
- [ ] Email webhook processing
- [ ] Image optimization and fallback
- [ ] Memory popup functionality

### Medium Priority (monitor for regressions)
- [ ] Tree/branch management
- [ ] Profile system
- [ ] Real-time updates
- [ ] Mobile responsiveness

### Low Priority (manual testing acceptable)
- [ ] Advanced UI animations
- [ ] Performance optimizations
- [ ] Cross-browser compatibility edge cases

---

**💡 Tips for Testing:**
- Keep browser dev tools open to monitor console messages
- Test with actual email accounts (not just simulated data)
- Use different device sizes and network conditions
- Create realistic datasets for performance testing
- Document any new bugs with screenshots and reproduction steps
- Test the email-to-memory workflow regularly as it depends on external services

This testing guide reflects the current state of the Tribe app with its memory-centric architecture, advanced email integration, and enhanced UI components. Regular testing ensures the app provides a smooth experience for families creating and managing their digital memories.