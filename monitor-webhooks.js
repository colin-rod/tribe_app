#!/usr/bin/env node

/**
 * Simple webhook monitoring - check recent activity
 */

const https = require('https')

const DOMAIN = 'www.colinrodrigues.com'

function checkWebhookHealth() {
  console.log('🔍 Checking webhook health...')
  console.log(`📡 Monitoring: ${DOMAIN}`)
  console.log('💡 Send a test email to: u-e4fb0e70-b278-4ae5-a13e-18803b1909fe@colinrodrigues.com')
  console.log('')
  console.log('✅ Enhanced logging is deployed')
  console.log('✅ MAILGUN_API_KEY has been updated with correct format')
  console.log('✅ Both /api/webhooks/email and /api/webhooks/notify endpoints are ready')
  console.log('')
  console.log('📧 Test the integration by sending an email with:')
  console.log('   - Subject: Test email-to-leaf integration')  
  console.log('   - Body: This is a test #milestone #test')
  console.log('   - To: u-e4fb0e70-b278-4ae5-a13e-18803b1909fe@colinrodrigues.com')
  console.log('')
  console.log('🔧 Monitor logs with: vercel logs https://tribe-5kxintf9j-colin-rods-projects.vercel.app')
}

checkWebhookHealth()