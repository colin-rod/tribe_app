/**
 * Enhanced Loading State Utilities
 * Helpers to add loading states to existing components and operations
 */

import { useState, useEffect, useCallback } from 'react'
import { AppError, ErrorCodes, createError } from './error-handler'
import { formatErrorForUser, FormattedError } from './error-messages'
import { showError, showSuccess, toastService } from './toast-service'
import { createComponentLogger } from './logger'

const logger = createComponentLogger('EnhancedLoading')

// Global loading state manager for coordinated loading states
class LoadingStateManager {
  private static instance: LoadingStateManager
  private loadingStates = new Map<string, boolean>()
  private listeners = new Set<(states: Record<string, boolean>) => void>()

  static getInstance(): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager()
    }
    return LoadingStateManager.instance
  }

  setLoading(key: string, loading: boolean) {
    this.loadingStates.set(key, loading)
    this.notifyListeners()
  }

  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false
  }

  isAnyLoading(): boolean {
    return Array.from(this.loadingStates.values()).some(loading => loading)
  }

  getLoadingStates(): Record<string, boolean> {
    return Object.fromEntries(this.loadingStates)
  }

  subscribe(listener: (states: Record<string, boolean>) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    const states = this.getLoadingStates()
    this.listeners.forEach(listener => listener(states))
  }

  clear() {
    this.loadingStates.clear()
    this.notifyListeners()
  }
}

export const loadingStateManager = LoadingStateManager.getInstance()

// Hook to subscribe to global loading states
export function useGlobalLoadingStates() {
  const [states, setStates] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const unsubscribe = loadingStateManager.subscribe(setStates)
    setStates(loadingStateManager.getLoadingStates())
    return unsubscribe
  }, [])

  return {
    states,
    isAnyLoading: loadingStateManager.isAnyLoading(),
    isLoading: (key: string) => loadingStateManager.isLoading(key)
  }
}

