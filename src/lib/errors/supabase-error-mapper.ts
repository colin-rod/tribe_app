/**
 * Supabase Error Mapper
 * Maps Supabase-specific errors to standardized AppError codes
 */

import { AppError, ErrorCodes } from '@/lib/error-handler'

interface SupabaseError {
  code?: string
  message: string
  details?: string
  hint?: string
}

/**
 * Maps Supabase error codes to our standardized error codes
 */
export function mapSupabaseError(error: SupabaseError): AppError {
  const { code, message, details, hint } = error

  // Map specific Supabase error codes
  switch (code) {
    // Authentication errors
    case 'invalid_credentials':
    case 'invalid_grant':
    case 'invalid_request':
      return new AppError(
        'Invalid credentials. Please check your email and password.',
        ErrorCodes.UNAUTHORIZED,
        { supabaseCode: code, details, hint }
      )

    case 'signup_disabled':
      return new AppError(
        'Account creation is currently disabled.',
        ErrorCodes.FORBIDDEN,
        { supabaseCode: code, details }
      )

    case 'email_not_confirmed':
      return new AppError(
        'Please check your email and click the confirmation link.',
        ErrorCodes.UNAUTHORIZED,
        { supabaseCode: code, details }
      )

    case 'weak_password':
      return new AppError(
        'Password is too weak. Please choose a stronger password.',
        ErrorCodes.VALIDATION_ERROR,
        { supabaseCode: code, details }
      )

    // Database constraint errors
    case '23505': // unique_violation
      return new AppError(
        'This item already exists.',
        ErrorCodes.DUPLICATE_ENTRY,
        { supabaseCode: code, details }
      )

    case '23503': // foreign_key_violation
      return new AppError(
        'Cannot complete action due to related data.',
        ErrorCodes.VALIDATION_ERROR,
        { supabaseCode: code, details }
      )

    case '23502': // not_null_violation
      return new AppError(
        'Required information is missing.',
        ErrorCodes.VALIDATION_ERROR,
        { supabaseCode: code, details }
      )

    case '42501': // insufficient_privilege
      return new AppError(
        'You don\'t have permission to perform this action.',
        ErrorCodes.FORBIDDEN,
        { supabaseCode: code, details }
      )

    // Row Level Security errors
    case 'PGRST116': // No rows updated/deleted
      return new AppError(
        'No changes were made. You may not have permission to modify this item.',
        ErrorCodes.FORBIDDEN,
        { supabaseCode: code, details }
      )

    case 'PGRST204': // No content
      return new AppError(
        'No data found.',
        ErrorCodes.NOT_FOUND,
        { supabaseCode: code, details }
      )

    // Connection and network errors
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
    case 'ETIMEDOUT':
      return new AppError(
        'Unable to connect to the server. Please check your connection.',
        ErrorCodes.NETWORK_ERROR,
        { supabaseCode: code, details }
      )

    // Storage errors
    case 'storage/object-not-found':
      return new AppError(
        'File not found.',
        ErrorCodes.NOT_FOUND,
        { supabaseCode: code, details }
      )

    case 'storage/unauthorized':
      return new AppError(
        'You don\'t have permission to access this file.',
        ErrorCodes.FORBIDDEN,
        { supabaseCode: code, details }
      )

    case 'storage/retry-limit-exceeded':
      return new AppError(
        'Upload failed after multiple attempts. Please try again.',
        ErrorCodes.SERVICE_UNAVAILABLE,
        { supabaseCode: code, details }
      )

    // Default case - analyze message for patterns
    default:
      return mapByMessagePattern(message, code, { details, hint })
  }
}

/**
 * Maps error messages that don't have specific codes
 */
function mapByMessagePattern(
  message: string, 
  code?: string, 
  context?: { details?: string; hint?: string }
): AppError {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('permission denied') || lowerMessage.includes('access denied')) {
    return new AppError(
      'You don\'t have permission to perform this action.',
      ErrorCodes.FORBIDDEN,
      { originalMessage: message, supabaseCode: code, ...context }
    )
  }

  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    return new AppError(
      'The requested item was not found.',
      ErrorCodes.NOT_FOUND,
      { originalMessage: message, supabaseCode: code, ...context }
    )
  }

  if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
    return new AppError(
      'This item already exists.',
      ErrorCodes.DUPLICATE_ENTRY,
      { originalMessage: message, supabaseCode: code, ...context }
    )
  }

  if (lowerMessage.includes('invalid') || lowerMessage.includes('malformed')) {
    return new AppError(
      'Invalid data provided.',
      ErrorCodes.VALIDATION_ERROR,
      { originalMessage: message, supabaseCode: code, ...context }
    )
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
    return new AppError(
      'Connection timeout. Please try again.',
      ErrorCodes.NETWORK_ERROR,
      { originalMessage: message, supabaseCode: code, ...context }
    )
  }

  // Default to database error for unrecognized Supabase errors
  return new AppError(
    message || 'A database error occurred.',
    ErrorCodes.DATABASE_ERROR,
    { originalMessage: message, supabaseCode: code, ...context }
  )
}

/**
 * Convenience function to handle Supabase operations
 */
export async function withSupabaseErrorHandling<T>(
  operation: () => Promise<{ data: T | null; error: Error | null }>,
  fallbackMessage = 'Operation failed'
): Promise<T> {
  try {
    const { data, error } = await operation()
    
    if (error) {
      throw mapSupabaseError(error)
    }

    if (data === null) {
      throw new AppError(
        'No data returned from operation.',
        ErrorCodes.NOT_FOUND
      )
    }

    return data
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    
    // Handle non-Supabase errors
    throw new AppError(
      fallbackMessage,
      ErrorCodes.UNKNOWN_ERROR,
      { originalError: error }
    )
  }
}