'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/IconLibrary'

interface Template {
  id: string
  name: string
  description: string
  icon: string
  treeConfig: {
    name: string
    description: string
  }
  branches: Array<{
    name: string
    description: string
    color: string
  }>
}

const templates: Template[] = [
  {
    id: 'new-baby',
    name: 'New Baby',
    description: 'Perfect for documenting a new addition to the family',
    icon: 'sprout',
    treeConfig: {
      name: "Baby's Tree",
      description: "Capturing every precious moment of our little one's journey"
    },
    branches: [
      {
        name: 'First Year Milestones',
        description: 'Rolling over, sitting up, first words, first steps',
        color: '#10B981'
      },
      {
        name: 'Daily Memories',
        description: 'Sweet everyday moments, funny expressions, cute outfits',
        color: '#3B82F6'
      },
      {
        name: 'Growth Updates',
        description: 'Monthly photos, height/weight tracking, development notes',
        color: '#F59E0B'
      }
    ]
  },
  {
    id: 'family-updates',
    name: 'Family Updates',
    description: 'Keep extended family connected with regular updates',
    icon: 'users',
    treeConfig: {
      name: 'Family Updates',
      description: 'Sharing our family adventures and daily life'
    },
    branches: [
      {
        name: 'Weekly Highlights',
        description: 'Best moments from each week - photos, videos, funny stories',
        color: '#EF4444'
      },
      {
        name: 'Special Events',
        description: 'Birthdays, holidays, family gatherings, celebrations',
        color: '#8B5CF6'
      },
      {
        name: 'Kids Activities',
        description: 'School events, sports, hobbies, achievements',
        color: '#EC4899'
      }
    ]
  },
  {
    id: 'vacation-memories',
    name: 'Vacation Memories',
    description: 'Document your family adventures and trips',
    icon: 'treePine',
    treeConfig: {
      name: 'Family Adventures',
      description: 'Collecting memories from all our amazing trips together'
    },
    branches: [
      {
        name: 'Beach Vacation 2024',
        description: 'Sand castles, ocean waves, and family fun in the sun',
        color: '#06B6D4'
      },
      {
        name: 'Camping Trips',
        description: 'Nature hikes, campfire stories, outdoor adventures',
        color: '#84CC16'
      },
      {
        name: 'City Explorations',
        description: 'Museums, restaurants, landmarks, urban adventures',
        color: '#F59E0B'
      }
    ]
  },
  {
    id: 'school-year',
    name: 'School Year',
    description: 'Track your child\'s academic journey and achievements',
    icon: 'flower',
    treeConfig: {
      name: "School Memories",
      description: "Documenting our child's learning journey and school experiences"
    },
    branches: [
      {
        name: 'School Projects',
        description: 'Art projects, science experiments, creative assignments',
        color: '#10B981'
      },
      {
        name: 'Special Events',
        description: 'School plays, field trips, sports day, graduation ceremonies',
        color: '#3B82F6'
      },
      {
        name: 'Daily School Life',
        description: 'Lunch box notes, homework victories, friendship moments',
        color: '#EC4899'
      }
    ]
  },
  {
    id: 'custom',
    name: 'Start from Scratch',
    description: 'Create your own unique tree and branches',
    icon: 'leaf',
    treeConfig: {
      name: '',
      description: ''
    },
    branches: []
  }
]

interface OnboardingTemplatesProps {
  onSelectTemplate: (template: Template) => void
  onSkipTemplates: () => void
}

export default function OnboardingTemplates({ onSelectTemplate, onSkipTemplates }: OnboardingTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template.id)
    onSelectTemplate(template)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Choose a Template</h3>
        <p className="text-sm text-gray-600">
          Get started quickly with a pre-configured setup, or create your own from scratch
        </p>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            variant="leaf"
            className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
              selectedTemplate === template.id
                ? 'ring-2 ring-leaf-500 shadow-lg'
                : 'hover:ring-1 hover:ring-leaf-300'
            }`}
            onClick={() => handleSelectTemplate(template)}
          >
            <div className="p-4">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-leaf-500 rounded-full flex items-center justify-center shadow-sm">
                    <Icon name={template.icon as any} size="md" className="text-leaf-100" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-bark-400 font-display">{template.name}</h4>
                  <p className="text-sm text-bark-300 mt-1 mb-3">{template.description}</p>

                  {/* Preview of branches (if not custom) */}
                  {template.branches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-bark-400">Includes these branches:</p>
                      <div className="flex flex-wrap gap-2">
                        {template.branches.map((branch, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-leaf-100 text-bark-400 border border-leaf-200"
                            style={{
                              borderLeftColor: branch.color,
                              borderLeftWidth: '3px'
                            }}
                          >
                            {branch.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selection indicator */}
                {selectedTemplate === template.id && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-leaf-500 rounded-full flex items-center justify-center">
                      <Icon name="check" size="xs" className="text-leaf-100" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={onSkipTemplates}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip templates
        </button>

        {selectedTemplate && (
          <div className="text-sm text-leaf-600 font-medium">
            Template selected! Continue to customize your setup.
          </div>
        )}
      </div>
    </div>
  )
}