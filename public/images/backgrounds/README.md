# Nature Background Images Directory

This directory is for storing nature-themed background images and textures.

## Recommended Sources for Nature Backgrounds:

1. **Unsplash** - Free for commercial use, no attribution required:
   - 750+ botanical images
   - 30K+ botanical illustrations 
   - 900+ nature backgrounds
   - 4K nature wallpapers

2. **Pexels** - 1M+ nature wallpapers, royalty-free:
   - Botanical photos
   - Nature textures
   - Seasonal landscapes

## Usage Guidelines:

### Image Formats:
- WebP (preferred for performance)
- JPG for photography
- PNG for illustrations with transparency
- SVG for simple patterns and textures

### Optimization:
- Compress images for web (80-90% quality for JPGs)
- Generate multiple sizes for responsive design
- Use Next.js Image component for automatic optimization

### File Organization:
```
backgrounds/
├── botanical/
│   ├── leaves-pattern.webp
│   ├── branch-texture.jpg
├── seasonal/
│   ├── spring-flowers.webp
│   ├── autumn-leaves.jpg
├── textures/
│   ├── bark-texture.jpg
│   ├── wood-grain.webp
└── patterns/
    ├── leaf-pattern.svg
    ├── nature-dots.svg
```

### Color Compatibility:
Ensure backgrounds work well with the nature color palette:
- Primary: leaf-500 (#6EC26B)
- Secondary: bark-400 (#6B4630)
- Accents: flower-400 (#F7C6D2), fruit-400 (#FFD66B)

### Performance Tips:
- Lazy load background images
- Use CSS background-image with object-fit
- Consider using CSS gradients for subtle nature-inspired backgrounds