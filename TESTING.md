# Tribe App Testing Guide

This document provides comprehensive testing scenarios for the Tribe app's core functionality.

## 🗂️ **Table of Contents**
- [Prerequisites](#prerequisites)
- [Authentication Flow](#authentication-flow)
- [Circle Creation](#circle-creation)
- [Dashboard & Navigation](#dashboard--navigation)
- [Database Verification](#database-verification)
- [Error Scenarios](#error-scenarios)
- [Browser Testing](#browser-testing)

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

## 📱 **Dashboard & Navigation**

### Test Case 6: Dashboard Navigation
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

### Test Case 7: Empty States
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

### Test Case 13: Load Testing
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
- [ ] Dashboard navigation (Test Case 6)
- [ ] One error scenario (Test Case 9)

This ensures core functionality remains working.

---

**💡 Tip:** Keep this document updated as new features are added. Consider automating critical paths with tools like Playwright or Cypress as the app grows.