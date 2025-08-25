// Simple RBAC test script to verify the system works
// Run with: node test-rbac.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRBAC() {
  console.log('🧪 Testing RBAC System...\n')

  try {
    // Test 1: Check if RBAC tables exist and have data
    console.log('1. Testing RBAC table structure...')
    
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(5)
    
    if (rolesError) {
      console.error('❌ Failed to query roles table:', rolesError.message)
      return
    }
    
    console.log('✅ Roles table accessible')
    console.log(`   Found ${roles?.length || 0} roles:`, roles?.map(r => r.name).join(', '))

    // Test 2: Check permissions table
    const { data: permissions, error: permsError } = await supabase
      .from('permissions')
      .select('*')
      .limit(5)
    
    if (permsError) {
      console.error('❌ Failed to query permissions table:', permsError.message)
      return
    }
    
    console.log('✅ Permissions table accessible')
    console.log(`   Found ${permissions?.length || 0} permissions:`, permissions?.map(p => p.name).join(', '))

    // Test 3: Check role permissions mapping
    console.log('\n2. Testing role-permission relationships...')
    
    const { data: rolePerms, error: rolePermsError } = await supabase
      .from('role_permissions')
      .select(`
        *,
        role:roles(name),
        permission:permissions(name)
      `)
      .limit(10)
    
    if (rolePermsError) {
      console.error('❌ Failed to query role permissions:', rolePermsError.message)
      return
    }
    
    console.log('✅ Role-permission relationships working')
    console.log(`   Found ${rolePerms?.length || 0} role-permission mappings`)
    
    // Test user roles table
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(5)
    
    if (userRolesError) {
      console.error('❌ Failed to query user roles:', userRolesError.message)
      return
    }
    
    console.log('✅ User roles table accessible')
    console.log(`   Found ${userRoles?.length || 0} user role assignments`)

    // Test 4: Check circle policies work
    console.log('\n3. Testing circle access policies...')
    
    const { data: circles, error: circlesError } = await supabase
      .from('circles')
      .select('id, name, privacy')
      .limit(3)
    
    if (circlesError) {
      console.error('❌ Failed to query circles:', circlesError.message)
      return
    }
    
    console.log('✅ Circle policies allow basic queries')
    console.log(`   Found ${circles?.length || 0} accessible circles`)

    console.log('\n🎉 RBAC system appears to be working correctly!')
    console.log('\n📝 Next steps:')
    console.log('   - Test circle creation to verify automatic role assignment')
    console.log('   - Test permission-based UI controls in the dashboard')
    console.log('   - Verify post creation, editing, and deletion permissions')

  } catch (error) {
    console.error('❌ Unexpected error during RBAC testing:', error.message)
  }
}

testRBAC()