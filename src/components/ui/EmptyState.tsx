'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'primary'
  icon?: string
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actions?: EmptyStateAction[]
  contextualHelp?: {
    title: string
    items: string[]
  }
  variant?: 'default' | 'nature'
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  actions = [],
  contextualHelp,
  variant = 'default',
  className = ''
}: EmptyStateProps) {
  const cardClasses = variant === 'nature' 
    ? 'border-leaf-200 bg-gradient-to-br from-leaf-50 to-surface'
    : ''

  const titleClasses = variant === 'nature'
    ? 'text-bark-400 font-display'
    : 'text-gray-900'

  const descriptionClasses = variant === 'nature'
    ? 'text-bark-300'
    : 'text-gray-600'

  return (
    <Card className={`${cardClasses} ${className}`}>
      <CardContent className="text-center py-12">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {typeof icon === 'string' ? (
            <div className="text-6xl">{icon}</div>
          ) : (
            <div className="w-16 h-16 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>

        {/* Title and Description */}
        <h3 className={`text-xl font-semibold ${titleClasses} mb-3`}>
          {title}
        </h3>
        <p className={`${descriptionClasses} mb-8 max-w-md mx-auto leading-relaxed`}>
          {description}
        </p>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant === 'primary' ? 'default' : action.variant}
                className={action.variant === 'primary' && variant === 'nature' 
                  ? 'bg-leaf-500 hover:bg-leaf-600 text-leaf-100 shadow-lg' 
                  : ''
                }
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Contextual Help */}
        {contextualHelp && (
          <div className={`text-left max-w-sm mx-auto p-4 rounded-lg ${
            variant === 'nature' 
              ? 'bg-leaf-100/50 border border-leaf-200' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            <h4 className={`font-medium mb-3 text-sm ${
              variant === 'nature' ? 'text-bark-400' : 'text-gray-900'
            }`}>
              {contextualHelp.title}
            </h4>
            <ul className="space-y-2">
              {contextualHelp.items.map((item, index) => (
                <li key={index} className={`text-sm flex items-start ${
                  variant === 'nature' ? 'text-bark-300' : 'text-gray-600'
                }`}>
                  <span className="mr-2 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}