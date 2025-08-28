import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Message } from './useMessages'

interface UseRealTimeSubscriptionProps {
  branchId: string
  userId: string
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  scrollToBottom: (smooth?: boolean) => void
}

export function useRealTimeSubscription({
  branchId,
  userId,
  messages,
  setMessages,
  scrollToBottom
}: UseRealTimeSubscriptionProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!branchId) return

    const postsChannel = supabase
      .channel(`posts-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `branch_id=eq.${branchId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: newPost, error } = await supabase
              .from('posts')
              .select(`
                *,
                profiles (first_name, last_name, avatar_url),
                comments (
                  *,
                  profiles (first_name, last_name, avatar_url)
                ),
                likes (user_id)
              `)
              .eq('id', payload.new.id)
              .single()
            
            if (!error && newPost) {
              setMessages(prevMessages => {
                // Check if message already exists to prevent duplicates
                const exists = prevMessages.some(msg => msg.id === newPost.id)
                if (exists) return prevMessages
                
                const newMessages = [newPost, ...prevMessages]
                
                // Auto-scroll if user is near bottom or it's their own message
                setTimeout(() => {
                  const container = messagesContainerRef.current
                  if (container) {
                    const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100
                    const isOwnMessage = newPost.author_id === userId
                    
                    if (isNearBottom || isOwnMessage) {
                      scrollToBottom()
                    }
                  }
                }, 100)
                
                return newMessages
              })
            }
          } else if (payload.eventType === 'DELETE') {
            setMessages(prevMessages => 
              prevMessages.filter(msg => msg.id !== payload.old.id)
            )
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === payload.new.id 
                  ? { ...msg, ...payload.new }
                  : msg
              )
            )
          }
        }
      )
      .subscribe()

    // Subscribe to likes changes
    const likesChannel = supabase
      .channel(`likes-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            const postId = payload.new?.post_id || payload.old?.post_id
            if (!postId) return

            // Check if this like is for a post in our current branch
            const { data: post } = await supabase
              .from('posts')
              .select('branch_id')
              .eq('id', postId)
              .single()

            if (post?.branch_id === branchId) {
              // Fetch updated likes for this post
              const { data: updatedLikes } = await supabase
                .from('likes')
                .select('user_id')
                .eq('post_id', postId)

              setMessages(prevMessages =>
                prevMessages.map(msg =>
                  msg.id === postId
                    ? { ...msg, likes: updatedLikes || [] }
                    : msg
                )
              )
            }
          }
        }
      )
      .subscribe()

    // Subscribe to comments changes
    const commentsChannel = supabase
      .channel(`comments-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: newComment } = await supabase
              .from('comments')
              .select(`
                *,
                profiles (first_name, last_name, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single()

            if (newComment) {
              // Check if this comment is for a post in our current branch
              const { data: post } = await supabase
                .from('posts')
                .select('branch_id')
                .eq('id', newComment.post_id)
                .single()

              if (post?.branch_id === branchId) {
                setMessages(prevMessages =>
                  prevMessages.map(msg =>
                    msg.id === newComment.post_id
                      ? { ...msg, comments: [...(msg.comments || []), newComment] }
                      : msg
                  )
                )
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      postsChannel.unsubscribe()
      likesChannel.unsubscribe()
      commentsChannel.unsubscribe()
    }
  }, [branchId, userId, setMessages, scrollToBottom])

  return { messagesContainerRef }
}