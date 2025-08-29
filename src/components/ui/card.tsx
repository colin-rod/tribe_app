import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`.trim()} 
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div 
      className={`px-6 py-4 border-b border-gray-200 ${className}`.trim()} 
      {...props}
    >
      {children}
    </div>
  )
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ children, className = '', ...props }: CardTitleProps) {
  return (
    <h3 
      className={`text-lg font-semibold text-gray-900 ${className}`.trim()} 
      {...props}
    >
      {children}
    </h3>
  )
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div 
      className={`px-6 py-4 ${className}`.trim()} 
      {...props}
    >
      {children}
    </div>
  )
}