#!/usr/bin/env node

/**
 * Test script for email webhook endpoint
 * Usage: node scripts/test-email-webhook.js
 */

const crypto = require('crypto')

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/email'
const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY || 'your-secure-webhook-api-key-change-this'
const TEST_USER_ID = process.env.TEST_USER_ID || '12345678-1234-1234-1234-123456789abc'

async function testWebhookWithApiKey() {
  console.log('🧪 Testing webhook with API key authentication...')
  
  const testEmail = {
    to: `u-${TEST_USER_ID}@tribe.app`,
    from: 'test@example.com',
    subject: 'Test Email from Script',
    text: 'This is a test email sent from the test script. #test #milestone',
    attachments: [
      {
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
        size: 1024000,
        url: 'https://example.com/test-image.jpg'
      }
    ],
    timestamp: new Date().toISOString()
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WEBHOOK_API_KEY
      },
      body: JSON.stringify(testEmail)
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ API Key test successful!')
      console.log('Response:', JSON.stringify(result, null, 2))
    } else {
      console.log('❌ API Key test failed!')
      console.log('Status:', response.status)
      console.log('Response:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ API Key test error:', error.message)
  }
}

async function testWebhookWithFormData() {
  console.log('\n🧪 Testing webhook with Mailgun form data format...')
  
  // Create form data similar to what Mailgun sends
  const formData = new FormData()
  formData.append('recipient', `u-${TEST_USER_ID}@tribe.app`)
  formData.append('sender', 'test@example.com')
  formData.append('subject', 'Test Mailgun Form Data')
  formData.append('body-plain', 'This is a test email in Mailgun format. #formdata #test')
  formData.append('body-html', '<p>This is a test email in Mailgun format. <strong>#formdata #test</strong></p>')
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString())
  formData.append('attachment-count', '0')

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'x-api-key': WEBHOOK_API_KEY
      },
      body: formData
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Form data test successful!')
      console.log('Response:', JSON.stringify(result, null, 2))
    } else {
      console.log('❌ Form data test failed!')
      console.log('Status:', response.status)
      console.log('Response:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ Form data test error:', error.message)
  }
}

async function testInvalidAuthentication() {
  console.log('\n🧪 Testing invalid authentication (should fail)...')
  
  const testEmail = {
    to: `u-${TEST_USER_ID}@tribe.app`,
    from: 'test@example.com',
    subject: 'Invalid Auth Test',
    text: 'This should fail authentication',
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'invalid-key'
      },
      body: JSON.stringify(testEmail)
    })

    const result = await response.json()
    
    if (response.status === 401) {
      console.log('✅ Authentication test successful (correctly rejected)!')
      console.log('Response:', JSON.stringify(result, null, 2))
    } else {
      console.log('❌ Authentication test failed (should have been rejected)!')
      console.log('Status:', response.status)
      console.log('Response:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ Authentication test error:', error.message)
  }
}

async function testInvalidUserEmail() {
  console.log('\n🧪 Testing invalid user email format...')
  
  const testEmail = {
    to: 'invalid-format@tribe.app',
    from: 'test@example.com',
    subject: 'Invalid User Email Test',
    text: 'This should fail due to invalid email format',
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WEBHOOK_API_KEY
      },
      body: JSON.stringify(testEmail)
    })

    const result = await response.json()
    
    if (response.status === 400) {
      console.log('✅ Invalid email test successful (correctly rejected)!')
      console.log('Response:', JSON.stringify(result, null, 2))
    } else {
      console.log('❌ Invalid email test failed!')
      console.log('Status:', response.status)
      console.log('Response:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ Invalid email test error:', error.message)
  }
}

async function runAllTests() {
  console.log('🚀 Starting Email Webhook Tests\n')
  console.log(`Webhook URL: ${WEBHOOK_URL}`)
  console.log(`Test User ID: ${TEST_USER_ID}`)
  console.log('=' * 50)
  
  await testWebhookWithApiKey()
  await testWebhookWithFormData()
  await testInvalidAuthentication()
  await testInvalidUserEmail()
  
  console.log('\n🏁 All tests completed!')
  console.log('\nNext steps:')
  console.log('1. Check your application logs for webhook processing')
  console.log('2. Log into your app and check the Inbox tab for new leaves')
  console.log('3. Test the assignment workflow by moving leaves to branches')
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = {
  testWebhookWithApiKey,
  testWebhookWithFormData,
  testInvalidAuthentication,
  testInvalidUserEmail
}