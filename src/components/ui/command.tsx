import React, { useState, useRef, useEffect } from 'react'

interface CommandProps {
  children: React.ReactNode
}

export function Command({ children }: CommandProps) {
  return (
    <div className="flex flex-col">
      {children}
    </div>
  )
}

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string
}

export function CommandInput({ placeholder = 'Search...', className = '', ...props }: CommandInputProps) {
  return (
    <div className="flex items-center border-b border-gray-200 px-3 py-2">
      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        className={`flex-1 bg-transparent outline-none text-sm placeholder-gray-400 ${className}`.trim()}
        placeholder={placeholder}
        {...props}
      />
    </div>
  )
}

interface CommandEmptyProps {
  children: React.ReactNode
}

export function CommandEmpty({ children }: CommandEmptyProps) {
  return (
    <div className="px-3 py-6 text-center text-sm text-gray-500">
      {children}
    </div>
  )
}

interface CommandGroupProps {
  children: React.ReactNode
  className?: string
}

export function CommandGroup({ children, className = '' }: CommandGroupProps) {
  return (
    <div className={`overflow-auto ${className}`.trim()}>
      {children}
    </div>
  )
}

interface CommandItemProps {
  children: React.ReactNode
  value?: string
  onSelect?: (value?: string) => void
}

export function CommandItem({ children, value, onSelect }: CommandItemProps) {
  return (
    <div
      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center"
      onClick={() => onSelect?.(value)}
    >
      {children}
    </div>
  )
}