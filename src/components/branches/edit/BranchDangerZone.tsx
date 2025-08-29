'use client'

import { useState } from 'react'
import type { Branch } from '@/types/database'

interface BranchDangerZoneProps {
  branch: Branch
  onDelete: () => Promise<void>
}

export default function BranchDangerZone({ branch, onDelete }: BranchDangerZoneProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleDeleteClick = () => {
    setShowConfirmation(true)
  }

  const handleConfirmDelete = async () => {
    if (confirmationText !== branch.name) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
      setShowConfirmation(false)
      setConfirmationText('')
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setConfirmationText('')
  }

  const canDelete = confirmationText === branch.name

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Danger Zone</h2>

      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Delete Branch
            </h3>
            <p className="text-red-700 mb-4">
              Permanently delete this branch and all its content. This action cannot be undone.
              All posts, comments, and member associations will be lost forever.
            </p>

            {!showConfirmation ? (
              <button
                onClick={handleDeleteClick}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete Branch
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="confirm-delete" className="block text-sm font-medium text-red-900 mb-2">
                    Type <code className="bg-red-100 px-1 py-0.5 rounded text-red-800 font-mono">{branch.name}</code> to confirm deletion:
                  </label>
                  <input
                    id="confirm-delete"
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="block w-full max-w-sm px-3 py-2 border border-red-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder={branch.name}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleConfirmDelete}
                    disabled={!canDelete || isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Branch'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Before you delete
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>All posts and memories in this branch will be permanently deleted</li>
                <li>All comments and reactions will be lost</li>
                <li>Members will lose access to all content</li>
                <li>Cross-tree access permissions will be revoked</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}