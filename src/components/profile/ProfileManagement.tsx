'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { Profile, FamilyRole } from '@/types/database'
import { Icon } from '@/components/ui/IconLibrary'
import { Button } from '@/components/ui/button'
import { COMMON_ANIMATIONS, SPRING_CONFIGS } from '@/lib/animations'

interface ProfileManagementProps {
  profile: Profile
  onSave: (data: ProfileFormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}

export interface ProfileFormData {
  firstName: string
  lastName: string
  bio: string
  familyRole: FamilyRole | null
  avatarFile: File | null
  currentAvatarUrl?: string
}

const familyRoles: { value: FamilyRole | '', label: string, icon: string, description: string }[] = [
  { value: '', label: 'Not specified', icon: 'user', description: 'No specific family role' },
  { value: 'parent', label: 'Parent', icon: 'heart', description: 'Mother or Father' },
  { value: 'child', label: 'Child', icon: 'sprout', description: 'Son or Daughter' },
  { value: 'grandparent', label: 'Grandparent', icon: 'star', description: 'Grandmother or Grandfather' },
  { value: 'grandchild', label: 'Grandchild', icon: 'flower', description: 'Grandchild' },
  { value: 'sibling', label: 'Sibling', icon: 'users', description: 'Brother or Sister' },
  { value: 'spouse', label: 'Spouse', icon: 'heart', description: 'Husband or Wife' },
  { value: 'partner', label: 'Partner', icon: 'heart', description: 'Life Partner' },
  { value: 'other', label: 'Other', icon: 'user', description: 'Other family relationship' }
]

export default function ProfileManagement({ profile, onSave, onCancel, saving }: ProfileManagementProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    bio: profile.bio || '',
    familyRole: profile.family_role,
    avatarFile: null,
    currentAvatarUrl: profile.avatar_url || undefined
  })
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = useCallback((field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    handleInputChange('avatarFile', file)
  }, [handleInputChange])

  const removeAvatar = useCallback(() => {
    setPreviewUrl(null)
    handleInputChange('avatarFile', null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleInputChange])

  const handleRoleSelect = useCallback((role: FamilyRole | '') => {
    handleInputChange('familyRole', role || null)
    setShowRoleSelector(false)
  }, [handleInputChange])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!formData.firstName.trim()) {
      setError('First name is required')
      return
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return
    }

    try {
      await onSave(formData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save profile')
    }
  }, [formData, onSave])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const selectedRole = familyRoles.find(role => role.value === formData.familyRole)
  const avatarUrl = previewUrl || formData.currentAvatarUrl

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={SPRING_CONFIGS.bouncy}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-leaf-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Icon name="user" size="md" className="text-leaf-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit Profile</h1>
                <p className="text-sm text-gray-600">Update your personal information</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              disabled={saving}
            >
              <Icon name="x" size="md" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center">
                    <Icon name="alertTriangle" size="sm" className="mr-2" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profile"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-gray-500 font-medium">
                      {getInitials(formData.firstName || 'U', formData.lastName || 'U')}
                    </span>
                  )}
                </div>
                
                {avatarUrl && (
                  <motion.button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon name="x" size="xs" />
                  </motion.button>
                )}
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  disabled={saving}
                >
                  <Icon name="camera" size="sm" className="mr-2" />
                  {avatarUrl ? 'Change Photo' : 'Add Photo'}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 transition-colors"
                  placeholder="Enter first name"
                  disabled={saving}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 transition-colors"
                  placeholder="Enter last name"
                  disabled={saving}
                  required
                />
              </div>
            </div>

            {/* Family Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Family Role
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleSelector(!showRoleSelector)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 transition-colors text-left flex items-center justify-between"
                  disabled={saving}
                >
                  <div className="flex items-center space-x-2">
                    {selectedRole && <Icon name={selectedRole.icon as any} size="sm" className="text-gray-500" />}
                    <span className={selectedRole?.value ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedRole?.label || 'Select a role...'}
                    </span>
                  </div>
                  <Icon name="chevronDown" size="sm" className="text-gray-400" />
                </button>

                <AnimatePresence>
                  {showRoleSelector && (
                    <motion.div
                      className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="p-2 max-h-60 overflow-y-auto">
                        {familyRoles.map((role) => (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => handleRoleSelect(role.value)}
                            className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                          >
                            <Icon name={role.icon as any} size="sm" className="text-gray-500" />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{role.label}</div>
                              <div className="text-xs text-gray-500">{role.description}</div>
                            </div>
                            {formData.familyRole === role.value && (
                              <Icon name="check" size="sm" className="text-leaf-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 transition-colors resize-none"
                placeholder="Tell your family a bit about yourself..."
                rows={3}
                disabled={saving}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || !formData.firstName.trim() || !formData.lastName.trim()}
            className="flex items-center space-x-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}