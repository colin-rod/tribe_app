/**
 * Automatic Leaf Type Detection
 * Analyzes content and media to automatically determine the most appropriate leaf type
 */

import { LeafType } from '@/types/database'

interface DetectionResult {
  leafType: LeafType
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * Detects leaf type based on uploaded media files and content text
 */
export function detectLeafType(content: string, mediaFiles: File[]): DetectionResult {
  // Priority 1: Media-based detection (highest confidence)
  if (mediaFiles.length > 0) {
    const mediaTypes = analyzeMediaFiles(mediaFiles)
    
    // If we have photos, it's a photo leaf
    if (mediaTypes.images > 0) {
      return {
        leafType: 'photo',
        confidence: 'high',
        reason: `${mediaTypes.images} photo${mediaTypes.images > 1 ? 's' : ''} uploaded`
      }
    }
    
    
    // If we have audio, it's an audio leaf
    if (mediaTypes.audio > 0) {
      return {
        leafType: 'audio',
        confidence: 'high',
        reason: `${mediaTypes.audio} audio file${mediaTypes.audio > 1 ? 's' : ''} uploaded`
      }
    }
  }

  // Priority 2: Content-based milestone detection
  const milestoneDetection = detectMilestoneContent(content)
  if (milestoneDetection.isMilestone) {
    return {
      leafType: 'milestone',
      confidence: 'medium',
      reason: `Milestone keywords detected: ${milestoneDetection.keywords.join(', ')}`
    }
  }

  // Priority 3: Fallback to text if there's content
  if (content.trim().length > 0) {
    return {
      leafType: 'text',
      confidence: 'medium',
      reason: 'Text content provided'
    }
  }

  // Default fallback
  return {
    leafType: 'text',
    confidence: 'low',
    reason: 'Default type - no content detected'
  }
}

/**
 * Analyzes uploaded media files to categorize them
 */
function analyzeMediaFiles(files: File[]) {
  const mediaTypes = {
    images: 0,
    audio: 0,
    other: 0
  }

  files.forEach(file => {
    const type = file.type.toLowerCase()
    
    if (type.startsWith('image/')) {
      mediaTypes.images++
    } else if (type.startsWith('audio/')) {
      mediaTypes.audio++
    } else {
      mediaTypes.other++
    }
  })

  return mediaTypes
}

/**
 * Detects milestone-related content in text
 */
function detectMilestoneContent(content: string): { isMilestone: boolean; keywords: string[] } {
  if (!content.trim()) {
    return { isMilestone: false, keywords: [] }
  }

  const milestoneKeywords = [
    // Life events
    'birthday', 'born', 'birth',
    'graduated', 'graduation', 'graduate',
    'wedding', 'married', 'engagement', 'engaged',
    'anniversary',
    
    // Achievements
    'first', '1st', 'achievement', 'accomplished',
    'promotion', 'promoted', 'new job',
    'award', 'won', 'winner', 'champion',
    
    // Life stages
    'started', 'began', 'beginning',
    'finished', 'completed', 'ended',
    'moved', 'new home', 'new house',
    'retired', 'retirement',
    
    // Special occasions
    'celebration', 'celebrate', 'party',
    'special day', 'milestone',
    'important', 'memorable',
    
    // Ages and numbers
    'years old', 'age', 'turned',
    '1 year', '2 years', '5 years', '10 years',
    '18th', '21st', '30th', '40th', '50th', '60th',
    
    // Family milestones  
    'baby', 'pregnancy', 'pregnant',
    'crawling', 'walking', 'talking',
    'tooth', 'teeth', 'lost tooth',
    'potty trained', 'school',
    
    // Seasonal/temporal
    'first time', 'last time',
    'finally', 'at last'
  ]

  const contentLower = content.toLowerCase()
  const foundKeywords = milestoneKeywords.filter(keyword => 
    contentLower.includes(keyword)
  )

  return {
    isMilestone: foundKeywords.length > 0,
    keywords: foundKeywords
  }
}

/**
 * Get a user-friendly description of the detected leaf type
 */
export function getLeafTypeDescription(leafType: LeafType): string {
  const descriptions = {
    photo: 'Photo Memory',
    video: 'Video Memory',
    audio: 'Voice Memory',
    text: 'Written Memory',
    milestone: 'Milestone Memory'
  }
  
  return descriptions[leafType] || 'Memory'
}

/**
 * Get the appropriate icon for the detected leaf type
 */
export function getLeafTypeIcon(leafType: LeafType): string {
  const icons = {
    photo: 'camera',
    video: 'video',
    audio: 'mic',
    text: 'pencil',
    milestone: 'star'
  }
  
  return icons[leafType] || 'leaf'
}