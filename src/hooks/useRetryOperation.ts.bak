/**
 * Retry Operation Hook
 * Provides automatic retry logic for failed operations with exponential backoff
 */

import { useState, useCallback, useRef } from 'react'
import { AppError, ErrorCodes } from '@/lib/error-handler'
import { showError, showSuccess } from '@/lib/toast-service'

interface RetryConfig {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryCondition?: (error: AppError) => boolean
  onRetryAttempt?: (attempt: number, error: AppError) => void
  onMaxRetriesReached?: (error: AppError) => void
}

interface RetryState {
  isRetrying: boolean
  currentAttempt: number
  lastError: AppError | null
  canRetry: boolean
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: AppError) => {
    // Retry on network errors, service unavailable, and rate limits
    return [
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.API_RATE_LIMIT,
      ErrorCodes.DATABASE_ERROR
    ].includes(error.code as ErrorCodes)
  },
  onRetryAttempt: () => {},
  onMaxRetriesReached: () => {}
}

export function useRetryOperation(config: RetryConfig = {}) {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    currentAttempt: 0,
    lastError: null,
    canRetry: false
  })

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1)
    return Math.min(delay, finalConfig.maxDelay)
  }, [finalConfig])

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> => {
    const config = { ...finalConfig, ...customConfig }
    let lastError: AppError
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setState(prev => ({
      ...prev,
      isRetrying: false,
      currentAttempt: 0,
      lastError: null,
      canRetry: false
    }))

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        setState(prev => ({
          ...prev,
          currentAttempt: attempt,
          isRetrying: attempt > 1
        }))

        const result = await operation()
        
        // Success - reset state
        setState(prev => ({
          ...prev,
          isRetrying: false,
          currentAttempt: 0,
          lastError: null,
          canRetry: false
        }))

        return result
      } catch (error) {
        // Convert to AppError
        lastError = error instanceof AppError 
          ? error 
          : new AppError(
              error instanceof Error ? error.message : 'Unknown error',
              ErrorCodes.UNKNOWN_ERROR,
              { originalError: error }
            )

        // Check if we should retry
        const shouldRetry = attempt <= config.maxRetries && config.retryCondition(lastError)
        
        setState(prev => ({
          ...prev,
          lastError,
          canRetry: shouldRetry,
          isRetrying: shouldRetry
        }))

        if (shouldRetry) {
          config.onRetryAttempt(attempt, lastError)
          
          // Calculate delay and wait
          const delay = calculateDelay(attempt)
          
          showError(`Operation failed. Retrying in ${Math.round(delay / 1000)} seconds... (${attempt}/${config.maxRetries})`)
          
          await new Promise(resolve => {
            timeoutRef.current = setTimeout(resolve, delay)
          })
        } else {
          // Max retries reached or non-retryable error
          setState(prev => ({
            ...prev,
            isRetrying: false,
            canRetry: false
          }))

          if (attempt > config.maxRetries) {
            config.onMaxRetriesReached(lastError)
            const maxRetriesError = new AppError(
              `Operation failed after ${config.maxRetries} attempts: ${lastError.message}`,
              ErrorCodes.NETWORK_ERROR,
              { 
                originalError: lastError,
                maxRetries: config.maxRetries,
                attempts: attempt - 1
              }
            )
            throw maxRetriesError
          } else {
            throw lastError
          }
        }
      }
    }

    throw lastError!
  }, [finalConfig, calculateDelay])

  const manualRetry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    if (!state.canRetry || !state.lastError) {
      return null
    }

    try {
      setState(prev => ({ ...prev, isRetrying: true }))
      const result = await operation()
      
      setState(prev => ({
        ...prev,
        isRetrying: false,
        lastError: null,
        canRetry: false
      }))
      
      showSuccess('Operation completed successfully!')
      return result
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : new AppError(
            error instanceof Error ? error.message : 'Unknown error',
            ErrorCodes.UNKNOWN_ERROR
          )

      setState(prev => ({ 
        ...prev, 
        isRetrying: false,
        lastError: appError
      }))
      
      showError('Retry failed: ' + appError.message)
      return null
    }
  }, [state.canRetry, state.lastError])

  const cancelRetry = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setState(prev => ({
      ...prev,
      isRetrying: false,
      canRetry: false
    }))
  }, [])

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setState({
      isRetrying: false,
      currentAttempt: 0,
      lastError: null,
      canRetry: false
    })
  }, [])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    ...state,
    executeWithRetry,
    manualRetry,
    cancelRetry,
    reset,
    cleanup
  }
}

// Specialized hook for API calls
export function useApiRetry(config: RetryConfig = {}) {
  return useRetryOperation({
    maxRetries: 3,
    initialDelay: 2000,
    retryCondition: (error: AppError) => {
      return [
        ErrorCodes.NETWORK_ERROR,
        ErrorCodes.SERVICE_UNAVAILABLE,
        ErrorCodes.API_RATE_LIMIT,
        ErrorCodes.DATABASE_ERROR,
        ErrorCodes.INTERNAL_SERVER_ERROR
      ].includes(error.code as ErrorCodes)
    },
    ...config
  })
}

// Specialized hook for file uploads
export function useFileUploadRetry(config: RetryConfig = {}) {
  return useRetryOperation({
    maxRetries: 2,
    initialDelay: 3000,
    maxDelay: 15000,
    retryCondition: (error: AppError) => {
      return [
        ErrorCodes.NETWORK_ERROR,
        ErrorCodes.FILE_UPLOAD_FAILED,
        ErrorCodes.SERVICE_UNAVAILABLE
      ].includes(error.code as ErrorCodes)
    },
    ...config
  })
}

// Hook with exponential backoff and jitter
export function useRetryWithJitter(config: RetryConfig = {}) {
  const calculateDelayWithJitter = useCallback((attempt: number): number => {
    const { initialDelay = 1000, maxDelay = 10000, backoffMultiplier = 2 } = config
    const baseDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1)
    
    // Add jitter (random factor between 0.5 and 1.5)
    const jitter = 0.5 + Math.random()
    const delay = baseDelay * jitter
    
    return Math.min(delay, maxDelay)
  }, [config])

  return useRetryOperation({
    ...config,
    // Override the delay calculation to use jitter
    initialDelay: config.initialDelay || 1000
  })
}