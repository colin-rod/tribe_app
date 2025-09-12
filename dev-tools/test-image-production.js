#!/usr/bin/env node

/**
 * Test script to send image to production and check detailed logs
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Create a test image as base64
const createTestImageBase64 = () => {
  // This is a tiny 1x1 pixel PNG image in base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};

async function testProductionImageUpload() {
  console.log('🧪 Testing Production Image Upload');
  console.log('================================');
  
  const VERCEL_URL = 'https://www.colinrodrigues.com';
  const TREE_ID = '7104f163-8398-4659-b22c-6e70de764f7c';
  
  // Create form data with image attachment
  const formData = new FormData();
  
  formData.append('to', `person-${TREE_ID}@colinrodrigues.com`);
  formData.append('from', 'test@example.com');
  formData.append('subject', 'Production Image Test');
  formData.append('text', 'Testing production image upload with enhanced logging');
  formData.append('attachments', '1'); // Tell SendGrid we have 1 attachment
  
  // Add the test image
  formData.append('attachment1', 'production-test.png');
  formData.append('attachment1_content_type', 'image/png');
  formData.append('attachment1_content', createTestImageBase64());
  
  console.log('📧 Sending email with image attachment...');
  console.log(`   To: person-${TREE_ID}@colinrodrigues.com`);
  console.log(`   Attachment: production-test.png (${createTestImageBase64().length} chars)`);
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
    
    if (result.success) {
      console.log('✅ Webhook processed successfully');
      
      if (result.data?.hasMedia) {
        console.log('✅ SUCCESS: Image was processed and uploaded!');
      } else {
        console.log('❌ ISSUE: Webhook succeeded but no media detected');
        console.log('   Check Vercel logs for detailed information');
      }
    } else {
      console.log('❌ FAILURE: Webhook failed');
      console.log(`   Error: ${result.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('💥 ERROR during test:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testProductionImageUpload().catch(console.error);
}

module.exports = { testProductionImageUpload };