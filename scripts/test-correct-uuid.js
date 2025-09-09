#!/usr/bin/env node

/**
 * Test with the CORRECT user ID from Supabase
 */

const https = require('https')
const crypto = require('crypto')

const DOMAIN = 'www.colinrodrigues.com'
const WEBHOOK_SIGNING_KEY = '268cfcff55f7cd39ff4a51fd58925589'

// CORRECT user ID from Supabase
const CORRECT_USER_ID = 'e4fb0e70-b278-4ae5-a13e-18803b1909fe'

console.log('🔧 Testing with CORRECT UUID from Supabase')
console.log('=' .repeat(50))
console.log(`Correct UUID: ${CORRECT_USER_ID}`)
console.log('')

// Test the notify endpoint with the stored message
const notificationData = {
  recipient: `u-${CORRECT_USER_ID}@colinrodrigues.com`,
  sender: 'colin.rods@gmail.com',
  subject: 'testing',
  'message-url': 'https://storage-europe-west1.api.mailgun.net/v3/domains/colinrodrigues.com/messages/BAABAgDudj-7fv4Hfa5Ae7LjE60Svn-vYg',
  timestamp: Math.floor(Date.now() / 1000).toString()
}

function testWithCorrectUUID() {
  console.log('🧪 Testing notify webhook with correct UUID...')
  console.log(`📧 Email: ${notificationData.recipient}`)
  
  const timestamp = notificationData.timestamp
  const token = 'test-token-' + Date.now()
  
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest('hex')

  const formData = new URLSearchParams()
  formData.append('recipient', notificationData.recipient)
  formData.append('sender', notificationData.sender)
  formData.append('subject', notificationData.subject)
  formData.append('message-url', notificationData['message-url'])
  formData.append('timestamp', timestamp)

  const postData = formData.toString()
  
  const options = {
    hostname: DOMAIN,
    port: 443,
    path: '/api/webhooks/notify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'x-mailgun-signature-256': signature,
      'x-mailgun-timestamp': timestamp,
      'x-mailgun-token': token
    }
  }

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
          }
        } catch (e) {
          console.log('\n✅ Success but couldn\'t parse response')
        }
      } else if (res.statusCode === 404) {
        console.log('\n❌ Still "User not found" - there may be another issue')
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

testWithCorrectUUID()