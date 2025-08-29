'use client'

import { useState } from 'react'
import type { Branch } from '@/types/database'

interface BranchGeneralSettingsProps {
  branch: Branch
  onSave: (data: { name: string; description: string; color: string; privacy: 'private' | 'invite_only' }) => Promise<void>
  saving: boolean
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
  '#F97316', // Orange
  '#6366F1', // Indigo
]

export default function BranchGeneralSettings({ branch, onSave, saving }: BranchGeneralSettingsProps) {
  const [name, setName] = useState(branch.name)
  const [description, setDescription] = useState(branch.description || '')
  const [color, setColor] = useState(branch.color || '#3B82F6')
  const [privacy, setPrivacy] = useState<'private' | 'invite_only'>(branch.privacy || 'private')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({ name, description, color, privacy })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">General Settings</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Branch Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="What's this branch about?"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Branch Color
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

        {/* Privacy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Privacy Level
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="privacy"
                value="private"
                checked={privacy === 'private'}
                onChange={(e) => setPrivacy(e.target.value as 'private' | 'invite_only')}
                className="mr-3"
              />
              <div>
                <div className="font-medium">Private</div>
                <div className="text-sm text-gray-500">Only members you directly add can see this branch</div>
              </div>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="privacy"
                value="invite_only"
                checked={privacy === 'invite_only'}
                onChange={(e) => setPrivacy(e.target.value as 'private' | 'invite_only')}
                className="mr-3"
              />
              <div>
                <div className="font-medium">Invite Only</div>
                <div className="text-sm text-gray-500">Members can request to join, but need approval</div>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}