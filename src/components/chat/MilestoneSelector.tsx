'use client'

interface MilestoneSelectorProps {
  isVisible: boolean
  selectedMilestone: string
  onMilestoneChange: (milestone: string) => void
  onToggle?: () => void
  disabled?: boolean
  buttonOnly?: boolean
}

const milestoneTypes = [
  'first_smile',
  'first_laugh', 
  'first_word',
  'first_steps',
  'first_tooth',
  'first_solid_food',
  'birthday',
  'christmas',
  'vacation',
  'other'
]

export default function MilestoneSelector({ 
  isVisible, 
  selectedMilestone, 
  onMilestoneChange, 
  onToggle, 
  disabled = false,
  buttonOnly = false
}: MilestoneSelectorProps) {
  const formatMilestoneLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (buttonOnly) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`p-1 rounded ${isVisible ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`}
        disabled={disabled}
      >
        <span className="text-lg">🎉</span>
      </button>
    )
  }

  return (
    <>
      {/* Milestone Selection */}
      {isVisible && (
        <div className="mb-3">
          <select
            value={selectedMilestone}
            onChange={(e) => onMilestoneChange(e.target.value)}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a milestone (optional)</option>
            {milestoneTypes.map((type) => (
              <option key={type} value={type}>
                {formatMilestoneLabel(type)}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}