/**
 * Form Components
 * Reusable form field components with validation integration
 */

'use client'

import React from 'react'
import { FormState, FormActions } from './form-store'

interface BaseFieldProps {
  name: string
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  helpText?: string
}

interface FormContextProps<T extends Record<string, any>> {
  form: FormState<T> & FormActions<T>
}

const FormContext = React.createContext<FormContextProps<any> | null>(null)

export function FormProvider<T extends Record<string, any>>({
  form,
  children
}: {
  form: FormState<T> & FormActions<T>
  children: React.ReactNode
}) {
  return (
    <FormContext.Provider value={{ form }}>
      {children}
    </FormContext.Provider>
  )
}

export function useFormContext<T extends Record<string, any>>() {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('Form field components must be used within FormProvider')
  }
  return context as FormContextProps<T>
}

// Text Input Field
export interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel'
  autoComplete?: string
}

export function TextField<T extends Record<string, any>>({
  name,
  label,
  type = 'text',
  placeholder,
  disabled = false,
  required = false,
  className = '',
  helpText,
  autoComplete
}: TextFieldProps) {
  const { form } = useFormContext<T>()
  const fieldName = name as keyof T
  const value = form.data[fieldName] || ''
  const error = form.errors[fieldName]
  const touched = form.touched[fieldName]
  const showError = touched && error && !error.isValid

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled || form.submitting}
        autoComplete={autoComplete}
        onChange={(e) => form.setValue(fieldName, e.target.value as T[keyof T])}
        onBlur={() => form.setFieldTouched(fieldName, true)}
        className={`
          block w-full px-3 py-2 border rounded-md shadow-sm text-sm
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
          ${showError 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }
          ${disabled || form.submitting ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}
        `}
      />

      {showError && (
        <p className="text-sm text-red-600">{error.firstError}</p>
      )}
      
      {helpText && !showError && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

// Textarea Field
export interface TextareaFieldProps extends BaseFieldProps {
  rows?: number
  maxLength?: number
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export function TextareaField<T extends Record<string, any>>({
  name,
  label,
  rows = 3,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  helpText,
  maxLength,
  resize = 'vertical'
}: TextareaFieldProps) {
  const { form } = useFormContext<T>()
  const fieldName = name as keyof T
  const value = form.data[fieldName] || ''
  const error = form.errors[fieldName]
  const touched = form.touched[fieldName]
  const showError = touched && error && !error.isValid

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value}
        placeholder={placeholder}
        disabled={disabled || form.submitting}
        maxLength={maxLength}
        onChange={(e) => form.setValue(fieldName, e.target.value as T[keyof T])}
        onBlur={() => form.setFieldTouched(fieldName, true)}
        className={`
          block w-full px-3 py-2 border rounded-md shadow-sm text-sm
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
          ${showError 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }
          ${disabled || form.submitting ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}
          resize-${resize}
        `}
      />

      {maxLength && (
        <div className="flex justify-between text-sm text-gray-500">
          <span>{showError ? error.firstError : helpText}</span>
          <span>{String(value).length}/{maxLength}</span>
        </div>
      )}

      {!maxLength && showError && (
        <p className="text-sm text-red-600">{error.firstError}</p>
      )}
      
      {!maxLength && helpText && !showError && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

// Select Field
export interface SelectFieldProps extends BaseFieldProps {
  options: Array<{ value: string; label: string }>
  emptyOption?: string
}

export function SelectField<T extends Record<string, any>>({
  name,
  label,
  options,
  emptyOption,
  disabled = false,
  required = false,
  className = '',
  helpText
}: SelectFieldProps) {
  const { form } = useFormContext<T>()
  const fieldName = name as keyof T
  const value = form.data[fieldName] || ''
  const error = form.errors[fieldName]
  const touched = form.touched[fieldName]
  const showError = touched && error && !error.isValid

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={name}
        name={name}
        value={value}
        disabled={disabled || form.submitting}
        onChange={(e) => form.setValue(fieldName, e.target.value as T[keyof T])}
        onBlur={() => form.setFieldTouched(fieldName, true)}
        className={`
          block w-full px-3 py-2 border rounded-md shadow-sm text-sm
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${showError 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }
          ${disabled || form.submitting ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'}
        `}
      >
        {emptyOption && (
          <option value="">{emptyOption}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {showError && (
        <p className="text-sm text-red-600">{error.firstError}</p>
      )}
      
      {helpText && !showError && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

// Submit Button
export interface SubmitButtonProps {
  children: React.ReactNode
  className?: string
  loadingText?: string
  disabled?: boolean
}

export function SubmitButton<T extends Record<string, any>>({
  children,
  className = '',
  loadingText = 'Submitting...',
  disabled = false
}: SubmitButtonProps) {
  const { form } = useFormContext<T>()

  return (
    <button
      type="button"
      onClick={form.submit}
      disabled={disabled || form.submitting || !form.isValid}
      className={`
        px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent 
        rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 
        focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {form.submitting ? loadingText : children}
    </button>
  )
}

// Form Error Summary
export function FormErrors<T extends Record<string, any>>({
  className = ''
}: {
  className?: string
}) {
  const { form } = useFormContext<T>()
  
  const errorMessages = Object.entries(form.errors)
    .filter(([_, error]) => error && !error.isValid)
    .map(([field, error]) => error!.firstError)
    .filter(Boolean)

  if (errorMessages.length === 0 || !form.submitted) return null

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Please fix the following errors:
          </h3>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            {errorMessages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}