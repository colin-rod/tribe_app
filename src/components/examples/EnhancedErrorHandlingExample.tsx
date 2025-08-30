/**
 * Enhanced Error Handling Examples
 * Demonstrates all enhanced error handling and loading state features
 */

'use client'

import React, { useState } from 'react'
import { useAsyncOperation, useFormSubmission, useFileUploadOperation } from '@/hooks/useAsyncOperation'
import { useRetryOperation, useApiRetry } from '@/hooks/useRetryOperation'
import { useFormValidation } from '@/hooks/useFormValidation'
import { LoadingButton, LoadingOverlay, LoadingSkeleton, LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorDisplay, InlineError } from '@/components/ui/ErrorDisplay'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { AppError, ErrorCodes, createError } from '@/lib/error-handler'
import { treeCreateSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

export default function EnhancedErrorHandlingExample() {
  const [formData, setFormData] = useState({ name: '', email: '', description: '' })
  const [simulateErrorType, setSimulateErrorType] = useState<'network' | 'validation' | 'server' | 'none'>('none')

  // Form validation with real-time feedback
  const formValidation = useFormValidation({
    schema: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Please enter a valid email'),
      description: z.string().min(10, 'Description must be at least 10 characters')
    }),
    validateOnChange: true,
    validateOnBlur: true,
    sanitize: true
  })

  // Different async operation types
  const dataFetchOperation = useAsyncOperation({
    showErrorToast: true,
    context: {
      action: 'load',
      resourceType: 'data',
      feature: 'demo'
    }
  })

  const formSubmitOperation = useFormSubmission({
    successMessage: 'Form submitted successfully!',
    context: {
      action: 'save',
      resourceType: 'form data'
    }
  })

  const fileUploadOperation = useFileUploadOperation({
    successMessage: 'File uploaded successfully!',
    onError: (error) => {
      console.log('Upload failed:', error.message)
    }
  })

  // Retry operations
  const retryOperation = useRetryOperation({
    maxRetries: 3,
    initialDelay: 1000,
    onRetryAttempt: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error.message)
    }
  })

  const apiRetry = useApiRetry({
    maxRetries: 2,
    onMaxRetriesReached: (error) => {
      console.log('Max retries reached:', error.message)
    }
  })

  // Simulate different types of errors
  const simulateOperation = async (): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate delay

    switch (simulateErrorType) {
      case 'network':
        throw createError('Connection failed', ErrorCodes.NETWORK_ERROR)
      case 'validation':
        throw createError('Invalid input provided', ErrorCodes.VALIDATION_ERROR)
      case 'server':
        throw createError('Internal server error', ErrorCodes.INTERNAL_SERVER_ERROR)
      default:
        return 'Operation completed successfully!'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = formValidation.validate(formData)
    if (!validation.success) {
      return
    }

    await formSubmitOperation.execute(async () => {
      return await simulateOperation()
    }, {
      loadingMessage: 'Submitting form...',
      successMessage: 'Form submitted successfully!'
    })
  }

  const handleRetryOperation = async () => {
    await retryOperation.executeWithRetry(simulateOperation)
  }

  const handleApiOperation = async () => {
    await apiRetry.executeWithRetry(simulateOperation)
  }

  const handleFetch = async () => {
    await dataFetchOperation.execute(simulateOperation, {
      loadingMessage: 'Loading data...'
    })
  }

  const handleFileUpload = async () => {
    await fileUploadOperation.execute(async () => {
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 3000))
      if (simulateErrorType === 'network') {
        throw createError('Upload failed', ErrorCodes.FILE_UPLOAD_FAILED)
      }
      return 'File uploaded successfully!'
    }, {
      loadingMessage: 'Uploading file...',
      successMessage: 'Upload complete!'
    })
  }

  return (
    <ErrorBoundary level="section">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Enhanced Error Handling & Loading States
          </h1>
          <p className="text-gray-600">
            Comprehensive demonstration of enhanced UX patterns
          </p>
        </div>

        {/* Error Type Selector */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Simulate Error Type:</h3>
          <div className="flex gap-4">
            {[
              { value: 'none', label: 'Success' },
              { value: 'network', label: 'Network Error' },
              { value: 'validation', label: 'Validation Error' },
              { value: 'server', label: 'Server Error' }
            ].map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  value={option.value}
                  checked={simulateErrorType === option.value}
                  onChange={(e) => setSimulateErrorType(e.target.value as any)}
                  className="mr-2"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Form with Real-time Validation */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-xl font-semibold mb-4">Form with Real-time Validation</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData(prev => ({ ...prev, name: value }))
                  formValidation.handleFieldChange('name', value)
                }}
                onBlur={(e) => formValidation.handleFieldBlur('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formValidation.hasFieldError('name') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your name"
              />
              {formValidation.hasFieldError('name') && (
                <InlineError message={formValidation.getFieldError('name')!} />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData(prev => ({ ...prev, email: value }))
                  formValidation.handleFieldChange('email', value)
                }}
                onBlur={(e) => formValidation.handleFieldBlur('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formValidation.hasFieldError('email') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
              />
              {formValidation.hasFieldError('email') && (
                <InlineError message={formValidation.getFieldError('email')!} />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData(prev => ({ ...prev, description: value }))
                  formValidation.handleFieldChange('description', value)
                }}
                onBlur={(e) => formValidation.handleFieldBlur('description', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formValidation.hasFieldError('description') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter description (min 10 characters)"
                rows={3}
              />
              {formValidation.hasFieldError('description') && (
                <InlineError message={formValidation.getFieldError('description')!} />
              )}
            </div>

            <LoadingButton
              type="submit"
              loading={formSubmitOperation.loading}
              disabled={!formValidation.isValid}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Form
            </LoadingButton>

            {formSubmitOperation.error && (
              <ErrorDisplay
                error={formSubmitOperation.error}
                onRetry={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                onDismiss={formSubmitOperation.clearError}
                compact={true}
              />
            )}
          </form>
        </div>

        {/* Loading State Examples */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-xl font-semibold mb-4">Loading States & Error Handling</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <LoadingButton
                onClick={handleFetch}
                loading={dataFetchOperation.loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Fetch Data
              </LoadingButton>

              <LoadingButton
                onClick={handleRetryOperation}
                loading={retryOperation.isRetrying}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Operation with Retry ({retryOperation.currentAttempt}/{retryOperation.maxRetries || 3})
              </LoadingButton>

              <LoadingButton
                onClick={handleApiOperation}
                loading={apiRetry.isRetrying}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                API Call with Retry
              </LoadingButton>

              <LoadingButton
                onClick={handleFileUpload}
                loading={fileUploadOperation.loading}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                File Upload
              </LoadingButton>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Loading Spinner Variants:</h4>
              <div className="space-y-2">
                <LoadingSpinner size="sm" text="Small spinner" />
                <LoadingSpinner size="md" variant="dots" text="Dots animation" />
                <LoadingSpinner size="lg" variant="pulse" text="Pulse animation" />
                <LoadingSpinner size="sm" variant="bars" text="Bars animation" />
              </div>
            </div>
          </div>

          {/* Error Displays */}
          {dataFetchOperation.error && (
            <div className="mt-4">
              <ErrorDisplay
                error={dataFetchOperation.error}
                onRetry={handleFetch}
                onDismiss={dataFetchOperation.clearError}
              />
            </div>
          )}

          {retryOperation.lastError && !retryOperation.isRetrying && (
            <div className="mt-4">
              <ErrorDisplay
                error={{
                  ...retryOperation.lastError,
                  message: `Operation failed: ${retryOperation.lastError.message}`,
                  severity: 'high' as const,
                  actions: [
                    { label: 'Try Again', action: 'retry' as const, primary: true },
                    { label: 'Dismiss', action: 'dismiss' as const }
                  ],
                  isRecoverable: retryOperation.canRetry,
                  errorId: `retry-${Date.now()}`,
                  timestamp: new Date()
                }}
                onRetry={retryOperation.canRetry ? handleRetryOperation : undefined}
                onDismiss={retryOperation.reset}
              />
            </div>
          )}
        </div>

        {/* Loading Skeletons */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-xl font-semibold mb-4">Loading Skeletons</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">Text Skeleton</h4>
              <LoadingSkeleton lines={4} />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Avatar Skeleton</h4>
              <LoadingSkeleton variant="avatar" />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Card Skeleton</h4>
              <LoadingSkeleton variant="card" />
            </div>
          </div>
        </div>

        {/* Loading Overlay Demo */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-xl font-semibold mb-4">Loading Overlay</h3>
          <LoadingButton
            onClick={() => {
              // Demo loading overlay
              const overlay = document.createElement('div')
              overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
              overlay.innerHTML = `
                <div class="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
                  <div class="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600"></div>
                  <p class="text-gray-700 text-center font-medium">Processing...</p>
                </div>
              `
              document.body.appendChild(overlay)
              
              setTimeout(() => {
                document.body.removeChild(overlay)
              }, 3000)
            }}
            loading={false}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Show Loading Overlay (3s)
          </LoadingButton>
        </div>
      </div>
    </ErrorBoundary>
  )
}