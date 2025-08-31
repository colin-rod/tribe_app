import { AppError, handleError, ErrorCodes } from '../error-handler'

// Mock the logger
jest.mock('../logger', () => ({
  createComponentLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }),
}))

// Mock the toast service
jest.mock('../toast-service', () => ({
  handleErrorToast: jest.fn(),
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
    
    const result = handleError(appError, { logError: false })
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('App error')
    expect(result.code).toBe('APP_ERROR')
    expect(result.context).toEqual({ test: true })
  })

  it('should handle generic Error correctly', () => {
    const genericError = new Error('Generic error')
    
    const result = handleError(genericError, { logError: false })
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Generic error')
    expect(result.code).toBe('UNKNOWN_ERROR')
  })

  it('should handle string error correctly', () => {
    const result = handleError('String error', { logError: false })
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('An unexpected error occurred')
    expect(result.code).toBe('UNKNOWN_ERROR')
  })

  it('should handle unknown error correctly', () => {
    const unknownError = { weird: 'object' }
    
    const result = handleError(unknownError, { logError: false })
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('An unexpected error occurred')
    expect(result.code).toBe('UNKNOWN_ERROR')
  })

  it('should use fallback message when provided', () => {
    const result = handleError(null, { 
      logError: false,
      fallbackMessage: 'Fallback message'
    })
    
    expect(result.message).toBe('Fallback message')
    expect(result.code).toBe('UNKNOWN_ERROR')
  })

  it('should respect logError option', () => {
    handleError('Test error', { logError: false })
    
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it('should handle error mapping correctly', () => {
    const networkError = new Error('Network connection failed')
    
    const result = handleError(networkError, { logError: false })
    
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.message).toBe('Network connection failed')
  })

  it('should return AppError instance with correct properties', () => {
    const result = handleError('Test error', { 
      logError: false,
      fallbackMessage: 'Fallback'
    })
    
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Fallback')
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.timestamp).toBeInstanceOf(Date)
    expect(result.context).toEqual(expect.objectContaining({ originalError: 'Test error' }))
  })
})