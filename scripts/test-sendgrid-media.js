#!/usr/bin/env node

/**
 * Test SendGrid webhook with media attachments
 * This script simulates SendGrid sending form data with base64 attachments
 */

const https = require('https')

// Configuration
const WEBHOOK_URL = 'www.colinrodrigues.com'
const TEST_USER_ID = 'e4fb0e70-b278-4ae5-a13e-18803b1909fe' // Replace with a valid user ID

// Sample base64 image (1x1 pixel red PNG)
const SAMPLE_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

// Test data simulating SendGrid form submission
const testEmailData = {
  to: `u-${TEST_USER_ID}@colinrodrigues.com`,
  from: 'test@example.com',
  subject: 'Test Email with Media',
  text: 'This is a test email with an image attachment! #test #media',
  html: '<p>This is a test email with an image attachment! <strong>#test #media</strong></p>',
  attachments: '1',
  attachment1: 'test-image.png',
  attachment1_content_type: 'image/png',
  attachment1_content: SAMPLE_IMAGE_BASE64
}

function testSendGridWebhook() {
  console.log('🧪 Testing SendGrid webhook with media attachment...')
  
  // Convert form data to URL-encoded string
  const formData = Object.entries(testEmailData)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  
  const options = {
    hostname: WEBHOOK_URL,
    port: 443,
    path: '/api/webhooks/sendgrid',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formData),
      'User-Agent': 'SendGrid-Test/1.0'
    }
  }

  console.log(`📧 Sending test email to: ${testEmailData.to}`)
  console.log(`📎 With attachment: ${testEmailData.attachment1} (${testEmailData.attachment1_content_type})`)
  console.log(`📏 Attachment size: ${SAMPLE_IMAGE_BASE64.length} base64 chars`)

  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      console.log(`\n📊 Response Status: ${res.statusCode}`)
      console.log(`📋 Response Headers:`)
      Object.entries(res.headers).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`)
      })
      console.log(`📄 Response Body:`)
      console.log(data)
      
      if (res.statusCode === 200) {
        try {
          const response = JSON.parse(data)
          if (response.success && response.data) {
            console.log('\n✅ Test PASSED!')
            console.log(`   Leaf ID: ${response.data.leafId}`)
            console.log(`   Leaf Type: ${response.data.leafType}`)
            console.log(`   Has Media: ${response.data.hasMedia}`)
            
            if (response.data.leafType === 'photo' && response.data.hasMedia) {
              console.log('🎉 Media upload functionality is working correctly!')
            } else {
              console.log('⚠️  Media may not have been processed correctly')
            }
          } else {
            console.log('❌ Test FAILED - Invalid response format')
          }
        } catch (error) {
          console.log('❌ Test FAILED - Could not parse JSON response')
        }
      } else {
        console.log('❌ Test FAILED - Non-200 status code')
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Test FAILED - Request error:', error.message)
  })

  req.write(formData)
  req.end()
}

console.log('SendGrid Media Upload Test')
console.log('==========================')
console.log('This test simulates SendGrid sending an email with a media attachment')
console.log('to verify that the webhook properly uploads media to Supabase Storage.\n')

testSendGridWebhook()