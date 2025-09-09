#!/usr/bin/env node

/**
 * Test the webhook endpoint directly
 */

const https = require('https')
const crypto = require('crypto')

// Update these with your actual values
const VERCEL_URL = 'www.colinrodrigues.com' // Using your custom domain with www
const API_KEY = 'tenxipvzimvpdrfevcmhlolqbqhwlruo'
const WEBHOOK_SIGNING_KEY = '268cfcff55f7cd39ff4a51fd58925589'

// Test with the user ID from the failed email
const testEmail = {
  to: 'u-e4fb0e70@colinrodrigues.com',
  from: 'colin.rods@gmail.com', 
  subject: 'test',
  text: 'This is a test email! #test',
  attachments: []
}

function testWithApiKey() {
  console.log('🧪 Testing with API Key authentication...')
  
  const postData = JSON.stringify(testEmail)
  
  const options = {
    hostname: VERCEL_URL,
    port: 443,
    path: '/api/webhooks/email',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-api-key': API_KEY
    }
  }

  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      console.log(`📊 Status: ${res.statusCode}`)
      console.log(`📋 Response: ${data}`)
      
      if (res.statusCode === 200) {
        console.log('✅ API Key auth works!')
        testWithMailgunSignature()
      } else {
        console.log('❌ API Key auth failed')
        console.log('💡 Check your WEBHOOK_API_KEY in environment variables')
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Error:', error.message)
  })

  req.write(postData)
  req.end()
}

function testWithMailgunSignature() {
  console.log('\n🧪 Testing with Mailgun signature authentication...')
  
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const token = 'test-token-' + Date.now()
  
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SIGNING_KEY)
    .update(timestamp + token)
    .digest('hex')

  // Create form data like Mailgun sends
  const formData = new URLSearchParams()
  formData.append('recipient', testEmail.to)
  formData.append('sender', testEmail.from)
  formData.append('subject', testEmail.subject)
  formData.append('body-plain', testEmail.text)
  formData.append('timestamp', timestamp)

  const postData = formData.toString()
  
  const options = {
    hostname: VERCEL_URL,
    port: 443,
    path: '/api/webhooks/email',
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
      console.log(`📊 Status: ${res.statusCode}`)
      console.log(`📋 Response: ${data}`)
      
      if (res.statusCode === 200) {
        console.log('✅ Mailgun signature auth works!')
        console.log('💡 The issue is with your Mailgun route URL')
      } else {
        console.log('❌ Mailgun signature auth failed')
        console.log('💡 Check your MAILGUN_WEBHOOK_SIGNING_KEY')
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
console.log('🔧 Testing against colinrodrigues.com')
console.log('📧 Test email will be sent to: u-e4fb0e70@colinrodrigues.com')
console.log('')

// Run tests
testWithApiKey()