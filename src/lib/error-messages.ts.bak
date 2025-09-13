/**
 * Enhanced Error Messages and User-Friendly Error Handling
 */

import { AppError, ErrorCodes } from './error-handler'

// Enhanced error message mapping with context-aware messages
export const getContextualErrorMessage = (
  error: AppError, 
  context?: {
    action?: string
    resourceType?: string
    userId?: string
    feature?: string
  }
): string => {
  const { action, resourceType = 'item', feature } = context || {}

  switch (error.code) {
    case ErrorCodes.NETWORK_ERROR:
      if (action === 'upload') {
        return 'Upload failed due to connection issues. Please check your internet and try again.'
      }
      if (action === 'save') {
        return 'Could not save changes due to connection issues. Please try again.'
      }
      return 'Connection problem. Please check your internet and try again.'

    case ErrorCodes.UNAUTHORIZED:
      if (feature) {
        return `Please sign in to access ${feature}.`
      }
      return 'Your session has expired. Please sign in again.'

    case ErrorCodes.FORBIDDEN:
      if (action) {
        return `You don't have permission to ${action} this ${resourceType}.`
      }
      return 'You don\'t have permission to perform this action.'

    case ErrorCodes.NOT_FOUND:
      return `The ${resourceType} you're looking for could not be found. It may have been deleted or moved.`

    case ErrorCodes.VALIDATION_ERROR:
      if (action === 'create') {
        return `Please check your input and try creating the ${resourceType} again.`
      }
      if (action === 'update') {
        return `Please check your changes and try updating the ${resourceType} again.`
      }
      return 'Please check your input and try again.'

    case ErrorCodes.FILE_TOO_LARGE:
      return 'The file you selected is too large. Please choose a file smaller than 10MB.'

    case ErrorCodes.INVALID_FILE_TYPE:
      return 'This file type is not supported. Please choose a JPEG, PNG, GIF, or WebP image.'

    case ErrorCodes.FILE_UPLOAD_FAILED:
      return 'File upload failed. Please try again or choose a different file.'

    case ErrorCodes.DUPLICATE_ENTRY:
      if (resourceType === 'email') {
        return 'This email is already registered. Please try a different email or sign in instead.'
      }
      if (resourceType === 'invitation') {
        return 'An invitation has already been sent to this email address.'
      }
      return `A ${resourceType} with these details already exists.`

    case ErrorCodes.DATABASE_ERROR:
      if (action === 'save') {
        return 'Could not save your changes. Please try again in a moment.'
      }
      if (action === 'load') {
        return 'Could not load the requested data. Please try again.'
      }
      return 'A database error occurred. Please try again.'

    case ErrorCodes.SERVICE_UNAVAILABLE:
      if (feature === 'ai') {
        return 'AI features are temporarily unavailable. Please try again later.'
      }
      return 'This service is temporarily unavailable. Please try again in a few minutes.'

    case ErrorCodes.API_RATE_LIMIT:
      return 'Too many requests. Please wait a moment before trying again.'

    case ErrorCodes.SPEECH_RECOGNITION_ERROR:
      return 'Voice recognition failed. Please try speaking again or check your microphone.'

    case ErrorCodes.AI_SERVICE_ERROR:
      return 'AI processing is temporarily unavailable. Your content was saved without AI enhancement.'

    case ErrorCodes.TOKEN_EXPIRED:
      return 'Your session has expired. Please sign in again to continue.'

    case ErrorCodes.INTERNAL_SERVER_ERROR:
      return 'Something went wrong on our end. Please try again, and contact support if the problem persists.'

    default:
      // Fallback with contextual information
      if (action && resourceType) {
        return `Failed to ${action} ${resourceType}. Please try again.`
      }
      return error.message || 'Something unexpected happened. Please try again.'
  }
}

