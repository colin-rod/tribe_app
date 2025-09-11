'use client'

import React, { memo } from 'react'
import { Icon, type IconName, type IconSize } from './IconLibrary'

// Memoized icon component for better performance
export const OptimizedIcon = memo<{
  name: IconName
  size?: IconSize | number
  className?: string
  'aria-label'?: string
}>(({ name, size = 'md', className, 'aria-label': ariaLabel }) => {
  return (
    <Icon 
      name={name} 
      size={size} 
      className={className} 
      aria-label={ariaLabel}
    />
  )
})

OptimizedIcon.displayName = 'OptimizedIcon'

// Icon preloader for critical icons
export function preloadCriticalIcons() {
  const criticalIcons: IconName[] = [
    'leaf',
    'treePine',
    'heart',
    'messageCircle',
    'camera',
    'users'
  ]
  
  // Pre-render critical icons in a hidden container
  return (
    <div className="sr-only" aria-hidden="true">
      {criticalIcons.map(iconName => (
        <Icon key={iconName} name={iconName} size="sm" />
      ))}
    </div>
  )
}

// Icon with lazy loading for non-critical usage
export const LazyIcon = memo<{
  name: IconName
  size?: IconSize | number
  className?: string
  'aria-label'?: string
  fallback?: React.ReactNode
}>(({ name, size = 'md', className, 'aria-label': ariaLabel, fallback }) => {
  const [isLoaded, setIsLoaded] = React.useState(false)
  
  React.useEffect(() => {
    // Simulate icon loading check
    const timer = setTimeout(() => setIsLoaded(true), 0)
    return () => clearTimeout(timer)
  }, [])
  
  if (!isLoaded && fallback) {
    return <>{fallback}</>
  }
  
  return (
    <Icon 
      name={name} 
      size={size} 
      className={className} 
      aria-label={ariaLabel}
    />
  )
})

LazyIcon.displayName = 'LazyIcon'

// Accessible icon wrapper with proper ARIA attributes
export const AccessibleIcon = memo<{
  name: IconName
  size?: IconSize | number
  className?: string
  label: string
  decorative?: boolean
}>(({ name, size = 'md', className, label, decorative = false }) => {
  if (decorative) {
    return (
      <Icon 
        name={name} 
        size={size} 
        className={className}
        aria-hidden="true"
      />
    )
  }
  
  return (
    <Icon 
      name={name} 
      size={size} 
      className={className}
      aria-label={label}
      role="img"
    />
  )
})

AccessibleIcon.displayName = 'AccessibleIcon'

// Nature icon with seasonal variants
export const SeasonalIcon = memo<{
  season?: 'spring' | 'summer' | 'autumn' | 'winter'
  size?: IconSize | number
  className?: string
  'aria-label'?: string
}>(({ season = 'spring', size = 'md', className, 'aria-label': ariaLabel }) => {
  const seasonalIcons = {
    spring: 'sprout' as IconName,
    summer: 'sun' as IconName,
    autumn: 'leaf' as IconName,
    winter: 'snowflake' as IconName
  }
  
  return (
    <Icon 
      name={seasonalIcons[season]} 
      size={size} 
      className={className}
      aria-label={ariaLabel || `${season} icon`}
    />
  )
})

SeasonalIcon.displayName = 'SeasonalIcon'

export default OptimizedIcon