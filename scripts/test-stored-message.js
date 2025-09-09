#!/usr/bin/env node

/**
 * Test the notify webhook with the stored message from Mailgun
 */

const https = require('https')
const crypto = require('crypto')

// Update with your actual Vercel URL
const VERCEL_URL = 'www.colinrodrigues.com' // Using your custom domain with www
const WEBHOOK_SIGNING_KEY = '268cfcff55f7cd39ff4a51fd58925589'

// Data from the failed webhook log
const notificationData = {
  recipient: 'u-e4fb0e70@colinrodrigues.com',
  sender: 'colin.rods@gmail.com',
  subject: 'test',
  'message-url': 'https://storage-europe-west1.api.mailgun.net/v3/domains/colinrodrigues.com/messages/BAABAgAk0iR8682zLJ1IMalk54GPOD5rYQ',
  timestamp: Math.floor(Date.now() / 1000).toString()
}

function testNotifyWebhook() {
  console.log('🧪 Testing notify webhook with stored message...')
  
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
    hostname: VERCEL_URL,
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

  console.log('📧 Notification data:', notificationData)

  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      console.log('\n📊 Response:')
      console.log('Status:', res.statusCode)
      console.log('Response:', data)
      
      if (res.statusCode === 200) {
        console.log('\n✅ Notify webhook works! Message processed from storage.')
        console.log('💡 Check your dashboard Inbox for the new leaf')
      } else {
        console.log('\n❌ Notify webhook failed')
        console.log('💡 Check the response details above')
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Error:', error.message)
  })

  req.write(postData)
  req.end()
}

// Instructions
console.log('🔧 Testing stored message from colinrodrigues.com')
console.log('📧 Processing your failed email from Mailgun storage')
console.log('')

// Run test
testNotifyWebhook()