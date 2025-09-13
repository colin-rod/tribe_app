'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { motion, useAnimation, useReducedMotion } from 'framer-motion'
import { 
  SPRING_CONFIGS, 
  SCALE_VALUES, 
  MOVEMENT_VALUES, 
  OPACITY_VALUES
} from '@/lib/animations'

// Haptic feedback for supported devices
export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      }
      navigator.vibrate(patterns[intensity])
    }
  }, [])

  return triggerHaptic
}

// Nature-inspired button interaction (performance optimized)
export const useTactileButton = () => {
  const shouldReduceMotion = useReducedMotion()
  const triggerHaptic = useHapticFeedback()

  const handleTap = useCallback(() => {
    triggerHaptic('light')
  }, [triggerHaptic])

  // Performance-first motion props using standardized values
  const motionProps = {
    whileHover: shouldReduceMotion ? {} : {
      y: MOVEMENT_VALUES.hoverY,
      scale: SCALE_VALUES.hoverScaleSmall,
      transition: SPRING_CONFIGS.gentle
    },
    whileTap: shouldReduceMotion ? {} : {
      scale: SCALE_VALUES.tapScale,
      rotate: 0,
      y: MOVEMENT_VALUES.tapY,
      transition: SPRING_CONFIGS.gentle
    },
    initial: { opacity: OPACITY_VALUES.hidden, scale: 0.95 },
    animate: { opacity: OPACITY_VALUES.visible, scale: 1 },
    transition: shouldReduceMotion 
      ? { duration: 0 }
      : { delay: 0.06, ...SPRING_CONFIGS.responsive },
    onTap: handleTap
  }

  return { motionProps, motion }
}

// Nature-inspired card interaction (simplified for performance)
export const useTactileCard = () => {
  const shouldReduceMotion = useReducedMotion()

  // Simplified "shiver" effect using standardized values
  const motionProps = {
    whileHover: shouldReduceMotion ? {} : {
      y: MOVEMENT_VALUES.hoverY,
      scale: SCALE_VALUES.hoverScaleSmall,
      transition: SPRING_CONFIGS.responsive
    },
    initial: { opacity: OPACITY_VALUES.hidden, scale: 0.95 },
    animate: { opacity: OPACITY_VALUES.visible, scale: 1 },
    transition: shouldReduceMotion 
      ? { duration: 0 }
      : { delay: 0.1, ...SPRING_CONFIGS.responsive }
  }

  return { motionProps, motion }
}

// Simplified drag interaction for performance
export const useTactileDrag = (onDrag?: (info: any) => void) => {
  const shouldReduceMotion = useReducedMotion()
  const triggerHaptic = useHapticFeedback()

  const handleDragStart = useCallback(() => {
    triggerHaptic('light')
  }, [triggerHaptic])

  const handleDragEnd = useCallback(() => {
    triggerHaptic('medium')
  }, [triggerHaptic])

  const motionProps: any = {
    drag: true,
    dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
    dragElastic: 0.15,
    whileDrag: shouldReduceMotion ? {} : { scale: SCALE_VALUES.dragScale },
    transition: SPRING_CONFIGS.bouncy,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd
  }

  if (onDrag) {
    motionProps.onDrag = (_: any, info: any) => onDrag(info)
  }

  return { motionProps, motion }
}

// Ripple effect
export const useRippleEffect = () => {
  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    const ripple = document.createElement('span')
    
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(184, 212, 184, 0.6);
      pointer-events: none;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      animation: ripple 0.6s ease-out;
    `
    
    element.appendChild(ripple)
    
    setTimeout(() => {
      ripple.remove()
    }, 600)
  }, [])

  return createRipple
}

// Parallax scrolling
export const useParallax = () => {
  const [scrollY, setScrollY] = useState(0)
  
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return scrollY
}

// Simple interaction tracking (performance optimized)
export const useInteractionTracking = () => {
  const shouldReduceMotion = useReducedMotion()
  
  const recordInteraction = useCallback((type: 'tap' | 'hover' | 'drag') => {
    if (shouldReduceMotion) return
    // Simple interaction logging - could be expanded for analytics
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Nature interaction: ${type}`)
    }
  }, [shouldReduceMotion])
  
  return { recordInteraction }
}

// Simplified shake detection (optional feature)
export const useShakeDetection = (onShake: () => void) => {
  const shouldReduceMotion = useReducedMotion()
  
  useEffect(() => {
    if (shouldReduceMotion) return // Skip shake detection if motion is reduced
    
    const handleKeyboard = (event: KeyboardEvent) => {
      // Fallback: trigger on double-tap space for accessibility
      if (event.code === 'Space' && event.detail === 2) {
        onShake()
      }
    }
    
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [onShake, shouldReduceMotion])
}

// Simplified nature-inspired particle effect (performance conscious)
export const useParticleEffect = () => {
  const shouldReduceMotion = useReducedMotion()
  
  const createParticles = useCallback((x: number, y: number, count: number = 3) => {
    if (shouldReduceMotion) return // Skip particles if motion is reduced
    
    // Limit to 3 particles max for performance
    const maxCount = Math.min(count, 3)
    for (let i = 0; i < maxCount; i++) {
      const particle = document.createElement('div')
      particle.className = 'opacity-60 pointer-events-none fixed z-50 text-leaf-500'
      particle.style.cssText = `
        left: ${x + Math.random() * 20 - 10}px;
        top: ${y + Math.random() * 20 - 10}px;
        font-size: 16px;
        animation: sprout 0.5s ease-out forwards;
      `
      particle.textContent = ['🌱', '🍃', '🌿'][Math.floor(Math.random() * 3)]
      
      document.body.appendChild(particle)
      
      setTimeout(() => {
        particle.remove()
      }, 500)
    }
  }, [shouldReduceMotion])

  return createParticles
}