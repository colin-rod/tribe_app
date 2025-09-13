/**
 * Enhanced Async Operation Hook
 * Provides loading states, error handling, and retry logic
 */

import { useState, useCallback } from 'react'
import { AppError, ErrorCodes, handleError } from '@/lib/error-handler'
import { formatErrorForUser, FormattedError } from '@/lib/error-messages'
import { showError, showSuccess, toastService } from '@/lib/toast-service'

interface AsyncOperationState<T> {
  data: T | null
  loading: boolean
  error: FormattedError | null
  success: boolean
}

interface AsyncOperationOptions {
  onSuccess?: (data: any) => void
  onError?: (error: FormattedError) => void
  showSuccessToast?: boolean
  showErrorToast?: boolean
  successMessage?: string
  retryDelay?: number
  maxRetries?: number
  context?: {
    action?: string
    resourceType?: string
    feature?: string
  }
}

export function useAsyncOperation<T = any>(
  options: AsyncOperationOptions = {}
) {
  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage,
    retryDelay = 1000,
    maxRetries = 3,
    context = {}
  } = options

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false
  })

  const [retryCount, setRetryCount] = useState(0)

  const execute = useCallback(async (
    operation: () => Promise<T>,
    operationOptions?: {
      loadingMessage?: string
      successMessage?: string
      context?: {
        action?: string
        resourceType?: string
        feature?: string
      }
    }
  ): Promise<T | null> => {
    const { loadingMessage, context: opContext } = operationOptions || {}
    const effectiveContext = { ...context, ...opContext }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      success: false 
    }))

    let loadingToast: string | null = null
    if (loadingMessage) {
      loadingToast = toastService.loading(loadingMessage)
    }

    try {
      const result = await operation()
      
      setState(prev => ({ 
        ...prev, 
        data: result, 
        loading: false, 
        success: true 
      }))

      // Dismiss loading toast
      if (loadingToast) {
        toastService.dismiss(loadingToast)
      }

      // Show success message
      const finalSuccessMessage = operationOptions?.successMessage || successMessage
      if (showSuccessToast && finalSuccessMessage) {
        showSuccess(finalSuccessMessage)
      }

      // Reset retry count on success
      setRetryCount(0)

      // Call success callback
      onSuccess?.(result)

      return result
    } catch (error) {
      // Dismiss loading toast
      if (loadingToast) {
        toastService.dismiss(loadingToast)
      }

      // Convert to AppError and format for user
      const appError = handleError(error)
      const formattedError = formatErrorForUser(appError, effectiveContext)

      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: formattedError 
      }))

      // Show error toast
      if (showErrorToast) {
        showError(formattedError.message)
      }

      // Call error callback
      onError?.(formattedError)

      return null
    }
  }, [
    context, 
    maxRetries, 
    onError, 
    onSuccess, 
    retryDelay, 
    showErrorToast, 
    showSuccessToast, 
    successMessage
  ])

  const retry = useCallback(async (operation: () => Promise<T>): Promise<T | null> => {
    if (retryCount >= maxRetries) {
      const maxRetriesError = new AppError(
        'Maximum retry attempts reached',
        ErrorCodes.NETWORK_ERROR,
        { retryCount, maxRetries }
      )
      
      const formattedError = formatErrorForUser(maxRetriesError, context)
      setState(prev => ({ ...prev, error: formattedError }))
      
      if (showErrorToast) {
        showError('Unable to complete the operation after multiple attempts.')
      }
      
      return null
    }

    // Increment retry count
    setRetryCount(prev => prev + 1)

    // Wait before retrying
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount))
    }

    return execute(operation)
  }, [retryCount, maxRetries, retryDelay, execute, context, showErrorToast])

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    })
    setRetryCount(0)
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    execute,
    retry,
    reset,
    clearError,
    retryCount,
    canRetry: retryCount < maxRetries && state.error?.isRecoverable
  }
}

// Specialized hook for form submissions
export function useFormSubmission<T = any>(options: AsyncOperationOptions = {}) {
  return useAsyncOperation<T>({
    ...options,
    showSuccessToast: true,
    showErrorToast: true,
    context: {
      action: 'save',
      ...options.context
    }
  })
}

// Specialized hook for data fetching
export function useDataFetch<T = any>(options: AsyncOperationOptions = {}) {
  return useAsyncOperation<T>({
    ...options,
    showSuccessToast: false,
    showErrorToast: true,
    context: {
      action: 'load',
      ...options.context
    }
  })
}

// Specialized hook for file uploads
export function useFileUploadOperation(options: AsyncOperationOptions = {}) {
  return useAsyncOperation({
    ...options,
    showSuccessToast: true,
    showErrorToast: true,
    maxRetries: 2,
    retryDelay: 2000,
    context: {
      action: 'upload',
      resourceType: 'file',
      ...options.context
    }
  })
}

// Hook for operations with optimistic updates
export function useOptimisticOperation<T = any>(options: AsyncOperationOptions = {}) {
  const [optimisticData, setOptimisticData] = useState<T | null>(null)
  const [originalData, setOriginalData] = useState<T | null>(null)
  
  const asyncOp = useAsyncOperation<T>({
    ...options,
    onError: (error) => {
      // Revert optimistic update on error
      if (originalData !== null) {
        setOptimisticData(originalData)
      }
      options.onError?.(error)
    },
    onSuccess: (data) => {
      // Clear original data on success
      setOriginalData(null)
      options.onSuccess?.(data)
    }
  })

  const executeWithOptimistic = useCallback(async (
    operation: () => Promise<T>,
    optimisticValue: T,
    operationOptions?: Parameters<typeof asyncOp.execute>[1]
  ): Promise<T | null> => {
    // Store original data for potential revert
    setOriginalData(asyncOp.data)
    
    // Apply optimistic update
    setOptimisticData(optimisticValue)

    return asyncOp.execute(operation, operationOptions)
  }, [asyncOp.data, asyncOp.execute])

  return {
    ...asyncOp,
    data: optimisticData || asyncOp.data,
    executeWithOptimistic
  }
}