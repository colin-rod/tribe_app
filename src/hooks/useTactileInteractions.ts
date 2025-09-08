'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { useSpring, useSpringValue, animated } from '@react-spring/web'
import { useGesture } from '@use-gesture/react'

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
  const [springs, api] = useSpring(() => ({
    scale: 1,
    y: 0,
    rotateZ: 0,
    config: { tension: 300, friction: 10 }
  }))

  const triggerHaptic = useHapticFeedback()

  const bind = useGesture({
    onPointerDown: () => {
      api.start({ scale: 0.95, y: 2 })
      triggerHaptic('light')
    },
    onPointerUp: () => {
      api.start({ scale: 1.02, y: -3 })
      setTimeout(() => api.start({ scale: 1, y: 0 }), 150)
    },
    onPointerLeave: () => {
      api.start({ scale: 1, y: 0 })
    },
    onHover: ({ hovering }) => {
      if (hovering) {
        api.start({ scale: 1.05, y: -2, rotateZ: Math.random() * 2 - 1 })
      } else {
        api.start({ scale: 1, y: 0, rotateZ: 0 })
      }
    }
  })

  return { bind, springs, animated }
}

// Card hover and tilt effects
export const useTactileCard = () => {
  const [springs, api] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
    y: 0,
    config: { tension: 300, friction: 40 }
  }))

  const bind = useGesture({
    onMove: ({ xy, hovering }) => {
      if (!hovering) return
      
      const [x, y] = xy
      const rotateX = (y - window.innerHeight / 2) / window.innerHeight * -10
      const rotateY = (x - window.innerWidth / 2) / window.innerWidth * 10
      
      api.start({
        rotateX,
        rotateY,
        rotateZ: Math.random() * 1 - 0.5,
        scale: 1.02,
        y: -5
      })
    },
    onHover: ({ hovering }) => {
      api.start({
        rotateX: 0,
        rotateY: 0,
        rotateZ: hovering ? Math.random() * 2 - 1 : 0,
        scale: hovering ? 1.02 : 1,
        y: hovering ? -5 : 0
      })
    }
  })

  return { bind, springs, animated }
}

// Draggable elements
export const useTactileDrag = (onDrag?: (info: any) => void) => {
  const [springs, api] = useSpring(() => ({
    x: 0,
    y: 0,
    scale: 1,
    rotateZ: 0,
    config: { tension: 800, friction: 35 }
  }))

  const triggerHaptic = useHapticFeedback()

  const bind = useGesture({
    onDrag: ({ offset: [x, y], dragging, velocity, direction }) => {
      const scale = dragging ? 1.1 : 1
      const rotateZ = dragging ? direction[0] * 5 : 0
      
      api.start({ x, y, scale, rotateZ, immediate: dragging })
      
      if (dragging && onDrag) {
        onDrag({ x, y, velocity, direction })
      }
      
      if (dragging) {
        triggerHaptic('light')
      }
    },
    onDragEnd: () => {
      api.start({ x: 0, y: 0, scale: 1, rotateZ: 0 })
      triggerHaptic('medium')
    }
  })

  return { bind, springs, animated }
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