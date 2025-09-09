#!/usr/bin/env node

/**
 * Test webhook with debug information
 */

const https = require('https')

const DOMAIN = 'www.colinrodrigues.com'
const API_KEY = 'tenxipvzimvpdrfevcmhlolqbqhwlruo'

// Test different user ID formats
const testCases = [
  {
    name: 'Short ID (from dashboard)',
    email: 'u-e4fb0e70@colinrodrigues.com'
  },
  {
    name: 'UUID format (if e4fb0e70 is just the start)',
    email: 'u-e4fb0e70-1234-4567-8901-123456789abc@colinrodrigues.com'
  }
]

function testUserFormat(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`)
  console.log(`📧 Email: ${testCase.email}`)
  
  const testEmail = {
    to: testCase.email,
    from: 'colin.rods@gmail.com',
    subject: 'Test Email - Debug',
    text: 'This is a debug test! #test',
    attachments: []
  }

  const postData = JSON.stringify(testEmail)
  
  const options = {
    hostname: DOMAIN,
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
        console.log('✅ Success! This format works.')
      } else if (res.statusCode === 404 && data.includes('User not found')) {
        console.log('❌ User not found - wrong format or user not in database')
      } else if (res.statusCode === 400 && data.includes('Invalid email address format')) {
        console.log('❌ Invalid email format - extraction failed')
      } else {
        console.log('❌ Other error')
      }
      
      // Test next case if there is one
      const nextIndex = testCases.indexOf(testCase) + 1
      if (nextIndex < testCases.length) {
        setTimeout(() => testUserFormat(testCases[nextIndex]), 1000)
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Error:', error.message)
  })

  req.write(postData)
  req.end()
}

console.log('🔧 Debug Testing Different User ID Formats')
console.log('=' .repeat(50))

// Start with first test case
testUserFormat(testCases[0])