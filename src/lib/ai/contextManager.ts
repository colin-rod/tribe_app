/**
 * Conversation Context Manager
 * Manages conversation state, user preferences, and contextual information for AI interactions
 */

import { supabase } from '@/lib/supabase/client'
import type { AIPromptContext } from './aiService'

export interface UserConversationState {
  userId: string
  branchId: string
  lastInteraction: Date
  conversationPhase: 'initial' | 'active' | 'followup' | 'concluded'
  currentTopic?: string
  pendingPrompts: string[]
  preferences: {
    promptStyle: 'casual' | 'formal' | 'playful'
    reminderFrequency: 'high' | 'medium' | 'low'
    preferredTopics: string[]
    bestTimeForPrompts: 'morning' | 'afternoon' | 'evening' | 'anytime'
  }
  responseHistory: {
    prompt: string
    response: string
    timestamp: Date
    engagement: 'high' | 'medium' | 'low'
  }[]
}

export interface BranchConversationContext {
  branchId: string
  recentActivity: {
    messageCount24h: number
    lastActiveUser: string
    lastActiveTime: Date
    topTopics: string[]
  }
  familyDynamics: {
    activeMembers: string[]
    childrenAges?: number[]
    commonActivities: string[]
    recentMilestones: {
      type: string
      date: Date
      child?: string
    }[]
  }
}

class ConversationContextManager {
  private userStates: Map<string, UserConversationState> = new Map()
  private branchContexts: Map<string, BranchConversationContext> = new Map()

  /**
   * Get comprehensive context for AI prompting
   */
  async getAIContext(userId: string, branchId: string): Promise<AIPromptContext> {
    const [userProfile, branchInfo, recentMessages, userState] = await Promise.all([
      this.getUserProfile(userId),
      this.getBranchInfo(branchId),
      this.getRecentMessages(branchId, 10),
      this.getUserState(userId, branchId)
    ])

    const timeContext = this.getTimeContext()

    return {
      branchName: branchInfo.name,
      branchType: branchInfo.type,
      userName: `${userProfile.first_name} ${userProfile.last_name}`.trim() || 'there',
      familyRole: userProfile.family_role,
      recentMessages: recentMessages.map(msg => ({
        content: msg.content || '',
        author: `${msg.profiles?.first_name} ${msg.profiles?.last_name}`.trim(),
        timestamp: new Date(msg.created_at),
        milestoneType: msg.milestone_type || undefined
      })),
      userPreferences: userState?.preferences,
      timeContext
    }
  }

  /**
   * Update user conversation state after interaction
   */
  async updateUserState(
    userId: string, 
    branchId: string, 
    interaction: {
      prompt: string
      response: string
      engagement: 'high' | 'medium' | 'low'
    }
  ): Promise<void> {
    const key = `${userId}-${branchId}`
    let state = this.userStates.get(key)

    if (!state) {
      state = await this.initializeUserState(userId, branchId)
    }

    // Update interaction history
    state.responseHistory.push({
      prompt: interaction.prompt,
      response: interaction.response,
      timestamp: new Date(),
      engagement: interaction.engagement
    })

    // Keep only last 50 interactions
    if (state.responseHistory.length > 50) {
      state.responseHistory = state.responseHistory.slice(-50)
    }

    // Update conversation phase
    state.conversationPhase = this.determineConversationPhase(state)
    state.lastInteraction = new Date()

    // Learn from user behavior
    this.updateUserPreferences(state, interaction)

    // Persist to database
    await this.persistUserState(state)
    this.userStates.set(key, state)
  }

  /**
   * Determine if user should receive a proactive prompt
   */
  shouldPromptUser(userId: string, branchId: string): boolean {
    const key = `${userId}-${branchId}`
    const state = this.userStates.get(key)

    if (!state) return true // New users get initial prompt

    const hoursSinceLastInteraction = (Date.now() - state.lastInteraction.getTime()) / (1000 * 60 * 60)
    
    const frequencyHours = {
      high: 8,    // 3 times per day
      medium: 24, // Once per day
      low: 72     // Every 3 days
    }

    const threshold = frequencyHours[state.preferences.reminderFrequency]
    
    // Check if it's a good time based on user preferences
    const currentHour = new Date().getHours()
    const timePreference = state.preferences.bestTimeForPrompts
    
    let isGoodTime = true
    if (timePreference === 'morning' && (currentHour < 6 || currentHour > 12)) isGoodTime = false
    if (timePreference === 'afternoon' && (currentHour < 12 || currentHour > 18)) isGoodTime = false
    if (timePreference === 'evening' && (currentHour < 18 || currentHour > 22)) isGoodTime = false

    return hoursSinceLastInteraction >= threshold && isGoodTime
  }

