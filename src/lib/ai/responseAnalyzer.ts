/**
 * Response Analyzer
 * Automatically categorizes and tags user responses for better AI context
 */

export interface MessageAnalysis {
  categories: MessageCategory[]
  tags: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  topics: string[]
  urgency: 'low' | 'medium' | 'high'
  milestone?: string
  people?: string[]
  locations?: string[]
  timeReferences?: string[]
}

export interface MessageCategory {
  type: 'milestone' | 'daily_update' | 'concern' | 'celebration' | 'question' | 'memory' | 'routine' | 'photo_share'
  confidence: number
  reason: string
}

class ResponseAnalyzer {
  private milestoneKeywords = {
    first_smile: ['first smile', 'smiled for the first time', 'first real smile'],
    first_laugh: ['first laugh', 'laughed for the first time', 'giggled'],
    first_word: ['first word', 'said mama', 'said dada', 'said their first'],
    first_steps: ['first steps', 'walked', 'took their first step', 'walking'],
    first_tooth: ['first tooth', 'tooth came in', 'teething'],
    first_solid_food: ['first food', 'solid food', 'started eating'],
    birthday: ['birthday', 'turned', 'years old', 'birthday party'],
    christmas: ['christmas', 'xmas', 'santa', 'presents'],
    vacation: ['vacation', 'trip', 'travel', 'holiday'],
  }

  private sentimentWords = {
    positive: ['happy', 'excited', 'love', 'amazing', 'wonderful', 'great', 'awesome', 'perfect', 'beautiful', 'proud', 'joy', 'smile', 'laugh'],
    negative: ['worried', 'concerned', 'difficult', 'hard', 'problem', 'issue', 'crying', 'upset', 'sick', 'tired', 'stressed'],
  }

  private urgencyIndicators = {
    high: ['urgent', 'emergency', 'help', 'immediately', 'right now', 'asap', 'sick', 'hurt', 'fever'],
    medium: ['soon', 'today', 'tomorrow', 'this week', 'concerned', 'worried', 'question'],
  }

  private topicCategories = {
    health: ['doctor', 'sick', 'fever', 'medicine', 'checkup', 'vaccine', 'teeth', 'growth', 'sleep'],
    food: ['eating', 'food', 'hungry', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'bottle', 'milk'],
    development: ['walking', 'talking', 'crawling', 'sitting', 'playing', 'learning', 'book', 'toy'],
    social: ['friends', 'playdate', 'daycare', 'school', 'family', 'grandma', 'grandpa', 'cousin'],
    activities: ['park', 'playground', 'swimming', 'music', 'dance', 'art', 'reading', 'game'],
    routine: ['bedtime', 'nap', 'bath', 'morning', 'evening', 'schedule', 'routine'],
  }

  /**
   * Analyze a user message and extract categories, tags, and metadata
   */
  analyzeMessage(content: string, mediaUrls?: string[]): MessageAnalysis {
    const cleanContent = content.toLowerCase().trim()
    
    return {
      categories: this.categorizeMessage(cleanContent, mediaUrls),
      tags: this.extractTags(cleanContent),
      sentiment: this.analyzeSentiment(cleanContent),
      topics: this.extractTopics(cleanContent),
      urgency: this.assessUrgency(cleanContent),
      milestone: this.detectMilestone(cleanContent),
      people: this.extractPeople(cleanContent),
      locations: this.extractLocations(cleanContent),
      timeReferences: this.extractTimeReferences(cleanContent)
    }
  }

  private categorizeMessage(content: string, mediaUrls?: string[]): MessageCategory[] {
    const categories: MessageCategory[] = []
    
    // Photo sharing
    if (mediaUrls && mediaUrls.length > 0) {
      categories.push({
        type: 'photo_share',
        confidence: 0.9,
        reason: 'Message includes media attachments'
      })
    }

    // Milestone detection
    const milestone = this.detectMilestone(content)
    if (milestone) {
      categories.push({
        type: 'milestone',
        confidence: 0.95,
        reason: `Detected milestone: ${milestone}`
      })
    }

    // Celebration
    if (this.containsWords(content, ['birthday', 'celebrate', 'party', 'achievement', 'proud', 'excited'])) {
      categories.push({
        type: 'celebration',
        confidence: 0.8,
        reason: 'Contains celebratory language'
      })
    }

    // Concern/Question
    if (this.containsWords(content, ['worried', 'concerned', 'should i', 'is this normal', '?'])) {
      categories.push({
        type: content.includes('?') ? 'question' : 'concern',
        confidence: 0.85,
        reason: content.includes('?') ? 'Contains question marks' : 'Contains concern indicators'
      })
    }

    // Memory sharing
    if (this.containsWords(content, ['remember', 'today we', 'this morning', 'yesterday', 'last week'])) {
      categories.push({
        type: 'memory',
        confidence: 0.75,
        reason: 'Contains memory/experience sharing language'
      })
    }

    // Routine updates
    if (this.containsWords(content, ['bedtime', 'nap', 'morning', 'routine', 'schedule', 'usually'])) {
      categories.push({
        type: 'routine',
        confidence: 0.7,
        reason: 'Contains routine/schedule references'
      })
    }

    // Default to daily update if no specific category
    if (categories.length === 0 || (categories.length === 1 && categories[0].type === 'photo_share')) {
      categories.push({
        type: 'daily_update',
        confidence: 0.6,
        reason: 'General update without specific category indicators'
      })
    }

    return categories.sort((a, b) => b.confidence - a.confidence)
  }