// Enhanced loading wrapper for any async operation
export async function withLoadingState<T>(
  operation: () => Promise<T>,
  options: {
    key?: string
    showToast?: boolean
    loadingMessage?: string
    successMessage?: string
    onError?: (error: FormattedError) => void
    retryCount?: number
    retryDelay?: number
  } = {}
): Promise<T | null> {
  const {
    key = `operation_${Date.now()}`,
    showToast = false,
    loadingMessage,
    successMessage,
    onError,
    retryCount = 0,
    retryDelay = 1000
  } = options

  let toastId: string | null = null
  
  try {
    // Set loading state
    loadingStateManager.setLoading(key, true)
    
    if (showToast && loadingMessage) {
      toastId = toastService.loading(loadingMessage)
    }

    // Execute operation with retry logic
    let lastError: AppError | null = null
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await operation()
        
        // Success - clear loading and show success message
        if (toastId) {
          toastService.dismiss(toastId)
        }
        
        if (showToast && successMessage) {
          showSuccess(successMessage)
        }

        return result
      } catch (error) {
        lastError = error instanceof AppError 
          ? error 
          : new AppError(
              error instanceof Error ? error.message : 'Operation failed',
              ErrorCodes.UNKNOWN_ERROR
            )

        if (attempt < retryCount) {
          logger.info(`Retrying operation (attempt ${attempt + 1}/${retryCount})`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    // All attempts failed
    if (lastError) {
      throw lastError
    }

    return null
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : 'Operation failed',
          ErrorCodes.UNKNOWN_ERROR
        )

    // Clear loading toast
    if (toastId) {
      toastService.dismiss(toastId)
    }

    // Format error for user display
    const formattedError = formatErrorForUser(appError)
    
    // Show error toast
    if (showToast) {
      showError(formattedError.message)
    }

    // Call error callback
    if (onError) {
      onError(formattedError)
    }

    logger.error('Operation failed', appError)
    return null
  } finally {
    // Clear loading state
    loadingStateManager.setLoading(key, false)
  }
}

// Wrapper for React components to add loading states
export function withLoadingWrapper<P extends object>(
  Component: React.ComponentType<P>,
  loadingKey?: string
) {
  return function LoadingWrappedComponent(props: P) {
    const { isLoading } = useGlobalLoadingStates()
    const key = loadingKey || Component.displayName || Component.name || 'component'
    const componentIsLoading = isLoading(key)

    if (componentIsLoading) {
      return (
        <div className="animate-pulse">
          <div className="bg-gray-200 rounded h-32 w-full"></div>
        </div>
      )
    }

    return <Component {...props} />
  }
}

// Batch loading operations
export async function batchWithLoading<T extends Record<string, () => Promise<any>>>(
  operations: T,
  options: {
    showProgress?: boolean
    progressMessage?: (completed: number, total: number) => string
    onComplete?: (results: { [K in keyof T]: Awaited<ReturnType<T[K]>> }) => void
    onError?: (errors: { key: string; error: FormattedError }[]) => void
  } = {}
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> | null }> {
  const {
    showProgress = false,
    progressMessage = (completed, total) => `Processing ${completed}/${total}...`,
    onComplete,
    onError
  } = options

  const keys = Object.keys(operations) as (keyof T)[]
  const results = {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> | null }
  const errors: { key: string; error: FormattedError }[] = []

  let progressToastId: string | null = null
  
  if (showProgress) {
    progressToastId = toastService.loading(progressMessage(0, keys.length))
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const operation = operations[key]

    try {
      // Update progress
      if (progressToastId && showProgress) {
        toastService.dismiss(progressToastId)
        progressToastId = toastService.loading(progressMessage(i, keys.length))
      }

      // Execute operation
      const result = await withLoadingState(operation, {
        key: String(key),
        showToast: false // Handled by progress toast
      })

      results[key] = result
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : new AppError('Operation failed', ErrorCodes.UNKNOWN_ERROR)
      
      const formattedError = formatErrorForUser(appError)
      errors.push({ key: String(key), error: formattedError })
      results[key] = null
    }
  }

  // Complete progress
  if (progressToastId) {
    toastService.dismiss(progressToastId)
    
    if (errors.length === 0) {
      showSuccess(`All ${keys.length} operations completed successfully!`)
    } else {
      showError(`${errors.length} operations failed out of ${keys.length}`)
    }
  }

  // Call callbacks
  if (errors.length > 0 && onError) {
    onError(errors)
  }

  if (onComplete) {
    onComplete(results as any)
  }

  return results
}

// Progressive loading for lists/grids
export function useProgressiveLoading<T>(
  items: T[],
  options: {
    batchSize?: number
    delay?: number
    onBatchLoaded?: (batch: T[], totalLoaded: number) => void
  } = {}
) {
  const { batchSize = 10, delay = 100, onBatchLoaded } = options
  const [loadedItems, setLoadedItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentBatch, setCurrentBatch] = useState(0)

  const loadNextBatch = useCallback(async () => {
    if (currentBatch * batchSize >= items.length) {
      return
    }

    setIsLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    
    const nextBatch = items.slice(
      currentBatch * batchSize,
      (currentBatch + 1) * batchSize
    )
    
    setLoadedItems(prev => [...prev, ...nextBatch])
    setCurrentBatch(prev => prev + 1)
    
    if (onBatchLoaded) {
      onBatchLoaded(nextBatch, (currentBatch + 1) * batchSize)
    }
    
    setIsLoading(false)
  }, [items, currentBatch, batchSize, delay, onBatchLoaded])

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    
    while (currentBatch * batchSize < items.length) {
      await loadNextBatch()
    }
    
    setIsLoading(false)
  }, [currentBatch, batchSize, items.length, loadNextBatch])

  const reset = useCallback(() => {
    setLoadedItems([])
    setCurrentBatch(0)
    setIsLoading(false)
  }, [])

  // Auto-load first batch
  useEffect(() => {
    if (items.length > 0 && loadedItems.length === 0) {
      loadNextBatch()
    }
  }, [items.length, loadedItems.length, loadNextBatch])

  return {
    loadedItems,
    isLoading,
    hasMore: currentBatch * batchSize < items.length,
    loadNextBatch,
    loadAll,
    reset,
    progress: Math.min(loadedItems.length / items.length, 1)
  }
}