  /**
   * Get personalized prompt suggestions based on user history
   */
  getPersonalizedPrompts(userId: string, branchId: string): string[] {
    const key = `${userId}-${branchId}`
    const state = this.userStates.get(key)
    const branchContext = this.branchContexts.get(branchId)

    if (!state || !branchContext) {
      return this.getDefaultPrompts()
    }

    const prompts: string[] = []

    // Recent milestone follow-ups
    const recentMilestones = branchContext.familyDynamics.recentMilestones
    if (recentMilestones.length > 0) {
      const latestMilestone = recentMilestones[0]
      prompts.push(`How has everyone been adjusting since ${latestMilestone.child || 'the little one'}'s ${latestMilestone.type}?`)
    }

    // Activity-based prompts
    const commonActivities = branchContext.familyDynamics.commonActivities
    if (commonActivities.length > 0) {
      const activity = commonActivities[Math.floor(Math.random() * commonActivities.length)]
      prompts.push(`Have you done any ${activity} lately? I'd love to hear about it!`)
    }

    // Time-sensitive prompts
    const timeContext = this.getTimeContext()
    if (timeContext.dayOfWeek === 'Sunday') {
      prompts.push(`How was your family weekend? Any special moments to remember?`)
    }

    return prompts.length > 0 ? prompts : this.getDefaultPrompts()
  }

  /**
   * Learn user preferences from interactions
   */
  private updateUserPreferences(state: UserConversationState, interaction: {
    response: string
    engagement: 'high' | 'medium' | 'low'
    prompt: string
  }): void {
    // Analyze response length and engagement to adjust prompt style
    const responseLength = interaction.response.length
    
    if (interaction.engagement === 'high' && responseLength > 100) {
      // User engages well with current style, reinforce it
      return
    }

    if (interaction.engagement === 'low' && responseLength < 50) {
      // Try different approach
      if (state.preferences.promptStyle === 'casual') {
        state.preferences.promptStyle = 'playful'
      } else if (state.preferences.promptStyle === 'formal') {
        state.preferences.promptStyle = 'casual'
      }
    }

    // Extract topics from response
    const topics = this.extractTopics(interaction.response)
    for (const topic of topics) {
      if (!state.preferences.preferredTopics.includes(topic)) {
        state.preferences.preferredTopics.push(topic)
      }
    }

    // Keep top 10 topics
    if (state.preferences.preferredTopics.length > 10) {
      state.preferences.preferredTopics = state.preferences.preferredTopics.slice(-10)
    }
  }

  private determineConversationPhase(state: UserConversationState): UserConversationState['conversationPhase'] {
    const recentInteractions = state.responseHistory.slice(-5)
    
    if (recentInteractions.length === 0) return 'initial'
    if (recentInteractions.length < 3) return 'active'
    
    const lastInteraction = recentInteractions[recentInteractions.length - 1]
    const timeSinceLastInteraction = Date.now() - lastInteraction.timestamp.getTime()
    
    if (timeSinceLastInteraction > 24 * 60 * 60 * 1000) { // 24 hours
      return 'concluded'
    }
    
    return 'followup'
  }

