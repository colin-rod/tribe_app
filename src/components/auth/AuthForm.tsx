'use client'

import { ReactNode } from 'react'
import { Icon } from '@/components/ui/IconLibrary'

interface AuthFormProps {
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  error?: string | null
  message?: string | null
  children: ReactNode
  submitText: string
  loadingText: string
  submitIcon: string
  showGoogleAuth?: boolean
  onGoogleAuth?: () => void
  alternativeText: string
  alternativeLink: string
  alternativeLinkText: string
}

export default function AuthForm({
  onSubmit,
  loading,
  error,
  message,
  children,
  submitText,
  loadingText,
  submitIcon,
  showGoogleAuth = true,
  onGoogleAuth,
  alternativeText,
  alternativeLink,
  alternativeLinkText
}: AuthFormProps) {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {error && (
        <div className="bg-flower-400/10 border-2 border-flower-400 text-bark-400 px-4 py-3 rounded-lg font-medium flex items-center">
          <Icon name="alertTriangle" size="sm" className="mr-2 text-flower-400" />
          {error}
        </div>
      )}
      
      {message && (
        <div className="bg-leaf-500/10 border-2 border-leaf-500 text-bark-400 px-4 py-3 rounded-lg font-medium flex items-center">
          <Icon name="check" size="sm" className="mr-2 text-leaf-500" />
          {message}
        </div>
      )}
    
      <div className="space-y-4">
        {children}
      </div>

      <div className="space-y-4">
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border-2 border-transparent text-sm font-bold rounded-lg text-leaf-100 bg-bark-400 hover:bg-bark-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bark-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-150 hover:-translate-y-0.5"
        >
          <span className="mr-2 text-xl">{submitIcon}</span>
          {loading ? loadingText : submitText}
        </button>
        
        {showGoogleAuth && onGoogleAuth && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-bark-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface text-bark-300 font-medium">Or continue with</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onGoogleAuth}
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border-2 border-bark-200 rounded-lg shadow-sm text-sm font-medium text-bark-400 bg-surface hover:bg-leaf-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-leaf-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-sm text-bark-300">
          {alternativeText}{' '}
          <a href={alternativeLink} className="font-bold text-leaf-600 hover:text-leaf-500 transition-colors">
            {alternativeLinkText}
          </a>
        </p>
      </div>
    </form>
  )
}