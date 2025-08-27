'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AssistantMessage, Child } from '@/types/database'

// Simple LLM integration - replace with your preferred provider
// For now using a basic OpenAI-style API call
const LLM_API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY

/**
 * Create a new assistant thread
 */
export async function createNewThread(treeId: string, initialMessage: string) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  // Verify user has access to this tree
  const { data: treeMember, error: memberError } = await supabase
    .from('tree_members')
    .select('role')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .in('role', ['owner', 'caregiver'])
    .single()

  if (memberError || !treeMember) {
    throw new Error('Access denied. Only tree owners and caregivers can use the assistant.')
  }

  // Create the thread
  const { data: thread, error: threadError } = await supabase
    .from('assistant_threads')
    .insert({
      tree_id: treeId,
      created_by: user.id,
      title: generateThreadTitle(initialMessage)
    })
    .select()
    .single()

  if (threadError) {
    throw new Error(`Failed to create thread: ${threadError.message}`)
  }

  // Get children for context
  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('tree_id', treeId)

  // Send initial message and get response
  await sendMessage(thread.id, initialMessage, children || [])

  revalidatePath('/assistant')
  return thread
}

/**
 * Send a message in a thread and get AI response
 */
export async function sendMessage(threadId: string, message: string, children: Child[]) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  // Verify access to thread
  const { data: thread, error: threadError } = await supabase
    .from('assistant_threads')
    .select(`
      id,
      tree_id,
      trees (
        name
      )
    `)
    .eq('id', threadId)
    .single()

  if (threadError || !thread) {
    throw new Error('Thread not found')
  }

  // Verify tree access
  const { data: treeMember, error: memberError } = await supabase
    .from('tree_members')
    .select('role')
    .eq('tree_id', thread.tree_id)
    .eq('user_id', user.id)
    .in('role', ['owner', 'caregiver'])
    .single()

  if (memberError || !treeMember) {
    throw new Error('Access denied')
  }

  // Insert parent message
  const { data: parentMessage, error: parentMessageError } = await supabase
    .from('assistant_messages')
    .insert({
      thread_id: threadId,
      author: 'parent',
      content: message
    })
    .select()
    .single()

  if (parentMessageError) {
    throw new Error(`Failed to save message: ${parentMessageError.message}`)
  }

  // Get conversation history for context
  const { data: messageHistory, error: historyError } = await supabase
    .from('assistant_messages')
    .select('author, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(20) // Last 20 messages for context

  if (historyError) {
    console.error('Error fetching message history:', historyError)
  }

  // Generate AI response
  const aiResponse = await generateAIResponse(
    message, 
    messageHistory || [],
    children,
    thread.trees.name
  )

  // Insert AI response
  const { data: aiMessage, error: aiMessageError } = await supabase
    .from('assistant_messages')
    .insert({
      thread_id: threadId,
      author: 'assistant',
      content: aiResponse
    })
    .select()
    .single()

  if (aiMessageError) {
    throw new Error(`Failed to save AI response: ${aiMessageError.message}`)
  }

  // Update thread timestamp
  await supabase
    .from('assistant_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId)

  revalidatePath(`/assistant/${threadId}`)
  
  return {
    messages: [parentMessage, aiMessage]
  }
}

/**
 * Delete a thread and all its messages
 */
export async function deleteThread(threadId: string) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  // Verify thread ownership
  const { data: thread, error: threadError } = await supabase
    .from('assistant_threads')
    .select('created_by')
    .eq('id', threadId)
    .single()

  if (threadError || !thread || thread.created_by !== user.id) {
    throw new Error('Thread not found or access denied')
  }

  // Delete thread (messages will be deleted via CASCADE)
  const { error: deleteError } = await supabase
    .from('assistant_threads')
    .delete()
    .eq('id', threadId)

  if (deleteError) {
    throw new Error(`Failed to delete thread: ${deleteError.message}`)
  }

  revalidatePath('/assistant')
}

/**
 * Generate AI response using LLM API
 */
async function generateAIResponse(
  userMessage: string,
  messageHistory: { author: string; content: string }[],
  children: Child[],
  treeName: string
): Promise<string> {
  // If no API key is configured, return a helpful placeholder
  if (!LLM_API_KEY) {
    return generatePlaceholderResponse(userMessage, children)
  }

  try {
    // Build context about children
    const childrenContext = children.length > 0 
      ? children.map(child => {
          const age = child.dob 
            ? Math.floor((new Date().getTime() - new Date(child.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
            : null
          return `${child.name}${age !== null ? ` (${age} years old)` : ''}`
        }).join(', ')
      : 'No children information provided'

    // Build conversation history
    const conversationHistory = messageHistory.map(msg => ({
      role: msg.author === 'parent' ? 'user' : 'assistant',
      content: msg.content
    }))

    // System prompt for the assistant
    const systemPrompt = `You are a helpful family assistant for the ${treeName} family. You provide supportive, evidence-based parenting advice and information.

Family context:
- Children: ${childrenContext}

Guidelines:
- Provide warm, supportive responses
- Offer practical, actionable advice
- Reference child development milestones when relevant
- Suggest age-appropriate activities
- Always encourage consulting healthcare providers for medical concerns
- Keep responses conversational and encouraging
- Focus on positive parenting approaches

Remember: You're here to support parents with information and suggestions, not replace professional medical or psychological advice.`

    const response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'I apologize, but I encountered an error generating a response. Please try again.'

  } catch (error) {
    console.error('Error generating AI response:', error)
    return generatePlaceholderResponse(userMessage, children)
  }
}

/**
 * Generate a helpful placeholder response when AI is not available
 */
function generatePlaceholderResponse(userMessage: string, children: Child[]): string {
  const childrenInfo = children.length > 0 
    ? `I see you have ${children.length} child${children.length > 1 ? 'ren' : ''}: ${children.map(c => c.name).join(', ')}.`
    : ''

  const responses = [
    `Thank you for your question about parenting! ${childrenInfo}

While I don't have AI capabilities configured right now, here are some general suggestions:

• Consider your child's developmental stage and individual needs
• Look for age-appropriate activities that match their interests
• Maintain consistent routines, especially for sleep and meals
• Remember that every child develops at their own pace

For specific concerns, always consult with your pediatrician or child development specialist.

Would you like to share more details about what you're experiencing?`,

    `I appreciate you reaching out! ${childrenInfo}

Here are some helpful parenting resources while the AI assistant is being configured:

• Zero to Three (zerotothree.org) for early childhood development
• American Academy of Pediatrics (healthychildren.org) for health guidance
• Your local pediatrician for personalized advice
• Parent groups in your community for peer support

Feel free to continue the conversation - I'm here to help organize your thoughts and questions!`,

    `Thanks for your question! ${childrenInfo}

Some general parenting principles that might help:

• Follow your child's lead and interests
• Create predictable routines that feel safe
• Use positive reinforcement more than corrections
• Take care of yourself so you can take care of them
• Trust your instincts as a parent

What specific area would you like to explore further? I'm here to help you think through your parenting journey.`
  ]

  return responses[Math.floor(Math.random() * responses.length)]
}

/**
 * Generate a title for a thread based on the initial message
 */
function generateThreadTitle(message: string): string {
  // Simple title generation - in production you might use AI for this too
  const words = message.split(' ').slice(0, 8).join(' ')
  return words.length < message.length ? words + '...' : words
}