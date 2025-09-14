/**
 * Personalized Prompting System
 * Learns from user patterns to generate more targeted and engaging prompts
 */

import { supabase } from '@/lib/supabase/client'

// Define proper types for database responses
interface AnalysisRecord {
  user_id: string
  branch_id: string
  response_text: string
  categories: Array<{
    type: string
    confidence: number
    reason: string
  }>
  tags: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  topics: string[]
  urgency: 'low' | 'medium' | 'high'
  milestone: string | null
  people: string[]
  locations: string[]
  time_references: string[]
  confidence_score: number
  created_at: string
}

interface LeafRecord {
  id: string
  content: string
  created_at: string
  author_id: string
  branch_id: string
  profiles?: {
    first_name: string
    last_name: string
  }
}

export interface UserPattern {
  userId: string
  branchId: string
  preferences: {
    preferredPromptTypes: string[]
    bestResponseTimes: string[]
    engagementTriggers: string[]
    avoidanceTopics: string[]
  }
  behavioral: {
    averageResponseLength: number
    responseFrequency: number // days between responses
    sentimentTrends: 'improving' | 'stable' | 'declining'
    engagementLevel: 'high' | 'medium' | 'low'
  }
  content: {
    commonTopics: string[]
    frequentTags: string[]
    milestoneTypes: string[]
    peopleOfInterest: string[]
    locationPatterns: string[]
  }
  timing: {
    mostActiveHours: number[]
    preferredDays: string[]
    responseLatency: number // average time to respond in hours
  }
  lastUpdated: Date
}

export interface PersonalizedPromptSuggestion {
  content: string
  promptType: 'checkin' | 'milestone' | 'memory' | 'followup' | 'celebration'
  confidence: number
  reasoning: string[]
  suggestedTiming: {
    hour: number
    day?: string
  }
  suggestedResponses: string[]
  personalizationFactors: {
    basedOnTopics: string[]
    basedOnPeople: string[]
    basedOnTiming: boolean
    basedOnSentiment: boolean
  }
}

class PersonalizedPromptingSystem {
  private patterns: Map<string, UserPattern> = new Map()

  /**
   * Analyze user patterns from their response history
   */
  async analyzeUserPatterns(userId: string, branchId: string): Promise<UserPattern> {
    const cacheKey = `${userId}-${branchId}`
    
    // Check cache first
    if (this.patterns.has(cacheKey)) {
      const pattern = this.patterns.get(cacheKey)!
      // Refresh if older than 24 hours
      if (Date.now() - pattern.lastUpdated.getTime() < 24 * 60 * 60 * 1000) {
        return pattern
      }
    }

    // Fetch user's response analysis data
    const { data: analyses } = await supabase
      .from('ai_response_analysis')
      .select('*')
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!analyses || analyses.length === 0) {
      return this.generateDefaultPattern(userId, branchId)
    }

    // Also fetch recent leaves for additional context
    const { data: recentLeaves } = await supabase
      .from('leaves_with_details')
      .select('*, profiles(first_name, last_name)')
      .eq('author_id', userId)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(50)

    const pattern = this.computeUserPattern(userId, branchId, analyses, recentLeaves || [])
    
    // Cache the result
    this.patterns.set(cacheKey, pattern)
    
