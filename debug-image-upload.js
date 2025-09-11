#!/usr/bin/env node

/**
 * Debug script for image upload issues
 * Tests the specific failure points in the image processing pipeline
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const path = require('path');

// Create a test image as base64
const createTestImageBase64 = () => {
  // This is a tiny 1x1 pixel PNG image in base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};

// Test the webhook with an image attachment
async function testImageUpload() {
  console.log('🐛 Debug: Image Upload Pipeline\n');
  
  const VERCEL_URL = 'https://www.colinrodrigues.com';
  const TREE_ID = '7104f163-8398-4659-b22c-6e70de764f7c';
  
  // Create form data with image attachment
  const formData = new FormData();
  
  formData.append('to', `person-${TREE_ID}@colinrodrigues.com`);
  formData.append('from', 'debug@example.com');
  formData.append('subject', 'Debug Image Upload Test');
  formData.append('text', 'Testing image upload with detailed debugging');
  formData.append('attachments', '1'); // Tell SendGrid we have 1 attachment
  
  // Add the test image
  formData.append('attachment1', 'test-debug-image.png');
  formData.append('attachment1_content_type', 'image/png');
  formData.append('attachment1_content', createTestImageBase64());
  
  console.log('📧 Sending test email with image attachment...');
  console.log(`   To: person-${TREE_ID}@colinrodrigues.com`);
  console.log('   Attachment: 1x1 pixel PNG image (base64)');
  console.log('   Size:', createTestImageBase64().length, 'characters');
  console.log('');

  try {
    const response = await fetch(`${VERCEL_URL}/api/webhooks/sendgrid`, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'SendGrid'
        // Don't set Content-Type - let FormData set it
      }
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Body:', JSON.stringify(result, null, 2));
    console.log('');
    
    // Analyze the results
    if (result.success) {
      console.log('✅ Webhook processed successfully');
      
      if (result.data?.hasMedia) {
        console.log('✅ SUCCESS: Image was processed and uploaded!');
        console.log(`   - Leaf Type: ${result.data.leafType}`);
        console.log(`   - Has Media: ${result.data.hasMedia}`);
      } else {
        console.log('❌ FAILURE: Image processing failed');
        console.log(`   - Leaf Type: ${result.data?.leafType || 'unknown'}`);
        console.log(`   - Has Media: ${result.data?.hasMedia || false}`);
        
        console.log('\n🔍 Debugging Steps:');
        console.log('1. Check Vercel logs for detailed error messages');
        console.log('2. Verify Supabase Storage "media" bucket exists');
        console.log('3. Check RLS policies on storage.objects table');
        console.log('4. Ensure SUPABASE_SERVICE_ROLE_KEY has storage permissions');
      }
    } else {
      console.log('❌ FAILURE: Webhook failed entirely');
      console.log(`   Error: ${result.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('💥 ERROR during test:', error.message);
  }
}

// Test just the attachment parsing logic
function testAttachmentParsing() {
  console.log('\n🔍 Testing Attachment Parsing Logic:');
  console.log('======================================');
  
  // Simulate what SendGrid sends
  const mockFormData = new Map();
  mockFormData.set('attachments', '1');
  mockFormData.set('attachment1', 'test-image.png');
  mockFormData.set('attachment1_content_type', 'image/png');
  mockFormData.set('attachment1_content', createTestImageBase64());
  
  // Simulate the parsing logic
  const attachmentCount = parseInt(mockFormData.get('attachments') || '0');
  console.log('Expected attachment count:', attachmentCount);
  
  const attachments = [];
  for (let i = 1; i <= attachmentCount; i++) {
    const filename = mockFormData.get(`attachment${i}`);
    const contentType = mockFormData.get(`attachment${i}_content_type`);
    const content = mockFormData.get(`attachment${i}_content`);
    
    console.log(`Attachment ${i}:`);
    console.log(`  - Filename: ${filename || 'MISSING'}`);
    console.log(`  - Content-Type: ${contentType || 'MISSING'}`);
    console.log(`  - Has Content: ${!!content}`);
    console.log(`  - Content Length: ${content?.length || 0}`);
    
    if (content) {
      attachments.push({ filename, type: contentType, content });
    }
  }
  
  console.log(`\nResult: ${attachments.length} attachments ready for processing`);
  
  if (attachments.length > 0) {
    const att = attachments[0];
    console.log('✅ Attachment parsing looks correct');
    console.log(`   Will attempt to upload: ${att.filename} (${att.type})`);
  } else {
    console.log('❌ Attachment parsing failed - no content extracted');
  }
}

// Supabase Storage debugging tips
function showStorageDebuggingTips() {
  console.log('\n🔧 Supabase Storage Debugging Tips:');
  console.log('===================================');
  
  console.log('1. Check if "media" bucket exists in Supabase Storage');
  console.log('2. Verify RLS policies on storage.objects:');
  console.log('   SELECT * FROM storage.objects LIMIT 1; -- Should work with service role');
  console.log('   ');
  console.log('3. Check current RLS policies:');
  console.log('   SELECT * FROM pg_policies WHERE tablename = \'objects\' AND schemaname = \'storage\';');
  console.log('   ');
  console.log('4. Test manual upload:');
  console.log('   -- Try uploading via Supabase dashboard');
  console.log('   ');
  console.log('5. Check service role key permissions:');
  console.log('   -- Ensure SUPABASE_SERVICE_ROLE_KEY bypasses RLS');
  console.log('   ');
  console.log('6. Verify bucket policy allows inserts:');
  console.log('   -- Check bucket settings in Supabase dashboard');
}

// Run all tests
async function runDebugSuite() {
  console.log('🐛 Image Upload Debug Suite');
  console.log('===========================\n');
  
  // Test 1: Attachment parsing logic
  testAttachmentParsing();
  
  // Test 2: Full webhook test
  await testImageUpload();
  
  // Test 3: Show debugging tips
  showStorageDebuggingTips();
  
  console.log('\n📝 Next Steps:');
  console.log('1. Run this script to see current status');
  console.log('2. Check Vercel logs if image processing fails');  
  console.log('3. Verify Supabase Storage configuration');
  console.log('4. Test manual file upload to identify storage issues');
}

// Run if this file is executed directly
if (require.main === module) {
  runDebugSuite().catch(console.error);
}

module.exports = { testImageUpload, testAttachmentParsing };