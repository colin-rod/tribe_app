/**
 * AI Prompt Templates and Scenarios
 * Pre-defined prompts and conversation scenarios for different family situations
 */

export interface PromptTemplate {
  id: string
  type: 'checkin' | 'milestone' | 'memory' | 'followup' | 'celebration'
  category: 'daily' | 'weekly' | 'special' | 'milestone' | 'seasonal'
  title: string
  prompt: string
  followUpQuestions: string[]
  suggestedResponses: string[]
  triggers?: {
    timeOfDay?: ('morning' | 'afternoon' | 'evening')[]
    dayOfWeek?: string[]
    keywords?: string[]
    milestones?: string[]
  }
  personalization?: {
    familyRole?: ('parent' | 'child' | 'grandparent')[]
    branchType?: ('family' | 'community')[]
    ageGroups?: ('infant' | 'toddler' | 'child' | 'teen')[]
  }
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Daily Check-ins
  {
    id: 'morning-checkin',
    type: 'checkin',
    category: 'daily',
    title: 'Morning Check-in',
    prompt: 'Good morning! I hope everyone\'s having a great start to their day. What\'s on the agenda for {branchName} today?',
    followUpQuestions: [
      'That sounds exciting! How is everyone feeling about it?',
      'Are there any special preparations you\'re doing?',
      'What are you most looking forward to?'
    ],
    suggestedResponses: [
      'Pretty typical morning',
      'We have something special planned',
      'Just the usual routine',
      'Everyone\'s excited today!'
    ],
    triggers: {
      timeOfDay: ['morning']
    }
  },

  {
    id: 'evening-reflection',
    type: 'checkin',
    category: 'daily',
    title: 'Evening Reflection',
    prompt: 'How did the day go for {branchName}? I\'d love to hear about the highlights - or even the challenging moments that made you stronger!',
    followUpQuestions: [
      'That sounds like it was really meaningful. How did it make you feel?',
      'What was the best part about that experience?',
      'Were there any surprises during the day?'
    ],
    suggestedResponses: [
      'It was a great day!',
      'Had some ups and downs',
      'Busy but good',
      'Something special happened'
    ],
    triggers: {
      timeOfDay: ['evening']
    }
  },

  // Milestone Celebrations
  {
    id: 'first-steps-celebration',
    type: 'celebration',
    category: 'milestone',
    title: 'First Steps Milestone',
    prompt: 'OH MY GOODNESS! First steps are such an incredible milestone! I\'m so excited for your family. Tell me everything - where did it happen? Who saw it? How did everyone react?',
    followUpQuestions: [
      'How many steps did they take?',
      'What was their expression like?',
      'Did they seem surprised by their own achievement?',
      'How are the parents feeling about this big moment?'
    ],
    suggestedResponses: [
      'It was amazing to watch!',
      'We got it on video!',
      'Everyone was so proud',
      'They looked so determined'
    ],
    triggers: {
      milestones: ['first_steps'],
      keywords: ['steps', 'walking', 'walked']
    }
  },

  {
    id: 'first-word-celebration',
    type: 'celebration',
    category: 'milestone',
    title: 'First Word Milestone',
    prompt: 'What a special moment! A first word is such a precious milestone. What did they say? Was it what you expected? I bet everyone\'s hearts just melted!',
    followUpQuestions: [
      'Have they said it again since then?',
      'Who were they looking at when they said it?',
      'Are they trying to say other words now too?',
      'How long have you been waiting for this moment?'
    ],
    suggestedResponses: [
      'It was "mama" or "dada"',
      'So unexpected!',
      'We\'ve been practicing',
      'Everyone got emotional'
    ],
    triggers: {
      milestones: ['first_word'],
      keywords: ['word', 'said', 'talking', 'spoke']
    }
  },

  // Memory Prompts
  {
    id: 'weekend-memories',
    type: 'memory',
    category: 'weekly',
    title: 'Weekend Memories',
    prompt: 'Sunday evening is perfect for reflecting! What was the most memorable part of your weekend with {branchName}? I love hearing about these family moments!',
    followUpQuestions: [
      'That sounds wonderful! What made it so special?',
      'Did everyone enjoy it equally?',
      'Are you planning to do something similar again?'
    ],
    suggestedResponses: [
      'We had family time',
      'Tried something new',
      'Just relaxed together',
      'Made some memories'
    ],
    triggers: {
      dayOfWeek: ['Sunday']
    }
  },

