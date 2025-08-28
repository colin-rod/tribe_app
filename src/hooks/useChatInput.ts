import { useState, useRef, useCallback, useEffect } from 'react'
import { handleError, ErrorCodes, createError } from '@/lib/error-handler'

interface UseChatInputProps {
  onSendMessage: (content: string, files: File[], milestoneType?: string) => Promise<void>
  disabled?: boolean
}

const generatePreview = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      resolve('')
    }
  })
}

export function useChatInput({ onSendMessage, disabled = false }: UseChatInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMilestones, setShowMilestones] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [sending, setSending] = useState(false)
  const [voiceError, setVoiceError] = useState<string>('')
  const [isListening, setIsListening] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const addFiles = useCallback(async (newFiles: File[]) => {
    try {
      if (newFiles.length + files.length > 5) {
        throw createError('Maximum 5 files allowed', ErrorCodes.VALIDATION_ERROR)
      }

      const validFiles: File[] = []
      
      for (const file of newFiles) {
        const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/')
        const isValidSize = file.size <= 50 * 1024 * 1024 // 50MB limit
        
        if (!isValidType) {
          throw createError(
            `${file.name} is not a supported file type`, 
            ErrorCodes.INVALID_FILE_TYPE,
            { fileName: file.name, fileType: file.type }
          )
        }
        
        if (!isValidSize) {
          throw createError(
            `${file.name} is too large (max 50MB)`, 
            ErrorCodes.FILE_TOO_LARGE,
            { fileName: file.name, fileSize: file.size }
          )
        }
        
        validFiles.push(file)
      }

      if (validFiles.length === 0) return

      const newPreviews = await Promise.all(validFiles.map(generatePreview))
      
      setFiles([...files, ...validFiles])
      setPreviewUrls([...previewUrls, ...newPreviews])
      setIsExpanded(true)
    } catch (error) {
      handleError(error, { 
        logError: true,
        showToUser: true 
      })
    }
  }, [files, previewUrls])

  const removeFile = useCallback((index: number) => {
    if (previewUrls[index] && previewUrls[index].startsWith('blob:')) {
      URL.revokeObjectURL(previewUrls[index])
    }
    
    setFiles(files.filter((_, i) => i !== index))
    setPreviewUrls(previewUrls.filter((_, i) => i !== index))
    
    if (files.length === 1 && !message.trim()) {
      setIsExpanded(false)
    }
  }, [files, previewUrls, message])

  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newMessage = message.slice(0, start) + emoji + message.slice(end)
    
    setMessage(newMessage)
    setShowEmojiPicker(false)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }, [message])

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setMessage(prev => prev + (prev ? ' ' : '') + transcript)
    setVoiceError('')
    setIsListening(false)
    
    // Focus textarea after voice input
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }, [])

  const handleVoiceError = useCallback((error: string) => {
    setVoiceError(error)
    setIsListening(false)
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setVoiceError('')
    }, 5000)
  }, [])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!message.trim() && files.length === 0) return
    
    setSending(true)
    
    try {
      await onSendMessage(message.trim(), files, selectedMilestone || undefined)
      
      // Reset form
      setMessage('')
      setFiles([])
      setPreviewUrls([])
      setSelectedMilestone('')
      setIsExpanded(false)
      setShowMilestones(false)
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to send message' 
      })
    } finally {
      setSending(false)
    }
  }, [message, files, selectedMilestone, onSendMessage])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const canSend = (message.trim() || files.length > 0) && !sending

  return {
    // State
    message,
    files,
    previewUrls,
    showEmojiPicker,
    showMilestones,
    selectedMilestone,
    isExpanded,
    sending,
    voiceError,
    isListening,
    canSend,
    
    // Refs
    textareaRef,
    fileInputRef,
    
    // Setters
    setMessage,
    setShowEmojiPicker,
    setShowMilestones,
    setSelectedMilestone,
    setIsExpanded,
    setIsListening,
    
    // Handlers
    addFiles,
    removeFile,
    insertEmoji,
    handleVoiceTranscript,
    handleVoiceError,
    handleSubmit,
    handleKeyPress
  }
}