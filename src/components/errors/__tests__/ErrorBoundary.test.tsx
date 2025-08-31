import React from 'react'
import { render, screen, fireEvent } from '@/__tests__/utils/test-utils'
import { ErrorBoundary, PageErrorFallback, SectionErrorFallback, ComponentErrorFallback } from '../ErrorBoundary'
import { AppError, ErrorCodes } from '@/lib/error-handler'

// Mock the logger
jest.mock('@/lib/logger', () => ({
  createComponentLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }),
}))

// Mock the error messages
jest.mock('@/lib/error-messages', () => ({
  formatErrorForUser: jest.fn((error) => error.message),
}))

// Mock the ErrorDisplay component
jest.mock('@/components/ui/ErrorDisplay', () => ({
  ErrorBoundaryFallback: ({ error, resetError }: any) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={resetError}>Reset</button>
    </div>
  ),
}))

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console errors during tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('catches errors and displays component-level fallback by default', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong with this component/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('displays page-level fallback when level is set to page', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error: Test error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('displays section-level fallback when level is set to section', () => {
    render(
      <ErrorBoundary level="section">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/unable to load this section/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('resets error when reset button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong with this component/i)).toBeInTheDocument()
    
    const resetButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(resetButton)

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(AppError),
      expect.stringMatching(/^error_/)
    )
  })

  it('handles AppError correctly', () => {
    const ThrowAppError = () => {
      throw new AppError('Custom app error', ErrorCodes.VALIDATION_ERROR)
    }

    render(
      <ErrorBoundary>
        <ThrowAppError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong with this component/i)).toBeInTheDocument()
  })
})

describe('PageErrorFallback', () => {
  it('renders page error fallback correctly', () => {
    const error = new AppError('Page error', ErrorCodes.NOT_FOUND)
    const resetError = jest.fn()

    render(
      <PageErrorFallback 
        error={error} 
        resetError={resetError} 
        errorId="test-error-id" 
        level="page" 
      />
    )

    expect(screen.getByText('Error: Page error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })
})

describe('SectionErrorFallback', () => {
  it('renders section error fallback correctly', () => {
    const error = new AppError('Section error', ErrorCodes.DATABASE_ERROR)
    const resetError = jest.fn()

    render(
      <SectionErrorFallback 
        error={error} 
        resetError={resetError} 
        errorId="test-error-id" 
        level="section" 
      />
    )

    expect(screen.getByText(/unable to load this section/i)).toBeInTheDocument()
    expect(screen.getByText('Section error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows debug info in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const error = new AppError('Debug error', ErrorCodes.DATABASE_ERROR)
    const resetError = jest.fn()

    render(
      <SectionErrorFallback 
        error={error} 
        resetError={resetError} 
        errorId="debug-error-id" 
        level="section" 
      />
    )

    expect(screen.getByText('Debug Info')).toBeInTheDocument()
    expect(screen.getByText('Error ID: debug-error-id')).toBeInTheDocument()
    expect(screen.getByText('Code: DATABASE_ERROR')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })
})

describe('ComponentErrorFallback', () => {
  it('renders component error fallback correctly', () => {
    const error = new AppError('Component error', ErrorCodes.UNKNOWN_ERROR)
    const resetError = jest.fn()

    render(
      <ComponentErrorFallback 
        error={error} 
        resetError={resetError} 
        errorId="test-error-id" 
        level="component" 
      />
    )

    expect(screen.getByText(/something went wrong with this component/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('handles reset button click', () => {
    const error = new AppError('Component error', ErrorCodes.UNKNOWN_ERROR)
    const resetError = jest.fn()

    render(
      <ComponentErrorFallback 
        error={error} 
        resetError={resetError} 
        errorId="test-error-id" 
        level="component" 
      />
    )

    const resetButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(resetButton)

    expect(resetError).toHaveBeenCalledTimes(1)
  })
})