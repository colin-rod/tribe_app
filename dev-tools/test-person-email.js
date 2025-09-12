#!/usr/bin/env node

/**
 * Test script for person-specific email routing
 * Tests the new person-{treeId}@domain.com format
 */

const path = require('path');

// Mock SendGrid webhook payload for person-specific email
const createPersonEmailPayload = (treeId, content = "Testing person-specific email routing! #family #test") => {
  const formData = new FormData();
  
  formData.append('to', `person-${treeId}@colinrodrigues.com`);
  formData.append('from', 'parent@example.com');
  formData.append('subject', 'Test for Baby Sarah');
  formData.append('text', content);
  formData.append('attachments', '0');
  
  return formData;
};

// Test function
async function testPersonEmailRouting() {
  console.log('🧪 Testing Person-Specific Email Routing\n');
  
  // You'll need to replace this with an actual tree ID from your database
  const testTreeId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with real tree ID
  
  try {
    console.log(`📧 Testing email to: person-${testTreeId}@colinrodrigues.com`);
    
    const payload = createPersonEmailPayload(testTreeId, `
Hello Baby Sarah! 👶

This is a test message to verify person-specific email routing is working correctly.

The system should:
1. ✅ Extract tree ID from email address
2. ✅ Find the tree and its managing user
3. ✅ Create a leaf with person context
4. ✅ Include "📧 Email for: [Person Name]" in content

#milestone #test #family
    `.trim());
    
    // Update this to your production domain
    const VERCEL_URL = process.env.VERCEL_URL || 'https://colinrodrigues.com';
    
    const response = await fetch(`${VERCEL_URL}/api/webhooks/sendgrid`, {
      method: 'POST',
      body: payload,
      headers: {
        'User-Agent': 'SendGrid',
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Body:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data?.routingType === 'person') {
      console.log('\n✅ SUCCESS: Person-specific email routing is working!');
      console.log(`   - Leaf ID: ${result.data.leafId}`);
      console.log(`   - Routing Type: ${result.data.routingType}`);
      console.log(`   - Target Tree: ${result.data.targetTreeId}`);
      console.log(`   - Leaf Type: ${result.data.leafType}`);
    } else {
      console.log('\n❌ FAILED: Person-specific email routing failed');
      console.log('   Check the logs for more details');
    }
    
  } catch (error) {
    console.error('\n💥 ERROR during test:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure your dev server is running (npm run dev)');
    console.log('   2. Update testTreeId with a real tree ID from your database');
    console.log('   3. Ensure the tree has a managing user and person_name');
    console.log('   4. Check that the migration script completed successfully');
  }
}

// Helper function to test tree email extraction
function testEmailExtraction() {
  console.log('\n🔍 Testing Email Extraction Functions:\n');
  
  const testCases = [
    'person-550e8400-e29b-41d4-a716-446655440000@colinrodrigues.com',
    'u-550e8400-e29b-41d4-a716-446655440000@colinrodrigues.com', 
    'invalid-email@colinrodrigues.com',
    'person-invalid-uuid@colinrodrigues.com'
  ];
  
  testCases.forEach((email, index) => {
    console.log(`Test ${index + 1}: ${email}`);
    
    // Mock the extraction logic
    const isPersonEmail = email.startsWith('person-');
    const isUserEmail = email.startsWith('u-');
    
    if (isPersonEmail) {
      const treeId = email.replace('person-', '').split('@')[0];
      const isValidUUID = treeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      console.log(`   ✅ Person email detected, Tree ID: ${treeId}, Valid: ${!!isValidUUID}`);
    } else if (isUserEmail) {
      const userId = email.replace('u-', '').split('@')[0];
      console.log(`   📧 Legacy user email detected, User ID: ${userId}`);
    } else {
      console.log(`   ❌ Unrecognized email format`);
    }
    console.log('');
  });
}

// Run tests
async function runTests() {
  console.log('🚀 Person-Centric Email Routing Test Suite\n');
  console.log('=' .repeat(50));
  
  // Test email extraction logic
  testEmailExtraction();
  
  console.log('=' .repeat(50));
  
  // Test actual email routing (requires running server)
  await testPersonEmailRouting();
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Create a tree using the new person-centric fields');  
  console.log('   2. Generate an email address for the tree');
  console.log('   3. Send a real email to test end-to-end functionality');
  console.log('   4. Check the dashboard to see the routed content');
}

// Run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testPersonEmailRouting, testEmailExtraction };