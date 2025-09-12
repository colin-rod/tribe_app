'use client'

import React from 'react'
import { 
  // Nature & Plants
  Leaf, 
  TreePine, 
  Trees,
  Flower,
  Flower2,
  Sprout,
  Bug,
  
  // Weather & Environment
  Sun,
  Cloud,
  CloudRain,
  Droplets,
  Wind,
  Snowflake,
  
  // Media & Content
  Camera,
  Video,
  Mic,
  Music,
  Image,
  
  // Actions & States
  Heart,
  MessageCircle,
  Share,
  Users,
  User,
  Plus,
  Edit,
  Trash2,
  
  // System & Security
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Settings,
  Upload,
  Download,
  Lock,
  
  // Shapes & Decorative
  Star,
  Circle,
  Square,
  Triangle,
  
  // Communication & Notification
  Mail,
  Bell,
  AlertTriangle,
  
  // Additional Icons
  FileText,
  Package,
  Rocket,
  Palette,
  Sparkles,
  Award,
  CalendarDays,
  MapPin,
  Shield,
  
  type LucideIcon
} from 'lucide-react'

// Icon size variants
export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48
} as const

export type IconSize = keyof typeof ICON_SIZES

// Nature-themed icon categories
export const NATURE_ICONS = {
  // Plants & Trees
  leaf: Leaf,
  treePine: TreePine,
  trees: Trees,
  flower: Flower,
  flower2: Flower2,
  sprout: Sprout,
  
  // Creatures
  bug: Bug,
  
  // Weather
  sun: Sun,
  cloud: Cloud,
  cloudRain: CloudRain,
  droplets: Droplets,
  wind: Wind,
  snowflake: Snowflake,
} as const

export const MEDIA_ICONS = {
  camera: Camera,
  video: Video,
  mic: Mic,
  music: Music,
  image: Image,
} as const

export const SOCIAL_ICONS = {
  heart: Heart,
  messageCircle: MessageCircle,
  share: Share,
  users: Users,
  user: User,
} as const

export const ACTION_ICONS = {
  plus: Plus,
  edit: Edit,
  trash: Trash2,
  upload: Upload,
  download: Download,
} as const

export const SYSTEM_ICONS = {
  check: Check,
  x: X,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  search: Search,
  settings: Settings,
  lock: Lock,
  bell: Bell,
  alertTriangle: AlertTriangle,
  shield: Shield,
} as const

export const DECORATIVE_ICONS = {
  star: Star,
  circle: Circle,
  square: Square,
  triangle: Triangle,
  sparkles: Sparkles,
  award: Award,
} as const

export const COMMUNICATION_ICONS = {
  mail: Mail,
} as const

export const CONTENT_ICONS = {
  fileText: FileText,
  package: Package,
  rocket: Rocket,
  palette: Palette,
  calendarDays: CalendarDays,
  mapPin: MapPin,
} as const

// Combined icon library
export const ICON_LIBRARY = {
  ...NATURE_ICONS,
  ...MEDIA_ICONS,
  ...SOCIAL_ICONS,
  ...ACTION_ICONS,
  ...SYSTEM_ICONS,
  ...DECORATIVE_ICONS,
  ...COMMUNICATION_ICONS,
  ...CONTENT_ICONS,
} as const

export type IconName = keyof typeof ICON_LIBRARY

// Icon component props
interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName
  size?: IconSize | number
  className?: string
  'aria-label'?: string
}

// Main Icon component
export function Icon({ 
  name, 
  size = 'md', 
  className = '',
  'aria-label': ariaLabel,
  ...props 
}: IconProps) {
  const IconComponent = ICON_LIBRARY[name] as LucideIcon
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon library`)
    return null
  }
  
  const iconSize = typeof size === 'number' ? size : ICON_SIZES[size]
  
  return (
    <IconComponent
      size={iconSize}
      className={`inline-block ${className}`}
      aria-label={ariaLabel || name}
      {...props}
    />
  )
}

// Nature-themed icon presets for common use cases
export const NatureIconPresets = {
  // Leaf types for different contexts
  leafTypes: {
    content: 'leaf',
    milestone: 'flower',
    memory: 'sprout',
    photo: 'camera',
    video: 'video',
    audio: 'mic',
  },
  
  // Weather moods
  weatherMoods: {
    happy: 'sun',
    calm: 'cloud',
    refreshing: 'droplets',
    energetic: 'wind',
    peaceful: 'snowflake',
  },
  
  // Seasonal themes
  seasons: {
    spring: 'sprout',
    summer: 'sun',
    autumn: 'leaf',
    winter: 'snowflake',
  },
} as const

// Helper function to get seasonal icon
export function getSeasonalIcon(season?: string): IconName {
  if (!season) return 'leaf'
  return NatureIconPresets.seasons[season as keyof typeof NatureIconPresets.seasons] || 'leaf'
}

// Helper function to get leaf type icon
export function getLeafTypeIcon(leafType?: string): IconName {
  if (!leafType) return 'leaf'
  return NatureIconPresets.leafTypes[leafType as keyof typeof NatureIconPresets.leafTypes] || 'leaf'
}

// Helper function to get weather mood icon
export function getWeatherMoodIcon(mood?: string): IconName {
  if (!mood) return 'sun'
  return NatureIconPresets.weatherMoods[mood as keyof typeof NatureIconPresets.weatherMoods] || 'sun'
}

export default Icon