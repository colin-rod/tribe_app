/**
 * Form State Management
 * Reusable form state with validation, submission, and error handling
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { validateForm, ValidationRule, FieldValidationResult, hasValidationErrors } from '@/lib/errors'

export interface FormFieldConfig<T = any> {
  rules?: ValidationRule<T>[]
  required?: boolean
  initialValue?: T
}

export interface FormConfig<T extends Record<string, any>> {
  fields: { [K in keyof T]: FormFieldConfig<T[K]> }
  onSubmit?: (data: T) => Promise<void>
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export interface FormState<T extends Record<string, any>> {
  data: T
  errors: FieldValidationResult
  touched: Record<keyof T, boolean>
  submitting: boolean
  submitted: boolean
  isDirty: boolean
  isValid: boolean
}

export interface FormActions<T extends Record<string, any>> {
  setValue: (field: keyof T, value: T[keyof T]) => void
  setValues: (values: Partial<T>) => void
  setError: (field: keyof T, error: string) => void
  setFieldTouched: (field: keyof T, touched?: boolean) => void
  setTouched: (touched: Record<keyof T, boolean>) => void
  validate: (field?: keyof T) => boolean
  validateAll: () => boolean
  submit: () => Promise<void>
  reset: (data?: Partial<T>) => void
  resetField: (field: keyof T) => void
}

/**
 * Creates a form store with validation and submission handling
 */
