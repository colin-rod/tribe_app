#!/usr/bin/env node

/**
 * Test with the full user ID from database
 */

const https = require('https')

const DOMAIN = 'www.colinrodrigues.com'
const API_KEY = 'tenxipvzimvpdrfevcmhlolqbqhwlruo'

// Full user ID from Supabase database
const FULL_USER_ID = 'e4fb0e70-b278-4ae5-a13e-18803b19b9fe'

const testEmail = {
  to: `u-${FULL_USER_ID}@colinrodrigues.com`,
  from: 'colin.rods@gmail.com',
  subject: 'Test Email - Full UUID',
  text: 'This should work with the full UUID! #test #milestone',
  attachments: []
}

console.log('🧪 Testing with FULL user ID from database')
console.log(`📧 Email: ${testEmail.to}`)
console.log('')

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
      try {
        const response = JSON.parse(data)
        if (response.success && response.data && response.data.leafId) {
          console.log('\n🎉 SUCCESS! Leaf created successfully!')
          console.log(`📄 Leaf ID: ${response.data.leafId}`)
          console.log(`📝 Leaf Type: ${response.data.leafType}`)
          console.log(`🎨 Has Media: ${response.data.hasMedia}`)
          console.log('\n💡 Check your dashboard Inbox tab to see the new leaf!')
        } else {
          console.log('\n✅ Request successful but unexpected response format')
        }
      } catch (error) {
        console.log('\n✅ Request successful')
      }
    } else {
      console.log('\n❌ Request failed')
    }
  })
})

req.on('error', (error) => {
  console.error('❌ Error:', error.message)
})

req.write(postData)
req.end()