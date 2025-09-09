#!/usr/bin/env node

/**
 * Test various scenarios to debug user lookup
 */

const https = require('https')

const DOMAIN = 'www.colinrodrigues.com'
const API_KEY = 'tenxipvzimvpdrfevcmhlolqbqhwlruo'

// Test with different user ID patterns
const testEmails = [
  'u-e4fb0e70@colinrodrigues.com',                    // Shown in dashboard
  'user-e4fb0e70@colinrodrigues.com',                 // Different prefix
  'e4fb0e70@colinrodrigues.com',                      // No prefix
  'u-invalid-user@colinrodrigues.com',                // Invalid user (should fail)
  'not-user-email@colinrodrigues.com'                 // Non-user email (should be ignored)
]

let currentIndex = 0

function testEmailFormat(email) {
  console.log(`\n🧪 Testing email: ${email}`)
  
  const testEmail = {
    to: email,
    from: 'colin.rods@gmail.com',
    subject: 'Debug Test',
    text: 'Debug test message #test',
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
      
      // Analyze the response
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS: Leaf created!')
      } else if (data.includes('not a user email')) {
        console.log('📝 INFO: Email ignored (not user format)')
      } else if (data.includes('User not found')) {
        console.log('❌ ERROR: User exists but not found in database')
      } else if (data.includes('Invalid email address format')) {
        console.log('❌ ERROR: Email format rejected')
      } else {
        console.log('❓ UNKNOWN: Other error')
      }
      
      // Continue with next email
      currentIndex++
      if (currentIndex < testEmails.length) {
        setTimeout(() => testEmailFormat(testEmails[currentIndex]), 1000)
      } else {
        console.log('\n🔍 Summary:')
        console.log('If all tests show "User not found", the issue is:')
        console.log('1. User ID mismatch between frontend and database')
        console.log('2. User account not properly created in Supabase')
        console.log('3. Wrong table lookup (check profiles table)')
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Error:', error.message)
  })

  req.write(postData)
  req.end()
}

console.log('🔧 Testing User Lookup Debug')
console.log('=' .repeat(40))
testEmailFormat(testEmails[currentIndex])