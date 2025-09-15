#!/usr/bin/env node

/**
 * Check what users exist in the database
 */

import https from 'https'

const DOMAIN = 'www.colinrodrigues.com'
const API_KEY = 'tenxipvzimvpdrfevcmhlolqbqhwlruo'

function checkUsers() {
  console.log('🔍 Checking users in database...')
  
  const options = {
    hostname: DOMAIN,
    port: 443,
    path: '/api/users', // This endpoint might not exist
    method: 'GET',
    headers: {
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
        console.log('✅ Found users in database')
      } else {
        console.log('❌ Could not fetch users (this endpoint might not exist)')
        console.log('💡 You need to sign up at https://www.colinrodrigues.com first')
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Error:', error.message)
    console.log('💡 You need to sign up at https://www.colinrodrigues.com first')
  })

  req.end()
}

checkUsers()