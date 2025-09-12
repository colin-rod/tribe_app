'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthForm from '@/components/auth/AuthForm'
import AuthInput from '@/components/auth/AuthInput'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { loading, error, handleSignIn, handleGoogleAuth } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSignIn(email, password)
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Return to your community grove"
      icon="🍃"
    >
      <AuthForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        submitText="Sign In"
        loadingText="Signing in..."
        submitIcon="🍃"
        onGoogleAuth={handleGoogleAuth}
        alternativeText="Don't have an account?"
        alternativeLink="/auth/signup"
        alternativeLinkText="Sign up"
      >
        <AuthInput
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <AuthInput
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </AuthForm>
    </AuthLayout>
  )
}