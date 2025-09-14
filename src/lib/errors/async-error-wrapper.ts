/**
 * Async Operation Error Wrapper
 * Provides consistent error handling for async operations with loading states
 */

import { AppError, ErrorCodes, errorHandler } from '@/lib/error-handler'
import { mapSupabaseError } from './supabase-error-mapper'

export interface AsyncOperationOptions {
  showToast?: boolean
  logError?: boolean
  fallbackMessage?: string
  retryAttempts?: number
  retryDelay?: number
}

export interface AsyncOperationResult<T> {
  data: T | null
  error: AppError | null
  isLoading: boolean
}

export interface AsyncOperationState<T> {
  data: T | null
  error: AppError | null
  isLoading: boolean
  retry: () => Promise<void>
}

/**
 * Wraps an async operation with error handling and loading state management
 */
export async function withAsyncErrorHandling<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): Promise<AsyncOperationResult<T>> {
  const {
    showToast = false,
    logError = true,
    fallbackMessage = 'Operation failed',
    retryAttempts = 0,
    retryDelay = 1000
  } = options

  let lastError: AppError | null = null

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      const data = await operation()
      return {
        data,
        error: null,
        isLoading: false
      }
    } catch (error) {
      // Map Supabase errors
      if (error && typeof error === 'object' && 'code' in error) {
        lastError = mapSupabaseError(error as any)
      } else {
        lastError = errorHandler.handle(error, {
          logError,
          showToast: attempt === retryAttempts, // Only show toast on final attempt
          fallbackMessage
        })
      }

      // If we have retries left and it's a retryable error, wait and continue
      if (attempt < retryAttempts && isRetryableError(lastError)) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }
      
      break
    }
  }

  return {
    data: null,
    error: lastError,
    isLoading: false
  }
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: AppError): boolean {
  const retryableCodes = [
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.API_RATE_LIMIT
  ]
  
  return retryableCodes.includes(error.code as ErrorCodes)
}

/**
 * Creates a stateful async operation wrapper with retry capability
 */
export function createAsyncOperation<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): () => Promise<AsyncOperationState<T>> {
  let currentState: AsyncOperationState<T> = {
    data: null,
    error: null,
    isLoading: false,
    retry: async () => {}
  }

  const executeOperation = async (): Promise<AsyncOperationState<T>> => {
    currentState = {
      ...currentState,
      isLoading: true,
      error: null
    }

    const result = await withAsyncErrorHandling(operation, options)
    
    currentState = {
      data: result.data,
      error: result.error,
      isLoading: false,
      retry: async () => { 
        await executeOperation()
      }
    }

    return currentState
  }

  currentState.retry = async () => { 
    await executeOperation()
  }
  return executeOperation
}

/**
 * Batch operation error handler
 */
export async function withBatchErrorHandling<T>(
  operations: Array<() => Promise<T>>,
  options: AsyncOperationOptions & {
    continueOnError?: boolean
    aggregateErrors?: boolean
  } = {}
): Promise<{
  results: Array<T | null>
  errors: Array<AppError | null>
  hasErrors: boolean
  successCount: number
  errorCount: number
}> {
  const {
    continueOnError = true,
    aggregateErrors = true,
    ...asyncOptions
  } = options

  const results: Array<T | null> = []
  const errors: Array<AppError | null> = []

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i]
    
    try {
      const result = await withAsyncErrorHandling(
        operation,
        { ...asyncOptions, showToast: false } // Don't show individual toasts
      )
      
      results.push(result.data)
      errors.push(result.error)
      
      if (result.error && !continueOnError) {
        // Fill remaining slots with null if stopping on first error
        while (results.length < operations.length) {
          results.push(null)
          errors.push(null)
        }
        break
      }
    } catch (error) {
      const appError = errorHandler.handle(error, { ...asyncOptions, showToast: false })
      results.push(null)
      errors.push(appError)
      
      if (!continueOnError) {
        while (results.length < operations.length) {
          results.push(null)
          errors.push(null)
        }
        break
      }
    }
  }

  const successCount = results.filter(r => r !== null).length
  const errorCount = errors.filter(e => e !== null).length
  const hasErrors = errorCount > 0

  // Show aggregated toast if requested
  if (asyncOptions.showToast && hasErrors && aggregateErrors) {
    const message = `${errorCount} of ${operations.length} operations failed`
    errorHandler.handle(
      new AppError(message, ErrorCodes.UNKNOWN_ERROR),
      { showToast: true, logError: false }
    )
  }

  return {
    results,
    errors,
    hasErrors,
    successCount,
    errorCount
  }
}

/**
 * Utility functions for common async patterns
 */
export const AsyncUtils = {
  /**
   * Wraps a Supabase query with error handling
   */
  supabaseQuery: <T>(
    query: () => Promise<{ data: T | null; error: Error | null }>,
    fallbackMessage = 'Database query failed'
  ) => withAsyncErrorHandling(
    async () => {
      const { data, error } = await query()
      if (error) throw mapSupabaseError(error)
      return data
    },
    { fallbackMessage, showToast: true }
  ),

  /**
   * Wraps a file upload operation
   */
  fileUpload: <T>(
    upload: () => Promise<T>,
    fallbackMessage = 'File upload failed'
  ) => withAsyncErrorHandling(upload, {
    fallbackMessage,
    showToast: true,
    retryAttempts: 2,
    retryDelay: 1000
  }),

  /**
   * Wraps an API call with network error handling
   */
  apiCall: <T>(
    apiCall: () => Promise<T>,
    fallbackMessage = 'API call failed'
  ) => withAsyncErrorHandling(apiCall, {
    fallbackMessage,
    showToast: true,
    retryAttempts: 1,
    retryDelay: 2000
  })
}