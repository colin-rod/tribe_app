'use client'

import React from 'react'
import { useTactileButton, useRippleEffect, useParticleEffect } from '@/hooks/useTactileInteractions'
import { motion } from 'framer-motion'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'wooden' | 'leaf'
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
  const { motionProps, controls, motion: motionComponent } = useTactileButton()
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
    default: 'game-button bg-ac-sage text-ac-brown-dark border-ac-sage-dark hover:bg-ac-sage-light hover:border-ac-sage shadow-lg',
    outline: 'border-3 border-ac-brown bg-surface text-ac-brown hover:bg-ac-peach-light hover:border-ac-brown-dark rounded-2xl shadow-md font-display',
    ghost: 'text-ac-brown hover:bg-ac-peach-light rounded-xl transition-all duration-200',
    destructive: 'bg-ac-coral text-white hover:bg-red-500 border-3 border-red-600 rounded-2xl shadow-lg font-display',
    wooden: 'bg-ac-brown text-white border-3 border-ac-brown-dark rounded-2xl shadow-wooden font-display hover:bg-ac-brown-light font-semibold text-shadow',
    leaf: 'bg-gradient-to-br from-ac-sage to-ac-sage-light text-ac-brown-dark border-3 border-ac-sage-dark rounded-full shadow-lg relative overflow-visible'
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
        {variant === 'leaf' && <span className="absolute -top-1 -right-1 text-lg">🌿</span>}
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
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          🌿
        </motion.span>
      )}
      {variant === 'wooden' && (
        <span className="absolute top-1 left-1 text-xs opacity-50">🌳</span>
      )}
      {children}
    </motion.button>
  )
}