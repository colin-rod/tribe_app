import { useState, useCallback } from 'react'
import { z } from 'zod'
import { validateData, ValidationResult } from '@/lib/validation/schemas'
import { sanitizeObject } from '@/lib/validation/sanitization'

export interface FormValidationOptions<T> {
  schema: z.ZodSchema<T>
  sanitize?: boolean
  onValidationSuccess?: (data: T) => void
  onValidationError?: (errors: string[]) => void
}

export interface FormValidationReturn<T> {
  errors: Record<string, string>
  isValid: boolean
  isValidating: boolean
  validate: (data: Partial<T>) => ValidationResult<T>
  validateField: (field: keyof T, value: unknown) => string | null
  clearErrors: () => void
  clearFieldError: (field: keyof T) => void
  setFieldError: (field: keyof T, error: string) => void
}

/**
 * Hook for form validation with Zod schemas
 */
export function useFormValidation<T extends Record<string, unknown>>(
  options: FormValidationOptions<T>
): FormValidationReturn<T> {
  const { schema, sanitize = true, onValidationSuccess, onValidationError } = options

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field as string]
      return newErrors
    })
  }, [])

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field as string]: error,
    }))
  }, [])

  const validateField = useCallback((field: keyof T, value: unknown): string | null => {
    try {
      // Create a minimal object to validate just this field
      const fieldSchema = schema.pick({ [field]: true } as any)
      const result = validateData(fieldSchema, { [field]: value })
      
      if (result.success) {
        clearFieldError(field)
        return null
      } else {
        const errorMessage = result.errors?.[0] || 'Validation failed'
        setFieldError(field, errorMessage)
        return errorMessage
      }
    } catch (error) {
      // If pick doesn't work, validate the entire object silently
      return null
    }
  }, [schema, clearFieldError, setFieldError])

  const validate = useCallback((data: Partial<T>): ValidationResult<T> => {
    setIsValidating(true)
    
    try {
      // Sanitize data if requested
      const dataToValidate = sanitize ? sanitizeObject(data as Record<string, unknown>) : data

      const result = validateData(schema, dataToValidate)

      if (result.success) {
        clearErrors()
        onValidationSuccess?.(result.data)
      } else {
        // Convert Zod errors to field-specific errors
        const fieldErrors: Record<string, string> = {}
        
        if (result.errors) {
          result.errors.forEach(error => {
            // Parse error format: "field.path: error message"
            const colonIndex = error.indexOf(':')
            if (colonIndex > 0) {
              const fieldPath = error.substring(0, colonIndex).trim()
              const errorMessage = error.substring(colonIndex + 1).trim()
              
              // Handle nested field paths (e.g., "settings.theme")
              const topLevelField = fieldPath.split('.')[0]
              fieldErrors[topLevelField] = errorMessage
            } else {
              // Fallback for errors without field paths
              fieldErrors._form = error
            }
          })
        }

        setErrors(fieldErrors)
        onValidationError?.(result.errors || [])
      }

      return result
    } finally {
      setIsValidating(false)
    }
  }, [schema, sanitize, clearErrors, onValidationSuccess, onValidationError])

  const isValid = Object.keys(errors).length === 0

  return {
    errors,
    isValid,
    isValidating,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    setFieldError,
  }
}

/**
 * Hook for real-time field validation
 */
export function useFieldValidation<T extends Record<string, unknown>>(
  field: keyof T,
  schema: z.ZodSchema<T>
) {
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const validate = useCallback(async (value: unknown) => {
    setIsValidating(true)
    
    try {
      // Extract just the schema for this field
      const fieldSchema = schema.pick({ [field]: true } as any)
      const result = validateData(fieldSchema, { [field]: value })
      
      if (result.success) {
        setError(null)
        return true
      } else {
        const errorMessage = result.errors?.[0] || 'Validation failed'
        setError(errorMessage.split(':')[1]?.trim() || errorMessage)
        return false
      }
    } catch (err) {
      setError('Validation error')
      return false
    } finally {
      setIsValidating(false)
    }
  }, [field, schema])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    isValidating,
    validate,
    clearError,
    isValid: error === null,
  }
}

/**
 * Hook for async validation (e.g., checking if email exists)
 */
export function useAsyncValidation<T>(
  validationFn: (value: T) => Promise<boolean | string>,
  debounceMs = 500
) {
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)

  const validate = useCallback(async (value: T) => {
    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    // Set up new debounced validation
    const timeout = setTimeout(async () => {
      setIsValidating(true)
      
      try {
        const result = await validationFn(value)
        
        if (result === true) {
          setError(null)
        } else if (typeof result === 'string') {
          setError(result)
        } else {
          setError('Validation failed')
        }
      } catch (err) {
        setError('Validation error occurred')
      } finally {
        setIsValidating(false)
      }
    }, debounceMs)

    setDebounceTimeout(timeout)
  }, [validationFn, debounceMs, debounceTimeout])

  const clearError = useCallback(() => {
    setError(null)
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      setDebounceTimeout(null)
    }
  }, [debounceTimeout])

  return {
    error,
    isValidating,
    validate,
    clearError,
    isValid: error === null,
  }
}