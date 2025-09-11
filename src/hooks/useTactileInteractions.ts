'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useAnimation, useTransform } from 'framer-motion'

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

// Tactile button interaction
export const useTactileButton = () => {
  const controls = useAnimation()
  const scale = useMotionValue(1)
  const y = useMotionValue(0)
  const rotateZ = useMotionValue(0)

  const triggerHaptic = useHapticFeedback()

  const handlePointerDown = useCallback(() => {
    controls.start({ scale: 0.99, y: 0.5 })
    triggerHaptic('light')
  }, [controls, triggerHaptic])

  const handlePointerUp = useCallback(() => {
    controls.start({ scale: 1.005, y: -0.5 })
    setTimeout(() => controls.start({ scale: 1, y: 0 }), 100)
  }, [controls])

  const handlePointerLeave = useCallback(() => {
    controls.start({ scale: 1, y: 0, rotateZ: 0 })
  }, [controls])

  const handleHoverStart = useCallback(() => {
    controls.start({ 
      scale: 1.01, 
      y: -0.5, 
      rotateZ: Math.random() * 0.3 - 0.15 
    })
  }, [controls])

  const handleHoverEnd = useCallback(() => {
    controls.start({ scale: 1, y: 0, rotateZ: 0 })
  }, [controls])

  const motionProps = {
    animate: controls,
    whileTap: { scale: 0.99, y: 0.5 },
    whileHover: { scale: 1.01, y: -0.5 },
    transition: { type: 'spring', stiffness: 300, damping: 10 },
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    onHoverStart: handleHoverStart,
    onHoverEnd: handleHoverEnd
  }

  return { motionProps, controls, motion }
}

// Card hover and tilt effects
export const useTactileCard = () => {
  const controls = useAnimation()
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const rotateZ = useMotionValue(0)

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const rotateXValue = (y - rect.height / 2) / rect.height * -3
    const rotateYValue = (x - rect.width / 2) / rect.width * 3
    
    controls.start({
      rotateX: rotateXValue,
      rotateY: rotateYValue,
      rotateZ: Math.random() * 0.5 - 0.25,
      scale: 1.01,
      y: -2
    })
  }, [controls])

  const handleHoverStart = useCallback(() => {
    controls.start({
      rotateZ: Math.random() * 0.5 - 0.25,
      scale: 1.01,
      y: -2
    })
  }, [controls])

  const handleHoverEnd = useCallback(() => {
    controls.start({
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      y: 0
    })
  }, [controls])

  const motionProps = {
    animate: controls,
    whileHover: { scale: 1.01, y: -2 },
    transition: { type: 'spring', stiffness: 300, damping: 40 },
    onMouseMove: handleMouseMove,
    onHoverStart: handleHoverStart,
    onHoverEnd: handleHoverEnd
  }

  return { motionProps, controls, motion }
}

// Draggable elements
export const useTactileDrag = (onDrag?: (info: any) => void) => {
  const controls = useAnimation()
  const triggerHaptic = useHapticFeedback()

  const handleDragStart = useCallback(() => {
    triggerHaptic('light')
  }, [triggerHaptic])

  const handleDrag = useCallback((event: any, info: any) => {
    if (onDrag) {
      onDrag(info)
    }
    triggerHaptic('light')
  }, [onDrag, triggerHaptic])

  const handleDragEnd = useCallback(() => {
    controls.start({ x: 0, y: 0, scale: 1, rotateZ: 0 })
    triggerHaptic('medium')
  }, [controls, triggerHaptic])

  const motionProps = {
    drag: true,
    dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
    dragElastic: 0.2,
    whileDrag: { scale: 1.1, rotateZ: 5 },
    transition: { type: 'spring', stiffness: 800, damping: 35 },
    onDragStart: handleDragStart,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
    animate: controls
  }

  return { motionProps, controls, motion }
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

// Gesture recognition for special interactions
export const useGestureRecognition = () => {
  const gestureRef = useRef<string[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const recordGesture = useCallback((gesture: string) => {
    gestureRef.current.push(gesture)
    
    // Clear timeout if it exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Set timeout to clear gestures after 2 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      gestureRef.current = []
    }, 2000)
    
    return gestureRef.current.join('-')
  }, [])
  
  const checkPattern = useCallback((pattern: string) => {
    const current = gestureRef.current.join('-')
    return current.includes(pattern)
  }, [])
  
  const clearGestures = useCallback(() => {
    gestureRef.current = []
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])
  
  return { recordGesture, checkPattern, clearGestures }
}

// Shake detection
export const useShakeDetection = (onShake: () => void, threshold: number = 15) => {
  const lastUpdate = useRef(0)
  const lastX = useRef(0)
  const lastY = useRef(0)
  const lastZ = useRef(0)
  
  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event
      if (!accelerationIncludingGravity) return
      
      const currentTime = new Date().getTime()
      const timeDifference = currentTime - lastUpdate.current
      
      if (timeDifference > 100) {
        const deltaX = Math.abs(accelerationIncludingGravity.x! - lastX.current)
        const deltaY = Math.abs(accelerationIncludingGravity.y! - lastY.current)
        const deltaZ = Math.abs(accelerationIncludingGravity.z! - lastZ.current)
        
        if (deltaX + deltaY + deltaZ > threshold) {
          onShake()
        }
        
        lastUpdate.current = currentTime
        lastX.current = accelerationIncludingGravity.x!
        lastY.current = accelerationIncludingGravity.y!
        lastZ.current = accelerationIncludingGravity.z!
      }
    }
    
    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [onShake, threshold])
}

// Particle effects
export const useParticleEffect = () => {
  const createParticles = useCallback((x: number, y: number, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div')
      particle.className = 'sparkle'
      particle.style.cssText = `
        position: fixed;
        left: ${x + Math.random() * 40 - 20}px;
        top: ${y + Math.random() * 40 - 20}px;
        z-index: 1000;
        pointer-events: none;
        font-size: ${Math.random() * 8 + 12}px;
      `
      particle.textContent = ['✨', '🌟', '💫', '⭐'][Math.floor(Math.random() * 4)]
      
      document.body.appendChild(particle)
      
      setTimeout(() => {
        particle.remove()
      }, 800)
    }
  }, [])

  return createParticles
}