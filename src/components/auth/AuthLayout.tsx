'use client'

import { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  icon: string
  children: ReactNode
}

export default function AuthLayout({ title, subtitle, icon, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-leaf-100 via-sky-100 to-flower-400/20 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-leaf-500/10 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-flower-400/15 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-40 w-40 h-40 bg-flower-400/8 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 bg-fruit-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-leaf-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-2xl">{icon}</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-bark-400 font-display">
            {title}
          </h2>
          <p className="mt-2 text-center text-sm text-bark-300">
            {subtitle}
          </p>
        </div>
        
        <div className="bg-surface rounded-lg shadow-lg border-3 border-leaf-300 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}