  {
    id: 'photo-memory-prompt',
    type: 'memory',
    category: 'special',
    title: 'Photo Memory Sharing',
    prompt: 'I notice you don\'t share photos very often, but when you do, they\'re always so special! Do you have any recent pictures that capture a sweet family moment?',
    followUpQuestions: [
      'What\'s the story behind this photo?',
      'Who took the picture?',
      'What was happening just before or after this moment?'
    ],
    suggestedResponses: [
      'I have a few good ones',
      'Let me find something',
      'Here\'s from last week',
      'This one\'s my favorite'
    ]
  },

  // Seasonal Prompts
  {
    id: 'season-activities',
    type: 'checkin',
    category: 'seasonal',
    title: 'Seasonal Activities',
    prompt: 'I love how each season brings new opportunities for family fun! What {season} activities have you been enjoying with {branchName} lately?',
    followUpQuestions: [
      'That sounds like so much fun! Is this a new tradition for your family?',
      'What did everyone enjoy most about it?',
      'Are you planning any other seasonal activities?'
    ],
    suggestedResponses: [
      'We love this season!',
      'Trying new activities',
      'Same favorites as always',
      'Making new traditions'
    ]
  },

  // Developmental Follow-ups
  {
    id: 'growth-followup',
    type: 'followup',
    category: 'special',
    title: 'Growth and Development',
    prompt: 'I\'ve noticed you mentioned some new developments with the little one recently. How are they doing with {previousTopic}? It\'s amazing how quickly they grow and change!',
    followUpQuestions: [
      'Have you noticed any other new skills emerging?',
      'How are they handling this new phase?',
      'What has surprised you most about their development?'
    ],
    suggestedResponses: [
      'They\'re doing great!',
      'Still working on it',
      'Lots of new things',
      'Growing so fast'
    ]
  },

  // Special Occasion Prompts
  {
    id: 'birthday-celebration',
    type: 'celebration',
    category: 'special',
    title: 'Birthday Celebration',
    prompt: 'HAPPY BIRTHDAY! Birthdays are such special family occasions. How are you celebrating? I\'d love to hear about all the birthday magic happening in {branchName}!',
    followUpQuestions: [
      'What was their favorite part of the celebration?',
      'Did you do anything special or traditional?',
      'How did they react to their gifts?',
      'Any funny or sweet birthday moments?'
    ],
    suggestedResponses: [
      'It was perfect!',
      'They loved everything',
      'Small but sweet celebration',
      'Made wonderful memories'
    ],
    triggers: {
      keywords: ['birthday', 'born', 'cake', 'party'],
      milestones: ['birthday']
    }
  },

  // Challenging Days Support
  {
    id: 'tough-day-support',
    type: 'checkin',
    category: 'special',
    title: 'Supportive Check-in',
    prompt: 'Some days are tougher than others, and that\'s completely normal in family life. How is everyone holding up? Remember, even the challenging days can become meaningful memories.',
    followUpQuestions: [
      'What helped you get through the tough moments?',
      'Is there anything that brought a smile despite the challenges?',
      'How can I help you capture the resilience your family shows?'
    ],
    suggestedResponses: [
      'We got through it together',
      'Found some bright spots',
      'Taking it one moment at a time',
      'Tomorrow will be better'
    ]
  },

  // Activity-Based Prompts
  {
    id: 'mealtime-memories',
    type: 'memory',
    category: 'daily',
    title: 'Mealtime Moments',
    prompt: 'Family meals often create the sweetest memories! Have you had any fun, funny, or heartwarming mealtime moments with {branchName} recently?',
    followUpQuestions: [
      'What made this mealtime special?',
      'Did anyone try something new?',
      'Are there any favorite family meal traditions?'
    ],
    suggestedResponses: [
      'Trying new foods',
      'Funny conversation',
      'Cooked together',
      'Family favorite meal'
    ],
    triggers: {
      keywords: ['eat', 'food', 'dinner', 'lunch', 'cooking', 'meal']
    }
  },

  {
    id: 'bedtime-routine',
    type: 'memory',
    category: 'daily',
    title: 'Bedtime Stories',
    prompt: 'Bedtime routines can be so precious - all those quiet, cozy moments together. How have bedtimes been going with {branchName}? Any sweet bedtime stories or routines to share?',
    followUpQuestions: [
      'Do you have favorite bedtime books or songs?',
      'What helps everyone wind down best?',
      'Any cute things they say before sleep?'
    ],
    suggestedResponses: [
      'Love our bedtime routine',
      'Reading together',
      'Sometimes challenging',
      'Sweet sleepy moments'
    ],
    triggers: {
      keywords: ['sleep', 'bedtime', 'nap', 'story', 'book']
    }
  }
]

/**
 * Get prompt templates by category or type
 */
