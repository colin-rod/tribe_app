'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { rbac } from '@/lib/rbac'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // Tree creation form
  const [treeName, setTreeName] = useState('')
  const [treeDescription, setTreeDescription] = useState('')
  
  // Branch creation form - now supporting different types
  const [branches, setBranches] = useState([
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

  const addBranch = () => {
    setBranches([...branches, { name: '', description: '', color: '#3B82F6', type: 'family' as const, privacy: 'private' as const }])
  }

  const removeBranch = (index: number) => {
    if (branches.length > 1) {
      setBranches(branches.filter((_, i) => i !== index))
    }
  }

  const updateBranch = (index: number, field: string, value: string) => {
    const updated = branches.map((branch, i) => 
      i === index ? { ...branch, [field]: value } : branch
    )
    setBranches(updated)
  }

  const createTreeAndBranches = async () => {
    if (!user) return

    if (!treeName.trim()) {
      alert('Please enter a tree name to continue')
      return
    }

    setLoading(true)
    try {
      let tree = null
      
      // Create required tree
      const { data: treeData, error: treeError } = await supabase
        .from('trees')
        .insert({
          name: treeName.trim(),
          description: treeDescription.trim() || null,
          created_by: user.id
        })
        .select()
        .single()

      if (treeError) throw treeError
      tree = treeData

      // Assign owner role using RBAC system (tree creator gets owner role)
      const ownerAssigned = await rbac.assignRole(
        user.id,
        'owner',
        { type: 'tree', id: tree.id },
        user.id
      )

      if (!ownerAssigned) {
        throw new Error('Failed to assign owner role to tree')
      }

      // Add user as member for backward compatibility
      const { error: memberError } = await supabase
        .from('tree_members')
        .insert({
          tree_id: tree.id,
          user_id: user.id,
          role: 'owner'
        })

      if (memberError) throw memberError

      // Create branches within the tree
      for (const branch of branches) {
        if (branch.name.trim()) {
          const { data: newBranch, error: branchError } = await supabase
            .from('branches')
            .insert({
              tree_id: tree.id, // Required tree association
              name: branch.name,
              description: branch.description,
              color: branch.color,
              type: branch.type,
              privacy: branch.privacy,
              created_by: user.id,
              is_discoverable: branch.type === 'community', // Community branches are discoverable
              auto_approve_members: branch.type === 'community' && branch.privacy === 'public'
            })
            .select()
            .single()

          if (branchError) throw branchError

          // Assign owner role using RBAC system (branch creator gets owner role)
          const ownerAssigned = await rbac.assignRole(
            user.id,
            'owner',
            { type: 'branch', id: newBranch.id },
            user.id
          )

          if (!ownerAssigned) {
            throw new Error('Failed to assign owner role to branch')
          }

          // Add user to branch_members for backward compatibility
          const { error: branchMemberError } = await supabase
            .from('branch_members')
            .insert({
              branch_id: newBranch.id,
              user_id: user.id,
              role: 'owner',
              join_method: 'admin_added',
              status: 'active'
            })

          if (branchMemberError) throw branchMemberError
        }
      }

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error creating branches:', error)
      alert('Failed to create your branches. Please try again.')
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
          Welcome to Tree!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Every family needs a tree. Let's create yours!
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Create Your Family Tree</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Your tree is your family's home base. All your branches will live within your tree, and you can share special branches with other families.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tree Name *
                </label>
                <input
                  type="text"
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                  placeholder="e.g., The Smith Family"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  value={treeDescription}
                  onChange={(e) => setTreeDescription(e.target.value)}
                  placeholder="Tell us about your family..."
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={() => setStep(2)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next: Create Branches
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Create Your Branches</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Branches are groups within your tree (e.g., one per child, or by topic)
                </p>
              </div>
              
              {branches.map((branch, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Branch {index + 1}</h4>
                    {branches.length > 1 && (
                      <button
                        onClick={() => removeBranch(index)}
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
                        placeholder="Branch name (e.g., Emma's Branch, New Dads NYC)"
                        value={branch.name}
                        onChange={(e) => updateBranch(index, 'name', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <textarea
                        placeholder="Description (optional)"
                        value={branch.description}
                        onChange={(e) => updateBranch(index, 'description', e.target.value)}
                        rows={2}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => updateBranch(index, 'type', 'family')}
                          className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                            branch.type === 'family' 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          👨‍👩‍👧‍👦 Family
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBranch(index, 'type', 'community')}
                          className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                            branch.type === 'community' 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          🌍 Community
                        </button>
                      </div>
                    </div>

                    {branch.type === 'community' && (
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
                              checked={branch.privacy === 'public'}
                              onChange={(e) => updateBranch(index, 'privacy', e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm">Public - Anyone can join</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`privacy-${index}`}
                              value="invite_only"
                              checked={branch.privacy === 'invite_only'}
                              onChange={(e) => updateBranch(index, 'privacy', e.target.value)}
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
                            onClick={() => updateBranch(index, 'color', color)}
                            className={`w-6 h-6 rounded-full border-2 ${
                              branch.color === color ? 'border-gray-400' : 'border-gray-200'
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
                onClick={addBranch}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Another Branch
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                
                <button
                  onClick={createTreeAndBranches}
                  disabled={loading || !treeName.trim() || !branches.some(c => c.name.trim())}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Tree & Branches'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}