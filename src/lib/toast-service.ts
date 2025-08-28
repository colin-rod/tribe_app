import toast from 'react-hot-toast'
import type { AppError } from './error-handler'
import { getUserFriendlyMessage } from './error-handler'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface ToastOptions {
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

class ToastService {
  private static instance: ToastService

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService()
    }
    return ToastService.instance
  }

  success(message: string, options?: ToastOptions): string {
    return toast.success(message, {
      duration: options?.duration || 4000,
      ...this.getToastOptions(options)
    })
  }

  error(message: string, options?: ToastOptions): string {
    return toast.error(message, {
      duration: options?.duration || 6000, // Longer duration for errors
      ...this.getToastOptions(options)
    })
  }

  warning(message: string, options?: ToastOptions): string {
    return toast(message, {
      icon: '⚠️',
      duration: options?.duration || 5000,
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #F59E0B',
      },
      ...this.getToastOptions(options)
    })
  }

  info(message: string, options?: ToastOptions): string {
    return toast(message, {
      icon: 'ℹ️',
      duration: options?.duration || 4000,
      style: {
        background: '#DBEAFE',
        color: '#1E40AF',
        border: '1px solid #3B82F6',
      },
      ...this.getToastOptions(options)
    })
  }

  loading(message: string): string {
    return toast.loading(message)
  }

  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ): Promise<T> {
    return toast.promise(promise, messages)
  }

  dismiss(toastId?: string): void {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  }

  // Handle AppError instances with user-friendly messages
  handleError(error: AppError, options?: ToastOptions): string {
    const message = getUserFriendlyMessage(error)
    return this.error(message, options)
  }

  // Show success message with optional action
  showSuccess(message: string, action?: { label: string; onClick: () => void }): string {
    if (action) {
      return toast.success(`${message} (Click to ${action.label})`, {
        duration: 6000,
        onClick: action.onClick
      })
    }
    return this.success(message)
  }

  // Show error with retry option
  showErrorWithRetry(
    message: string,
    onRetry: () => void,
    retryLabel = 'Retry'
  ): string {
    return toast.error(`${message} (Click to ${retryLabel})`, {
      duration: 8000,
      onClick: onRetry
    })
  }

  // Optimistic update pattern
  optimisticUpdate<T>(
    promise: Promise<T>,
    optimisticMessage: string,
    successMessage: string,
    errorMessage: string
  ): Promise<T> {
    const successToast = this.success(optimisticMessage)
    
    return promise
      .then((result) => {
        toast.dismiss(successToast)
        this.success(successMessage)
        return result
      })
      .catch((error) => {
        toast.dismiss(successToast)
        this.error(errorMessage)
        throw error
      })
  }

  private getToastOptions(_options?: ToastOptions) {
    return {}
  }
}

// Export singleton instance and convenience functions
export const toastService = ToastService.getInstance()

// Convenience functions for common patterns
export const showSuccess = (message: string, options?: ToastOptions) => 
  toastService.success(message, options)

export const showError = (message: string, options?: ToastOptions) => 
  toastService.error(message, options)

export const showWarning = (message: string, options?: ToastOptions) => 
  toastService.warning(message, options)

export const showInfo = (message: string, options?: ToastOptions) => 
  toastService.info(message, options)

export const showLoading = (message: string) => 
  toastService.loading(message)

export const handleErrorToast = (error: AppError, options?: ToastOptions) => 
  toastService.handleError(error, options)

export const showSuccessWithAction = (
  message: string, 
  action: { label: string; onClick: () => void }
) => toastService.showSuccess(message, action)

export const showErrorWithRetry = (
  message: string, 
  onRetry: () => void, 
  retryLabel?: string
) => toastService.showErrorWithRetry(message, onRetry, retryLabel)

// Hook for loading states with toast
export const useToastPromise = () => {
  return <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => toastService.promise(promise, messages)
}