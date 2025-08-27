'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface RobustDashboardProps {
  user: User
}

interface DataState {
  profile: any
  trees: any[]
  branches: any[]
  subscription: any
  loading: boolean
  errors: { [key: string]: string }
}

export default function RobustDashboard({ user }: RobustDashboardProps) {
  const router = useRouter()
  const [data, setData] = useState<DataState>({
    profile: null,
    trees: [],
    branches: [],
    subscription: null,
    loading: true,
    errors: {}
  })

  useEffect(() => {
    loadUserData()
  }, [user.id])

  const loadUserData = async () => {
    setData(prev => ({ ...prev, loading: true, errors: {} }))

    // Load profile with error handling
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.log('Profile error:', profileError)
        
        // If no profile exists, try to create one
        if (profileError.code === 'PGRST116') {
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                first_name: user.email?.split('@')[0] || 'User',
                last_name: null
              })
              .select()
              .single()

            if (createError) {
              setData(prev => ({
                ...prev,
                errors: { ...prev.errors, profile: `Could not create profile: ${createError.message}` }
              }))
            } else {
              setData(prev => ({ ...prev, profile: newProfile }))
            }
          } catch (err: any) {
            setData(prev => ({
              ...prev,
              errors: { ...prev.errors, profile: `Profile creation failed: ${err.message}` }
            }))
          }
        } else {
          setData(prev => ({
            ...prev,
            errors: { ...prev.errors, profile: `Profile query failed: ${profileError.message}` }
          }))
        }
      } else {
        setData(prev => ({ ...prev, profile }))
      }
    } catch (err: any) {
      setData(prev => ({
        ...prev,
        errors: { ...prev.errors, profile: `Unexpected profile error: ${err.message}` }
      }))
    }

    // Load trees with error handling
    try {
      const { data: trees, error: treesError } = await supabase
        .from('tree_members')
        .select(`
          *,
          trees (*)
        `)
        .eq('user_id', user.id)

      if (treesError) {
        console.log('Trees error:', treesError)
        setData(prev => ({
          ...prev,
          errors: { ...prev.errors, trees: `Trees query failed: ${treesError.message}` }
        }))
      } else {
        setData(prev => ({ ...prev, trees: trees || [] }))
      }
    } catch (err: any) {
      setData(prev => ({
        ...prev,
        errors: { ...prev.errors, trees: `Unexpected trees error: ${err.message}` }
      }))
    }

    // Load branches with error handling
    try {
      const { data: branches, error: branchesError } = await supabase
        .from('branch_members')
        .select(`
          *,
          branches (
            id,
            name,
            description,
            color,
            branch_kind,
            tree_id,
            member_count,
            trees (
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(6)

      if (branchesError) {
        console.log('Branches error:', branchesError)
        setData(prev => ({
          ...prev,
          errors: { ...prev.errors, branches: `Branches query failed: ${branchesError.message}` }
        }))
      } else {
        setData(prev => ({ ...prev, branches: branches || [] }))
      }
    } catch (err: any) {
      setData(prev => ({
        ...prev,
        errors: { ...prev.errors, branches: `Unexpected branches error: ${err.message}` }
      }))
    }

    // Load subscription with error handling
    try {
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (subscriptionError) {
        console.log('Subscription error:', subscriptionError)
        // This is often expected for new users, so only log non-critical errors
        if (subscriptionError.code !== 'PGRST116') {
          setData(prev => ({
            ...prev,
            errors: { ...prev.errors, subscription: `Subscription query failed: ${subscriptionError.message}` }
          }))
        }
      } else {
        setData(prev => ({ ...prev, subscription }))
      }
    } catch (err: any) {
      setData(prev => ({
        ...prev,
        errors: { ...prev.errors, subscription: `Unexpected subscription error: ${err.message}` }
      }))
    }

    setData(prev => ({ ...prev, loading: false }))
  }

  const getDisplayName = () => {
    if (data.profile?.first_name) {
      return `${data.profile.first_name} ${data.profile.last_name || ''}`.trim()
    }
    return user.email?.split('@')[0] || 'User'
  }

  const isPaidUser = data.subscription?.is_active && data.subscription?.plan !== 'free'
  const hasErrors = Object.keys(data.errors).length > 0

  return (
    <div className="p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {getDisplayName()}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Here's your family dashboard
        </p>
      </div>

      {/* Error Messages */}
      {hasErrors && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">⚠️ Some data could not be loaded:</h3>
          <div className="space-y-1 text-sm text-amber-700">
            {Object.entries(data.errors).map(([key, error]) => (
              <div key={key}>
                <strong>{key}:</strong> {error}
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-amber-600">
            <p>Don't worry! You can still use the app. Some features may be limited until these issues are resolved.</p>
            <button
              onClick={() => router.push('/test-db')}
              className="text-amber-800 underline mt-1"
            >
              Run Database Diagnostics →
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {data.errors.trees ? '?' : data.trees.length}
              </div>
              <div className="text-sm text-gray-600">Family Trees</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {data.errors.branches ? '?' : data.branches.length}
              </div>
              <div className="text-sm text-gray-600">Your Branches</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
              isPaidUser ? 'bg-purple-100' : 'bg-gray-100'
            }`}>
              <svg className={`w-6 h-6 ${isPaidUser ? 'text-purple-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {data.errors.subscription ? '?' : (isPaidUser ? 'Pro' : 'Free')}
              </div>
              <div className="text-sm text-gray-600">Current Plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Branches */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Your Branches</h2>
                <button
                  onClick={() => router.push('/branches')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All
                </button>
              </div>
            </div>
            
            {data.errors.branches ? (
              <div className="p-6 text-center text-gray-500">
                <p>Could not load branches: {data.errors.branches}</p>
                <button
                  onClick={() => router.push('/branches/create')}
                  className="mt-2 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Try Creating a Branch
                </button>
              </div>
            ) : data.branches.length > 0 ? (
              <div className="p-6">
                <div className="space-y-4">
                  {data.branches.map((branchMember: any) => {
                    const branch = branchMember.branches
                    return (
                      <div key={branch?.id || branchMember.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-4"
                            style={{ backgroundColor: branch?.color || '#3B82F6' }}
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{branch?.name || 'Unknown Branch'}</h3>
                            <div className="flex items-center text-sm text-gray-600">
                              {branch?.trees?.name && (
                                <span className="mr-2">{branch.trees.name} •</span>
                              )}
                              <span>{branch?.member_count || 0} members</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => router.push(`/branches/${branch?.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          disabled={!branch?.id}
                        >
                          View
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Branches Yet</h3>
                <p className="text-gray-600 mb-4">Create your first branch to start sharing with family!</p>
                <button
                  onClick={() => router.push('/branches/create')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Create Branch
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/onboarding')}
                className="w-full flex items-center p-3 text-left bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
                Set Up Your Tree
              </button>
              
              <button
                onClick={() => router.push('/branches/create')}
                className="w-full flex items-center p-3 text-left bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Branch
              </button>
              
              <button
                onClick={() => router.push('/test-db')}
                className="w-full flex items-center p-3 text-left bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Database
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Email:</span> {user.email}</div>
              <div><span className="font-medium">User ID:</span> <span className="font-mono text-xs">{user.id}</span></div>
              <div><span className="font-medium">Joined:</span> {new Date(user.created_at).toLocaleDateString()}</div>
              {data.profile && (
                <div><span className="font-medium">Profile:</span> ✅ Loaded</div>
              )}
              {data.errors.profile && (
                <div><span className="font-medium">Profile:</span> ❌ {data.errors.profile}</div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push('/profile')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Update Profile →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}