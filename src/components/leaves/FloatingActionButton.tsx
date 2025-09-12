'use client'

import React, { useState } from 'react'
import { Plus, Camera, Video, Mic, Type, Flag, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface FloatingActionButtonProps {
  onCreateContent: (type: 'photo' | 'video' | 'audio' | 'text' | 'milestone') => void
  disabled?: boolean
  className?: string
}

const contentTypes = [
  {
    type: 'photo' as const,
    label: 'Photo',
    icon: Camera,
    color: 'bg-green-500 hover:bg-green-600',
    description: 'Upload photos'
  },
  {
    type: 'video' as const,
    label: 'Video',
    icon: Video,
    color: 'bg-blue-500 hover:bg-blue-600',
    description: 'Upload videos'
  },
  {
    type: 'audio' as const,
    label: 'Audio',
    icon: Mic,
    color: 'bg-purple-500 hover:bg-purple-600',
    description: 'Record audio'
  },
  {
    type: 'text' as const,
    label: 'Note',
    icon: Type,
    color: 'bg-gray-500 hover:bg-gray-600',
    description: 'Write a note'
  },
  {
    type: 'milestone' as const,
    label: 'Milestone',
    icon: Flag,
    color: 'bg-yellow-500 hover:bg-yellow-600',
    description: 'Mark milestone'
  }
]

export default function FloatingActionButton({ 
  onCreateContent, 
  disabled = false, 
  className = '' 
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleCreateContent = (type: 'photo' | 'video' | 'audio' | 'text' | 'milestone') => {
    onCreateContent(type)
    setIsOpen(false)
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Action Items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 space-y-3"
          >
            {contentTypes.map((item, index) => (
              <motion.div
                key={item.type}
                initial={{ opacity: 0, x: 20, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  y: 0,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ 
                  opacity: 0, 
                  x: 20, 
                  y: 10,
                  transition: { delay: (contentTypes.length - 1 - index) * 0.05 }
                }}
                className="flex items-center justify-end gap-3"
              >
                {/* Label */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    transition: { delay: index * 0.05 + 0.1 }
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-white text-gray-700 px-3 py-2 rounded-lg shadow-lg border text-sm font-medium whitespace-nowrap"
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </motion.div>

                {/* Action Button */}
                <button
                  onClick={() => handleCreateContent(item.type)}
                  className={`w-12 h-12 rounded-full text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 ${item.color}`}
                  disabled={disabled}
                >
                  <item.icon className="w-5 h-5 mx-auto" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-14 h-14 rounded-full shadow-lg transition-all duration-200 
          flex items-center justify-center text-white font-medium
          hover:scale-110 active:scale-95
          ${disabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : isOpen 
              ? 'bg-red-500 hover:bg-red-600 rotate-45' 
              : 'bg-blue-600 hover:bg-blue-700'
          }
        `}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? -45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.div>
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Alternative compact version for smaller screens
export function CompactFloatingActionButton({ 
  onCreateContent, 
  disabled = false, 
  className = '' 
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleCreateContent = (type: 'photo' | 'video' | 'audio' | 'text' | 'milestone') => {
    onCreateContent(type)
    setIsOpen(false)
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Quick Actions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-12 right-0 bg-white rounded-2xl shadow-xl border p-2 flex gap-2"
          >
            {contentTypes.slice(0, 3).map((item, index) => (
              <motion.button
                key={item.type}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ opacity: 0, scale: 0 }}
                onClick={() => handleCreateContent(item.type)}
                className={`w-10 h-10 rounded-xl text-white transition-all duration-200 hover:scale-110 ${item.color}`}
                title={item.description}
              >
                <item.icon className="w-4 h-4 mx-auto" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-12 h-12 rounded-full shadow-lg transition-all duration-200 
          flex items-center justify-center text-white
          hover:scale-110 active:scale-95
          ${disabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : isOpen 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-600 hover:bg-blue-700'
          }
        `}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </motion.button>
    </div>
  )
}