/**
 * Lazy loading wrapper with loading states and error boundaries
 */

'use client'

import React, { Suspense, memo } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createComponentLogger } from '@/lib/logger'
import { Icon } from '@/components/ui/IconLibrary'

const logger = createComponentLogger('LazyWrapper')

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ComponentType
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
  minLoadingTime?: number
}

// Default loading component
const DefaultLoading = memo(function DefaultLoading() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  )
})

// Default error component
const DefaultErrorFallback = memo(function DefaultErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error
  resetErrorBoundary: () => void 
}) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center space-y-4 p-6">
        <Icon name="alertTriangle" size="3xl" className="text-red-500" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 text-sm mb-4">
            {process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
})

// Loading component with minimum display time
const LoadingWithMinTime = memo(function LoadingWithMinTime({ 
  fallback: Fallback = DefaultLoading,
  minTime = 300
}: {
  fallback?: React.ComponentType
  minTime?: number
}) {
  const [showLoading, setShowLoading] = React.useState(true)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false)
    }, minTime)

    return () => clearTimeout(timer)
  }, [minTime])

  if (showLoading) {
    return <Fallback />
  }

  return null
})

const LazyWrapper = memo(function LazyWrapper({
  children,
  fallback: Fallback = DefaultLoading,
  errorFallback: ErrorFallback = DefaultErrorFallback,
  minLoadingTime
}: LazyWrapperProps) {
  const loadingComponent = minLoadingTime ? (
    <LoadingWithMinTime fallback={Fallback} minTime={minLoadingTime} />
  ) : (
    <Fallback />
  )

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log error using structured logging
        logger.error('LazyWrapper Error', error, { 
          metadata: {
            errorInfo: errorInfo.componentStack,
            nodeEnv: process.env.NODE_ENV 
          }
        })
        
        // In production, you might want to send to error reporting service
        // errorReportingService.captureError(error, errorInfo)
      }}
    >
      <Suspense fallback={loadingComponent}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
})

export default LazyWrapper

// Utility function to create lazy components with consistent loading
export function createLazyComponent<T extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options?: {
    fallback?: React.ComponentType
    errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
    minLoadingTime?: number
  }
) {
  const LazyComponent = React.lazy(importFn)
  
  return memo(function WrappedLazyComponent(props: T) {
    return (
      <LazyWrapper {...options}>
        <LazyComponent {...props} />
      </LazyWrapper>
    )
  })
}

// Higher-order component for lazy loading
export function withLazyLoading<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options?: {
    fallback?: React.ComponentType
    errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
    minLoadingTime?: number
  }
) {
  return memo(function LazyLoadedComponent(props: T) {
    return (
      <LazyWrapper {...options}>
        <Component {...props} />
      </LazyWrapper>
    )
  })
}