  private extractTags(content: string): string[] {
    const tags = new Set<string>()
    
    // Extract hashtag-like patterns
    const hashtagPattern = /#(\w+)/g
    let match
    while ((match = hashtagPattern.exec(content)) !== null) {
      tags.add(match[1].toLowerCase())
    }
    
    // Extract meaningful keywords
    const keywords = [
      'happy', 'excited', 'tired', 'hungry', 'playful', 'cranky',
      'morning', 'afternoon', 'evening', 'bedtime',
      'park', 'home', 'daycare', 'grandmas', 'outside',
      'book', 'toy', 'music', 'bath', 'food', 'snack',
      'new', 'first', 'favorite', 'funny', 'cute'
    ]

    keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        tags.add(keyword)
      }
    })

    // Extract age-related tags
    const agePattern = /(\d+)\s*(month|year|week)s?\s*old/g
    while ((match = agePattern.exec(content)) !== null) {
      tags.add(`${match[1]}${match[2]}`)
    }

    return Array.from(tags)
  }

  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    let positiveScore = 0
    let negativeScore = 0

    this.sentimentWords.positive.forEach(word => {
      if (content.includes(word)) positiveScore++
    })

    this.sentimentWords.negative.forEach(word => {
      if (content.includes(word)) negativeScore++
    })

    // Check for emotional indicators
    if (content.includes('!') || content.includes('😊') || content.includes('❤️')) {
      positiveScore++
    }

    if (content.includes('😢') || content.includes('😰') || content.includes('💔')) {
      negativeScore++
    }

    if (positiveScore > negativeScore) return 'positive'
    if (negativeScore > positiveScore) return 'negative'
    return 'neutral'
  }

  private extractTopics(content: string): string[] {
    const topics = new Set<string>()

    Object.entries(this.topicCategories).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        topics.add(topic)
      }
    })

    return Array.from(topics)
  }

  private assessUrgency(content: string): 'low' | 'medium' | 'high' {
    if (this.urgencyIndicators.high.some(word => content.includes(word))) {
      return 'high'
    }
    if (this.urgencyIndicators.medium.some(word => content.includes(word))) {
      return 'medium'
    }
    return 'low'
  }

  private detectMilestone(content: string): string | undefined {
    for (const [milestone, keywords] of Object.entries(this.milestoneKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return milestone
      }
    }
    return undefined
  }

  private extractPeople(content: string): string[] {
    const people = new Set<string>()
    
    // Common family terms
    const familyTerms = ['mama', 'mom', 'mommy', 'dada', 'dad', 'daddy', 'grandma', 'grandpa', 'sister', 'brother', 'aunt', 'uncle', 'cousin']
    familyTerms.forEach(term => {
      if (content.includes(term)) {
        people.add(term)
      }
    })

    // Names (capitalized words that aren't at sentence start)
    const namePattern = /(?<!^|\. )([A-Z][a-z]+)/g
    let match
    while ((match = namePattern.exec(content)) !== null) {
      const name = match[1]
      if (!['I', 'We', 'He', 'She', 'They'].includes(name)) {
        people.add(name.toLowerCase())
      }
    }

    return Array.from(people)
  }

  private extractLocations(content: string): string[] {
    const locations = new Set<string>()
    
    const locationKeywords = ['park', 'home', 'daycare', 'school', 'playground', 'beach', 'zoo', 'library', 'store', 'restaurant', 'hospital', 'doctor']
    locationKeywords.forEach(location => {
      if (content.includes(location)) {
        locations.add(location)
      }
    })

    return Array.from(locations)
  }

  private extractTimeReferences(content: string): string[] {
    const timeRefs = new Set<string>()
    
    const timePatterns = [
      /\b(today|yesterday|tomorrow)\b/g,
      /\b(this|last|next)\s+(morning|afternoon|evening|night|week|month|year)\b/g,
      /\b(\d{1,2}:\d{2})\s*(am|pm)?\b/g,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g
    ]

    timePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        timeRefs.add(match[0])
      }
    })

    return Array.from(timeRefs)
  }

  private containsWords(content: string, words: string[]): boolean {
    return words.some(word => content.includes(word))
  }

  /**
   * Generate suggested tags based on analysis
   */
  generateSuggestedTags(analysis: MessageAnalysis): string[] {
    const suggested = new Set<string>()

    // Add category-based tags
    analysis.categories.forEach(category => {
      if (category.confidence > 0.7) {
        suggested.add(category.type)
      }
    })

    // Add sentiment
    if (analysis.sentiment !== 'neutral') {
      suggested.add(analysis.sentiment)
    }

    // Add topics
    analysis.topics.forEach(topic => suggested.add(topic))

    // Add milestone if detected
    if (analysis.milestone) {
      suggested.add(analysis.milestone)
    }

    // Add urgency if not low
    if (analysis.urgency !== 'low') {
      suggested.add(`urgency_${analysis.urgency}`)
    }

    return Array.from(suggested).slice(0, 8) // Limit to 8 suggestions
  }
}

// Singleton instance
let responseAnalyzerInstance: ResponseAnalyzer | null = null

export function getResponseAnalyzer(): ResponseAnalyzer {
  if (!responseAnalyzerInstance) {
    responseAnalyzerInstance = new ResponseAnalyzer()
  }
  return responseAnalyzerInstance
}

export default ResponseAnalyzer