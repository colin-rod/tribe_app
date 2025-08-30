/**
 * Loading Spinner Components
 * Reusable loading states for different contexts
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'dots' | 'pulse' | 'bars'
  className?: string
  text?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'default',
  className = '',
  text
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex space-x-1">
          <div className={cn('bg-blue-600 rounded-full animate-bounce', sizeClasses[size])} style={{ animationDelay: '0ms' }}></div>
          <div className={cn('bg-blue-600 rounded-full animate-bounce', sizeClasses[size])} style={{ animationDelay: '150ms' }}></div>
          <div className={cn('bg-blue-600 rounded-full animate-bounce', sizeClasses[size])} style={{ animationDelay: '300ms' }}></div>
        </div>
        {text && <span className={cn('text-gray-600 ml-2', textSizeClasses[size])}>{text}</span>}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('bg-blue-600 rounded-full animate-pulse', sizeClasses[size])}></div>
        {text && <span className={cn('text-gray-600 ml-2', textSizeClasses[size])}>{text}</span>}
      </div>
    )
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex space-x-1 items-end">
          <div className="w-1 bg-blue-600 animate-pulse rounded-full" style={{ height: '12px', animationDelay: '0ms' }}></div>
          <div className="w-1 bg-blue-600 animate-pulse rounded-full" style={{ height: '16px', animationDelay: '150ms' }}></div>
          <div className="w-1 bg-blue-600 animate-pulse rounded-full" style={{ height: '20px', animationDelay: '300ms' }}></div>
          <div className="w-1 bg-blue-600 animate-pulse rounded-full" style={{ height: '16px', animationDelay: '450ms' }}></div>
          <div className="w-1 bg-blue-600 animate-pulse rounded-full" style={{ height: '12px', animationDelay: '600ms' }}></div>
        </div>
        {text && <span className={cn('text-gray-600 ml-2', textSizeClasses[size])}>{text}</span>}
      </div>
    )
  }

  // Default spinner
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-blue-600', sizeClasses[size])}></div>
      {text && <span className={cn('text-gray-600 ml-2', textSizeClasses[size])}>{text}</span>}
    </div>
  )
}

// Full page loading overlay
interface LoadingOverlayProps {
  show: boolean
  text?: string
  variant?: 'default' | 'dots' | 'pulse' | 'bars'
}

export function LoadingOverlay({ show, text = 'Loading...', variant = 'default' }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <LoadingSpinner size="xl" variant={variant} />
        <p className="text-gray-700 text-center font-medium">{text}</p>
      </div>
    </div>
  )
}

// Inline loading state for buttons
interface LoadingButtonProps {
  loading: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function LoadingButton({ 
  loading, 
  children, 
  className = '',
  disabled = false,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'relative inline-flex items-center justify-center transition-all duration-200',
        loading && 'cursor-not-allowed opacity-80',
        className
      )}
    >
      {loading && (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <span className={cn('transition-opacity duration-200', loading && 'opacity-0')}>
        {children}
      </span>
    </button>
  )
}

// Loading skeleton for content areas
interface LoadingSkeletonProps {
  lines?: number
  className?: string
  variant?: 'text' | 'card' | 'avatar' | 'image'
}

export function LoadingSkeleton({ 
  lines = 3, 
  className = '',
  variant = 'text'
}: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="bg-gray-300 h-48 w-full rounded-t-lg mb-4"></div>
        <div className="space-y-3">
          <div className="bg-gray-300 h-4 w-3/4 rounded"></div>
          <div className="bg-gray-300 h-4 w-1/2 rounded"></div>
          <div className="bg-gray-300 h-4 w-5/6 rounded"></div>
        </div>
      </div>
    )
  }

  if (variant === 'avatar') {
    return (
      <div className={cn('animate-pulse flex items-center space-x-4', className)}>
        <div className="bg-gray-300 h-12 w-12 rounded-full"></div>
        <div className="space-y-2 flex-1">
          <div className="bg-gray-300 h-4 w-1/4 rounded"></div>
          <div className="bg-gray-300 h-3 w-1/2 rounded"></div>
        </div>
      </div>
    )
  }

  if (variant === 'image') {
    return (
      <div className={cn('bg-gray-300 animate-pulse rounded', className)} 
           style={{ aspectRatio: '16/9' }}></div>
    )
  }

  // Default text skeleton
  return (
    <div className={cn('animate-pulse space-y-3', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className="bg-gray-300 h-4 rounded"
          style={{ 
            width: index === lines - 1 ? '60%' : '100%' 
          }}
        ></div>
      ))}
    </div>
  )
}