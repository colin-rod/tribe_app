#!/usr/bin/env node

/**
 * Test the email webhook with JSON payload (bypass Mailgun message fetch)
 */

const https = require('https')
const crypto = require('crypto')

const DOMAIN = 'www.colinrodrigues.com'
const WEBHOOK_SIGNING_KEY = '268cfcff55f7cd39ff4a51fd58925589'

// Test data with direct email content (not stored message)
const testEmail = {
  to: 'u-e4fb0e70-b278-4ae5-a13e-18803b1909fe@colinrodrigues.com',
  from: 'colin.rods@gmail.com',
  subject: 'Test email-to-leaf integration',
  text: 'This is a test message sent to verify the email-to-leaf integration is working properly. #test #milestone',
  attachments: [],
  timestamp: new Date().toISOString()
}

function testWebhookWithJSON() {
  console.log('🧪 Testing webhook with JSON payload...')
  console.log(`📧 To: ${testEmail.to}`)
  console.log(`📧 From: ${testEmail.from}`)
  console.log(`📄 Subject: ${testEmail.subject}`)
  
  const postData = JSON.stringify(testEmail)
  
  const options = {
    hostname: DOMAIN,
    port: 443,
    path: '/api/webhooks/email',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-api-key': 'test-key-' + Date.now() // Use API key auth instead of Mailgun signature
    }
  }

  console.log('\n📤 Sending test email to webhook...')

  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      console.log('\n📊 Response:')
      console.log('Status:', res.statusCode)
      console.log('Response:', data)
      
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data)
          if (parsed.success && parsed.data && parsed.data.leafId) {
            console.log('\n🎉 SUCCESS! Leaf created!')
            console.log(`📄 Leaf ID: ${parsed.data.leafId}`)
            console.log(`📝 Leaf Type: ${parsed.data.leafType}`)
            console.log(`🎨 Has Media: ${parsed.data.hasMedia}`)
            console.log('\n💡 Check your dashboard Inbox tab!')
          } else {
            console.log('\n✅ Request successful')
          }
        } catch (e) {
          console.log('\n✅ Request successful but couldn\'t parse JSON')
        }
      } else if (res.statusCode === 401) {
        console.log('\n❌ 401 Unauthorized - authentication failed')
      } else if (res.statusCode === 404) {
        console.log('\n❌ 404 - User not found or endpoint missing')
      } else if (res.statusCode === 500) {
        console.log('\n❌ 500 - Server error (check logs)')
      } else {
        console.log('\n❌ Other error')
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Error:', error.message)
  })

  req.write(postData)
  req.end()
}

console.log('🔧 Testing Email-to-Leaf Integration')
console.log('=' .repeat(40))
testWebhookWithJSON()