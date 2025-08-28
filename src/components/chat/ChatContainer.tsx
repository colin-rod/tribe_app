'use client'

import type { User } from '@supabase/supabase-js'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import AIMessageBubble, { AITypingIndicator } from './AIMessageBubble'
import { useMessages } from '@/hooks/useMessages'
import { useRealTimeSubscription } from '@/hooks/useRealTimeSubscription'
import { useAIPrompts } from '@/hooks/useAIPrompts'
import { useScrollToBottom } from '@/hooks/useScrollToBottom'
import { handleError, getUserFriendlyMessage } from '@/lib/error-handler'

interface ChatContainerProps {
  user: User
  branch: {
    id: string
    name: string
    color: string
    description?: string
  }
  canPost: boolean
}

export default function ChatContainer({ user, branch, canPost }: ChatContainerProps) {
  const { messagesEndRef, scrollToBottom } = useScrollToBottom()
  
  const {
    messages,
    loading,
    setMessages,
    sendMessage,
    toggleLike,
    deleteMessage
  } = useMessages({ branchId: branch.id, userId: user.id })

  const {
    aiPrompts,
    aiThinking,
    handleAIQuickReply,
    dismissPrompt
  } = useAIPrompts({ userId: user.id, branchId: branch.id, messages })

  const { messagesContainerRef } = useRealTimeSubscription({
    branchId: branch.id,
    userId: user.id,
    messages,
    setMessages,
    scrollToBottom
  })

  const handleSendMessage = async (content: string, files: File[], milestoneType?: string) => {
    try {
      await sendMessage(content, files, milestoneType)
    } catch (error) {
      const appError = handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to send message' 
      })
      // Could show toast notification with getUserFriendlyMessage(appError)
    }
  }

  const handleLikeMessage = async (messageId: string) => {
    try {
      await toggleLike(messageId)
    } catch (error) {
      const appError = handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to toggle like' 
      })
      // Could show toast notification with getUserFriendlyMessage(appError)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId)
    } catch (error) {
      const appError = handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to delete message' 
      })
      // Could show toast notification with getUserFriendlyMessage(appError)
    }
  }

  const handleReplyToMessage = (messageId: string) => {
    // Could implement threading here in the future
    console.log('Reply to message:', messageId)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gray-50"
        style={{ minHeight: 0 }} // Important for flex child scrolling
      >
        {messages.length === 0 && aiPrompts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
              <p className="text-gray-500 mb-4">Share what&apos;s on your mind with {branch.name}</p>
            </div>
          </div>
        ) : (
          <div className="pb-4">
            {/* Combine and sort messages with AI prompts */}
            {(() => {
              const allMessages = [
                ...messages.map(m => ({ ...m, type: 'message', timestamp: new Date(m.created_at) })),
                ...aiPrompts.map(p => ({ ...p, type: 'ai-prompt', timestamp: p.createdAt }))
              ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

              return allMessages.map((item) => {
                if (item.type === 'ai-prompt') {
                  return (
                    <AIMessageBubble
                      key={`ai-${item.id}`}
                      message={{
                        id: item.id,
                        content: item.content,
                        promptType: item.promptType,
                        created_at: item.createdAt.toISOString(),
                        suggestedResponses: item.suggestedResponses,
                        metadata: item.aiMetadata
                      }}
                      onQuickReply={(response) => handleAIQuickReply(item.id, response)}
                      onDismiss={(promptId) => dismissPrompt(promptId)}
                    />
                  )
                } else {
                  return (
                    <MessageBubble
                      key={`msg-${item.id}`}
                      message={item}
                      currentUser={user}
                      isOwnMessage={item.author_id === user.id}
                      onLike={handleLikeMessage}
                      onReply={handleReplyToMessage}
                      onDelete={item.author_id === user.id ? handleDeleteMessage : undefined}
                    />
                  )
                }
              })
            })()}
            
            {/* AI Thinking Indicator */}
            {aiThinking && <AITypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      {canPost ? (
        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder={`Message ${branch.name}...`}
        />
      ) : (
        <div className="p-4 bg-gray-100 border-t">
          <p className="text-center text-gray-500 text-sm">
            You don&apos;t have permission to post in this branch
          </p>
        </div>
      )}
    </div>
  )
}