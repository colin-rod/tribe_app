#!/usr/bin/env node

/**
 * Quick script to get your user ID for testing email functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function getUserId() {
  try {
    // Get the first user from profiles table
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .limit(1)

    if (error) {
      console.error('❌ Error fetching user:', error.message)
      return
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found. Please sign up first at your app.')
      return
    }

    const user = users[0]
    console.log('✅ Found test user:')
    console.log(`   Name: ${user.first_name} ${user.last_name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   User ID: ${user.id}`)
    console.log('')
    console.log('📧 Test email address:')
    console.log(`   u-${user.id}@colinrodrigues.com`)
    console.log('')
    console.log('🎯 Short version for testing:')
    console.log(`   u-${user.id.substring(0, 8)}@colinrodrigues.com`)

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

getUserId()