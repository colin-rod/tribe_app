'use client'

import React, { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from 'react-error-boundary'

// Lazy load the AI prompting engine to reduce bundle size
// TODO: Fix this - SmartPromptingEngine is not a React component
// const AIPromptingEngineOld = lazy(() => 
//   import('@/lib/ai/promptingEngine').then(module => ({
//     default: module.default
//   }))
// )

interface LazyAIPromptingEngineProps {
  onResult?: (result: unknown) => void
  onError?: (error: Error) => void
  fallback?: React.ReactNode
  [key: string]: unknown
}

const AIPromptingEngine = (props: LazyAIPromptingEngineProps) => <div>AI Component temporarily disabled</div>

function AILoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-gray-600">Loading AI features...</p>
      </div>
    </div>
  )
}

function AIErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-red-500 mb-2">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.766 0L3.048 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">AI features unavailable</h3>
        <p className="text-sm text-gray-600 mb-4">
          Unable to load AI functionality. Please try again.
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

export function LazyAIPromptingEngine({ 
  fallback, 
  onError, 
  ...props 
}: LazyAIPromptingEngineProps) {
  return (
    <ErrorBoundary
      FallbackComponent={AIErrorFallback}
      onError={onError}
      onReset={() => {
        // Clear any cached failures and retry
        window.location.reload()
      }}
    >
      <Suspense fallback={fallback || <AILoadingFallback />}>
        <AIPromptingEngine {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

// Hook for conditional AI loading
export function useAIFeatures() {
  const [isAIEnabled, setIsAIEnabled] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const enableAI = React.useCallback(async () => {
    if (isAIEnabled || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // Preload the AI module
      await import('@/lib/ai/promptingEngine')
      setIsAIEnabled(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load AI features'))
    } finally {
      setIsLoading(false)
    }
  }, [isAIEnabled, isLoading])

  const disableAI = React.useCallback(() => {
    setIsAIEnabled(false)
    setError(null)
  }, [])

  return {
    isAIEnabled,
    isLoading,
    error,
    enableAI,
    disableAI
  }
}

export default LazyAIPromptingEngine