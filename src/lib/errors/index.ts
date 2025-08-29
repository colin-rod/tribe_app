/**
 * Unified Error Handling System
 * Central export point for all error handling utilities
 */

// Core error handling
export {
  AppError,
  ErrorCodes,
  errorHandler,
  handleAsyncError,
  handleError,
  createError,
  getUserFriendlyMessage
} from '@/lib/error-handler'

// Supabase error handling
export {
  mapSupabaseError,
  withSupabaseErrorHandling
} from './supabase-error-mapper'

// Async operation wrappers
export {
  withAsyncErrorHandling,
  createAsyncOperation,
  withBatchErrorHandling,
  AsyncUtils,
  type AsyncOperationOptions,
  type AsyncOperationResult,
  type AsyncOperationState
} from './async-error-wrapper'

// Validation helpers
export {
  validateField,
  validateForm,
  ValidationRules,
  ValidationSchemas,
  validateWithSchema,
  throwValidationError,
  hasValidationErrors,
  getValidationErrors,
  getFirstValidationError,
  type ValidationRule,
  type ValidationResult,
  type FieldValidationResult
} from './validation-helpers'

// React Error Boundaries
export {
  ErrorBoundary,
  PageErrorFallback,
  SectionErrorFallback,
  ComponentErrorFallback,
  withErrorBoundary,
  useErrorHandler,
  type ErrorFallbackProps
} from '@/components/errors/ErrorBoundary'

// Convenience functions for common patterns
export const ErrorUtils = {
  /**
   * Quick validation with toast on error
   */
  validateAndThrow: (data: Record<string, any>, schemaName: keyof typeof ValidationSchemas) => {
    const result = validateWithSchema(data, schemaName)
    if (hasValidationErrors(result)) {
      throwValidationError(result)
    }
  },

  /**
   * Supabase query with automatic error handling
   */
  supabaseQuery: AsyncUtils.supabaseQuery,

  /**
   * API call with retry and user feedback
   */
  apiCall: AsyncUtils.apiCall,

  /**
   * File upload with progress and error handling
   */
  fileUpload: AsyncUtils.fileUpload
}