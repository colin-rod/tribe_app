import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { handleError, ErrorCodes, createError } from '@/lib/error-handler'

export interface Message {
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

interface UseMessagesProps {
  branchId: string
  userId: string
}

export function useMessages({ branchId, userId }: UseMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const loadMessages = useCallback(async () => {
    if (!branchId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
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
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw createError('Failed to load messages', ErrorCodes.DATABASE_ERROR, { error })
      }

      setMessages(data || [])
    } catch (error) {
      handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to load messages' 
      })
    } finally {
      setLoading(false)
    }
  }, [branchId])

  const sendMessage = useCallback(async (
    content: string, 
    files: File[], 
    milestoneType?: string
  ) => {
    if (!content.trim() && files.length === 0) return

    try {
      let mediaUrls: string[] = []
      
      // Upload files if any
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `posts/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, file)

          if (uploadError) {
            throw createError('Failed to upload file', ErrorCodes.FILE_UPLOAD_FAILED, { 
              uploadError,
              fileName: file.name 
            })
          }

          const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(filePath)

          return urlData.publicUrl
        })

        mediaUrls = await Promise.all(uploadPromises)
      }

      // Create post
      const postData: {
        branch_id: string
        author_id: string
        content: string | null
        media_urls?: string[]
        milestone_type?: string
        milestone_date?: string
      } = {
        branch_id: branchId,
        author_id: userId,
        content: content.trim() || null,
      }

      if (mediaUrls.length > 0) {
        postData.media_urls = mediaUrls
      }

      if (milestoneType) {
        postData.milestone_type = milestoneType
        postData.milestone_date = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('posts')
        .insert([postData])

      if (error) {
        throw createError('Failed to send message', ErrorCodes.DATABASE_ERROR, { error })
      }

    } catch (error) {
      const appError = handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to send message' 
      })
      throw appError
    }
  }, [branchId, userId])

  const toggleLike = useCallback(async (messageId: string) => {
    try {
      // Check if user already liked this post
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', messageId)
        .eq('user_id', userId)
        .single()

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', messageId)
          .eq('user_id', userId)

        if (error) {
          throw createError('Failed to unlike post', ErrorCodes.DATABASE_ERROR, { error })
        }
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert([{
            post_id: messageId,
            user_id: userId
          }])

        if (error) {
          throw createError('Failed to like post', ErrorCodes.DATABASE_ERROR, { error })
        }
      }
    } catch (error) {
      handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to toggle like' 
      })
    }
  }, [userId])

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', messageId)
        .eq('author_id', userId) // Only allow deleting own messages

      if (error) {
        throw createError('Failed to delete message', ErrorCodes.DATABASE_ERROR, { error })
      }
    } catch (error) {
      const appError = handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to delete message' 
      })
      throw appError
    }
  }, [userId])

  // Load messages on branchId change
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  return {
    messages,
    loading,
    setMessages,
    loadMessages,
    sendMessage,
    toggleLike,
    deleteMessage
  }
}