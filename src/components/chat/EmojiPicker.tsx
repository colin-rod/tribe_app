'use client'

import { useRef, useEffect } from 'react'

interface EmojiPickerProps {
  isOpen: boolean
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
  disabled?: boolean
}

const popularEmojis = [
  '😀', '😊', '😍', '🥰', '😘', '😂', '🤣', '😭', '🥳', '😴',
  '👶', '👧', '👦', '👨', '👩', '👪', '❤️', '💕', '👏', '🎉'
]

export default function EmojiPicker({ isOpen, onEmojiSelect, onClose, disabled = false }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-gray-600 rounded"
        disabled={disabled}
      >
        <span className="text-lg">😊</span>
      </button>
      
      {isOpen && (
        <div 
          ref={pickerRef}
          className="absolute bottom-full right-0 mb-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64"
        >
          <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
            {popularEmojis.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onEmojiSelect(emoji)}
                className="text-lg hover:bg-gray-100 rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}