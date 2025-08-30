/**
 * React Error Boundary Components
 * Catches JavaScript errors in component trees and displays fallback UI
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { AppError, ErrorCodes, errorHandler } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('ErrorBoundary')

interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: AppError, errorId: string) => void
  level?: 'page' | 'section' | 'component'
  resetKeys?: Array<string | number | boolean | null | undefined>
  resetOnPropsChange?: boolean
}

export interface ErrorFallbackProps {
  error: AppError
  resetError: () => void
  errorId: string
  level: string
}

/**
 * Main Error Boundary component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error.message || 'An unexpected error occurred',
          ErrorCodes.INTERNAL_SERVER_ERROR,
          { originalError: error.name, stack: error.stack }
        )

    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error: appError,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props
    const { error: appError, errorId } = this.state

    if (appError) {
      // Log the error with React-specific context
      errorHandler.handle(appError, {
        logError: true,
        showToast: false // Error boundary will show its own UI
      })

      // Call custom error handler if provided
      onError?.(appError, errorId)

      // Log React error info using structured logging
      logger.error('React Error Boundary caught an error', appError, {
        errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
        nodeEnv: process.env.NODE_ENV
      })
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && !prevProps.hasError) {
      return
    }

    // Reset error when resetKeys change
    if (resetKeys && resetKeys !== prevProps.resetKeys) {
      if (resetKeys.some((key, i) => key !== prevProps.resetKeys?.[i])) {
        this.resetError()
      }
    }

    // Reset error when props change (if enabled)
    if (resetOnPropsChange && hasError) {
      this.resetError()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    })
  }

  render() {
    const { hasError, error, errorId } = this.state
    const { children, fallback: FallbackComponent, level = 'component' } = this.props

    if (hasError && error) {
      if (FallbackComponent) {
        return <FallbackComponent error={error} resetError={this.resetError} errorId={errorId} level={level} />
      }

      // Default fallback based on level
      switch (level) {
        case 'page':
          return <PageErrorFallback error={error} resetError={this.resetError} errorId={errorId} level={level} />
        case 'section':
          return <SectionErrorFallback error={error} resetError={this.resetError} errorId={errorId} level={level} />
        default:
          return <ComponentErrorFallback error={error} resetError={this.resetError} errorId={errorId} level={level} />
      }
    }

    return children
  }
}

/**
 * Page-level error fallback
 */
export function PageErrorFallback({ error, resetError, errorId }: ErrorFallbackProps) {
  const isNetworkError = error.code === ErrorCodes.NETWORK_ERROR
  const isAuthError = [ErrorCodes.UNAUTHORIZED, ErrorCodes.FORBIDDEN].includes(error.code as ErrorCodes)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {isNetworkError ? '🔌' : isAuthError ? '🔒' : '⚠️'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {isNetworkError ? 'Connection Problem' : isAuthError ? 'Access Denied' : 'Something Went Wrong'}
          </h1>
          <p className="text-gray-600 mb-8">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          
          <div className="space-x-4">
            <button
              onClick={resetError}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
            >
              Go Home
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <h3 className="text-red-800 font-medium mb-2">Development Info</h3>
              <p className="text-red-700 text-sm mb-2">Error ID: {errorId}</p>
              <p className="text-red-700 text-sm mb-2">Code: {error.code}</p>
              <pre className="text-red-600 text-xs overflow-auto">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Section-level error fallback
 */
export function SectionErrorFallback({ error, resetError, errorId }: ErrorFallbackProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-red-800 font-medium">Unable to load this section</h3>
          <p className="text-red-700 text-sm mt-1">
            {error.message || 'An error occurred while loading this content.'}
          </p>
          <div className="mt-4">
            <button
              onClick={resetError}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-red-800 text-sm cursor-pointer">Debug Info</summary>
              <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                <p>Error ID: {errorId}</p>
                <p>Code: {error.code}</p>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Component-level error fallback
 */
export function ComponentErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-yellow-800 text-sm">
            Something went wrong with this component.
          </p>
          <button
            onClick={resetError}
            className="mt-2 text-yellow-800 text-sm underline hover:text-yellow-900"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Higher-order component to wrap components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook to manually trigger error boundary
 */
export function useErrorHandler() {
  return (error: Error | AppError) => {
    throw error instanceof AppError ? error : new AppError(error.message, ErrorCodes.UNKNOWN_ERROR)
  }
}