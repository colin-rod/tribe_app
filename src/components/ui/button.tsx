'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTactileButton, useRippleEffect, useParticleEffect } from '@/hooks/useTactileInteractions'
import { Icon } from '@/components/ui/IconLibrary'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'bark' | 'leaf' | 'branch' | 'wooden'
  size?: 'sm' | 'md' | 'lg'
  tactile?: boolean
  particles?: boolean
}

export function Button({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '', 
  tactile = true,
  particles = false,
  onClick,
  ...props 
}: ButtonProps) {
  const { motionProps } = useTactileButton()
  const createRipple = useRippleEffect()
  const createParticles = useParticleEffect()
  const shouldReduceMotion = useReducedMotion()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (tactile) createRipple(e)
    if (particles) {
      const rect = e.currentTarget.getBoundingClientRect()
      createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 2)
    }
    onClick?.(e)
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium relative overflow-hidden focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed tactile-element ripple-effect'

  const variants = {
    default: 'bg-leaf-500 text-bark-400 border-3 border-leaf-700 hover:bg-leaf-300 hover:border-leaf-500 shadow-leaf-soft rounded-leaf font-display font-semibold transition-colors',
    outline: 'border-3 border-bark-200 bg-surface text-bark-400 hover:bg-flower-400 hover:border-bark-400 rounded-leaf shadow-leaf-soft font-display transition-colors',
    ghost: 'text-bark-400 hover:bg-flower-400 rounded-leaf transition-all duration-200',
    destructive: 'bg-flower-400 text-white hover:bg-red-500 border-3 border-red-600 rounded-leaf shadow-leaf-soft font-display transition-colors',
    bark: 'bg-bark-400 text-leaf-100 border-3 border-bark-400 rounded-leaf shadow-bark font-display hover:bg-bark-200 font-semibold text-shadow transition-colors',
    branch: 'bg-leaf-500 text-bark-400 border-3 border-leaf-700 hover:bg-leaf-300 rounded-leaf shadow-leaf-soft font-display font-semibold transition-colors',
    leaf: 'bg-gradient-to-br from-leaf-500 to-leaf-300 text-bark-400 border-3 border-leaf-700 rounded-pill shadow-leaf-soft relative overflow-visible font-display font-semibold transition-colors',
    wooden: 'bg-bark-400 text-leaf-100 border-3 border-bark-400 rounded-leaf shadow-bark font-display hover:bg-bark-200 font-semibold text-shadow transition-colors'
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[2rem]',
    md: 'px-6 py-3 text-base min-h-[2.5rem]',
    lg: 'px-8 py-4 text-lg min-h-[3rem]'
  }

  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`.trim()

  // Motion config for subtle hover/tap
  const subtleMotion = shouldReduceMotion ? {} : {
    whileHover: { scale: 1.02, transition: { type: 'spring', stiffness: 200, damping: 25 } },
    whileTap: { scale: 0.985, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 250, damping: 30 } }
  }

  return (
    <motion.button
      className={classes}
      onClick={handleClick}
      {...motionProps}      // from useTactileButton
      {...subtleMotion}     // ensures hover/tap is gentle
      {...props}
    >
      {/* Optional leaf icon motion */}
      {variant === 'leaf' && !shouldReduceMotion && (
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon name="leaf" size="sm" className="text-leaf-500 opacity-80" />
        </motion.div>
      )}

      {(variant === 'bark' || variant === 'wooden') && (
        <Icon name="sprout" size="xs" className="absolute top-1 left-1 text-leaf-300 opacity-60" />
      )}

      {variant === 'branch' && (
        <Icon name="trees" size="xs" className="absolute -top-1 -left-1 text-leaf-500 opacity-70" />
      )}

      {children}
    </motion.button>
  )
}