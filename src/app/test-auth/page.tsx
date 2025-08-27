'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function TestAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication...')
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('Auth result:', { user, error })
        
        if (error) {
          setError(error.message)
        } else {
          setUser(user)
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        setError('Authentication check failed')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="p-8">Checking authentication...</div>
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-red-600">{error}</p>
        <a href="/auth/login" className="text-blue-600 underline mt-4 block">
          Go to Login
        </a>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold mb-4">Not Authenticated</h1>
        <p>You are not logged in.</p>
        <a href="/auth/login" className="text-blue-600 underline mt-4 block">
          Go to Login
        </a>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Authentication Success!</h1>
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="font-semibold mb-2">User Details:</h2>
        <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
      <div className="mt-6 space-x-4">
        <a 
          href="/dashboard" 
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Dashboard
        </a>
        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}