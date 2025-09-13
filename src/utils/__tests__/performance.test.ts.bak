import { renderHook, act } from '@testing-library/react'
import { useDebounce, useThrottle } from '../performance'

// Mock timers
jest.useFakeTimers()

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    // Change value
    rerender({ value: 'changed', delay: 500 })
    expect(result.current).toBe('initial') // Still old value

    // Advance time by less than delay
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial') // Still old value

    // Advance time to complete delay
    act(() => {
      jest.advanceTimersByTime(200)
    })
    expect(result.current).toBe('changed') // Now updated
  })

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    // Rapid changes
    rerender({ value: 'change1' })
    act(() => jest.advanceTimersByTime(300))

    rerender({ value: 'change2' })
    act(() => jest.advanceTimersByTime(300))

    rerender({ value: 'final' })
    
    // Should still be initial value
    expect(result.current).toBe('initial')

    // Complete the final delay
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('final')
  })
})

describe('useThrottle', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should call function immediately on first call', () => {
    const mockFn = jest.fn()
    const { result } = renderHook(() => useThrottle(mockFn, 1000))

    act(() => {
      result.current('test')
    })

    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('test')
  })

  it('should throttle subsequent calls', () => {
    const mockFn = jest.fn()
    const { result } = renderHook(() => useThrottle(mockFn, 1000))

    // First call - should execute
    act(() => {
      result.current('first')
    })
    expect(mockFn).toHaveBeenCalledTimes(1)

    // Second call immediately - should be throttled
    act(() => {
      result.current('second')
    })
    expect(mockFn).toHaveBeenCalledTimes(1) // Still only 1 call

    // Advance time by less than delay
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Third call - should still be throttled
    act(() => {
      result.current('third')
    })
    expect(mockFn).toHaveBeenCalledTimes(1)

    // Advance time to complete throttle period
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Fourth call - should execute
    act(() => {
      result.current('fourth')
    })
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).toHaveBeenLastCalledWith('fourth')
  })

  it('should work with different argument types', () => {
    const mockFn = jest.fn()
    const { result } = renderHook(() => useThrottle(mockFn, 1000))

    // Test with multiple arguments
    act(() => {
      result.current('arg1', 'arg2', 123)
    })

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123)
  })
})