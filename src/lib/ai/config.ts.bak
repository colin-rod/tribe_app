/**
 * AI Service Configuration
 * Manages AI service initialization and environment variables
 */

import { createAIService, type AIServiceConfig } from './aiService'
import { createComponentLogger } from '../logger'

const logger = createComponentLogger('AIConfig')

/**
 * Get AI service configuration from environment variables
 */
export function getAIConfig(): AIServiceConfig {
  // Check for OpenAI configuration first
  const openAIKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (openAIKey) {
    return {
      provider: 'openai',
      apiKey: openAIKey,
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4',
      maxTokens: parseInt(process.env.NEXT_PUBLIC_OPENAI_MAX_TOKENS || '500'),
      temperature: parseFloat(process.env.NEXT_PUBLIC_OPENAI_TEMPERATURE || '0.7')
    }
  }

  // Check for Anthropic configuration
  const anthropicKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    return {
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: process.env.NEXT_PUBLIC_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: parseInt(process.env.NEXT_PUBLIC_ANTHROPIC_MAX_TOKENS || '500'),
      temperature: parseFloat(process.env.NEXT_PUBLIC_ANTHROPIC_TEMPERATURE || '0.7')
    }
  }

  // Fallback to demo mode with mock responses
  logger.warn('No AI API keys found. Running in demo mode with mock responses.')
  return {
    provider: 'openai', // Doesn't matter in demo mode
    apiKey: 'demo',
    model: 'demo',
    maxTokens: 500,
    temperature: 0.7
  }
}

/**
 * Initialize the AI service with environment configuration
 */
export function initializeAIService() {
  const config = getAIConfig()
  return createAIService(config)
}

/**
 * Check if AI service is properly configured
 */
export function isAIConfigured(): boolean {
  const openAIKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  const anthropicKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  
  const configured = !!(openAIKey || anthropicKey)
  logger.info('AI Configuration Check', { 
    metadata: {
      configured, 
      hasOpenAI: !!openAIKey,
      hasAnthropic: !!anthropicKey
    }
  })
  
  return configured
}

/**
 * Test AI API connection (temporary debug function)
 */
export async function testAIConnection() {
  if (!isAIConfigured()) {
    logger.info('AI not configured, skipping test')
    return false
  }
  
  try {
    const openAIKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (openAIKey) {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
        },
      })
      
      if (response.ok) {
        logger.info('OpenAI API connection successful')
        return true
      } else {
        logger.error('OpenAI API error', null, { status: response.status, statusText: response.statusText })
        return false
      }
    }
  } catch (error) {
    logger.error('OpenAI API connection failed', error)
    return false
  }
  
  return false
}

/**
 * Get demo AI responses when no API key is configured
 */
export function getDemoAIResponse(promptType: string, context: { userName: string; branchName: string }) {
  const responses = {
    checkin: [
      `Hi ${context.userName}! How has everyone been doing in ${context.branchName} today? I'd love to hear about any special moments or just how the day went.`,
      `Good evening! I hope ${context.branchName} had a wonderful day. What was the highlight of today?`,
      `Hey there! It's been a little while since we chatted. How are things going with the family?`
    ],
    milestone: [
      `That's so exciting! Tell me more about this special moment - I'd love to capture all the details for your family memories.`,
      `What an amazing milestone! How did it feel when it happened? I bet everyone was so proud.`,
      `This is such a big moment! Can you walk me through what happened? I want to make sure we get all the details saved.`
    ],
    memory: [
      `I'm here to help capture some beautiful family memories! What's been happening lately that you'd like to remember?`,
      `Let's create some lasting memories together. What's something special that's happened recently with the family?`,
      `I love helping families preserve their precious moments. What would you like to share today?`
    ],
    celebration: [
      `Congratulations! This is such a wonderful achievement. Tell me all about how this milestone happened!`,
      `What fantastic news! I'm so happy for your family. Can you share more details about this special moment?`,
      `This calls for a celebration! I'd love to hear the full story behind this amazing milestone.`
    ],
    followup: [
      `That sounds wonderful! Can you tell me more about how that felt?`,
      `I love hearing these details! What happened next?`,
      `That's such a sweet memory. Were there any other special moments from that day?`
    ]
  }

  const typeResponses = responses[promptType as keyof typeof responses] || responses.memory
  return typeResponses[Math.floor(Math.random() * typeResponses.length)]
}