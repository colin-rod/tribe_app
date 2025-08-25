'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { CircleType, CirclePrivacy } from '@/types/database'

export default function CreateCirclePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // Form state
  const [circleType, setCircleType] = useState<CircleType>('family')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [privacy, setPrivacy] = useState<CirclePrivacy>('private')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [autoApprove, setAutoApprove] = useState(false)
  const [isDiscoverable, setIsDiscoverable] = useState(false)

  // Available categories
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      setLoading(false)
    }

    const loadCategories = async () => {
      const { data } = await supabase
        .from('circle_categories')
        .select('*')
        .order('name')
      
      if (data) {
        setCategories(data)
      }
    }

    checkAuth()
    loadCategories()
  }, [router])

  const colorOptions = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !name.trim()) return

    setSubmitting(true)

    try {
      // Create the circle
      const { data: circle, error: circleError } = await supabase
        .from('circles')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          type: circleType,
          privacy: circleType === 'family' ? 'private' : privacy,
          category: category || null,
          location: location.trim() || null,
          color,
          created_by: user.id,
          is_discoverable: circleType === 'community' && isDiscoverable,
          auto_approve_members: autoApprove
        })
        .select()
        .single()

      if (circleError) throw circleError

      // Add creator as member - RBAC trigger will automatically assign owner role
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circle.id,
          user_id: user.id,
          role: 'admin', // Use admin for now, RBAC will assign owner role
          join_method: 'admin_added',
          status: 'active'
        })

      if (memberError) throw memberError

      // Redirect to dashboard
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Error creating circle:', error)
      alert(`Failed to create circle: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Create New Circle</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            
            {/* Circle Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What type of circle do you want to create?
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setCircleType('family')
                    setPrivacy('private')
                    setIsDiscoverable(false)
                    setAutoApprove(false)
                  }}
                  className={`p-6 text-left rounded-lg border-2 transition-colors ${
                    circleType === 'family' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-xl">👨‍👩‍👧‍👦</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Family Circle</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Private circles for sharing family moments, child updates, and memories with specific family members.
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setCircleType('community')
                    setPrivacy('public')
                    setIsDiscoverable(true)
                    setAutoApprove(true)
                  }}
                  className={`p-6 text-left rounded-lg border-2 transition-colors ${
                    circleType === 'community' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-xl">🌍</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Community Circle</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Connect with other parents around shared interests, local communities, or parenting stages.
                  </p>
                </button>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Circle Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Circle Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={circleType === 'family' ? "Emma's Circle" : "New Dads in Brooklyn"}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={circleType === 'family' ? "Share updates and memories about Emma" : "A supportive community for new fathers in Brooklyn"}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Circle Color
                  </label>
                  <div className="flex space-x-2">
                    {colorOptions.map((colorOption) => (
                      <button
                        key={colorOption}
                        type="button"
                        onClick={() => setColor(colorOption)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          color === colorOption ? 'border-gray-400 scale-110' : 'border-gray-200'
                        } transition-all`}
                        style={{ backgroundColor: colorOption }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Community-specific settings */}
            {circleType === 'community' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Community Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      Location (optional)
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Brooklyn, NY or San Francisco Bay Area"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Privacy Settings
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="privacy"
                          value="public"
                          checked={privacy === 'public'}
                          onChange={(e) => setPrivacy(e.target.value as CirclePrivacy)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm">Public</div>
                          <div className="text-xs text-gray-500">Anyone can find and join this circle</div>
                        </div>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="privacy"
                          value="invite_only"
                          checked={privacy === 'invite_only'}
                          onChange={(e) => setPrivacy(e.target.value as CirclePrivacy)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm">Invite Only</div>
                          <div className="text-xs text-gray-500">People must be invited to join</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {privacy === 'public' && (
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={autoApprove}
                          onChange={(e) => setAutoApprove(e.target.checked)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm">Auto-approve new members</div>
                          <div className="text-xs text-gray-500">Members can join immediately without approval</div>
                        </div>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isDiscoverable}
                          onChange={(e) => setIsDiscoverable(e.target.checked)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm">Show in public directory</div>
                          <div className="text-xs text-gray-500">Help people discover this circle</div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating Circle...' : 'Create Circle'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}