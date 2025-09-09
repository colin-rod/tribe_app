#!/usr/bin/env node

/**
 * Process the newest stored message from Mailgun
 */

const https = require('https')
const crypto = require('crypto')

const DOMAIN = 'www.colinrodrigues.com'
const WEBHOOK_SIGNING_KEY = '268cfcff55f7cd39ff4a51fd58925589'

// From the latest failed webhook log
const notificationData = {
  recipient: 'u-e4fb0e70-b278-4ae5-a13e-18803b1909fe@colinrodrigues.com',
  sender: 'colin.rods@gmail.com',
  subject: 'test message',
  'message-url': 'https://storage-europe-west1.api.mailgun.net/v3/domains/colinrodrigues.com/messages/BAABAgBOwN7VlwKy-rBPuLI8IXFCVl0GYg',
  timestamp: Math.floor(Date.now() / 1000).toString()
}

function processStoredMessage() {
  console.log('🧪 Processing newest stored message...')
  console.log(`📧 Recipient: ${notificationData.recipient}`)
  console.log(`📄 Subject: ${notificationData.subject}`)
  
  const timestamp = notificationData.timestamp
  const token = 'test-token-' + Date.now()
  
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest('hex')

  // Create form data like Mailgun sends for notifications
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

  console.log('\n📤 Sending notification to webhook...')

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

console.log('🔧 Processing Newest Stored Message')
console.log('=' .repeat(40))
processStoredMessage()