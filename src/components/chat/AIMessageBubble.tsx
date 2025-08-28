'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'

interface AIMessageBubbleProps {
  message: {
    id: string
    content: string
    promptType: 'checkin' | 'milestone' | 'memory' | 'followup' | 'celebration'
    created_at: string
    suggestedResponses?: string[]
    metadata?: {
      provider?: string
      model?: string
      confidence?: number
    }
  }
  currentUser: User
  onQuickReply: (response: string) => void
  onDismiss?: (messageId: string) => void
}

export default function AIMessageBubble({ 
  message, 
  onQuickReply, 
  onDismiss 
}: AIMessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getPromptTypeIcon = (type: string) => {
    const icons = {
      checkin: '👋',
      milestone: '🎉',
      memory: '📖',
      followup: '💭',
      celebration: '🌟'
    }
    return icons[type as keyof typeof icons] || '💙'
  }

  const getPromptTypeColor = (type: string) => {
    const colors = {
      checkin: 'from-blue-50 to-indigo-50 border-blue-200',
      milestone: 'from-yellow-50 to-amber-50 border-yellow-200',
      memory: 'from-purple-50 to-violet-50 border-purple-200',
      followup: 'from-green-50 to-emerald-50 border-green-200',
      celebration: 'from-pink-50 to-rose-50 border-pink-200'
    }
    return colors[type as keyof typeof colors] || 'from-gray-50 to-slate-50 border-gray-200'
  }

  const handleQuickReply = (response: string) => {
    onQuickReply(response)
    setShowSuggestions(false)
  }

  if (!isExpanded) {
    return (
      <div className="flex items-center justify-center py-2">
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
        >
          Show AI message
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start space-x-3 p-4 group">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${getPromptTypeColor(message.promptType)} shadow-sm`}>
          <span className="text-lg">{getPromptTypeIcon(message.promptType)}</span>
        </div>
      </div>

      {/* AI Message Content */}
      <div className="flex-1 min-w-0">
        {/* AI Name and Time */}
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">Sage</span>
            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
              AI Assistant
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {formatTime(message.created_at)}
          </span>
          
          {/* Dismiss button */}
          {onDismiss && (
            <button
              onClick={() => {
                setIsExpanded(false)
                onDismiss(message.id)
              }}
              className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* AI Message Bubble */}
        <div className={`inline-block max-w-2xl bg-gradient-to-br ${getPromptTypeColor(message.promptType)} border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm`}>
          <p className="text-sm text-gray-800 leading-relaxed">
            {message.content}
          </p>
          
          {/* AI Metadata (optional, for debugging) */}
          {process.env.NODE_ENV === 'development' && message.metadata && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <span>Model: {message.metadata.model}</span>
                {message.metadata.confidence && (
                  <span>• Confidence: {Math.round(message.metadata.confidence * 100)}%</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Suggested Responses */}
        {showSuggestions && message.suggestedResponses && message.suggestedResponses.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">Quick replies:</p>
            <div className="flex flex-wrap gap-2">
              {message.suggestedResponses.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(suggestion)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Actions */}
        <div className="flex items-center mt-2 space-x-3 text-xs text-gray-500">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="hover:text-gray-700 transition-colors"
          >
            {showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
          </button>
          
          <span>•</span>
          
          <span className="capitalize">{message.promptType} prompt</span>
          
          {message.metadata?.confidence && (
            <>
              <span>•</span>
              <span title="AI confidence score">
                {Math.round(message.metadata.confidence * 100)}% confident
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Typing indicator for AI
export function AITypingIndicator() {
  return (
    <div className="flex items-start space-x-3 p-4">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm">
          <span className="text-lg">🤔</span>
        </div>
      </div>

      {/* Typing Animation */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium text-gray-900">Sage</span>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
            AI Assistant
          </span>
        </div>

        <div className="inline-block bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs text-gray-500 ml-2">Sage is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  )
}