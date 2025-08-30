/**
 * Error Display Components
 * User-friendly error messages with actions
 */

import React from 'react'
import { FormattedError } from '@/lib/error-messages'
import { LoadingButton } from './LoadingSpinner'
import { cn } from '@/lib/utils'

interface ErrorDisplayProps {
  error: FormattedError
  onRetry?: () => void
  onDismiss?: () => void
  onContactSupport?: () => void
  className?: string
  compact?: boolean
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  onContactSupport,
  className = '',
  compact = false
}: ErrorDisplayProps) {
  const severityStyles = {
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800', 
    high: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-300 text-red-900'
  }

  const iconMap = {
    low: '⚠️',
    medium: '❌',
    high: '🚨',
    critical: '💥'
  }

  const handleAction = (actionType: string) => {
    switch (actionType) {
      case 'retry':
        onRetry?.()
        break
      case 'reload':
        window.location.reload()
        break
      case 'login':
        window.location.href = '/auth/login'
        break
      case 'contact':
        onContactSupport?.()
        break
      case 'dismiss':
        onDismiss?.()
        break
    }
  }

  if (compact) {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm',
        severityStyles[error.severity],
        className
      )}>
        <span className="text-lg">{iconMap[error.severity]}</span>
        <span className="font-medium">{error.message}</span>
        {error.actions.length > 0 && (
          <div className="flex gap-1 ml-2">
            {error.actions.slice(0, 1).map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(action.action)}
                className="text-xs underline hover:no-underline font-medium"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-lg border p-6',
      severityStyles[error.severity],
      className
    )}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <span className="text-2xl">{iconMap[error.severity]}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-2">
            {error.severity === 'critical' ? 'Critical Error' :
             error.severity === 'high' ? 'Error' :
             error.severity === 'medium' ? 'Problem' : 'Warning'}
          </h3>
          
          <p className="text-base mb-4 leading-relaxed">
            {error.message}
          </p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Technical Details
              </summary>
              <div className="text-xs font-mono bg-black bg-opacity-10 p-3 rounded border">
                <div>Error ID: {error.errorId}</div>
                <div>Timestamp: {error.timestamp.toISOString()}</div>
                <div>Recoverable: {error.isRecoverable ? 'Yes' : 'No'}</div>
              </div>
            </details>
          )}

          {error.actions.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {error.actions.map((action, index) => (
                <LoadingButton
                  key={index}
                  onClick={() => handleAction(action.action)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    action.primary
                      ? 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-300 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 underline hover:no-underline'
                  )}
                  loading={false}
                >
                  {action.label}
                </LoadingButton>
              ))}
            </div>
          )}

          {error.severity === 'critical' && (
            <div className="mt-4 p-3 bg-white bg-opacity-50 rounded border text-sm">
              <p className="font-medium mb-1">Need help?</p>
              <p>
                If this problem persists, please contact support with error ID: 
                <code className="ml-1 font-mono text-xs bg-black bg-opacity-20 px-1 rounded">
                  {error.errorId}
                </code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline error for forms
interface InlineErrorProps {
  message: string
  className?: string
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  return (
    <div className={cn('flex items-center gap-2 text-red-600 text-sm mt-1', className)}>
      <span className="text-red-500">⚠️</span>
      <span>{message}</span>
    </div>
  )
}

// Error boundary fallback
interface ErrorBoundaryFallbackProps {
  error: Error
  resetError: () => void
}

export function ErrorBoundaryFallback({ error, resetError }: ErrorBoundaryFallbackProps) {
  const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">💥</div>
          
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Something went wrong
          </h2>
          
          <p className="text-red-700 mb-6 leading-relaxed">
            An unexpected error occurred. Please try refreshing the page or contact support if the problem continues.
          </p>

          <div className="flex flex-col gap-3">
            <LoadingButton
              onClick={resetError}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              loading={false}
            >
              Try Again
            </LoadingButton>
            
            <button
              onClick={() => window.location.reload()}
              className="text-red-600 text-sm hover:text-red-800 underline hover:no-underline"
            >
              Reload Page
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm font-medium mb-2 text-red-800">
                Error Details (Development)
              </summary>
              <div className="text-xs font-mono bg-red-100 p-3 rounded border text-red-900 whitespace-pre-wrap">
                {error.stack || error.message}
              </div>
            </details>
          )}

          <div className="mt-4 text-xs text-red-600">
            Error ID: {errorId}
          </div>
        </div>
      </div>
    </div>
  )
}