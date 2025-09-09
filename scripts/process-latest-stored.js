#!/usr/bin/env node

/**
 * Process the latest stored message from Mailgun
 */

const https = require('https')
const crypto = require('crypto')

const DOMAIN = 'www.colinrodrigues.com'
const WEBHOOK_SIGNING_KEY = '268cfcff55f7cd39ff4a51fd58925589'

// From the latest failed webhook log
const notificationData = {
  recipient: 'u-e4fb0e70-b278-4ae5-a13e-18803b19b9fe@colinrodrigues.com', // Fixed email
  sender: 'colin.rods@gmail.com',
  subject: 'testing',
  'message-url': 'https://storage-europe-west1.api.mailgun.net/v3/domains/colinrodrigues.com/messages/BAABAgDudj-7fv4Hfa5Ae7LjE60Svn-vYg',
  timestamp: Math.floor(Date.now() / 1000).toString()
}

function processStoredMessage() {
  console.log('🧪 Processing stored message with fixed email address...')
  console.log(`📧 Corrected recipient: ${notificationData.recipient}`)
  
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

  console.log('📤 Sending to:', `https://${DOMAIN}/api/webhooks/notify`)

  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      console.log('\n📊 Response:')
      console.log('Status:', res.statusCode)
      console.log('Response:', data)
      
      if (res.statusCode === 200) {
        console.log('\n🎉 SUCCESS! Message processed from storage!')
        console.log('💡 Check your dashboard Inbox for the new leaf')
      } else if (res.statusCode === 401) {
        console.log('\n❌ Still getting 401 - authentication issue')
        console.log('🔍 This suggests the webhook signing key might be wrong')
      } else {
        console.log('\n❌ Other error - check response details above')
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Error:', error.message)
  })

  req.write(postData)
  req.end()
}

console.log('🔧 Processing Latest Stored Message')
console.log('=' .repeat(45))
processStoredMessage()