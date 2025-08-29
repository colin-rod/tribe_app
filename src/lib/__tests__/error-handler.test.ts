import { AppError, handleError, ErrorSeverity } from '../error-handler'

// Mock the logger
jest.mock('../logger', () => ({
  createComponentLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }),
}))

describe('AppError', () => {
  it('should create error with default values', () => {
    const error = new AppError('Test error')
    
    expect(error.message).toBe('Test error')
    expect(error.name).toBe('AppError')
    expect(error.code).toBe('UNKNOWN_ERROR')
    expect(error.context).toEqual({})
    expect(error.isOperational).toBe(true)
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  it('should create error with custom values', () => {
    const context = { userId: '123', action: 'test' }
    const error = new AppError('Custom error', 'CUSTOM_CODE', context, false)
    
    expect(error.message).toBe('Custom error')
    expect(error.code).toBe('CUSTOM_CODE')
    expect(error.context).toEqual(context)
    expect(error.isOperational).toBe(false)
  })

  it('should maintain proper stack trace', () => {
    const error = new AppError('Stack test')
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('Stack test')
  })
})

describe('handleError', () => {
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    jest.clearAllMocks()
  })

  it('should handle AppError correctly', () => {
    const appError = new AppError('App error', 'APP_ERROR', { test: true })
    
    handleError(appError, { logError: true })
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('App error'),
      expect.objectContaining({ test: true })
    )
  })

  it('should handle generic Error correctly', () => {
    const genericError = new Error('Generic error')
    
    handleError(genericError, { logError: true })
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Generic error'),
      expect.any(Object)
    )
  })

  it('should handle string error correctly', () => {
    handleError('String error', { logError: true })
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('String error'),
      expect.any(Object)
    )
  })

  it('should handle unknown error correctly', () => {
    const unknownError = { weird: 'object' }
    
    handleError(unknownError, { logError: true })
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown error'),
      expect.any(Object)
    )
  })

  it('should use fallback message when provided', () => {
    const result = handleError('Test error', { 
      logError: false,
      fallbackMessage: 'Fallback message'
    })
    
    expect(result.message).toBe('Test error')
    expect(result.fallbackMessage).toBe('Fallback message')
  })

  it('should respect logError option', () => {
    handleError('Test error', { logError: false })
    
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it('should handle different severities correctly', () => {
    handleError('Warning error', { 
      logError: true, 
      severity: ErrorSeverity.WARN 
    })
    
    expect(consoleWarnSpy).toHaveBeenCalled()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should return error details', () => {
    const result = handleError('Test error', { 
      logError: false,
      fallbackMessage: 'Fallback'
    })
    
    expect(result).toEqual({
      message: 'Test error',
      fallbackMessage: 'Fallback',
      code: 'UNKNOWN_ERROR',
      timestamp: expect.any(Date),
      context: expect.any(Object)
    })
  })
})