'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getUserTribes } from '@/lib/tribes'
import type { User } from '@supabase/supabase-js'

export default function TribesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tribes, setTribes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Get user's tribes
        const userTribes = await getUserTribes(user.id)
        setTribes(userTribes)

      } catch (error) {
        console.error('Error loading tribes:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tribes...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Your Tribes</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-gray-600">
            Manage your family tribes and their settings. Each tribe is your family's home base for organizing circles.
          </p>
        </div>

        {/* Tribes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tribes.map((tribeData) => (
            <div key={tribeData.tribe_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {tribeData.tribes.name}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  tribeData.role === 'owner' 
                    ? 'bg-blue-100 text-blue-800' 
                    : tribeData.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {tribeData.role}
                </span>
              </div>

              {tribeData.tribes.description && (
                <p className="text-gray-600 text-sm mb-4">
                  {tribeData.tribes.description}
                </p>
              )}

              <div className="text-xs text-gray-500 mb-4">
                Created {new Date(tribeData.tribes.created_at).toLocaleDateString()}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {tribeData.role === 'owner' ? 'You own this tribe' : 'Member since ' + new Date(tribeData.joined_at).toLocaleDateString()}
                </div>
                
                {(tribeData.role === 'owner' || tribeData.role === 'admin') && (
                  <button
                    onClick={() => router.push(`/tribes/${tribeData.tribe_id}/settings`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {tribes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tribes Yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't joined any tribes yet. Create your first tribe to get started!
            </p>
            <button
              onClick={() => router.push('/onboarding')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Create Your First Tribe
            </button>
          </div>
        )}
      </div>
    </div>
  )
}