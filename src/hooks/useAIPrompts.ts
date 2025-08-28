import { useState, useCallback, useEffect } from 'react'
import { getPromptingEngine } from '@/lib/ai/promptingEngine'
import { initializeAIService } from '@/lib/ai/config'
import type { SmartPrompt } from '@/lib/ai/promptingEngine'
import type { Message } from './useMessages'
import { handleError } from '@/lib/error-handler'

interface UseAIPromptsProps {
  userId: string
  branchId: string
  messages: Message[]
}

export function useAIPrompts({ userId, branchId, messages }: UseAIPromptsProps) {
  const [aiPrompts, setAiPrompts] = useState<SmartPrompt[]>([])
  const [aiThinking, setAiThinking] = useState(false)

  const loadAIPrompts = useCallback(async () => {
    try {
      const promptingEngine = getPromptingEngine()
      const pendingPrompts = await promptingEngine.getPendingPrompts(userId, branchId)
      setAiPrompts(pendingPrompts)
    } catch (error) {
      handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to load AI prompts' 
      })
    }
  }, [userId, branchId])

  const generateInitialPrompt = useCallback(async () => {
    try {
      setAiThinking(true)
      const promptingEngine = getPromptingEngine()
      const prompt = await promptingEngine.generateProactivePrompt(userId, branchId)
      
      if (prompt) {
        setAiPrompts([prompt])
      }
    } catch (error) {
      handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to generate AI prompt' 
      })
    } finally {
      setAiThinking(false)
    }
  }, [userId, branchId])

  const initializeAI = useCallback(async () => {
    try {
      initializeAIService()
      
      // Check for pending prompts first
      const promptingEngine = getPromptingEngine()
      const pendingPrompts = await promptingEngine.getPendingPrompts(userId, branchId)
      
      if (pendingPrompts.length > 0) {
        setAiPrompts(pendingPrompts)
      } else {
        // Generate initial prompt if no messages and no pending prompts
        if (messages.length === 0) {
          generateInitialPrompt()
        }
      }
    } catch (error) {
      handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to initialize AI service' 
      })
    }
  }, [userId, branchId, messages.length, generateInitialPrompt])

  const handleAIQuickReply = useCallback(async (promptId: string, response: string) => {
    try {
      setAiThinking(true)
      
      const promptingEngine = getPromptingEngine()
      const aiResponse = await promptingEngine.processUserResponse(promptId, response, userId, branchId)
      
      // Remove the responded prompt
      setAiPrompts(prev => prev.filter(p => p.id !== promptId))
      
      // If AI has a follow-up, add it
      if (aiResponse) {
        // Add a small delay to make it feel more natural
        setTimeout(() => {
          const followUpPrompt: SmartPrompt = {
            id: crypto.randomUUID(),
            branchId,
            userId,
            content: aiResponse.message,
            promptType: aiResponse.promptType || 'followup',
            suggestedResponses: aiResponse.suggestedResponses || [],
            aiMetadata: {
              provider: 'follow-up',
              model: 'response',
              confidence: aiResponse.confidenceScore
            },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            status: 'pending'
          }
          
          setAiPrompts(prev => [followUpPrompt, ...prev])
          setAiThinking(false)
        }, 1500)
      } else {
        setAiThinking(false)
      }
    } catch (error) {
      handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to process AI response' 
      })
      setAiThinking(false)
    }
  }, [userId, branchId])

  const dismissPrompt = useCallback((promptId: string) => {
    setAiPrompts(prev => prev.filter(p => p.id !== promptId))
  }, [])

  const checkForMilestonePrompts = useCallback(async () => {
    try {
      const promptingEngine = getPromptingEngine()
      const milestonePrompts = await promptingEngine.checkForMilestones(branchId)
      
      if (milestonePrompts.length > 0) {
        setAiPrompts(prev => [...milestonePrompts, ...prev])
      }
    } catch (error) {
      handleError(error, { 
        logError: true,
        fallbackMessage: 'Failed to check for milestone prompts' 
      })
    }
  }, [branchId])

  // Initialize AI on mount and when dependencies change
  useEffect(() => {
    initializeAI()
  }, [initializeAI])

  // Check for milestone prompts when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Check if the latest message has a milestone
      const latestMessage = messages[0]
      if (latestMessage && latestMessage.milestone_type) {
        checkForMilestonePrompts()
      }
    }
  }, [messages, checkForMilestonePrompts])

  return {
    aiPrompts,
    aiThinking,
    setAiPrompts,
    loadAIPrompts,
    generateInitialPrompt,
    initializeAI,
    handleAIQuickReply,
    dismissPrompt,
    checkForMilestonePrompts
  }
}