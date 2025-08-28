'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface MessageBubbleProps {
  message: {
    id: string
    content: string | null
    media_urls: string[] | null
    milestone_type: string | null
    milestone_date: string | null
    created_at: string
    author_id: string
    profiles: {
      first_name: string
      last_name: string
      avatar_url: string | null
    }
    likes: { user_id: string }[]
    comments: {
      id: string
      content: string
      created_at: string
      author_id: string
      profiles: {
        first_name: string
        last_name: string
        avatar_url: string | null
      }
    }[]
  }
  currentUser: User
  isOwnMessage: boolean
  onLike: (messageId: string) => void
  onReply: (messageId: string) => void
  onDelete?: (messageId: string) => void
}

export default function MessageBubble({ 
  message, 
  currentUser, 
  isOwnMessage, 
  onLike, 
  onReply,
  onDelete 
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const router = useRouter()

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    
    // Same day
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    // This week
    if (diffMs < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const isLiked = message.likes?.some(like => like.user_id === currentUser.id)

  return (
    <div 
      className={`flex items-start space-x-3 p-4 group hover:bg-gray-50 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <button
        onClick={() => message.author_id !== currentUser.id ? router.push(`/profile/${message.author_id}`) : router.push('/profile')}
        className="flex-shrink-0"
      >
        {message.profiles?.avatar_url ? (
          <img
            className="w-10 h-10 rounded-full object-cover"
            src={message.profiles.avatar_url}
            alt={`${message.profiles.first_name} ${message.profiles.last_name}`}
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {message.profiles?.first_name?.[0]}{message.profiles?.last_name?.[0]}
            </span>
          </div>
        )}
      </button>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Author and Time */}
        <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <button
            onClick={() => message.author_id !== currentUser.id ? router.push(`/profile/${message.author_id}`) : router.push('/profile')}
            className="text-sm font-medium text-gray-900 hover:text-blue-600"
          >
            {isOwnMessage ? 'You' : `${message.profiles?.first_name} ${message.profiles?.last_name}`}
          </button>
          <span className="text-xs text-gray-500">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Message Bubble */}
        <div className={`inline-block max-w-xs lg:max-w-md xl:max-w-lg ${
          isOwnMessage 
            ? 'bg-blue-500 text-white rounded-l-lg rounded-tr-lg rounded-br-sm' 
            : 'bg-white border border-gray-200 text-gray-900 rounded-r-lg rounded-tl-lg rounded-bl-sm shadow-sm'
        } px-4 py-2 relative`}>
          
          {/* Milestone Badge */}
          {message.milestone_type && (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${
              isOwnMessage 
                ? 'bg-blue-400 text-blue-50' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              🎉 {message.milestone_type.replace('_', ' ')}
            </div>
          )}

          {/* Text Content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Media Content */}
          {message.media_urls && message.media_urls.length > 0 && (
            <div className={`${message.content ? 'mt-2' : ''}`}>
              {message.media_urls.length === 1 ? (
                <div className="rounded-lg overflow-hidden max-w-sm">
                  {message.media_urls[0].includes('.mp4') || message.media_urls[0].includes('.mov') || message.media_urls[0].includes('.webm') ? (
                    <video 
                      src={message.media_urls[0]} 
                      controls 
                      className="w-full max-h-64 object-cover"
                    />
                  ) : (
                    <img 
                      src={message.media_urls[0]} 
                      alt="Shared media" 
                      className="w-full max-h-64 object-cover cursor-pointer"
                      onClick={() => {
                        // TODO: Implement image viewer modal
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden max-w-sm">
                  {message.media_urls.slice(0, 4).map((url: string, index: number) => (
                    <div key={index} className="relative">
                      {url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') ? (
                        <video 
                          src={url} 
                          controls 
                          className="w-full h-20 object-cover"
                        />
                      ) : (
                        <img 
                          src={url} 
                          alt={`Media ${index + 1}`} 
                          className="w-full h-20 object-cover cursor-pointer"
                          onClick={() => {
                            // TODO: Implement image viewer modal
                          }}
                        />
                      )}
                      {index === 3 && message.media_urls!.length > 4 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            +{message.media_urls!.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        <div className={`flex items-center mt-1 space-x-2 text-xs ${
          isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
        } ${showActions || message.likes?.length > 0 || message.comments?.length > 0 ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          
          {/* Like Button */}
          <button
            onClick={() => onLike(message.id)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-full transition-colors ${
              isLiked 
                ? 'text-red-500 hover:text-red-600' 
                : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {message.likes?.length > 0 && (
              <span>{message.likes.length}</span>
            )}
          </button>

          {/* Reply Button */}
          <button
            onClick={() => {
              setShowComments(!showComments)
              onReply(message.id)
            }}
            className="flex items-center space-x-1 px-2 py-1 rounded-full text-gray-500 hover:text-blue-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {message.comments?.length > 0 && (
              <span>{message.comments.length}</span>
            )}
          </button>

          {/* Delete Button (own messages only) */}
          {isOwnMessage && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="px-2 py-1 rounded-full text-gray-500 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Comments Thread */}
        {showComments && message.comments && message.comments.length > 0 && (
          <div className="mt-3 space-y-2 border-l-2 border-gray-100 pl-4">
            {message.comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {comment.profiles?.first_name?.[0]}{comment.profiles?.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-gray-900">
                      {comment.author_id === currentUser.id ? 'You' : `${comment.profiles?.first_name} ${comment.profiles?.last_name}`}
                    </p>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(comment.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}