/**
 * Validation Error Helpers
 * Standardized validation error handling for forms and user input
 */

import { AppError, ErrorCodes } from '@/lib/error-handler'

export interface ValidationRule<T = any> {
  test: (value: T) => boolean
  message: string
  code?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  firstError?: string
}

export interface FieldValidationResult {
  [fieldName: string]: ValidationResult
}

/**
 * Validates a single value against multiple rules
 */
export function validateField<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  const errors: string[] = []
  
  for (const rule of rules) {
    if (!rule.test(value)) {
      errors.push(rule.message)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    firstError: errors[0]
  }
}

/**
 * Validates multiple fields with their respective rules
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  fieldRules: { [K in keyof T]?: ValidationRule<T[K]>[] }
): FieldValidationResult {
  const result: FieldValidationResult = {}

  for (const [fieldName, rules] of Object.entries(fieldRules)) {
    if (rules && Array.isArray(rules)) {
      const fieldValue = data[fieldName]
      result[fieldName] = validateField(fieldValue, rules)
    }
  }

  return result
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  // String validations
  required: (message = 'This field is required'): ValidationRule<string> => ({
    test: (value) => Boolean(value && value.trim().length > 0),
    message
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    test: (value) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters long`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    test: (value) => !value || value.length <= max,
    message: message || `Must be no more than ${max} characters long`
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    test: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),

  // Number validations
  min: (minValue: number, message?: string): ValidationRule<number> => ({
    test: (value) => value == null || value >= minValue,
    message: message || `Must be at least ${minValue}`
  }),

  max: (maxValue: number, message?: string): ValidationRule<number> => ({
    test: (value) => value == null || value <= maxValue,
    message: message || `Must be no more than ${maxValue}`
  }),

  // Password validations
  strongPassword: (message = 'Password must contain at least 8 characters with uppercase, lowercase, and number'): ValidationRule<string> => ({
    test: (value) => !value || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(value),
    message
  }),

  // File validations
  fileSize: (maxSizeInMB: number, message?: string): ValidationRule<File> => ({
    test: (file) => !file || file.size <= maxSizeInMB * 1024 * 1024,
    message: message || `File must be smaller than ${maxSizeInMB}MB`
  }),

  fileType: (allowedTypes: string[], message?: string): ValidationRule<File> => ({
    test: (file) => !file || allowedTypes.some(type => file.type.startsWith(type)),
    message: message || `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
  }),

  // Custom pattern
  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    test: (value) => !value || regex.test(value),
    message
  }),

  // Confirmation field (like password confirmation)
  matches: (targetValue: string, message: string): ValidationRule<string> => ({
    test: (value) => value === targetValue,
    message
  })
}

/**
 * Throws a validation error with details about failed fields
 */
export function throwValidationError(
  validationResult: FieldValidationResult,
  message = 'Validation failed'
): never {
  const errors: Record<string, string[]> = {}
  let firstError = ''

  for (const [fieldName, result] of Object.entries(validationResult)) {
    if (!result.isValid) {
      errors[fieldName] = result.errors
      if (!firstError && result.firstError) {
        firstError = result.firstError
      }
    }
  }

  throw new AppError(
    firstError || message,
    ErrorCodes.VALIDATION_ERROR,
    { fieldErrors: errors }
  )
}

/**
 * Checks if validation result has any errors
 */
export function hasValidationErrors(validationResult: FieldValidationResult): boolean {
  return Object.values(validationResult).some(result => !result.isValid)
}

/**
 * Gets all error messages from validation result
 */
export function getValidationErrors(validationResult: FieldValidationResult): string[] {
  const errors: string[] = []
  
  for (const result of Object.values(validationResult)) {
    if (!result.isValid) {
      errors.push(...result.errors)
    }
  }

  return errors
}

/**
 * Gets the first validation error message
 */
export function getFirstValidationError(validationResult: FieldValidationResult): string | null {
  for (const result of Object.values(validationResult)) {
    if (!result.isValid && result.firstError) {
      return result.firstError
    }
  }
  return null
}

/**
 * Pre-defined validation schemas for common forms
 */
export const ValidationSchemas = {
  // User profile validation
  profile: {
    firstName: [ValidationRules.required('First name is required'), ValidationRules.maxLength(50)],
    lastName: [ValidationRules.required('Last name is required'), ValidationRules.maxLength(50)],
    email: [ValidationRules.required('Email is required'), ValidationRules.email()],
    bio: [ValidationRules.maxLength(500, 'Bio must be 500 characters or less')]
  },

  // Branch creation validation
  branch: {
    name: [ValidationRules.required('Branch name is required'), ValidationRules.maxLength(100)],
    description: [ValidationRules.maxLength(500, 'Description must be 500 characters or less')]
  },

  // Tree creation validation
  tree: {
    name: [ValidationRules.required('Tree name is required'), ValidationRules.maxLength(100)],
    description: [ValidationRules.maxLength(500, 'Description must be 500 characters or less')]
  },

  // Password change validation
  passwordChange: (newPassword: string) => ({
    currentPassword: [ValidationRules.required('Current password is required')],
    newPassword: [ValidationRules.required('New password is required'), ValidationRules.strongPassword()],
    confirmPassword: [
      ValidationRules.required('Please confirm your password'),
      ValidationRules.matches(newPassword, 'Passwords do not match')
    ]
  }),

  // File upload validation
  avatar: {
    file: [
      ValidationRules.fileSize(5, 'Avatar must be smaller than 5MB'),
      ValidationRules.fileType(['image/'], 'Please select an image file')
    ]
  }
}

/**
 * Helper to validate data using a predefined schema
 */
export function validateWithSchema<T extends Record<string, any>>(
  data: T,
  schemaName: keyof typeof ValidationSchemas | { [K in keyof T]?: ValidationRule<T[K]>[] }
): FieldValidationResult {
  const rules = typeof schemaName === 'string' 
    ? ValidationSchemas[schemaName] 
    : schemaName

  return validateForm(data, rules as any)
}