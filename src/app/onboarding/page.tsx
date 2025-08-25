'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // Tribe creation form
  const [tribeName, setTribeName] = useState('')
  const [tribeDescription, setTribeDescription] = useState('')
  
  // Circle creation form - now supporting different types
  const [circles, setCircles] = useState([
    { name: '', description: '', color: '#3B82F6', type: 'family' as const, privacy: 'private' as const }
  ])
  
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
      }
    }
    
    getUser()
  }, [router])

  const addCircle = () => {
    setCircles([...circles, { name: '', description: '', color: '#3B82F6', type: 'family' as const, privacy: 'private' as const }])
  }

  const removeCircle = (index: number) => {
    if (circles.length > 1) {
      setCircles(circles.filter((_, i) => i !== index))
    }
  }

  const updateCircle = (index: number, field: string, value: string) => {
    const updated = circles.map((circle, i) => 
      i === index ? { ...circle, [field]: value } : circle
    )
    setCircles(updated)
  }

  const createTribeAndCircles = async () => {
    if (!user) return

    setLoading(true)
    try {
      let tribe = null
      
      // Create optional tribe if user provided tribe info
      if (tribeName.trim()) {
        const { data: tribeData, error: tribeError } = await supabase
          .from('tribes')
          .insert({
            name: tribeName,
            description: tribeDescription,
            created_by: user.id
          })
          .select()
          .single()

        if (tribeError) throw tribeError
        tribe = tribeData

        // Add user as admin of the tribe
        const { error: memberError } = await supabase
          .from('tribe_members')
          .insert({
            tribe_id: tribe.id,
            user_id: user.id,
            role: 'admin'
          })

        if (memberError) throw memberError
      }

      // Create circles (they can exist independently now)
      for (const circle of circles) {
        if (circle.name.trim()) {
          const { data: newCircle, error: circleError } = await supabase
            .from('circles')
            .insert({
              tribe_id: tribe?.id || null, // Optional tribe association
              name: circle.name,
              description: circle.description,
              color: circle.color,
              type: circle.type,
              privacy: circle.privacy,
              created_by: user.id,
              is_discoverable: circle.type === 'community', // Community circles are discoverable
              auto_approve_members: circle.type === 'community' && circle.privacy === 'public'
            })
            .select()
            .single()

          if (circleError) throw circleError

          // Add user to the circle
          const { error: circleMemberError } = await supabase
            .from('circle_members')
            .insert({
              circle_id: newCircle.id,
              user_id: user.id,
              role: 'admin',
              join_method: 'admin_added',
              status: 'active'
            })

          if (circleMemberError) throw circleMemberError
        }
      }

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error creating circles:', error)
      alert('Failed to create your circles. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const colorOptions = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ]

  if (!user) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to Tribe!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Let's set up your family tribe
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Create Your Family Tribe (Optional)</h3>
                <p className="mt-1 text-sm text-gray-600">
                  A tribe helps organize family-specific circles, but you can also create community circles independently
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tribe Name (Optional)
                </label>
                <input
                  type="text"
                  value={tribeName}
                  onChange={(e) => setTribeName(e.target.value)}
                  placeholder="e.g., The Smith Family (leave blank to skip)"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  value={tribeDescription}
                  onChange={(e) => setTribeDescription(e.target.value)}
                  placeholder="Tell us about your family..."
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={() => setStep(2)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next: Create Circles
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Create Your Circles</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Circles are groups within your tribe (e.g., one per child, or by topic)
                </p>
              </div>
              
              {circles.map((circle, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Circle {index + 1}</h4>
                    {circles.length > 1 && (
                      <button
                        onClick={() => removeCircle(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Circle name (e.g., Emma's Circle, New Dads NYC)"
                        value={circle.name}
                        onChange={(e) => updateCircle(index, 'name', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <textarea
                        placeholder="Description (optional)"
                        value={circle.description}
                        onChange={(e) => updateCircle(index, 'description', e.target.value)}
                        rows={2}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Circle Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => updateCircle(index, 'type', 'family')}
                          className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                            circle.type === 'family' 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          👨‍👩‍👧‍👦 Family
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCircle(index, 'type', 'community')}
                          className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                            circle.type === 'community' 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          🌍 Community
                        </button>
                      </div>
                    </div>

                    {circle.type === 'community' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Privacy
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`privacy-${index}`}
                              value="public"
                              checked={circle.privacy === 'public'}
                              onChange={(e) => updateCircle(index, 'privacy', e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm">Public - Anyone can join</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`privacy-${index}`}
                              value="invite_only"
                              checked={circle.privacy === 'invite_only'}
                              onChange={(e) => updateCircle(index, 'privacy', e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm">Invite Only - Members must be invited</span>
                          </label>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <div className="flex space-x-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateCircle(index, 'color', color)}
                            className={`w-6 h-6 rounded-full border-2 ${
                              circle.color === color ? 'border-gray-400' : 'border-gray-200'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={addCircle}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Another Circle
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                
                <button
                  onClick={createTribeAndCircles}
                  disabled={loading || !circles.some(c => c.name.trim())}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Tribe'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}