  private async initializeUserState(userId: string, branchId: string): Promise<UserConversationState> {
    // Try to load from database first
    const { data: existingState } = await supabase
      .from('user_conversation_states')
      .select('*')
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .single()

    if (existingState) {
      return {
        userId,
        branchId,
        lastInteraction: new Date(existingState.last_interaction),
        conversationPhase: existingState.conversation_phase,
        currentTopic: existingState.current_topic,
        pendingPrompts: existingState.pending_prompts || [],
        preferences: existingState.preferences || this.getDefaultPreferences(),
        responseHistory: existingState.response_history || []
      }
    }

    // Create new state
    const newState: UserConversationState = {
      userId,
      branchId,
      lastInteraction: new Date(),
      conversationPhase: 'initial',
      pendingPrompts: [],
      preferences: this.getDefaultPreferences(),
      responseHistory: []
    }

    await this.persistUserState(newState)
    return newState
  }

  private getDefaultPreferences(): UserConversationState['preferences'] {
    return {
      promptStyle: 'casual',
      reminderFrequency: 'medium',
      preferredTopics: [],
      bestTimeForPrompts: 'anytime'
    }
  }

  private async persistUserState(state: UserConversationState): Promise<void> {
    const { error } = await supabase
      .from('user_conversation_states')
      .upsert({
        user_id: state.userId,
        branch_id: state.branchId,
        last_interaction: state.lastInteraction.toISOString(),
        conversation_phase: state.conversationPhase,
        current_topic: state.currentTopic,
        pending_prompts: state.pendingPrompts,
        preferences: state.preferences,
        response_history: state.responseHistory
      })

    if (error) {
      console.error('Error persisting user state:', error)
    }
  }

  private async getUserState(userId: string, branchId: string): Promise<UserConversationState | null> {
    const key = `${userId}-${branchId}`
    
    if (this.userStates.has(key)) {
      return this.userStates.get(key)!
    }

    // Load from database
    const state = await this.initializeUserState(userId, branchId)
    this.userStates.set(key, state)
    return state
  }

  private async getUserProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, family_role')
      .eq('id', userId)
      .single()

    return data || { first_name: '', last_name: '', family_role: null }
  }

  private async getBranchInfo(branchId: string) {
    const { data } = await supabase
      .from('branches')
      .select('name, type')
      .eq('id', branchId)
      .single()

    return data || { name: 'Family', type: 'family' }
  }

  private async getRecentMessages(branchId: string, limit: number = 10) {
    const { data } = await supabase
      .from('posts')
      .select(`
        content, created_at, milestone_type,
        profiles (first_name, last_name)
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return data || []
  }

  private getTimeContext() {
    const now = new Date()
    const hour = now.getHours()
    
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    if (hour >= 5 && hour < 12) timeOfDay = 'morning'
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening'
    else timeOfDay = 'night'

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayOfWeek = days[now.getDay()]

    const month = now.getMonth()
    let season: string
    if (month >= 2 && month <= 4) season = 'spring'
    else if (month >= 5 && month <= 7) season = 'summer'
    else if (month >= 8 && month <= 10) season = 'fall'
    else season = 'winter'

    return { timeOfDay, dayOfWeek, season }
  }

  private extractTopics(text: string): string[] {
    // Simple topic extraction based on keywords
    const topicKeywords = {
      'school': ['school', 'class', 'teacher', 'homework', 'learning'],
      'playground': ['playground', 'park', 'swing', 'slide', 'outside'],
      'food': ['eat', 'food', 'dinner', 'lunch', 'breakfast', 'snack'],
      'sleep': ['sleep', 'nap', 'bedtime', 'tired', 'dream'],
      'play': ['play', 'toys', 'games', 'fun', 'blocks'],
      'family': ['mom', 'dad', 'sister', 'brother', 'grandma', 'grandpa'],
      'milestones': ['first', 'new', 'learned', 'can', 'milestone']
    }

    const topics: string[] = []
    const lowerText = text.toLowerCase()

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic)
      }
    }

    return topics
  }

  private getDefaultPrompts(): string[] {
    return [
      'How has your day been with the family?',
      'Any special moments you\'d like to capture today?',
      'What\'s been the highlight of your week so far?',
      'Tell me about something that made you smile recently!'
    ]
  }
}

// Singleton instance
let contextManagerInstance: ConversationContextManager | null = null

export function getContextManager(): ConversationContextManager {
  if (!contextManagerInstance) {
    contextManagerInstance = new ConversationContextManager()
  }
  return contextManagerInstance
}

export default ConversationContextManager