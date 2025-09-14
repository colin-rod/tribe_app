'use client'

import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  onShortPress?: () => void
  onProgress?: (progress: number) => void
  delay?: number
  preventDefault?: boolean
}

interface LongPressHandlers {
  onMouseDown: (event: React.MouseEvent) => void
  onMouseUp: (event: React.MouseEvent) => void
  onMouseLeave: (event: React.MouseEvent) => void
  onTouchStart: (event: React.TouchEvent) => void
  onTouchEnd: (event: React.TouchEvent) => void
  onTouchCancel: (event: React.TouchEvent) => void
}

/**
 * Custom hook for handling long press gestures with proper cleanup
 * Supports both mouse and touch events
 */
export function useLongPress({
  onLongPress,
  onShortPress,
  onProgress,
  delay = 500,
  preventDefault = true
}: UseLongPressOptions): LongPressHandlers {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const isLongPressRef = useRef(false)
  const startTimeRef = useRef<number>(0)

  const start = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (preventDefault) {
      event.preventDefault()
    }
    
    isLongPressRef.current = false
    startTimeRef.current = Date.now()
    
    // Set up progress tracking if callback provided
    if (onProgress) {
      onProgress(0) // Start at 0%
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTimeRef.current
        const progress = Math.min((elapsed / delay) * 100, 100)
        onProgress(progress)
        
        if (progress < 100) {
          animationFrameRef.current = requestAnimationFrame(updateProgress)
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(updateProgress)
    }
    
    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress()
    }, delay)
  }, [onLongPress, onProgress, delay, preventDefault])

  const clear = useCallback((event?: React.MouseEvent | React.TouchEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }
    
    // Reset progress when clearing
    if (onProgress && !isLongPressRef.current) {
      onProgress(0)
    }
    
    // If we haven't triggered long press and there's a short press handler, call it
    if (!isLongPressRef.current && onShortPress && event) {
      onShortPress()
    }
    
    isLongPressRef.current = false
  }, [onShortPress, onProgress])

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
  }
}

/**
 * Simplified version for touch-only long press
 */
export function useTouchLongPress(
  onLongPress: () => void,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const handleTouchStart = useCallback(() => {
    timeoutRef.current = setTimeout(onLongPress, delay)
  }, [onLongPress, delay])

  const handleTouchEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
  }
}