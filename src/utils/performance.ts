/**
 * Performance optimization utilities for React components
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('Performance')

/**
 * Debounce hook for expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Throttle hook for frequent events
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0)
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      return callback(...args)
    }
  }, [callback, delay]) as T
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
) {
  const [isVisible, setIsVisible] = useState(false)
  const [element, setElement] = useState<Element | null>(null)

  useEffect(() => {
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      options
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [element, options])

  return [setElement, isVisible] as const
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { start, end }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }))
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  }
}

/**
 * Memoized callback with dependency logging
 */
export function useCallbackWithDeps<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList,
  debugName?: string
): T {
  const prevDeps = useRef<React.DependencyList | undefined>(undefined)

  useEffect(() => {
    if (debugName && process.env.NODE_ENV === 'development') {
      if (prevDeps.current) {
        const changedDeps = deps.filter((dep, index) => dep !== prevDeps.current![index])
        if (changedDeps.length > 0) {
          logger.debug(`${debugName} dependencies changed`, {
            action: 'dependencyChange',
            metadata: { changedDeps: changedDeps.length }
          })
        }
      }
      prevDeps.current = deps
    }
  }, [debugName, deps])

  return useCallback(callback, deps)
}

/**
 * Memoized value with dependency logging
 */
export function useMemoWithDeps<T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T {
  const prevDeps = useRef<React.DependencyList | undefined>(undefined)

  useEffect(() => {
    if (debugName && process.env.NODE_ENV === 'development') {
      if (prevDeps.current) {
        const changedDeps = deps.filter((dep, index) => dep !== prevDeps.current![index])
        if (changedDeps.length > 0) {
          logger.debug(`${debugName} memo recalculated`, {
            action: 'memoRecalculation',
            metadata: { changedDeps: changedDeps.length }
          })
        }
      }
      prevDeps.current = deps
    }
  }, [debugName, deps])

  return useMemo(factory, deps)
}

/**
 * Hook to measure component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderStart = useRef<number | undefined>(undefined)
  const renderCount = useRef<number>(0)

  useEffect(() => {
    renderStart.current = performance.now()
    renderCount.current++
  })

  useEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`${componentName} render completed`, {
          action: 'renderPerformance',
          metadata: { 
            renderTime: Math.round(renderTime * 100) / 100,
            renderCount: renderCount.current
          }
        })

        // Warn about slow renders
        if (renderTime > 16) { // 60fps threshold
          logger.warn(`${componentName} slow render detected`, {
            action: 'slowRender',
            metadata: { renderTime, renderCount: renderCount.current }
          })
        }
      }
    }
  })
}

/**
 * Hook for batching state updates
 */
export function useBatchedState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue)
  const pendingUpdates = useRef<Array<(prev: T) => T>>([])
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const batchedSetState = useCallback((updater: (prev: T) => T) => {
    pendingUpdates.current.push(updater)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        return pendingUpdates.current.reduce((state, update) => update(state), prevState)
      })
      pendingUpdates.current = []
    }, 0)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [state, batchedSetState] as const
}

/**
 * Component performance wrapper
 */
export function withPerformanceMonitoring<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return memo(function PerformanceMonitoredComponent(props: P) {
    useRenderPerformance(componentName || Component.name || 'UnknownComponent')
    return React.createElement(Component, props)
  })
}

