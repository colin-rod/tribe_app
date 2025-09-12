'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthForm from '@/components/auth/AuthForm'
import AuthInput from '@/components/auth/AuthInput'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const { loading, error, message, handleSignUp, handleGoogleAuth } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSignUp(email, password, firstName, lastName)
  }

  return (
    <AuthLayout
      title="Plant Your Roots"
      subtitle="Join your community grove and start sharing precious memories"
      icon="🌱"
    >
      <AuthForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        message={message}
        submitText="Create Account"
        loadingText="Planting your roots..."
        submitIcon="🌱"
        onGoogleAuth={handleGoogleAuth}
        alternativeText="Already have an account?"
        alternativeLink="/auth/login"
        alternativeLinkText="Sign in"
      >
        <div className="grid grid-cols-2 gap-4">
          <AuthInput
            id="firstName"
            name="firstName"
            type="text"
            label="First name"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          
          <AuthInput
            id="lastName"
            name="lastName"
            type="text"
            label="Last name"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        
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
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          helpText="Must be at least 6 characters"
        />
      </AuthForm>
    </AuthLayout>
  )
}