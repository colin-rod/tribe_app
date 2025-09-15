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
import { createComponentLogger } from '../logger'

const logger = createComponentLogger('PromptingEngine')

export interface SmartPrompt {
  id: string
  branchId: string
  userId: string
  content: string
  promptType: 'checkin' | 'milestone' | 'memory' | 'followup' | 'celebration' | 'leaf_caption' | 'leaf_tags'
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

export interface LeafEnhancementRequest {
  leafId: string
  mediaUrls?: string[]
  content?: string
  context: {
    authorName: string
    branchName: string
    treeName: string
    childAge?: number
    existingTags?: string[]
  }
}

export interface LeafEnhancementResult {
  suggestedCaption?: string
  suggestedTags: string[]
  detectedMilestone?: {
    type: string
    confidence: number
    description: string
  }
  suggestedSeason?: string
  confidence: number
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
      let template: any = null
      
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
        template = getRandomPromptTemplate({
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
          template: template?.id
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
      logger.error('Error generating proactive prompt', error, { metadata: { userId, branchId } })
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
        engagement
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
      logger.error('Error processing user response', error, { metadata: { userId, promptId, responseLength: userResponse.length } })
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
        
        const celebrationContent = `What an amazing milestone! I saw that ${message.profiles?.first_name || 'someone'} reached a special moment with ${message.milestone_type?.replace('_', ' ')}. Tell me all about how this happened - I'd love to capture every detail of this precious memory!`

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
      logger.error('Error checking for milestones', error)
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
      logger.error('Error getting pending prompts', error)
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
      logger.error('Error scheduling proactive prompts', error)
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
        logger.error('Error storing response analysis', error, { metadata: { userId, branchId } })
      }
    } catch (error) {
      logger.error('Error in storeResponseAnalysis', error, { metadata: { userId, branchId } })
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
      logger.error('Error saving smart prompt', error, { metadata: { promptId: prompt.id, branchId: prompt.branchId, promptType: prompt.promptType } })
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
      logger.error('Error updating prompt status', error, { metadata: { promptId, status } })
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
        logger.error('Error cleaning up expired prompts', error)
      }
    } catch (error) {
      logger.error('Error in cleanup', error)
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

  /**
   * Enhance a leaf with AI-generated caption, tags, and milestone detection
   */
  async enhanceLeaf(request: LeafEnhancementRequest): Promise<LeafEnhancementResult> {
    try {
      if (!isAIConfigured()) {
        return this.generateDemoLeafEnhancement(request)
      }

      const aiService = getAIService()
      const contextManager = getContextManager()

      // Build enhanced context for leaf analysis
      const enhancementPrompt = this.buildLeafEnhancementPrompt(request)
      
      // Get AI analysis
      const aiResponse = await aiService.generateLeafEnhancement(enhancementPrompt)
      
      return {
        suggestedCaption: aiResponse.caption,
        suggestedTags: aiResponse.tags || [],
        detectedMilestone: aiResponse.milestone,
        suggestedSeason: aiResponse.season,
        confidence: aiResponse.confidence
      }
    } catch (error) {
      logger.error('Error enhancing leaf', error, { metadata: { leafId: request.leafId } })
      return this.generateDemoLeafEnhancement(request)
    }
  }

  /**
   * Generate captions for multiple leaves in batch
   */
  async enhanceLeavesBatch(requests: LeafEnhancementRequest[]): Promise<LeafEnhancementResult[]> {
    const results = await Promise.all(
      requests.map(request => this.enhanceLeaf(request))
    )
    return results
  }

  /**
   * Analyze leaf content and suggest improvements
   */
  async analyzeLeafContent(leafId: string, content: string, mediaUrls?: string[]): Promise<{
    contentQuality: 'high' | 'medium' | 'low'
    suggestions: string[]
    missingElements: string[]
  }> {
    try {
      if (!isAIConfigured()) {
        return {
          contentQuality: 'medium',
          suggestions: [
            'Consider adding more context about the moment',
            'Add emotional details about how this felt',
            'Include who else was involved in this memory'
          ],
          missingElements: ['emotions', 'context', 'people']
        }
      }

      // Implement basic content analysis based on content patterns
      const analysis = this.analyzeContentPatterns(content, mediaUrls)
      return analysis
    } catch (error) {
      logger.error('Error analyzing leaf content', error, { metadata: { contentLength: content?.length || 0, mediaCount: mediaUrls?.length || 0 } })
      return {
        contentQuality: 'low',
        suggestions: ['Unable to analyze content'],
        missingElements: []
      }
    }
  }

  private analyzeContentPatterns(content: string, mediaUrls?: string[]): {
    contentQuality: 'high' | 'medium' | 'low'
    suggestions: string[]
    missingElements: string[]
  } {
    const suggestions: string[] = []
    const missingElements: string[] = []
    
    // Analyze content length and depth
    const wordCount = content.split(/\s+/).length
    const hasEmotionalWords = /\b(happy|sad|excited|proud|worried|love|joy|surprised|amazed|grateful)\b/i.test(content)
    const hasContextWords = /\b(today|yesterday|morning|evening|while|when|after|during|first time|finally)\b/i.test(content)
    const hasPeopleWords = /\b(dad|mom|mama|papa|grandma|grandpa|brother|sister|family|together|with)\b/i.test(content)
    const hasActionWords = /\b(walking|talking|playing|laughing|smiling|crawling|running|eating|sleeping)\b/i.test(content)
    
    let quality: 'high' | 'medium' | 'low' = 'medium'
    
    // Determine quality based on content richness
    if (wordCount < 5) {
      quality = 'low'
      suggestions.push('Add more details about what happened')
      suggestions.push('Describe how you felt in this moment')
    } else if (wordCount > 20 && hasEmotionalWords && hasContextWords) {
      quality = 'high'
    }
    
    // Check for missing elements
    if (!hasEmotionalWords) {
      missingElements.push('emotions')
      suggestions.push('Add how this moment made you feel')
    }
    
    if (!hasContextWords) {
      missingElements.push('context')
      suggestions.push('Include when or where this happened')
    }
    
    if (!hasPeopleWords && !content.toLowerCase().includes('alone')) {
      missingElements.push('people')
      suggestions.push('Mention who was involved or who witnessed this')
    }
    
    if (!hasActionWords) {
      missingElements.push('actions')
      suggestions.push('Describe what was happening in more detail')
    }
    
    // Media analysis
    if (mediaUrls && mediaUrls.length > 0) {
      if (wordCount < 10) {
        suggestions.push('The photos/videos are great! Add a description to make this memory even more special')
      }
    } else {
      if (content.toLowerCase().includes('photo') || content.toLowerCase().includes('picture') || content.toLowerCase().includes('video')) {
        suggestions.push('Consider adding the photo or video you mentioned')
      }
    }
    
    // Length-specific suggestions
    if (wordCount > 50) {
      suggestions.push('This is a wonderfully detailed memory!')
    } else if (wordCount < 15) {
      suggestions.push('Try adding a bit more detail to make this memory even richer')
    }
    
    return {
      contentQuality: quality,
      suggestions: suggestions.slice(0, 4), // Limit to top 4 suggestions
      missingElements
    }
  }

  private buildLeafEnhancementPrompt(request: LeafEnhancementRequest): string {
    const { context } = request
    
    const prompt = `You are helping parents capture precious memories of their children. Analyze this memory and provide helpful suggestions.

Context:
- Parent: ${context.authorName}
- Child's Tree: ${context.treeName}
- Branch: ${context.branchName}
${context.childAge ? `- Child's age: ${context.childAge} months` : ''}

Memory Content:
${request.content || 'No text content provided'}

${request.mediaUrls ? `Media: ${request.mediaUrls.length} file(s) attached` : 'No media attached'}

${context.existingTags?.length ? `Existing tags: ${context.existingTags.join(', ')}` : ''}

Please provide:
1. A warm, engaging caption that captures the emotion and significance (if content needs enhancement)
2. 3-5 relevant tags for organization and search
3. Detect if this represents a milestone (first_word, first_steps, etc.)
4. Suggest a season/period classification if appropriate (first_year, toddler, preschool, etc.)

Response format:
{
  "caption": "suggested caption (only if needed)",
  "tags": ["tag1", "tag2", "tag3"],
  "milestone": {
    "type": "milestone_type",
    "confidence": 0.8,
    "description": "why this is a milestone"
  },
  "season": "suggested_season",
  "confidence": 0.9
}`

    return prompt
  }

  private generateDemoLeafEnhancement(request: LeafEnhancementRequest): LeafEnhancementResult {
    const { context } = request
    
    // Simple keyword-based demo enhancement
    const content = request.content?.toLowerCase() || ''
    const demoTags: string[] = []
    const demoMilestones: { [key: string]: { type: string; description: string } } = {
      'first step': { type: 'first_steps', description: 'Child took their first independent steps!' },
      'first word': { type: 'first_word', description: 'Child said their first recognizable word!' },
      'first tooth': { type: 'first_tooth', description: 'First tooth has emerged!' },
      'birthday': { type: 'birthday', description: 'Special birthday celebration!' },
      'crawling': { type: 'crawling', description: 'Child has started crawling!' }
    }

    // Extract demo tags from content
    const tagKeywords = {
      'play': ['play', 'playing', 'toys', 'games'],
      'family': ['mom', 'dad', 'grandma', 'grandpa', 'family'],
      'food': ['eat', 'eating', 'food', 'meal', 'dinner', 'lunch'],
      'sleep': ['sleep', 'nap', 'bedtime', 'tired'],
      'outside': ['park', 'outside', 'playground', 'walk'],
      'learning': ['book', 'read', 'learn', 'school'],
      'cute': ['cute', 'adorable', 'sweet', 'precious'],
      'happy': ['happy', 'smile', 'laugh', 'joy', 'fun']
    }

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        demoTags.push(tag)
      }
    }

    // Check for milestone
    let detectedMilestone
    for (const [phrase, milestone] of Object.entries(demoMilestones)) {
      if (content.includes(phrase)) {
        detectedMilestone = {
          type: milestone.type,
          confidence: 0.8,
          description: milestone.description
        }
        break
      }
    }

    // Suggest season based on child age
    let suggestedSeason
    if (context.childAge !== undefined) {
      if (context.childAge <= 12) suggestedSeason = 'first_year'
      else if (context.childAge <= 36) suggestedSeason = 'toddler'
      else if (context.childAge <= 60) suggestedSeason = 'preschool'
      else suggestedSeason = 'school_age'
    }

    return {
      suggestedTags: demoTags.length > 0 ? demoTags : ['memory', 'precious'],
      detectedMilestone,
      suggestedSeason,
      confidence: 0.7
    }
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