export function getPromptTemplates(filters?: {
  type?: PromptTemplate['type']
  category?: PromptTemplate['category']
  timeOfDay?: string
  dayOfWeek?: string
  keywords?: string[]
}): PromptTemplate[] {
  let templates = PROMPT_TEMPLATES

  if (filters) {
    templates = templates.filter(template => {
      if (filters.type && template.type !== filters.type) return false
      if (filters.category && template.category !== filters.category) return false
      
      if (filters.timeOfDay && template.triggers?.timeOfDay) {
        if (!template.triggers.timeOfDay.includes(filters.timeOfDay as any)) return false
      }
      
      if (filters.dayOfWeek && template.triggers?.dayOfWeek) {
        if (!template.triggers.dayOfWeek.includes(filters.dayOfWeek)) return false
      }
      
      if (filters.keywords && template.triggers?.keywords) {
        const hasMatchingKeyword = filters.keywords.some(keyword =>
          template.triggers!.keywords!.some(templateKeyword =>
            keyword.toLowerCase().includes(templateKeyword.toLowerCase())
          )
        )
        if (!hasMatchingKeyword) return false
      }
      
      return true
    })
  }

  return templates
}

/**
 * Get a random prompt template based on context
 */
export function getRandomPromptTemplate(context: {
  timeOfDay?: string
  dayOfWeek?: string
  recentKeywords?: string[]
  lastPromptType?: string
}): PromptTemplate {
  // Avoid repeating the same type consecutively
  let templates = PROMPT_TEMPLATES
  if (context.lastPromptType) {
    const otherTypes = templates.filter(t => t.type !== context.lastPromptType)
    if (otherTypes.length > 0) {
      templates = otherTypes
    }
  }

  // Filter by time context
  const contextFiltered = getPromptTemplates({
    timeOfDay: context.timeOfDay,
    dayOfWeek: context.dayOfWeek,
    keywords: context.recentKeywords
  })

  const finalTemplates = contextFiltered.length > 0 ? contextFiltered : templates
  return finalTemplates[Math.floor(Math.random() * finalTemplates.length)]
}

/**
 * Personalize a prompt template with user context
 */
export function personalizePrompt(
  template: PromptTemplate,
  context: {
    branchName: string
    userName: string
    previousTopic?: string
    season?: string
    recentKeywords?: string[]
  }
): string {
  let personalizedPrompt = template.prompt

  // Replace placeholders
  personalizedPrompt = personalizedPrompt.replace(/{branchName}/g, context.branchName)
  personalizedPrompt = personalizedPrompt.replace(/{userName}/g, context.userName)
  personalizedPrompt = personalizedPrompt.replace(/{previousTopic}/g, context.previousTopic || 'recent developments')
  personalizedPrompt = personalizedPrompt.replace(/{season}/g, context.season || 'current')

  // Add personalization based on recent keywords
  if (context.recentKeywords && context.recentKeywords.length > 0) {
    const recentTopic = context.recentKeywords[0]
    if (template.type === 'followup') {
      personalizedPrompt = personalizedPrompt.replace(/recently\./, `with ${recentTopic} recently.`)
    }
  }

  return personalizedPrompt
}

/**
 * Get appropriate follow-up questions based on user response
 */
export function getFollowUpQuestions(
  template: PromptTemplate,
  userResponse: string
): string[] {
  const responseLength = userResponse.length
  const enthusiasm = userResponse.includes('!') || userResponse.includes('love') || userResponse.includes('amazing')
  
  // Filter follow-up questions based on response characteristics
  let questions = template.followUpQuestions || []
  
  if (responseLength < 50) {
    // Short response - ask more open-ended questions
    questions = questions.filter(q => 
      q.includes('How') || q.includes('What') || q.includes('Tell me')
    )
  } else if (enthusiasm) {
    // Enthusiastic response - dig deeper into emotions and details
    questions = questions.filter(q =>
      q.includes('feel') || q.includes('favorite') || q.includes('special')
    )
  }
  
  return questions.slice(0, 2) // Return max 2 follow-up questions
}

/**
 * Generate contextual suggested responses
 */
export function generateSuggestedResponses(
  template: PromptTemplate,
  context: { timeOfDay?: string; branchType?: string }
): string[] {
  let responses = template.suggestedResponses || []
  
  // Customize responses based on context
  if (context.timeOfDay === 'morning') {
    responses = responses.map(r => 
      r === 'Pretty typical morning' ? 'Great start to the day!' : r
    )
  }
  
  if (context.branchType === 'community') {
    responses = responses.map(r => 
      r.replace('family', 'community').replace('everyone', 'the group')
    )
  }
  
  return responses.slice(0, 4) // Return max 4 suggestions
}

export default PROMPT_TEMPLATES