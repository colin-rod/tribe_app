#!/usr/bin/env node

/**
 * Debug the exact webhook flow step by step
 */

const https = require('https')

const DOMAIN = 'www.colinrodrigues.com'
const API_KEY = 'tenxipvzimvpdrfevcmhlolqbqhwlruo'
const USER_ID = 'e4fb0e70-b278-4ae5-a13e-18803b19b9fe'

console.log('🔍 Webhook Flow Debug')
console.log('=' .repeat(40))

// Test 1: Simple user check with different email format
const testEmails = [
  `u-${USER_ID}@colinrodrigues.com`,           // Full UUID
  `u-${USER_ID.substring(0,8)}@colinrodrigues.com`, // Short version (from dashboard)
]

let currentIndex = 0

function testEmail(email) {
  console.log(`\n🧪 Test ${currentIndex + 1}: ${email}`)
  
  const testData = {
    to: email,
    from: 'colin.rods@gmail.com',
    subject: 'Debug Test',
    text: 'Debug webhook flow test #debug',
    attachments: []
  }

  const postData = JSON.stringify(testData)
  
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
      console.log(`Status: ${res.statusCode}`)
      console.log(`Response: ${data}`)
      
      // Try to parse response for more details
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) {
          console.log(`❌ Error: ${parsed.error}`)
        } else if (parsed.success) {
          console.log('✅ Success!')
          if (parsed.data && parsed.data.leafId) {
            console.log(`📄 Leaf Created: ${parsed.data.leafId}`)
          }
        }
      } catch (e) {
        // Response not JSON
      }
      
      // Continue to next test
      currentIndex++
      if (currentIndex < testEmails.length) {
        setTimeout(() => testEmail(testEmails[currentIndex]), 1500)
      } else {
        console.log('\n🎯 Summary:')
        console.log('The webhook authentication works, so the issue is either:')
        console.log('1. User lookup timing - maybe database not synced')
        console.log('2. Case sensitivity in database query')
        console.log('3. Different field name expectations')
        console.log('\nNext step: Try sending real email through Mailgun!')
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Network Error:', error.message)
  })

  req.write(postData)
  req.end()
}

console.log(`Testing with User ID: ${USER_ID}`)
console.log('Email formats to test:')
testEmails.forEach((email, i) => {
  console.log(`${i + 1}. ${email}`)
})

testEmail(testEmails[currentIndex])