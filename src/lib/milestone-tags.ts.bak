/**
 * Milestone to Tags Conversion
 * Automatically extracts milestone-related tags from content and converts milestone types to special tags
 */

/**
 * Extracts milestone tags from text content
 */
export function extractMilestoneTags(content: string): string[] {
  if (!content.trim()) return []

  const milestoneTags: string[] = []
  const contentLower = content.toLowerCase()

  // Life events
  const lifeEventPatterns = {
    'birthday': ['birthday', 'born', 'birth'],
    'graduation': ['graduated', 'graduation', 'graduate'],
    'wedding': ['wedding', 'married', 'marriage'],
    'engagement': ['engagement', 'engaged', 'proposal'],
    'anniversary': ['anniversary'],
    'baby': ['baby', 'pregnancy', 'pregnant', 'birth'],
    'retirement': ['retired', 'retirement']
  }

  // Achievement patterns
  const achievementPatterns = {
    'first-time': ['first time', 'first', '1st time'],
    'promotion': ['promotion', 'promoted', 'new job'],
    'award': ['award', 'won', 'winner', 'champion'],
    'achievement': ['achievement', 'accomplished', 'success']
  }

  // Age/developmental milestones
  const agePatterns = {
    'milestone-age': ['years old', 'age', 'turned'],
    'coming-of-age': ['18th', '21st', 'legal age'],
    'big-birthday': ['30th', '40th', '50th', '60th', '70th', '80th', '90th']
  }

  // Family/child milestones
  const familyPatterns = {
    'crawling': ['crawling', 'crawl'],
    'walking': ['walking', 'first steps', 'steps'],
    'talking': ['talking', 'first words', 'words'],
    'tooth': ['tooth', 'teeth', 'lost tooth', 'first tooth'],
    'potty-trained': ['potty trained', 'potty training'],
    'school': ['first day of school', 'school', 'kindergarten'],
    'learning': ['learned', 'learning', 'can now']
  }

  // Check all patterns
  const allPatterns = {
    ...lifeEventPatterns,
    ...achievementPatterns,
    ...agePatterns,
    ...familyPatterns
  }

  Object.entries(allPatterns).forEach(([tag, keywords]) => {
    const hasKeyword = keywords.some(keyword => contentLower.includes(keyword))
    if (hasKeyword) {
      milestoneTags.push(tag)
    }
  })

  // Extract age numbers for age-specific tags
  const ageMatch = content.match(/(\d+)\s*(years?\s*old|yr|years?)/i)
  if (ageMatch) {
    const age = parseInt(ageMatch[1])
    if (age >= 1 && age <= 100) {
      milestoneTags.push(`age-${age}`)
    }
  }

  // Extract ordinal numbers for milestones (1st, 2nd, 3rd, etc.)
  const ordinalMatch = content.match(/(\d+)(st|nd|rd|th)\s*(birthday|anniversary|time)/i)
  if (ordinalMatch) {
    const number = parseInt(ordinalMatch[1])
    const occasion = ordinalMatch[3].toLowerCase()
    if (number >= 1 && number <= 100) {
      milestoneTags.push(`${number}-${occasion}`)
    }
  }

  return milestoneTags
}

/**
 * Converts traditional milestone types to tags
 */
export function convertMilestoneTypeToTags(milestoneType: string, milestoneDate?: string): string[] {
  const tags: string[] = []
  
  // Add the milestone type as a tag
  if (milestoneType) {
    tags.push(milestoneType.toLowerCase().replace(/\s+/g, '-'))
  }
  
  // Add date-based tags if date is provided
  if (milestoneDate) {
    const date = new Date(milestoneDate)
    const year = date.getFullYear()
    const month = date.toLocaleString('default', { month: 'long' }).toLowerCase()
    
    tags.push(`year-${year}`)
    tags.push(`month-${month}`)
    
    // Add season tag
    const season = getSeasonFromDate(date)
    if (season) {
      tags.push(`season-${season}`)
    }
  }
  
  return tags
}

/**
 * Get season from date
 */
function getSeasonFromDate(date: Date): string | null {
  const month = date.getMonth() + 1 // getMonth() returns 0-11
  
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'  
  if (month >= 9 && month <= 11) return 'fall'
  if (month === 12 || month === 1 || month === 2) return 'winter'
  
  return null
}

/**
 * Get all possible tags from content, milestone type, and date
 */
export function extractAllTags(content: string, milestoneType?: string, milestoneDate?: string): string[] {
  const contentTags = extractMilestoneTags(content)
  const milestoneTags = milestoneType ? convertMilestoneTypeToTags(milestoneType, milestoneDate) : []
  
  // Combine and deduplicate
  const allTags = [...new Set([...contentTags, ...milestoneTags])]
  
  return allTags
}

/**
 * Check if a tag is a milestone tag (has special styling)
 */
export function isMilestoneTag(tag: string): boolean {
  const milestoneTagPatterns = [
    /^(birthday|graduation|wedding|engagement|anniversary|baby|retirement)$/,
    /^(first-time|promotion|award|achievement)$/,
    /^(milestone-age|coming-of-age|big-birthday)$/,
    /^(crawling|walking|talking|tooth|potty-trained|school|learning)$/,
    /^age-\d+$/,
    /^\d+-(birthday|anniversary|time)$/,
    /^(year|month|season)-/
  ]
  
  return milestoneTagPatterns.some(pattern => pattern.test(tag))
}

/**
 * Get display name for milestone tag
 */
export function getMilestoneTagDisplayName(tag: string): string {
  // Handle age tags
  if (tag.startsWith('age-')) {
    const age = tag.replace('age-', '')
    return `${age} years old`
  }
  
  // Handle numbered occasions
  if (tag.match(/^\d+-(birthday|anniversary|time)$/)) {
    const [number, occasion] = tag.split('-')
    return `${number}${getOrdinalSuffix(parseInt(number))} ${occasion}`
  }
  
  // Handle year/month/season tags
  if (tag.startsWith('year-')) {
    return tag.replace('year-', '')
  }
  if (tag.startsWith('month-')) {
    return tag.replace('month-', '').charAt(0).toUpperCase() + tag.replace('month-', '').slice(1)
  }
  if (tag.startsWith('season-')) {
    return tag.replace('season-', '').charAt(0).toUpperCase() + tag.replace('season-', '').slice(1)
  }
  
  // Default: replace dashes with spaces and capitalize
  return tag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(number: number): string {
  const remainder10 = number % 10
  const remainder100 = number % 100
  
  if (remainder100 >= 11 && remainder100 <= 13) {
    return 'th'
  }
  
  switch (remainder10) {
    case 1: return 'st'
    case 2: return 'nd' 
    case 3: return 'rd'
    default: return 'th'
  }
}