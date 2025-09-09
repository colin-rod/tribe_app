#!/usr/bin/env node

/**
 * Simple test to send a sample email to your webhook endpoint
 */

const https = require('https')

// Replace with your actual Vercel deployment URL
const WEBHOOK_URL = 'https://your-app.vercel.app/api/webhooks/email'
const API_KEY = 'tenxipvzimvpdrfevcmhlolqbqhwlruo' // From your .env.local

// Sample test data - replace USER_ID with an actual user ID from your database
const testEmail = {
  to: 'u-YOUR_USER_ID_HERE@colinrodrigues.com',
  from: 'test@example.com',
  subject: 'Test Email - Milestone Photo',
  text: 'This is a test email with milestone content! #milestone #test',
  attachments: []
}

function sendTestEmail() {
  const postData = JSON.stringify(testEmail)

  const options = {
    hostname: 'your-app.vercel.app',
    port: 443,
    path: '/api/webhooks/email',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-api-key': API_KEY
    }
  }

  console.log('🧪 Sending test email to webhook...')
  console.log('📧 Email data:', testEmail)

  const req = https.request(options, (res) => {
    let data = ''

    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      console.log('\n📊 Response:')
      console.log('Status:', res.statusCode)
      console.log('Response:', data)

      if (res.statusCode === 200) {
        console.log('\n✅ Test email processed successfully!')
        console.log('💡 Check your dashboard Inbox tab for the new leaf')
      } else {
        console.log('\n❌ Test failed. Check the response above for details.')
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
console.log('🔧 SETUP INSTRUCTIONS:')
console.log('1. Replace YOUR_USER_ID_HERE with your actual user ID')
console.log('2. Replace your-app.vercel.app with your actual Vercel URL')
console.log('3. Run: node scripts/simple-test-email.js')
console.log('')

// Run the test (will fail until you update the URLs)
sendTestEmail()