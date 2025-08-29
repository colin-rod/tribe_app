import React, { useState, useRef, useEffect } from 'react'

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={selectRef}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isOpen,
            onToggle: () => setIsOpen(!isOpen),
            onSelect: (newValue: string) => {
              onValueChange(newValue)
              setIsOpen(false)
            },
            selectedValue: value
          })
        }
        return child
      })}
    </div>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean
  onToggle?: () => void
}

export function SelectTrigger({ 
  children, 
  className = '', 
  isOpen, 
  onToggle, 
  ...props 
}: SelectTriggerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full flex items-center justify-between px-3 py-2 
        border border-gray-300 rounded-lg bg-white text-sm
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
        ${className}
      `.trim()}
      {...props}
    >
      {children}
      <svg
        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

interface SelectValueProps {
  placeholder?: string
  selectedValue?: string
}

export function SelectValue({ placeholder = 'Select...', selectedValue }: SelectValueProps) {
  return (
    <span className={selectedValue ? 'text-gray-900' : 'text-gray-500'}>
      {selectedValue || placeholder}
    </span>
  )
}

interface SelectContentProps {
  children: React.ReactNode
  isOpen?: boolean
}

export function SelectContent({ children, isOpen }: SelectContentProps) {
  if (!isOpen) return null
  
  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
      <div className="py-1">
        {children}
      </div>
    </div>
  )
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onSelect?: (value: string) => void
  selectedValue?: string
}

export function SelectItem({ value, children, onSelect, selectedValue }: SelectItemProps) {
  const isSelected = value === selectedValue
  
  return (
    <button
      type="button"
      onClick={() => onSelect?.(value)}
      className={`
        w-full px-3 py-2 text-left text-sm hover:bg-gray-100
        ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
      `.trim()}
    >
      {children}
    </button>
  )
}