/**
 * Smart Prompting Engine
 * Orchestrates AI-driven conversations and manages proactive prompting
 */

import { supabase } from '@/lib/supabase/client'
import { getAIService } from './aiService'
import { getContextManager } from './contextManager'
import { getRandomPromptTemplate } from './promptTemplates'
import { isAIConfigured, getDemoAIResponse } from './config'
import { getResponseAnalyzer } from './responseAnalyzer'
import { getPersonalizedPromptingSystem } from './personalizedPrompting'
import type { AIResponse } from './aiService'
import type { MessageAnalysis } from './responseAnalyzer'

export interface SmartPrompt {
  id: string
  branchId: string
  userId: string
  content: string
  promptType: 'checkin' | 'milestone' | 'memory' | 'followup' | 'celebration'
  suggestedResponses: string[]
  aiMetadata: {
    provider: string
    model: string
    confidence: number
    template?: string
  }
  createdAt: Date
  expiresAt: Date
  status: 'pending' | 'responded' | 'dismissed' | 'expired'
}

export interface PromptEngineConfig {
  enableProactivePrompts: boolean
  promptingSchedule: {
    enabled: boolean
    times: string[] // ['09:00', '18:00'] for morning and evening
  }
  milestoneDetection: {
    enabled: boolean
    autoTrigger: boolean
  }
  responseTimeout: number // hours before prompt expires
}

class SmartPromptingEngine {
  private config: PromptEngineConfig = {
    enableProactivePrompts: true,
    promptingSchedule: {
      enabled: true,
      times: ['09:00', '19:00'] // 9 AM and 7 PM
    },
    milestoneDetection: {
      enabled: true,
      autoTrigger: true
    },
    responseTimeout: 48 // 48 hours
  }

  /**
   * Generate a proactive AI prompt for a user in a branch
   */
  async generateProactivePrompt(userId: string, branchId: string): Promise<SmartPrompt | null> {
    try {
      const contextManager = getContextManager()
      
      // Check if user should receive a prompt
      if (!contextManager.shouldPromptUser(userId, branchId)) {
        return null
      }

      // Get AI context
      const aiContext = await contextManager.getAIContext(userId, branchId)
      const personalizedSystem = getPersonalizedPromptingSystem()
      
      // Try to generate personalized prompt first
      let aiResponse: AIResponse
      try {
        const personalizedPrompt = await personalizedSystem.generatePersonalizedPrompt(
          userId,
          branchId,
          new Date()
        )
        
        if (personalizedPrompt.confidence > 0.6) {
          // Use personalized prompt
          aiResponse = {
            message: personalizedPrompt.content,
            promptType: personalizedPrompt.promptType,
            suggestedResponses: personalizedPrompt.suggestedResponses,
            confidenceScore: personalizedPrompt.confidence
          }
        } else {
          throw new Error('Personalized confidence too low, falling back to template')
        }
      } catch (error) {
        // Fallback to template-based approach
        const template = getRandomPromptTemplate({
          timeOfDay: aiContext.timeContext.timeOfDay,
          dayOfWeek: aiContext.timeContext.dayOfWeek,
          recentKeywords: this.extractKeywordsFromMessages(aiContext.recentMessages)
        })

        if (isAIConfigured()) {
          const aiService = getAIService()
          aiResponse = await aiService.generatePrompt(aiContext)
        } else {
          // Demo mode
          const demoContent = getDemoAIResponse(template.type, {
            userName: aiContext.userName,
            branchName: aiContext.branchName
          })
          aiResponse = {
            message: demoContent,
            promptType: template.type,
            suggestedResponses: template.suggestedResponses || [],
            confidenceScore: 0.8
          }
        }
      }

      // Create smart prompt
      const smartPrompt: SmartPrompt = {
        id: crypto.randomUUID(),
        branchId,
        userId,
        content: aiResponse.message,
        promptType: aiResponse.promptType,
        suggestedResponses: aiResponse.suggestedResponses || [],
        aiMetadata: {
          provider: isAIConfigured() ? 'configured' : 'demo',
          model: isAIConfigured() ? 'ai-model' : 'demo',
          confidence: aiResponse.confidenceScore,
          template: template.id
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.responseTimeout * 60 * 60 * 1000),
        status: 'pending'
      }

      // Persist to database
      await this.saveSmartPrompt(smartPrompt)

      // Update conversation state
      await contextManager.updateUserState(userId, branchId, {
        prompt: smartPrompt.content,
        response: '', // No response yet
        engagement: 'medium'
      })

      return smartPrompt
    } catch (error) {
      console.error('Error generating proactive prompt:', error)
      return null
    }
  }

