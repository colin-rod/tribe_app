import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AssistantChat from './assistant-chat'

interface PageProps {
  params: { threadId: string }
}

export default async function AssistantThreadPage({ params }: PageProps) {
  const { threadId } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get the thread and verify access
  const { data: thread, error: threadError } = await supabase
    .from('assistant_threads')
    .select(`
      id,
      tree_id,
      created_by,
      title,
      created_at,
      updated_at,
      trees (
        id,
        name
      )
    `)
    .eq('id', threadId)
    .single()

  if (threadError || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thread Not Found</h1>
          <p className="text-gray-600 mb-6">
            This conversation could not be found or you don't have access to it.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Verify user has access to this tree
  const { data: treeMember, error: memberError } = await supabase
    .from('tree_members')
    .select('role')
    .eq('tree_id', thread.tree_id)
    .eq('user_id', user.id)
    .in('role', ['owner', 'caregiver'])
    .single()

  if (memberError || !treeMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need to be an owner or caregiver in this family tree to access the assistant.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Get messages for this thread
  const { data: messages, error: messagesError } = await supabase
    .from('assistant_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Error fetching messages:', messagesError)
  }

  // Get children for this tree (for context)
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('*')
    .eq('tree_id', thread.tree_id)
    .order('dob', { ascending: false })

  if (childrenError) {
    console.error('Error fetching children:', childrenError)
  }

  return (
    <AssistantChat
      user={user}
      thread={thread}
      messages={messages || []}
      children={children || []}
    />
  )
}