import React, { useState, useRef, useEffect } from 'react'

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  
  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isOpen,
            onOpenChange: handleOpenChange
          })
        }
        return child
      })}
    </div>
  )
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PopoverTrigger({ asChild, children, isOpen, onOpenChange }: PopoverTriggerProps) {
  const handleClick = () => {
    onOpenChange?.(!isOpen)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick
    })
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  )
}

interface PopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PopoverContent({ 
  children, 
  className = '', 
  align = 'center',
  isOpen,
  onOpenChange
}: PopoverContentProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        onOpenChange?.(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onOpenChange])

  if (!isOpen) return null

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  }

  return (
    <div
      ref={contentRef}
      className={`
        absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg
        ${alignmentClasses[align]} ${className}
      `.trim()}
    >
      {children}
    </div>
  )
}