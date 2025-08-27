'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNewThread } from './actions'
import type { User } from '@supabase/supabase-js'

interface Thread {
  id: string
  tree_id: string
  title: string | null
  created_at: string
  updated_at: string
  trees: {
    name: string
  }
}

interface Tree {
  id: string
  name: string
  description: string | null
}

interface AssistantThreadsProps {
  user: User
  trees: Tree[]
  threads: Thread[]
}

export default function AssistantThreads({ user, trees, threads }: AssistantThreadsProps) {
  const [selectedTreeId, setSelectedTreeId] = useState(trees[0]?.id || '')
  const [isCreating, setIsCreating] = useState(false)
  const [showNewThreadModal, setShowNewThreadModal] = useState(false)
  const router = useRouter()

  const handleCreateThread = async (title: string) => {
    if (!selectedTreeId || !title.trim()) return

    setIsCreating(true)
    try {
      const thread = await createNewThread(selectedTreeId, title.trim())
      setShowNewThreadModal(false)
      router.push(`/assistant/${thread.id}`)
    } catch (error) {
      console.error('Error creating thread:', error)
      alert('Failed to create conversation. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const suggestedPrompts = [
    {
      title: "Milestone Tracker",
      prompt: "Help me track my child's developmental milestones and what to expect next",
      icon: "🎯"
    },
    {
      title: "Activity Ideas", 
      prompt: "Suggest age-appropriate activities for my child based on their current stage",
      icon: "🎨"
    },
    {
      title: "Sleep Questions",
      prompt: "I have questions about my child's sleep patterns and routines",
      icon: "😴"
    },
    {
      title: "Nutrition Help",
      prompt: "Help me with meal planning and nutrition questions for my child",
      icon: "🥗"
    }
  ]

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Your Conversations</h2>
          <p className="text-gray-600 mt-1">Get personalized parenting insights and milestone tracking</p>
        </div>
        <button
          onClick={() => setShowNewThreadModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Conversations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Conversations</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {threads.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h4>
                  <p className="text-gray-600 mb-4">
                    Start your first conversation with the family assistant to get personalized parenting insights.
                  </p>
                  <button
                    onClick={() => setShowNewThreadModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Start Chatting
                  </button>
                </div>
              ) : (
                threads.map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => router.push(`/assistant/${thread.id}`)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-gray-900 mb-1">
                          {thread.title || 'Untitled Conversation'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {thread.trees.name} • {formatDate(thread.updated_at)}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Quick Start</h3>
            </div>
            <div className="p-6 space-y-4">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setShowNewThreadModal(true)
                    // Pre-fill the prompt
                    setTimeout(() => {
                      const textarea = document.querySelector('#initial-prompt') as HTMLTextAreaElement
                      if (textarea) {
                        textarea.value = prompt.prompt
                      }
                    }, 100)
                  }}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">{prompt.icon}</span>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{prompt.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{prompt.prompt}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be specific about your child's age and stage</li>
              <li>• Ask about developmental milestones</li>
              <li>• Get activity and meal suggestions</li>
              <li>• Track growth and progress over time</li>
            </ul>
          </div>
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <NewThreadModal
          trees={trees}
          selectedTreeId={selectedTreeId}
          onTreeChange={setSelectedTreeId}
          onSubmit={handleCreateThread}
          onClose={() => setShowNewThreadModal(false)}
          isLoading={isCreating}
        />
      )}
    </>
  )
}

interface NewThreadModalProps {
  trees: Tree[]
  selectedTreeId: string
  onTreeChange: (treeId: string) => void
  onSubmit: (title: string) => void
  onClose: () => void
  isLoading: boolean
}

function NewThreadModal({ trees, selectedTreeId, onTreeChange, onSubmit, onClose, isLoading }: NewThreadModalProps) {
  const [title, setTitle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onSubmit(title.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Start New Conversation</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Family Tree
            </label>
            <select
              value={selectedTreeId}
              onChange={(e) => onTreeChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {trees.map((tree) => (
                <option key={tree.id} value={tree.id}>
                  {tree.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to discuss?
            </label>
            <textarea
              id="initial-prompt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Help me track my 2-year-old's milestones, or ask about sleep routines..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Starting...' : 'Start Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}