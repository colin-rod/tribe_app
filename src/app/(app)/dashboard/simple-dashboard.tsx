'use client'

import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface SimpleDashboardProps {
  user: User
}

export default function SimpleDashboard({ user }: SimpleDashboardProps) {
  const router = useRouter()

  return (
    <div className="p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to Tree! 🌳
        </h1>
        <p className="text-gray-600 mt-2">
          You're signed in as <span className="font-medium">{user.email}</span>
        </p>
      </div>

      {/* Quick Setup */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
        <p className="text-gray-600 mb-6">
          Welcome to your family sharing platform! Here's what you can do to get started:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Create Your Family Tree</h3>
            <p className="text-gray-600 text-sm mb-4">
              Set up your household and add family members to get started.
            </p>
            <button
              onClick={() => router.push('/onboarding')}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
            >
              Get Started
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Create Your First Branch</h3>
            <p className="text-gray-600 text-sm mb-4">
              Branches are where you'll share photos and memories with your family.
            </p>
            <button
              onClick={() => router.push('/branches/create')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Create Branch
            </button>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Account</h3>
        <div className="space-y-2 text-sm">
          <div><span className="font-medium">Email:</span> {user.email}</div>
          <div><span className="font-medium">User ID:</span> {user.id}</div>
          <div><span className="font-medium">Account Created:</span> {new Date(user.created_at).toLocaleDateString()}</div>
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
  )
}