  /**
   * Process user response to an AI prompt
   */
  async processUserResponse(
    promptId: string,
    userResponse: string,
    userId: string,
    branchId: string
  ): Promise<AIResponse | null> {
    try {
      // Get the original prompt
      const prompt = await this.getSmartPrompt(promptId)
      if (!prompt || prompt.status !== 'pending') {
        return null
      }

      // Mark prompt as responded
      await this.updatePromptStatus(promptId, 'responded')

      const contextManager = getContextManager()
      const responseAnalyzer = getResponseAnalyzer()
      
      // Analyze the user response
      const analysis = responseAnalyzer.analyzeMessage(userResponse)
      
      // Determine engagement level (enhanced with analysis)
      const engagement = this.assessUserEngagement(userResponse, analysis)
      
      // Store analysis for future reference
      await this.storeResponseAnalysis(userId, branchId, userResponse, analysis)
      
      // Update conversation state with rich analysis
      await contextManager.updateUserState(userId, branchId, {
        prompt: prompt.content,
        response: userResponse,
        engagement,
        analysis,
        tags: responseAnalyzer.generateSuggestedTags(analysis)
      })

      // Generate follow-up if appropriate
      if (userResponse.length > 20 && engagement !== 'low') {
        const aiContext = await contextManager.getAIContext(userId, branchId)
        
        let followUpResponse: AIResponse
        if (isAIConfigured()) {
          const aiService = getAIService()
          followUpResponse = await aiService.processUserResponse(
            userResponse,
            aiContext,
            prompt.promptType
          )
        } else {
          // Demo follow-up
          const followUps = [
            "That sounds wonderful! Can you tell me more about that?",
            "I love hearing these details! What was the best part?",
            "That's so sweet! How did everyone feel about it?",
            "What a special moment! Any other highlights from that day?"
          ]
          const randomFollowUp = followUps[Math.floor(Math.random() * followUps.length)]
          
          followUpResponse = {
            message: randomFollowUp,
            promptType: 'followup',
            confidenceScore: 0.7
          }
        }

        // Save follow-up as new prompt
        const followUpPrompt: SmartPrompt = {
          id: crypto.randomUUID(),
          branchId,
          userId,
          content: followUpResponse.message,
          promptType: 'followup',
          suggestedResponses: followUpResponse.suggestedResponses || [],
          aiMetadata: {
            provider: isAIConfigured() ? 'configured' : 'demo',
            model: isAIConfigured() ? 'ai-model' : 'demo',
            confidence: followUpResponse.confidenceScore,
          },
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.config.responseTimeout * 60 * 60 * 1000),
          status: 'pending'
        }

        await this.saveSmartPrompt(followUpPrompt)
        return followUpResponse
      }

      return null
    } catch (error) {
      console.error('Error processing user response:', error)
      return null
    }
  }

  /**
   * Check for milestone triggers in recent messages
   */
  async checkForMilestones(branchId: string): Promise<SmartPrompt[]> {
    if (!this.config.milestoneDetection.enabled) {
      return []
    }

    try {
      // Get recent messages
      const { data: recentMessages } = await supabase
        .from('posts')
        .select('*, profiles(first_name, last_name)')
        .eq('branch_id', branchId)
        .not('milestone_type', 'is', null)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (!recentMessages || recentMessages.length === 0) {
        return []
      }

      const prompts: SmartPrompt[] = []

      for (const message of recentMessages) {
        // Check if we already created a celebration prompt for this milestone
        const { data: existingPrompts } = await supabase
          .from('ai_system_messages')
          .select('*')
          .eq('branch_id', branchId)
          .eq('prompt_type', 'celebration')
          .gte('created_at', message.created_at)

        if (existingPrompts && existingPrompts.length > 0) {
          continue // Skip if we already celebrated this milestone
        }

        // Generate celebration prompt
        const contextManager = getContextManager()
        const aiContext = await contextManager.getAIContext(message.author_id, branchId)
        
        const celebrationContent = `🎉 What an amazing milestone! I saw that ${message.profiles?.first_name || 'someone'} reached a special moment with ${message.milestone_type?.replace('_', ' ')}. Tell me all about how this happened - I'd love to capture every detail of this precious memory!`

        const celebrationPrompt: SmartPrompt = {
          id: crypto.randomUUID(),
          branchId,
          userId: message.author_id,
          content: celebrationContent,
          promptType: 'celebration',
          suggestedResponses: [
            'It was amazing to watch!',
            'We were so proud!',
            'I have photos to share',
            'Such a special moment'
          ],
          aiMetadata: {
            provider: 'milestone-detection',
            model: 'auto-trigger',
            confidence: 0.9,
          },
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.config.responseTimeout * 60 * 60 * 1000),
          status: 'pending'
        }

        await this.saveSmartPrompt(celebrationPrompt)
        prompts.push(celebrationPrompt)
      }

      return prompts
    } catch (error) {
      console.error('Error checking for milestones:', error)
      return []
    }
  }

  /**
   * Get pending prompts for a user in a branch
   */
  async getPendingPrompts(userId: string, branchId: string): Promise<SmartPrompt[]> {
    try {
      const { data: prompts } = await supabase
        .from('ai_system_messages')
        .select('*')
        .eq('branch_id', branchId)
        .eq('user_id', userId)
        .eq('message_type', 'prompt')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      return prompts?.map(p => ({
        id: p.id,
        branchId: p.branch_id,
        userId: p.user_id,
        content: p.content,
        promptType: p.prompt_type,
        suggestedResponses: p.context_data?.suggestedResponses || [],
        aiMetadata: p.ai_metadata,
        createdAt: new Date(p.created_at),
        expiresAt: new Date(p.expires_at),
        status: 'pending'
      })) || []
    } catch (error) {
      console.error('Error getting pending prompts:', error)
      return []
    }
  }

  /**
   * Schedule proactive prompts for all active users
   */
  async scheduleProactivePrompts(): Promise<void> {
    if (!this.config.enableProactivePrompts || !this.config.promptingSchedule.enabled) {
      return
    }

    try {
      // Get all active branch members
      const { data: activeMembers } = await supabase
        .from('branch_members')
        .select(`
          user_id,
          branch_id,
          branches (name, type),
          profiles (first_name, last_name)
        `)
        .eq('status', 'active')

      if (!activeMembers) return

      // Check each user for prompting eligibility
      for (const member of activeMembers) {
        const shouldPrompt = await this.shouldSchedulePrompt(member.user_id, member.branch_id)
        
        if (shouldPrompt) {
          await this.generateProactivePrompt(member.user_id, member.branch_id)
        }
      }
    } catch (error) {
      console.error('Error scheduling proactive prompts:', error)
    }
  }

  private async shouldSchedulePrompt(userId: string, branchId: string): Promise<boolean> {
    // Check if user has recent activity
    const { data: recentActivity } = await supabase
      .from('posts')
      .select('created_at')
      .eq('branch_id', branchId)
      .eq('author_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    // Check if user has pending prompts
    const pendingPrompts = await this.getPendingPrompts(userId, branchId)
    
    // Don't prompt if user has pending prompts or was very recently active
    return pendingPrompts.length === 0 && (!recentActivity || recentActivity.length === 0)
  }

  private extractKeywordsFromMessages(messages: any[]): string[] {
    const keywords: string[] = []
    const keywordPattern = /\b(?:school|playground|food|sleep|play|birthday|milestone|first|new|love|fun|happy|excited)\b/gi
    
    messages.slice(0, 5).forEach(msg => {
      const matches = msg.content?.match(keywordPattern)
      if (matches) {
        keywords.push(...matches)
      }
    })
    
    return [...new Set(keywords.map(k => k.toLowerCase()))]
  }

  private assessUserEngagement(response: string, analysis?: MessageAnalysis): 'high' | 'medium' | 'low' {
    const length = response.length
    const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(response)
    const hasExclamation = response.includes('!')
    const hasQuestion = response.includes('?')
    
    let score = 0
    
    // Base scoring
    if (length > 100) score += 2
    else if (length > 50) score += 1
    
    if (hasEmojis) score += 1
    if (hasExclamation) score += 1
    if (hasQuestion) score += 1
    
    // Enhanced scoring with analysis
    if (analysis) {
      // Positive sentiment increases engagement
      if (analysis.sentiment === 'positive') score += 1
      
      // Multiple categories suggest detailed sharing
      if (analysis.categories.length > 1) score += 1
      
      // Milestone detection suggests high engagement
      if (analysis.milestone) score += 2
      
      // Rich topics indicate engaged sharing
      if (analysis.topics.length > 2) score += 1
      
      // People and location mentions suggest storytelling
      if ((analysis.people?.length || 0) + (analysis.locations?.length || 0) > 1) score += 1
    }
    
    if (score >= 4) return 'high'
    if (score >= 2) return 'medium'
    return 'low'
  }

  private async storeResponseAnalysis(
    userId: string,
    branchId: string,
    userResponse: string,
    analysis: MessageAnalysis
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_response_analysis')
        .insert({
          user_id: userId,
          branch_id: branchId,
          response_text: userResponse,
          categories: analysis.categories,
          tags: analysis.tags,
          sentiment: analysis.sentiment,
          topics: analysis.topics,
          urgency: analysis.urgency,
          milestone: analysis.milestone,
          people: analysis.people,
          locations: analysis.locations,
          time_references: analysis.timeReferences,
          confidence_score: analysis.categories[0]?.confidence || 0.5,
          created_at: new Date().toISOString()
        })

      if (error && error.code !== '42P01') { // Ignore table doesn't exist error for now
        console.error('Error storing response analysis:', error)
      }
    } catch (error) {
      console.error('Error in storeResponseAnalysis:', error)
    }
  }

  private async saveSmartPrompt(prompt: SmartPrompt): Promise<void> {
    const { error } = await supabase
      .from('ai_system_messages')
      .insert({
        id: prompt.id,
        branch_id: prompt.branchId,
        user_id: prompt.userId,
        message_type: 'prompt',
        content: prompt.content,
        prompt_type: prompt.promptType,
        context_data: {
          suggestedResponses: prompt.suggestedResponses
        },
        ai_metadata: prompt.aiMetadata,
        expires_at: prompt.expiresAt.toISOString()
      })

    if (error) {
      console.error('Error saving smart prompt:', error)
      throw error
    }
  }

  private async getSmartPrompt(promptId: string): Promise<SmartPrompt | null> {
    const { data } = await supabase
      .from('ai_system_messages')
      .select('*')
      .eq('id', promptId)
      .single()

    if (!data) return null

    return {
      id: data.id,
      branchId: data.branch_id,
      userId: data.user_id,
      content: data.content,
      promptType: data.prompt_type,
      suggestedResponses: data.context_data?.suggestedResponses || [],
      aiMetadata: data.ai_metadata,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at),
      status: 'pending' // Would need to track this properly
    }
  }

  private async updatePromptStatus(promptId: string, status: SmartPrompt['status']): Promise<void> {
    const { error } = await supabase
      .from('ai_system_messages')
      .update({
        ai_metadata: { status }
      })
      .eq('id', promptId)

    if (error) {
      console.error('Error updating prompt status:', error)
    }
  }

  /**
   * Clean up expired prompts
   */
  async cleanupExpiredPrompts(): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_system_messages')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (error) {
        console.error('Error cleaning up expired prompts:', error)
      }
    } catch (error) {
      console.error('Error in cleanup:', error)
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PromptEngineConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): PromptEngineConfig {
    return { ...this.config }
  }

  /**
   * Get user pattern insights for a specific user
   */
  async getUserPatternInsights(userId: string, branchId: string) {
    const personalizedSystem = getPersonalizedPromptingSystem()
    return await personalizedSystem.getUserInsights(userId, branchId)
  }

  /**
   * Generate personalized prompt preview without saving
   */
  async previewPersonalizedPrompt(userId: string, branchId: string) {
    const personalizedSystem = getPersonalizedPromptingSystem()
    return await personalizedSystem.generatePersonalizedPrompt(userId, branchId)
  }

  /**
   * Force refresh user patterns (clears cache)
   */
  refreshUserPatterns(): void {
    const personalizedSystem = getPersonalizedPromptingSystem()
    personalizedSystem.clearCache()
  }
}

// Singleton instance
let promptingEngineInstance: SmartPromptingEngine | null = null

export function getPromptingEngine(): SmartPromptingEngine {
  if (!promptingEngineInstance) {
    promptingEngineInstance = new SmartPromptingEngine()
  }
  return promptingEngineInstance
}

export default SmartPromptingEngine