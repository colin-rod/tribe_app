'use client'

import { useState, useRef, useEffect } from 'react'
import { handleError, ErrorCodes, createError, getUserFriendlyMessage } from '@/lib/error-handler'

// TypeScript interfaces for Speech Recognition API
interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported'
  message?: string
}

interface SpeechRecognitionResult {
  readonly confidence: number
  readonly transcript: string
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
  readonly resultIndex: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  grammars: unknown
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  abort(): void
  start(): void
  stop(): void
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition
  prototype: SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

interface VoiceInputProps {
  onTranscript: (text: string) => void
  onError?: (error: string) => void
  isDisabled?: boolean
}

export default function VoiceInput({ onTranscript, onError, isDisabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setIsSupported(true)
      
      // Initialize speech recognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript
        onTranscript(transcript)
        setIsListening(false)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false)
        
        const appError = createError(
          'Speech recognition failed',
          ErrorCodes.SPEECH_RECOGNITION_ERROR,
          { 
            speechError: event.error,
            originalMessage: event.message 
          }
        )
        
        const userFriendlyMessage = getUserFriendlyMessage(appError)
        
        // Log the error for debugging
        handleError(appError, { logError: true })
        
        if (onError) {
          onError(userFriendlyMessage)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } else {
      setIsSupported(false)
    }
  }, [onTranscript, onError])

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isDisabled) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        const appError = handleError(error, { 
          logError: true,
          fallbackMessage: 'Failed to start voice input' 
        })
        
        if (onError) {
          onError(getUserFriendlyMessage(appError))
        }
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  if (!isSupported) {
    return null // Hide the button if not supported
  }

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={isDisabled}
      className={`p-2 rounded-full transition-all duration-200 ${
        isListening
          ? 'bg-red-500 text-white animate-pulse'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isListening ? 'Click to stop recording' : 'Click to start voice input'}
    >
      {isListening ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6V6z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>
  )
}

// Voice input status indicator
export function VoiceInputStatus({ isListening, error }: { isListening: boolean; error?: string }) {
  if (!isListening && !error) return null

  return (
    <div className="flex items-center space-x-2 text-sm px-3 py-2 bg-gray-100 rounded-lg">
      {isListening ? (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-gray-700">Listening... speak now</span>
        </>
      ) : error ? (
        <>
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-700">{error}</span>
        </>
      ) : null}
    </div>
  )
}