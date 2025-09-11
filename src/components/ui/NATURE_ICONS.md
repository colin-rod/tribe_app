# Nature Icons System Documentation

## Overview
The Tribe app now features a comprehensive nature-inspired icon system built on top of Lucide React, with custom optimizations and accessibility features.

## Components

### IconLibrary.tsx
Central icon management system with categorized nature-themed icons.

**Available Categories:**
- `NATURE_ICONS`: leaf, treePine, trees, flower, flower2, sprout, bug
- `MEDIA_ICONS`: camera, video, mic, music, image
- `SOCIAL_ICONS`: heart, messageCircle, share, users, user
- `ACTION_ICONS`: plus, edit, trash, upload, download
- `SYSTEM_ICONS`: check, x, chevrons, search, settings, lock

### Basic Usage:
```tsx
import { Icon } from '@/components/ui/IconLibrary'

<Icon name="leaf" size="md" className="text-leaf-500" />
```

### Helper Functions:
```tsx
import { getLeafTypeIcon, getSeasonalIcon } from '@/components/ui/IconLibrary'

const icon = getLeafTypeIcon('photo') // returns 'camera'
const seasonal = getSeasonalIcon('spring') // returns 'sprout'
```

## Performance Optimizations

### OptimizedIcon Component
Memoized icon component for better performance:
```tsx
import { OptimizedIcon } from '@/components/ui/IconOptimizer'

<OptimizedIcon name="heart" size="lg" className="text-red-500" />
```

### Icon Preloading
For critical icons that appear immediately:
```tsx
import { preloadCriticalIcons } from '@/components/ui/IconOptimizer'

// Add to your layout or main component
{preloadCriticalIcons()}
```

### Lazy Loading
For non-critical icons:
```tsx
import { LazyIcon } from '@/components/ui/IconOptimizer'

<LazyIcon 
  name="settings" 
  fallback={<div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />}
/>
```

## Accessibility Features

### Accessible Icon Component
Proper ARIA attributes and screen reader support:
```tsx
import { AccessibleIcon } from '@/components/ui/IconOptimizer'

<AccessibleIcon 
  name="heart" 
  label="Like this post"
  decorative={false}
/>
```

### Decorative vs Functional Icons
- **Decorative**: Use `decorative={true}` or `aria-hidden="true"`
- **Functional**: Always provide meaningful `aria-label`

## Seasonal Icons

### SeasonalIcon Component
Automatically selects appropriate icons based on season:
```tsx
import { SeasonalIcon } from '@/components/ui/IconOptimizer'

<SeasonalIcon season="spring" size="xl" className="text-leaf-500" />
```

## Customization

### Icon Sizes
Available sizes: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl` or custom number

### Color Integration
Works seamlessly with the nature color palette:
- `text-leaf-500` - Primary green
- `text-bark-400` - Primary brown
- `text-flower-400` - Pink accent
- `text-fruit-400` - Yellow accent

## Migration from Emojis

### Before:
```tsx
<span className="text-xl">🌿</span>
```

### After:
```tsx
<Icon name="leaf" size="md" className="text-leaf-500" />
```

## Best Practices

### Performance
1. Use `OptimizedIcon` for frequently rendered icons
2. Preload critical icons in your main layout
3. Use `LazyIcon` for icons below the fold
4. Avoid creating new icon instances in render functions

### Accessibility
1. Always provide meaningful labels for functional icons
2. Use `decorative={true}` for purely visual icons
3. Test with screen readers
4. Ensure sufficient color contrast

### Design Consistency
1. Use consistent sizing across similar UI elements
2. Follow the nature color palette
3. Maintain visual hierarchy with icon sizes
4. Consider the context and meaning of each icon

## Available Icons Reference

### Nature & Plants
- `leaf` - General nature, growth
- `treePine` - Trees, forest themes
- `trees` - Multiple trees, community
- `flower` - Beauty, celebration
- `flower2` - Alternative flower style
- `sprout` - New growth, beginnings
- `bug` - Wildlife, nature

### Weather & Environment
- `sun` - Bright, positive, energy
- `cloud` - Calm, peaceful
- `cloudRain` - Renewal, freshness
- `droplets` - Water, purity
- `wind` - Movement, change
- `snowflake` - Winter, uniqueness

### Actions & Navigation
- `heart` - Love, favorites, reactions
- `messageCircle` - Comments, communication
- `share` - Sharing content
- `users` - Community, groups
- `camera` - Photos, memories
- `video` - Video content
- `mic` - Audio, voice notes

## Extending the System

### Adding New Icons
1. Import the icon from Lucide React in `IconLibrary.tsx`
2. Add to appropriate category constant
3. Update the combined `ICON_LIBRARY`
4. Add TypeScript types automatically update

### Custom SVG Icons
1. Place in `/public/icons/nature/` directory
2. Import and add to the icon library
3. Follow the same naming conventions
4. Ensure accessibility attributes

## Troubleshooting

### Common Issues
1. **Icon not found**: Check spelling and availability in Lucide React
2. **Performance issues**: Use `OptimizedIcon` or `LazyIcon`
3. **Accessibility warnings**: Add proper `aria-label` attributes
4. **Inconsistent sizing**: Use the predefined size constants

### Debug Mode
Enable console warnings for missing icons by checking the Icon component implementation.