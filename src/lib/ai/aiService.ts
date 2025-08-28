/**
 * AI Service for Journal Assistant
 * Provides intelligent conversation capabilities for family data collection
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface AIPromptContext {
  branchName: string
  branchType: 'family' | 'community' | 'topic' | 'local'
  userName: string
  familyRole?: string
  recentMessages: {
    content: string
    author: string
    timestamp: Date
    milestoneType?: string
  }[]
  userPreferences?: {
    promptStyle: 'casual' | 'formal' | 'playful'
    reminderFrequency: 'high' | 'medium' | 'low'
    topicsOfInterest: string[]
  }
  timeContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    dayOfWeek: string
    season: string
  }
}

export interface AIResponse {
  message: string
  promptType: 'checkin' | 'milestone' | 'memory' | 'followup' | 'celebration'
  suggestedResponses?: string[]
  extractedData?: {
    milestone?: {
      type: string
      date?: string
      description: string
    }
    mood?: string
    activities?: string[]
    people?: string[]
    locations?: string[]
  }
  confidenceScore: number
}

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
}

class AIService {
  private config: AIServiceConfig
  private conversationHistory: Map<string, AIMessage[]> = new Map()

  constructor(config: AIServiceConfig) {
    this.config = {
      model: config.provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229',
      maxTokens: 500,
      temperature: 0.7,
      ...config
    }
  }

  /**
   * Generate a proactive prompt based on context
   */
  async generatePrompt(context: AIPromptContext): Promise<AIResponse> {
    const conversationKey = `${context.branchName}-${context.userName}`
    const history = this.conversationHistory.get(conversationKey) || []

    // Determine prompt type based on context
    const promptType = this.determinePromptType(context, history)
    
    // Build system message for family journal assistant
    const systemMessage = this.buildSystemMessage(context, promptType)
    
    // Create conversation history
    const messages: AIMessage[] = [
      { role: 'system', content: systemMessage },
      ...history.slice(-10), // Keep last 10 messages for context
    ]

    try {
      const response = await this.callAI(messages)
      
      // Extract structured data from response
      const extractedData = this.extractStructuredData(response)
      
      // Generate suggested responses
      const suggestedResponses = this.generateSuggestedResponses(promptType, context)

      // Update conversation history
      const aiMessage: AIMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      history.push(aiMessage)
      this.conversationHistory.set(conversationKey, history)

      return {
        message: response,
        promptType,
        suggestedResponses,
        extractedData,
        confidenceScore: this.calculateConfidenceScore(response)
      }
    } catch (error) {
      console.error('AI Service Error:', error)
      throw new Error('Failed to generate AI response')
    }
  }

  /**
   * Process user response and generate follow-up
   */
  async processUserResponse(
    userMessage: string,
    context: AIPromptContext,
    previousPromptType: string
  ): Promise<AIResponse> {
    const conversationKey = `${context.branchName}-${context.userName}`
    const history = this.conversationHistory.get(conversationKey) || []

    // Add user message to history
    const userAIMessage: AIMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    history.push(userAIMessage)

    // Generate contextual follow-up
    const systemMessage = this.buildFollowUpSystemMessage(context, previousPromptType)
    
    const messages: AIMessage[] = [
      { role: 'system', content: systemMessage },
      ...history.slice(-10),
    ]

    try {
      const response = await this.callAI(messages)
      const extractedData = this.extractStructuredData(userMessage + ' ' + response)
      
      const aiMessage: AIMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      history.push(aiMessage)
      this.conversationHistory.set(conversationKey, history)

      return {
        message: response,
        promptType: 'followup',
        extractedData,
        confidenceScore: this.calculateConfidenceScore(response)
      }
    } catch (error) {
      console.error('AI Follow-up Error:', error)
      throw new Error('Failed to process user response')
    }
  }

  private determinePromptType(context: AIPromptContext, history: AIMessage[]): AIResponse['promptType'] {
    const recentMessages = context.recentMessages
    const lastMessage = recentMessages[0]
    
    // Check for milestone-related content
    if (lastMessage?.milestoneType || this.containsMilestoneKeywords(recentMessages)) {
      return 'celebration'
    }

    // Check if it's been a while since last message
    const lastMessageTime = lastMessage?.timestamp
    if (lastMessageTime) {
      const hoursSinceLastMessage = (Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastMessage > 24) {
        return 'checkin'
      }
    }

    // Time-based prompts
    if (context.timeContext.timeOfDay === 'evening' && history.length === 0) {
      return 'checkin'
    }

    // Default to memory prompt
    return 'memory'
  }

  private buildSystemMessage(context: AIPromptContext, promptType: AIResponse['promptType']): string {
    const basePersonality = `You are Sage, a warm and encouraging family journal assistant for the ${context.branchName} family. Your role is to help families capture and preserve precious memories through natural conversation.

Personality:
- Warm, empathetic, and genuinely interested in family life
- Ask thoughtful follow-up questions that encourage storytelling
- Celebrate milestones and achievements
- Be respectful of family dynamics and sensitive moments
- Use a ${context.userPreferences?.promptStyle || 'casual'} tone

Current context:
- Speaking with ${context.userName} (${context.familyRole || 'family member'})
- Time: ${context.timeContext.timeOfDay} on ${context.timeContext.dayOfWeek}
- Branch: ${context.branchName} (${context.branchType})
`

    const promptTypeInstructions = {
      checkin: `Today, initiate a gentle check-in. Ask about recent family moments, activities, or how everyone is doing. Keep it natural and conversational.`,
      
      milestone: `A milestone moment has been detected. Ask engaging questions about the details, feelings, and context around this special achievement.`,
      
      memory: `Help capture a family memory. Ask about recent experiences, special moments, or daily life that might be worth preserving.`,
      
      followup: `Continue the conversation naturally based on what was just shared. Ask relevant follow-up questions that encourage more storytelling.`,
      
      celebration: `A celebration is in order! Acknowledge the milestone or achievement and ask for more details about this special moment.`
    }

    return basePersonality + '\n\n' + promptTypeInstructions[promptType]
  }

  private buildFollowUpSystemMessage(context: AIPromptContext, previousPromptType: string): string {
    return `You are Sage, continuing a conversation about family memories. The user just shared something in response to your ${previousPromptType} prompt. 

Respond naturally by:
1. Acknowledging what they shared
2. Asking one thoughtful follow-up question
3. Being encouraging and showing genuine interest

Keep responses concise (2-3 sentences) and conversational. Focus on drawing out details, emotions, or context that make the memory richer.`
  }

  private async callAI(messages: AIMessage[]): Promise<string> {
    if (this.config.provider === 'openai') {
      return this.callOpenAI(messages)
    } else {
      return this.callAnthropic(messages)
    }
  }

  private async callOpenAI(messages: AIMessage[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  private async callAnthropic(messages: AIMessage[]): Promise<string> {
    // Convert messages format for Anthropic
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemMessage,
        messages: conversationMessages,
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.content[0]?.text || ''
  }

  private extractStructuredData(text: string): AIResponse['extractedData'] {
    // Simple keyword-based extraction (can be enhanced with NLP)
    const milestoneKeywords = {
      first_steps: ['first steps', 'walking', 'walked'],
      first_word: ['first word', 'said', 'talking'],
      first_tooth: ['tooth', 'teeth', 'teething'],
      birthday: ['birthday', 'turned', 'years old'],
      school: ['school', 'kindergarten', 'grade']
    }

    const activities = this.extractKeywords(text, [
      'playground', 'park', 'swimming', 'reading', 'drawing', 'playing',
      'cooking', 'baking', 'dancing', 'singing', 'walking', 'running'
    ])

    const people = this.extractNames(text)
    const locations = this.extractKeywords(text, [
      'home', 'school', 'park', 'beach', 'grandma', 'grandpa', 'restaurant'
    ])

    let milestone
    for (const [type, keywords] of Object.entries(milestoneKeywords)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        milestone = {
          type,
          description: text,
          date: new Date().toISOString().split('T')[0]
        }
        break
      }
    }

    return {
      milestone,
      activities: activities.length > 0 ? activities : undefined,
      people: people.length > 0 ? people : undefined,
      locations: locations.length > 0 ? locations : undefined,
    }
  }

  private extractKeywords(text: string, keywords: string[]): string[] {
    const found: string[] = []
    const lowerText = text.toLowerCase()
    
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword)
      }
    }
    
    return found
  }

  private extractNames(text: string): string[] {
    // Simple name extraction - look for capitalized words that aren't at sentence start
    const words = text.split(' ')
    const names: string[] = []
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i].replace(/[.,!?]/, '')
      if (word.match(/^[A-Z][a-z]+$/)) {
        names.push(word)
      }
    }
    
    return [...new Set(names)] // Remove duplicates
  }

  private generateSuggestedResponses(promptType: AIResponse['promptType'], context: AIPromptContext): string[] {
    const suggestions = {
      checkin: [
        'Had a great day!',
        'Nothing special today',
        'Lots happened today...',
        'Let me share a photo'
      ],
      milestone: [
        'Yes, it was amazing!',
        'Tell me more about milestones',
        'I want to record this',
        'Share with family'
      ],
      memory: [
        'I have a story to share',
        'Here\'s what happened...',
        'Let me think about that',
        'Ask me something else'
      ],
      followup: [
        'Exactly!',
        'There\'s more to it...',
        'That reminds me of...',
        'I\'ll share more later'
      ],
      celebration: [
        'Thank you!',
        'We\'re so proud',
        'It was a special moment',
        'Want to see photos?'
      ]
    }

    return suggestions[promptType] || suggestions.memory
  }

  private calculateConfidenceScore(response: string): number {
    // Simple confidence scoring based on response characteristics
    let score = 0.5

    // Length indicates thoughtfulness
    if (response.length > 50) score += 0.2
    if (response.length > 100) score += 0.1

    // Question marks indicate engagement
    const questionCount = (response.match(/\?/g) || []).length
    score += Math.min(questionCount * 0.1, 0.3)

    // Personal pronouns indicate personalization
    if (response.includes('you') || response.includes('your')) score += 0.1

    return Math.min(score, 1.0)
  }

  private containsMilestoneKeywords(messages: { content: string }[]): boolean {
    const milestoneKeywords = ['first', 'milestone', 'achievement', 'birthday', 'tooth', 'steps', 'word']
    const recentContent = messages.slice(0, 3).map(m => m.content.toLowerCase()).join(' ')
    
    return milestoneKeywords.some(keyword => recentContent.includes(keyword))
  }

  /**
   * Clear conversation history for a specific context
   */
  clearConversationHistory(branchName: string, userName: string): void {
    const conversationKey = `${branchName}-${userName}`
    this.conversationHistory.delete(conversationKey)
  }

  /**
   * Get conversation history for debugging/analysis
   */
  getConversationHistory(branchName: string, userName: string): AIMessage[] {
    const conversationKey = `${branchName}-${userName}`
    return this.conversationHistory.get(conversationKey) || []
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null

export function createAIService(config: AIServiceConfig): AIService {
  aiServiceInstance = new AIService(config)
  return aiServiceInstance
}

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    throw new Error('AI Service not initialized. Call createAIService first.')
  }
  return aiServiceInstance
}

export default AIService