import { useRef, useCallback } from 'react'

export function useScrollToBottom() {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    })
  }, [])

  return {
    messagesEndRef,
    scrollToBottom
  }
}