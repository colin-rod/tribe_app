'use client'

import React from 'react'
import { useTactileButton, useRippleEffect, useParticleEffect } from '@/hooks/useTactileInteractions'
import { motion } from 'framer-motion'

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
  const { motionProps, motion: motionComponent } = useTactileButton()
  const createRipple = useRippleEffect()
  const createParticles = useParticleEffect()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (tactile) {
      createRipple(e)
    }
    
    if (particles) {
      const rect = e.currentTarget.getBoundingClientRect()
      createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 3)
    }
    
    if (onClick) {
      onClick(e)
    }
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
    // Legacy variant for compatibility
    wooden: 'bg-bark-400 text-leaf-100 border-3 border-bark-400 rounded-leaf shadow-bark font-display hover:bg-bark-200 font-semibold text-shadow transition-colors'
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[2rem]',
    md: 'px-6 py-3 text-base min-h-[2.5rem]',
    lg: 'px-8 py-4 text-lg min-h-[3rem]'
  }
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`.trim()
  
  if (!tactile) {
    return (
      <button className={classes} onClick={handleClick} {...props}>
        {variant === 'leaf' && <span className="absolute -top-1 -right-1 text-lg">🍃</span>}
        {(variant === 'bark' || variant === 'wooden') && (
          <span className="absolute top-1 left-1 text-xs opacity-60">🌱</span>
        )}
        {variant === 'branch' && (
          <span className="absolute -top-1 -left-1 text-sm opacity-70">🌿</span>
        )}
        {children}
      </button>
    )
  }

  return (
    <motion.button 
      className={classes} 
      onClick={handleClick}
      {...motionProps}
      {...props}
    >
      {variant === 'leaf' && (
        <motion.span 
          className="absolute -top-1 -right-1 text-lg"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          🍃
        </motion.span>
      )}
      {(variant === 'bark' || variant === 'wooden') && (
        <span className="absolute top-1 left-1 text-xs opacity-60">🌱</span>
      )}
      {variant === 'branch' && (
        <span className="absolute -top-1 -left-1 text-sm opacity-70">🌿</span>
      )}
      {children}
    </motion.button>
  )
}