export function createFormStore<T extends Record<string, any>>(
  config: FormConfig<T>
): () => FormState<T> & FormActions<T> {
  const {
    fields,
    onSubmit,
    validateOnChange = false,
    validateOnBlur = true
  } = config

  // Create initial data from field configs
  const initialData = Object.keys(fields).reduce((acc, key) => {
    const fieldConfig = fields[key as keyof T]
    acc[key as keyof T] = fieldConfig.initialValue as T[keyof T]
    return acc
  }, {} as T)

  const initialTouched = Object.keys(fields).reduce((acc, key) => {
    acc[key as keyof T] = false
    return acc
  }, {} as Record<keyof T, boolean>)

  return function useForm(): FormState<T> & FormActions<T> {
    const [state, setState] = useState<FormState<T>>({
      data: initialData,
      errors: {},
      touched: initialTouched,
      submitting: false,
      submitted: false,
      isDirty: false,
      isValid: true
    })

    const mountedRef = useRef(true)
    const initialDataRef = useRef(initialData)

    // Helper to get field rules
    const getFieldRules = (field: keyof T): ValidationRule<T[keyof T]>[] => {
      const fieldConfig = fields[field]
      const rules = fieldConfig.rules || []
      
      // Add required rule if specified
      if (fieldConfig.required) {
        rules.unshift({
          test: (value) => value !== null && value !== undefined && value !== '',
          message: 'This field is required'
        })
      }
      
      return rules
    }

    // Validate single field
    const validateField = useCallback((field: keyof T): boolean => {
      const value = state.data[field]
      const rules = getFieldRules(field)
      
      if (rules.length === 0) return true

      const fieldRules = { [field]: rules }
      const fieldData = { [field]: value }
      const result = validateForm(fieldData as any, fieldRules as any)

      setState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          ...result
        }
      }))

      return result[field as string]?.isValid !== false
    }, [state.data, fields])

    // Validate all fields
    const validateAll = useCallback((): boolean => {
      const fieldRules = Object.keys(fields).reduce((acc, key) => {
        const fieldKey = key as keyof T
        acc[fieldKey] = getFieldRules(fieldKey)
        return acc
      }, {} as { [K in keyof T]: ValidationRule<T[K]>[] })

      const result = validateForm(state.data, fieldRules)
      const isValid = !hasValidationErrors(result)

      setState(prev => ({
        ...prev,
        errors: result,
        isValid
      }))

      return isValid
    }, [state.data, fields])

    // Actions
    const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
      if (!mountedRef.current) return

      setState(prev => {
        const newData = { ...prev.data, [field]: value }
        const isDirty = JSON.stringify(newData) !== JSON.stringify(initialDataRef.current)

        return {
          ...prev,
          data: newData,
          isDirty
        }
      })

      // Validate on change if enabled
      if (validateOnChange) {
        setTimeout(() => validateField(field), 0)
      }
    }, [validateOnChange, validateField])

    const setValues = useCallback((values: Partial<T>) => {
      if (!mountedRef.current) return

      setState(prev => {
        const newData = { ...prev.data, ...values }
        const isDirty = JSON.stringify(newData) !== JSON.stringify(initialDataRef.current)

        return {
          ...prev,
          data: newData,
          isDirty
        }
      })

      // Validate changed fields if enabled
      if (validateOnChange) {
        setTimeout(() => {
          Object.keys(values).forEach(key => validateField(key as keyof T))
        }, 0)
      }
    }, [validateOnChange, validateField])

    const setError = useCallback((field: keyof T, error: string) => {
      if (!mountedRef.current) return

      setState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: {
            isValid: false,
            errors: [error],
            firstError: error
          }
        }
      }))
    }, [])

    const setFieldTouched = useCallback((field: keyof T, touched = true) => {
      if (!mountedRef.current) return

      setState(prev => ({
        ...prev,
        touched: {
          ...prev.touched,
          [field]: touched
        }
      }))

      // Validate on blur if enabled
      if (touched && validateOnBlur) {
        setTimeout(() => validateField(field), 0)
      }
    }, [validateOnBlur, validateField])

    const setTouched = useCallback((touched: Record<keyof T, boolean>) => {
      if (!mountedRef.current) return

      setState(prev => ({
        ...prev,
        touched
      }))
    }, [])

    const submit = useCallback(async () => {
      if (!mountedRef.current || !onSubmit) return

      setState(prev => ({ ...prev, submitting: true }))

      const isValid = validateAll()
      if (!isValid) {
        setState(prev => ({ 
          ...prev, 
          submitting: false,
          submitted: true,
          touched: Object.keys(fields).reduce((acc, key) => {
            acc[key as keyof T] = true
            return acc
          }, {} as Record<keyof T, boolean>)
        }))
        return
      }

      try {
        await onSubmit(state.data)
        setState(prev => ({
          ...prev,
          submitting: false,
          submitted: true
        }))
      } catch (error: unknown) {
        setState(prev => ({
          ...prev,
          submitting: false,
          submitted: true
        }))
        
        // Handle validation errors from server
        if (error.context?.fieldErrors) {
          const serverErrors = Object.keys(error.context.fieldErrors).reduce((acc, key) => {
            const fieldErrors = error.context.fieldErrors[key]
            acc[key] = {
              isValid: false,
              errors: fieldErrors,
              firstError: fieldErrors[0]
            }
            return acc
          }, {} as FieldValidationResult)

          setState(prev => ({
            ...prev,
            errors: {
              ...prev.errors,
              ...serverErrors
            }
          }))
        }

        throw error
      }
    }, [onSubmit, state.data, validateAll, fields])

    const reset = useCallback((data?: Partial<T>) => {
      if (!mountedRef.current) return

      const resetData = { ...initialData, ...data }
      initialDataRef.current = resetData

      setState({
        data: resetData,
        errors: {},
        touched: initialTouched,
        submitting: false,
        submitted: false,
        isDirty: false,
        isValid: true
      })
    }, [initialData, initialTouched])

    const resetField = useCallback((field: keyof T) => {
      if (!mountedRef.current) return

      const fieldConfig = fields[field]
      const initialValue = fieldConfig.initialValue

      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          [field]: initialValue
        },
        touched: {
          ...prev.touched,
          [field]: false
        },
        errors: {
          ...prev.errors,
          [field]: undefined
        }
      }))
    }, [fields])

    // Cleanup
    useEffect(() => {
      return () => {
        mountedRef.current = false
      }
    }, [])

    return {
      ...state,
      setValue,
      setValues,
      setError,
      setFieldTouched,
      setTouched,
      validate: validateField,
      validateAll,
      submit,
      reset,
      resetField
    }
  }
}