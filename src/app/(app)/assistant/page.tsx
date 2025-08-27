import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AssistantThreads from './assistant-threads'

export default async function AssistantPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get user's trees where they are owner or caregiver (parent-only feature)
  const { data: userTrees, error: treesError } = await supabase
    .from('tree_members')
    .select(`
      tree_id,
      role,
      trees (
        id,
        name,
        description
      )
    `)
    .eq('user_id', user.id)
    .in('role', ['owner', 'caregiver'])

  if (treesError || !userTrees || userTrees.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Assistant Not Available</h1>
          <p className="text-gray-600 mb-6">
            The AI assistant is only available to tree owners and caregivers. 
            You need to be a parent or caregiver in a family tree to access this feature.
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

  // Get assistant threads for the user's trees
  const treeIds = userTrees.map(ut => ut.trees.id)
  
  const { data: threads, error: threadsError } = await supabase
    .from('assistant_threads')
    .select(`
      id,
      tree_id,
      title,
      created_at,
      updated_at,
      trees (
        name
      )
    `)
    .in('tree_id', treeIds)
    .order('updated_at', { ascending: false })

  if (threadsError) {
    console.error('Error fetching assistant threads:', threadsError)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Family Assistant</h1>
                <p className="text-gray-600">AI-powered parenting insights and milestone tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <AssistantThreads
          user={user}
          trees={userTrees.map(ut => ut.trees)}
          threads={threads || []}
        />
      </div>
    </div>
  )
}