// Error message categories for different UI contexts
export const getErrorSeverity = (error: AppError): 'low' | 'medium' | 'high' | 'critical' => {
  switch (error.code) {
    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.FILE_TOO_LARGE:
    case ErrorCodes.INVALID_FILE_TYPE:
      return 'low'

    case ErrorCodes.NOT_FOUND:
    case ErrorCodes.DUPLICATE_ENTRY:
    case ErrorCodes.SPEECH_RECOGNITION_ERROR:
      return 'medium'

    case ErrorCodes.NETWORK_ERROR:
    case ErrorCodes.DATABASE_ERROR:
    case ErrorCodes.SERVICE_UNAVAILABLE:
    case ErrorCodes.AI_SERVICE_ERROR:
      return 'high'

    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.FORBIDDEN:
    case ErrorCodes.TOKEN_EXPIRED:
    case ErrorCodes.INTERNAL_SERVER_ERROR:
      return 'critical'

    default:
      return 'medium'
  }
}

// Suggested actions based on error type
export const getErrorActions = (error: AppError): Array<{
  label: string
  action: 'retry' | 'reload' | 'login' | 'contact' | 'dismiss'
  primary?: boolean
}> => {
  switch (error.code) {
    case ErrorCodes.NETWORK_ERROR:
      return [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Reload Page', action: 'reload' }
      ]

    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.TOKEN_EXPIRED:
      return [
        { label: 'Sign In', action: 'login', primary: true },
        { label: 'Dismiss', action: 'dismiss' }
      ]

    case ErrorCodes.FORBIDDEN:
      return [
        { label: 'Contact Support', action: 'contact' },
        { label: 'Dismiss', action: 'dismiss', primary: true }
      ]

    case ErrorCodes.NOT_FOUND:
      return [
        { label: 'Go Back', action: 'dismiss', primary: true },
        { label: 'Reload', action: 'reload' }
      ]

    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.FILE_TOO_LARGE:
    case ErrorCodes.INVALID_FILE_TYPE:
      return [
        { label: 'Try Again', action: 'dismiss', primary: true }
      ]

    case ErrorCodes.SERVICE_UNAVAILABLE:
    case ErrorCodes.API_RATE_LIMIT:
      return [
        { label: 'Try Again Later', action: 'dismiss', primary: true },
        { label: 'Contact Support', action: 'contact' }
      ]

    case ErrorCodes.INTERNAL_SERVER_ERROR:
      return [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Contact Support', action: 'contact' },
        { label: 'Reload Page', action: 'reload' }
      ]

    default:
      return [
        { label: 'Try Again', action: 'retry', primary: true },
        { label: 'Dismiss', action: 'dismiss' }
      ]
  }
}

// Check if error is recoverable (user can retry)
export const isRecoverableError = (error: AppError): boolean => {
  const recoverableErrors = [
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.API_RATE_LIMIT,
    ErrorCodes.FILE_UPLOAD_FAILED,
    ErrorCodes.SPEECH_RECOGNITION_ERROR,
    ErrorCodes.AI_SERVICE_ERROR
  ]
  
  return recoverableErrors.includes(error.code as ErrorCodes)
}

// Generate error ID for tracking and support
export const generateErrorId = (error: AppError): string => {
  const timestamp = error.timestamp.getTime().toString(36)
  const codeHash = error.code.slice(0, 4)
  const randomSuffix = Math.random().toString(36).slice(2, 6)
  return `${codeHash}-${timestamp}-${randomSuffix}`.toUpperCase()
}

// Format error for user display with all context
export interface FormattedError {
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  actions: Array<{
    label: string
    action: 'retry' | 'reload' | 'login' | 'contact' | 'dismiss'
    primary?: boolean
  }>
  isRecoverable: boolean
  errorId: string
  timestamp: Date
}

export const formatErrorForUser = (
  error: AppError,
  context?: {
    action?: string
    resourceType?: string
    userId?: string
    feature?: string
  }
): FormattedError => {
  return {
    message: getContextualErrorMessage(error, context),
    severity: getErrorSeverity(error),
    actions: getErrorActions(error),
    isRecoverable: isRecoverableError(error),
    errorId: generateErrorId(error),
    timestamp: error.timestamp
  }
}