    return pattern
  }

  private generateDefaultPattern(userId: string, branchId: string): UserPattern {
    return {
      userId,
      branchId,
      preferences: {
        preferredPromptTypes: ['checkin', 'memory'],
        bestResponseTimes: ['09:00', '19:00'],
        engagementTriggers: ['family', 'milestones', 'daily activities'],
        avoidanceTopics: []
      },
      behavioral: {
        averageResponseLength: 50,
        responseFrequency: 2,
        sentimentTrends: 'stable',
        engagementLevel: 'medium'
      },
      content: {
        commonTopics: [],
        frequentTags: [],
        milestoneTypes: [],
        peopleOfInterest: [],
        locationPatterns: []
      },
      timing: {
        mostActiveHours: [9, 19],
        preferredDays: ['monday', 'wednesday', 'friday'],
        responseLatency: 4
      },
      lastUpdated: new Date()
    }
  }

  private computeUserPattern(
    userId: string,
    branchId: string,
    analyses: AnalysisRecord[],
    _leaves: LeafRecord[]
  ): UserPattern {
    // Analyze response patterns
    const avgResponseLength = analyses.reduce((sum, a) => sum + (a.response_text?.length || 0), 0) / analyses.length
    
    // Calculate response frequency
    const sortedDates = analyses.map(a => new Date(a.created_at)).sort((a, b) => b.getTime() - a.getTime())
    const daysBetween = sortedDates.length > 1 
      ? sortedDates.slice(0, -1).map((date, i) => 
          (date.getTime() - sortedDates[i + 1].getTime()) / (1000 * 60 * 60 * 24)
        ).reduce((sum, days) => sum + days, 0) / (sortedDates.length - 1)
      : 2

    // Analyze sentiment trends
    const recentSentiments = analyses.slice(0, 10).map(a => a.sentiment)
    const earlierSentiments = analyses.slice(-10).map(a => a.sentiment)
    
    const sentimentScore = (sentiments: string[]) => {
      return sentiments.reduce((score, sentiment) => {
        if (sentiment === 'positive') return score + 1
        if (sentiment === 'negative') return score - 1
        return score
      }, 0) / sentiments.length
    }

    const recentScore = sentimentScore(recentSentiments)
    const earlierScore = sentimentScore(earlierSentiments)
    
    let sentimentTrends: 'improving' | 'stable' | 'declining' = 'stable'
    if (recentScore > earlierScore + 0.2) sentimentTrends = 'improving'
    else if (recentScore < earlierScore - 0.2) sentimentTrends = 'declining'

    // Extract common patterns
    const allTags = analyses.flatMap(a => a.tags || [])
    const tagFrequency = this.countFrequency(allTags)
    const frequentTags = Object.entries(tagFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag)

    const allTopics = analyses.flatMap(a => a.topics || [])
    const topicFrequency = this.countFrequency(allTopics)
    const commonTopics = Object.entries(topicFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([topic]) => topic)

    const milestones = analyses.map(a => a.milestone).filter((m): m is string => Boolean(m))
    const milestoneTypes = [...new Set(milestones)]

    const allPeople = analyses.flatMap(a => a.people || [])
    const peopleOfInterest = [...new Set(allPeople)].slice(0, 8)

    const allLocations = analyses.flatMap(a => a.locations || [])
    const locationPatterns = [...new Set(allLocations)].slice(0, 6)

    // Analyze timing patterns
    const responseTimes = analyses.map(a => {
      const date = new Date(a.created_at)
      return {
        hour: date.getHours(),
        day: date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      }
    })

    const hourFrequency = this.countFrequency(responseTimes.map(t => t.hour))
    const mostActiveHours = Object.entries(hourFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    const dayFrequency = this.countFrequency(responseTimes.map(t => t.day))
    const preferredDays = Object.entries(dayFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([day]) => day)

    // Determine engagement level
    let engagementLevel: 'high' | 'medium' | 'low' = 'medium'
    const avgEngagementScore = avgResponseLength / 100 + 
      (analyses.filter(a => a.sentiment === 'positive').length / analyses.length) +
      (analyses.filter(a => (a.categories || []).length > 1).length / analyses.length)
    
    if (avgEngagementScore > 1.5) engagementLevel = 'high'
    else if (avgEngagementScore < 0.8) engagementLevel = 'low'

    // Determine preferred prompt types based on response patterns
    const categoryFrequency = this.countFrequency(
      analyses.flatMap(a => (a.categories || []).map((cat: { type: string; confidence: number; reason: string }) => cat.type))
    )
    const preferredPromptTypes = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type)

    return {
      userId,
      branchId,
      preferences: {
        preferredPromptTypes: preferredPromptTypes.length > 0 ? preferredPromptTypes : ['checkin', 'memory'],
        bestResponseTimes: mostActiveHours.map(h => `${h.toString().padStart(2, '0')}:00`),
        engagementTriggers: commonTopics.slice(0, 5),
        avoidanceTopics: [] // Could be learned from low-engagement responses
      },
      behavioral: {
        averageResponseLength: Math.round(avgResponseLength),
        responseFrequency: Math.round(daysBetween * 10) / 10,
        sentimentTrends,
        engagementLevel
      },
      content: {
        commonTopics,
        frequentTags,
        milestoneTypes,
        peopleOfInterest,
        locationPatterns
      },
      timing: {
        mostActiveHours,
        preferredDays,
        responseLatency: 4 // Could calculate from prompt-to-response timing
      },
      lastUpdated: new Date()
    }
  }

  /**
   * Generate a personalized prompt suggestion
   */
  async generatePersonalizedPrompt(
    userId: string,
    branchId: string,
    currentTime?: Date
  ): Promise<PersonalizedPromptSuggestion> {
    const pattern = await this.analyzeUserPatterns(userId, branchId)
    const time = currentTime || new Date()
    
    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, preferences')
      .eq('id', userId)
      .single()

    const userName = profile?.first_name || 'there'
    
    // Select prompt type based on preferences and current context
    const promptType = this.selectOptimalPromptType(pattern, time)
    
    // Generate content based on user patterns
    const content = this.generatePersonalizedContent(pattern, promptType, userName, time)
    
    // Calculate confidence based on pattern strength
    const confidence = this.calculatePromptConfidence(pattern, promptType, time)
    
    // Generate reasoning
    const reasoning = this.generateReasoning(pattern, promptType, time)
    
    // Suggest optimal timing
    const suggestedTiming = this.suggestOptimalTiming(pattern, time)
    
    // Generate personalized suggested responses
    const suggestedResponses = this.generateSuggestedResponses(pattern, promptType)

    return {
      content,
      promptType,
      confidence,
      reasoning,
      suggestedTiming,
      suggestedResponses,
      personalizationFactors: {
        basedOnTopics: pattern.content.commonTopics.slice(0, 3),
        basedOnPeople: pattern.content.peopleOfInterest.slice(0, 2),
        basedOnTiming: pattern.timing.mostActiveHours.includes(time.getHours()),
        basedOnSentiment: pattern.behavioral.sentimentTrends === 'improving'
      }
    }
  }

  private selectOptimalPromptType(
    pattern: UserPattern,
    time: Date
  ): 'checkin' | 'milestone' | 'memory' | 'followup' | 'celebration' {
    const hour = time.getHours()
    const preferredTypes = pattern.preferences.preferredPromptTypes

    // Morning hours favor check-ins
    if (hour >= 6 && hour <= 10 && preferredTypes.includes('checkin')) {
      return 'checkin'
    }
    
    // Evening hours favor memory sharing
    if (hour >= 18 && hour <= 22 && preferredTypes.includes('memory')) {
      return 'memory'
    }
    
    // If user frequently shares milestones
    if (pattern.content.milestoneTypes.length > 2 && preferredTypes.includes('milestone')) {
      return 'milestone'
    }
    
    // Default to user's most preferred type
    return (preferredTypes[0] as any) || 'checkin'
  }

  private generatePersonalizedContent(
    pattern: UserPattern,
    promptType: string,
    userName: string,
    time: Date
  ): string {
    const templates = this.getPersonalizedTemplates(pattern, promptType)
    const template = templates[Math.floor(Math.random() * templates.length)]
    
    // Replace placeholders
    let content = template
      .replace('{userName}', userName)
      .replace('{timeOfDay}', this.getTimeOfDay(time.getHours()))
    
    // Add topic-specific elements
    if (pattern.content.commonTopics.length > 0) {
      const randomTopic = pattern.content.commonTopics[
        Math.floor(Math.random() * Math.min(3, pattern.content.commonTopics.length))
      ]
      content = content.replace('{topic}', this.topicToPromptElement(randomTopic))
    } else {
      content = content.replace('{topic}', '')
    }
    
    // Add people-specific elements
    if (pattern.content.peopleOfInterest.length > 0) {
      const randomPerson = pattern.content.peopleOfInterest[
        Math.floor(Math.random() * Math.min(2, pattern.content.peopleOfInterest.length))
      ]
      content = content.replace('{person}', randomPerson)
    } else {
      content = content.replace('{person}', 'everyone')
    }

    return content.trim()
  }

  private getPersonalizedTemplates(pattern: UserPattern, promptType: string): string[] {
    const baseTemplates = {
      checkin: [
        "Good {timeOfDay}, {userName}! How are things going with {person} today? {topic}",
        "Hi {userName}! I'm curious about your day - anything special happening with {topic}?",
        "{timeOfDay} check-in! How's {person} doing, {userName}? Would love to hear an update! {topic}"
      ],
      memory: [
        "Hey {userName}! I was thinking about memories... anything sweet from {topic} lately?",
        "Memory time, {userName}! What's a moment with {person} that made you smile recently? {topic}",
        "Hi {userName}! Share a special moment from your day - especially anything about {topic}!"
      ],
      milestone: [
        "Hi {userName}! 🎉 Any exciting developments or new things {person} is doing? {topic}",
        "{userName}, I'm always excited to hear about milestones! Anything new with {topic}?",
        "Milestone check, {userName}! 🌟 Has {person} done anything amazing lately? {topic}"
      ],
      celebration: [
        "🎉 {userName}! I heard there might be something to celebrate with {topic}!",
        "Celebration time, {userName}! ✨ Tell me about this wonderful moment with {person}!",
        "So exciting, {userName}! 🌟 I'd love to hear all about {topic} and how {person} experienced it!"
      ],
      followup: [
        "Hi {userName}! 💫 I've been thinking about what you shared about {topic}. How did that go?",
        "{userName}, following up on {topic} - how are things developing with {person}?",
        "Hey {userName}! ✨ You mentioned {topic} before. Any updates on how that's going?"
      ]
    }

    return baseTemplates[promptType as keyof typeof baseTemplates] || baseTemplates.checkin
  }

  private topicToPromptElement(topic: string): string {
    const elements = {
      health: "Hope everyone is feeling well!",
      food: "How's mealtime going?",
      development: "Any new skills or progress?",
      social: "How are the social interactions?",
      activities: "What fun activities have you been up to?",
      routine: "How's the daily routine flowing?"
    }
    return elements[topic as keyof typeof elements] || ""
  }

  private getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'night'
  }

  private calculatePromptConfidence(
    pattern: UserPattern,
    promptType: string,
    time: Date
  ): number {
    let confidence = 0.5 // Base confidence

    // Boost if it's user's preferred prompt type
    if (pattern.preferences.preferredPromptTypes.includes(promptType)) {
      confidence += 0.2
    }

    // Boost if it's during user's active hours
    if (pattern.timing.mostActiveHours.includes(time.getHours())) {
      confidence += 0.15
    }

    // Boost based on engagement level
    if (pattern.behavioral.engagementLevel === 'high') {
      confidence += 0.1
    } else if (pattern.behavioral.engagementLevel === 'low') {
      confidence -= 0.1
    }

    // Boost if we have rich content patterns
    if (pattern.content.commonTopics.length > 3) {
      confidence += 0.05
    }

    return Math.min(0.95, Math.max(0.3, confidence))
  }

  private generateReasoning(
    pattern: UserPattern,
    promptType: string,
    time: Date
  ): string[] {
    const reasons: string[] = []

    if (pattern.preferences.preferredPromptTypes.includes(promptType)) {
      reasons.push(`User typically responds well to ${promptType} prompts`)
    }

    if (pattern.timing.mostActiveHours.includes(time.getHours())) {
      reasons.push(`User is usually active at ${time.getHours()}:00`)
    }

    if (pattern.behavioral.engagementLevel === 'high') {
      reasons.push('User shows high engagement with detailed responses')
    }

    if (pattern.content.commonTopics.length > 0) {
      reasons.push(`Personalized based on interests: ${pattern.content.commonTopics.slice(0, 2).join(', ')}`)
    }

    if (pattern.behavioral.sentimentTrends === 'improving') {
      reasons.push('User sentiment has been positive lately')
    }

    return reasons
  }

  private suggestOptimalTiming(
    pattern: UserPattern,
    _currentTime: Date
  ): { hour: number; day?: string } {
    const suggestedHour = pattern.timing.mostActiveHours[0] || 19
    const suggestedDay = pattern.timing.preferredDays[0]
    
    return {
      hour: suggestedHour,
      day: suggestedDay
    }
  }

  private generateSuggestedResponses(
    pattern: UserPattern,
    promptType: string
  ): string[] {
    const baseResponses = {
      checkin: ['Everything is going well!', 'It\'s been a good day', 'We\'re doing great!'],
      memory: ['Let me share a sweet moment', 'I have something to tell you', 'Today was special'],
      milestone: ['Yes, something amazing happened!', 'We reached a new milestone!', 'I have exciting news!'],
      celebration: ['Thank you for celebrating with us!', 'It was such a special moment', 'We\'re so proud!'],
      followup: ['Here\'s an update', 'Things are going well', 'Let me tell you more']
    }

    const responses = baseResponses[promptType as keyof typeof baseResponses] || baseResponses.checkin

    // Personalize based on user patterns
    if (pattern.content.commonTopics.includes('food')) {
      responses.push('Mealtime went really well today')
    }
    if (pattern.content.commonTopics.includes('development')) {
      responses.push('We\'re seeing new progress!')
    }

    return responses.slice(0, 4)
  }

  private countFrequency<T>(items: T[]): Record<string, number> {
    const frequency: Record<string, number> = {}
    for (const item of items) {
      const key = String(item)
      frequency[key] = (frequency[key] || 0) + 1
    }
    return frequency
  }

  /**
   * Clear cached patterns (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.patterns.clear()
  }

  /**
   * Get user pattern insights for debugging/admin purposes
   */
  async getUserInsights(userId: string, branchId: string): Promise<UserPattern> {
    return this.analyzeUserPatterns(userId, branchId)
  }
}

// Singleton instance
let personalizedPromptingInstance: PersonalizedPromptingSystem | null = null

export function getPersonalizedPromptingSystem(): PersonalizedPromptingSystem {
  if (!personalizedPromptingInstance) {
    personalizedPromptingInstance = new PersonalizedPromptingSystem()
  }
  return personalizedPromptingInstance
}

export default PersonalizedPromptingSystem