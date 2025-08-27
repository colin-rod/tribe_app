'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface TestResult {
  test: string
  success: boolean
  data?: any
  error?: string
  details?: string
}

export default function DatabaseTest() {
  const [user, setUser] = useState<any>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runDiagnostics()
  }, [])

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result])
  }

  const runDiagnostics = async () => {
    setLoading(true)
    setResults([])

    // Test 1: Basic Authentication
    try {
      console.log('Testing authentication...')
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        addResult({
          test: 'Authentication',
          success: false,
          error: error.message,
          details: 'Cannot get current user'
        })
        setLoading(false)
        return
      }

      if (!user) {
        addResult({
          test: 'Authentication',
          success: false,
          error: 'No user found',
          details: 'User is not logged in'
        })
        setLoading(false)
        return
      }

      setUser(user)
      addResult({
        test: 'Authentication',
        success: true,
        data: { id: user.id, email: user.email },
        details: 'User successfully retrieved'
      })

      // Test 2: Profiles Table
      try {
        console.log('Testing profiles table...')
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          addResult({
            test: 'Profiles Table',
            success: false,
            error: profileError.message,
            details: `Error code: ${profileError.code}, Details: ${profileError.details || 'None'}`
          })
        } else {
          addResult({
            test: 'Profiles Table',
            success: true,
            data: profile,
            details: profile ? 'Profile found' : 'No profile found (but no error)'
          })
        }
      } catch (err: any) {
        addResult({
          test: 'Profiles Table',
          success: false,
          error: err.message,
          details: 'Unexpected error querying profiles'
        })
      }

      // Test 3: Tree Members Table
      try {
        console.log('Testing tree_members table...')
        const { data: treeMembers, error: treeMembersError } = await supabase
          .from('tree_members')
          .select(`
            *,
            trees (*)
          `)
          .eq('user_id', user.id)

        if (treeMembersError) {
          addResult({
            test: 'Tree Members Table',
            success: false,
            error: treeMembersError.message,
            details: `Error code: ${treeMembersError.code}, Details: ${treeMembersError.details || 'None'}`
          })
        } else {
          addResult({
            test: 'Tree Members Table',
            success: true,
            data: treeMembers,
            details: `Found ${treeMembers?.length || 0} tree memberships`
          })
        }
      } catch (err: any) {
        addResult({
          test: 'Tree Members Table',
          success: false,
          error: err.message,
          details: 'Unexpected error querying tree_members'
        })
      }

      // Test 4: Branch Members Table
      try {
        console.log('Testing branch_members table...')
        const { data: branchMembers, error: branchMembersError } = await supabase
          .from('branch_members')
          .select(`
            *,
            branches (
              id,
              name,
              description,
              color
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (branchMembersError) {
          addResult({
            test: 'Branch Members Table',
            success: false,
            error: branchMembersError.message,
            details: `Error code: ${branchMembersError.code}, Details: ${branchMembersError.details || 'None'}`
          })
        } else {
          addResult({
            test: 'Branch Members Table',
            success: true,
            data: branchMembers,
            details: `Found ${branchMembers?.length || 0} branch memberships`
          })
        }
      } catch (err: any) {
        addResult({
          test: 'Branch Members Table',
          success: false,
          error: err.message,
          details: 'Unexpected error querying branch_members'
        })
      }

      // Test 5: Subscriptions Table
      try {
        console.log('Testing subscriptions table...')
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (subscriptionError) {
          addResult({
            test: 'Subscriptions Table',
            success: false,
            error: subscriptionError.message,
            details: `Error code: ${subscriptionError.code}, Details: ${subscriptionError.details || 'None'}`
          })
        } else {
          addResult({
            test: 'Subscriptions Table',
            success: true,
            data: subscription,
            details: subscription ? 'Subscription found' : 'No subscription found (but no error)'
          })
        }
      } catch (err: any) {
        addResult({
          test: 'Subscriptions Table',
          success: false,
          error: err.message,
          details: 'Unexpected error querying subscriptions'
        })
      }

      // Test 6: Try to create missing profile if needed
      const profileTest = results.find(r => r.test === 'Profiles Table')
      if (profileTest && !profileTest.success && user.email) {
        try {
          console.log('Attempting to create profile...')
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              first_name: user.email.split('@')[0],
              last_name: null
            })
            .select()
            .single()

          if (createError) {
            addResult({
              test: 'Profile Creation',
              success: false,
              error: createError.message,
              details: `Could not auto-create profile: ${createError.details || 'Unknown error'}`
            })
          } else {
            addResult({
              test: 'Profile Creation',
              success: true,
              data: newProfile,
              details: 'Profile created successfully!'
            })
          }
        } catch (err: any) {
          addResult({
            test: 'Profile Creation',
            success: false,
            error: err.message,
            details: 'Unexpected error creating profile'
          })
        }
      }

    } catch (err: any) {
      addResult({
        test: 'General Error',
        success: false,
        error: err.message,
        details: 'Unexpected error during diagnostics'
      })
    }

    setLoading(false)
  }

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
  }

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Database Diagnostics</h1>
          <p className="text-gray-600 mt-2">
            Testing database connectivity and table access for the current user
          </p>
        </div>

        {user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">Current User</h2>
            <div className="text-sm text-blue-800">
              <div><strong>ID:</strong> {user.id}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Running diagnostics...</p>
          </div>
        )}

        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-gray-900">
                  {getStatusIcon(result.success)} {result.test}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.success)}`}>
                  {result.success ? 'SUCCESS' : 'FAILED'}
                </span>
              </div>

              {result.details && (
                <p className="text-gray-600 mb-3">{result.details}</p>
              )}

              {result.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                  <p className="text-red-800 font-medium">Error: {result.error}</p>
                </div>
              )}

              {result.data && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm text-gray-600 mb-2">Data:</p>
                  <pre className="text-xs text-gray-800 overflow-auto max-h-32">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {!loading && results.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-600">
                  {results.filter(r => r.success).length} Tests Passed
                </span>
              </div>
              <div>
                <span className="font-medium text-red-600">
                  {results.filter(r => !r.success).length} Tests Failed
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Next Steps:</h4>
              {results.every(r => r.success) ? (
                <div className="text-green-700">
                  <p>✅ All tests passed! The dashboard should work now.</p>
                  <a href="/dashboard" className="text-blue-600 underline mt-2 inline-block">
                    Try Dashboard →
                  </a>
                </div>
              ) : (
                <div className="text-amber-700">
                  <p>⚠️ Some tests failed. Check the errors above and fix them before proceeding to the dashboard.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Diagnostics Again'}
          </button>
        </div>
      </div>
    </div>
  )
}