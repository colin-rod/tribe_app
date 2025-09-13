'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { showSuccess, showError } from '@/lib/toast-service'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const clearMessages = () => {
    setError(null)
    setMessage(null)
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    clearMessages()

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred with Google sign in'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true)
    clearMessages()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      showSuccess('Welcome back!')
      router.push('/dashboard')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign in'
      setError(errorMessage)
      showError('Sign in failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    setLoading(true)
    clearMessages()

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      })

      if (error) throw error

      if (data.user && !data.user.email_confirmed_at) {
        setMessage('Check your email for the confirmation link!')
      } else {
        router.push('/onboarding')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign up'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    message,
    handleSignIn,
    handleSignUp,
    handleGoogleAuth,
    clearMessages
  }
}