import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Nature-Inspired Color Palette
      colors: {
        // Main theme colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        
        // Nature palette
        leaf: {
          100: "var(--leaf-100)",
          300: "var(--leaf-300)", 
          500: "var(--leaf-500)",
          700: "var(--leaf-700)",
        },
        bark: {
          200: "var(--bark-200)",
          400: "var(--bark-400)",
        },
        sky: {
          100: "var(--sky-100)",
          300: "var(--sky-300)",
        },
        flower: {
          400: "var(--flower-400)",
        },
        fruit: {
          400: "var(--fruit-400)",
        },
        "nature-white": "var(--nature-white)",
        
        // Legacy AC tokens for compatibility
        ac: {
          cream: "var(--ac-cream)",
          sage: {
            DEFAULT: "var(--ac-sage)",
            light: "var(--ac-sage-light)",
            dark: "var(--ac-sage-dark)",
          },
          brown: {
            DEFAULT: "var(--ac-brown)",
            light: "var(--ac-brown-light)",
            dark: "var(--ac-brown-dark)",
          },
          sky: {
            DEFAULT: "var(--ac-sky)",
            light: "var(--ac-sky-light)",
            dark: "var(--ac-sky-dark)",
          },
          peach: {
            DEFAULT: "var(--ac-peach)",
            light: "var(--ac-peach-light)",
          },
          coral: "var(--ac-coral)",
          lavender: "var(--ac-lavender)",
          yellow: "var(--ac-yellow)",
          white: "var(--ac-white)",
        },
      },
      
      // Nature-inspired border radius
      borderRadius: {
        'leaf': 'var(--radius-leaf)',
        'soft': 'var(--radius-soft)', 
        'pill': 'var(--radius-pill)',
        // Legacy game radius mappings
        'game-sm': 'var(--radius-leaf)',
        'game': 'var(--radius-leaf)', 
        'game-lg': 'var(--radius-soft)',
        'game-xl': 'var(--radius-soft)',
      },
      
      // Nature-inspired shadows
      boxShadow: {
        'leaf-soft': 'var(--shadow-leaf-soft)',
        'leaf-press': 'var(--shadow-leaf-press)',
        'floating': 'var(--shadow-floating)',
        'bark': 'var(--shadow-bark)',
        // Legacy shadow mappings
        'soft': 'var(--shadow-leaf-soft)',
        'game': 'var(--shadow-leaf-soft)',
        'game-lg': 'var(--shadow-floating)',
        'wooden': 'var(--shadow-bark)',
      },
      
      // Typography
      fontFamily: {
        sans: ['Quicksand', 'var(--font-geist-sans)', 'system-ui'],
        display: ['Comic Neue', 'cursive'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      
      // Custom transitions
      transitionTimingFunction: {
        'bounce': 'var(--transition-bounce)',
        'soft': 'var(--transition-soft)',
      },
      
      // Animation keyframes
      keyframes: {
        'leaf-sway': {
          '0%, 100%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
        },
        // Legacy animation mapping
        'gentle-sway': {
          '0%, 100%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
        },
        'sprout': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shiver': {
          '0%, 100%': { transform: 'rotate(0deg) translateY(0px)' },
          '50%': { transform: 'rotate(2deg) translateY(-6px)' },
        },
        'press-in': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.98)' },
        },
        // Legacy sparkle animation
        'sparkle': {
          '0%': { opacity: '0', transform: 'scale(0) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1) rotate(180deg)' },
          '100%': { opacity: '0', transform: 'scale(0) rotate(360deg)' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        'slide-in': {
          'from': { opacity: '0', transform: 'translateX(100%)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        'tactile-press': {
          '0%': { transform: 'scale(1) translateY(0px)' },
          '50%': { transform: 'scale(0.98) translateY(1px)' },
          '100%': { transform: 'scale(1.02) translateY(-1px)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      
      // Animations
      animation: {
        'leaf-sway': 'leaf-sway 3s ease-in-out infinite',
        'sprout': 'sprout 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shiver': 'shiver 0.2s ease-out',
        'press-in': 'press-in 0.15s ease-out',
        'ripple': 'ripple 0.6s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        // Legacy animations
        'gentle-sway': 'gentle-sway 3s ease-in-out infinite',
        'sparkle': 'sparkle 0.8s ease-out',
        'tactile-press': 'tactile-press 0.15s ease-out',
      },
      
      // Text shadows
      textShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'DEFAULT': '0 1px 3px rgba(0, 0, 0, 0.4)',
        'lg': '0 2px 4px rgba(0, 0, 0, 0.5)',
      },
      
      // Backdrop filters for game-like effects
      backdropBlur: {
        'game': '8px',
      },
    },
  },
  plugins: [
    // Custom plugin for text shadows
    function({ addUtilities }: any) {
      const newUtilities = {
        '.text-shadow-sm': {
          'text-shadow': '0 1px 2px rgba(0, 0, 0, 0.3)',
        },
        '.text-shadow': {
          'text-shadow': '0 1px 3px rgba(0, 0, 0, 0.4)',
        },
        '.text-shadow-lg': {
          'text-shadow': '0 2px 4px rgba(0, 0, 0, 0.5)',
        },
        '.text-shadow-none': {
          'text-shadow': 'none',
        },
      }
      addUtilities(newUtilities)
    },
    
    // Custom plugin for game-like components
    function({ addComponents }: any) {
      const components = {
        '.btn-leaf': {
          '@apply relative bg-bark-400 text-leaf-100 border-3 border-bark-400 rounded-leaf shadow-bark font-display font-semibold transition-all duration-150 ease-bounce hover:bg-bark-200 hover:-translate-y-1 hover:shadow-floating active:translate-y-0 active:scale-95 text-shadow': {},
        },
        '.btn-branch': {
          '@apply btn-leaf bg-leaf-500 text-bark-400 border-leaf-700 hover:bg-leaf-300': {},
        },
        // Legacy button mappings
        '.btn-game': {
          '@apply btn-leaf': {},
        },
        '.btn-game-sage': {
          '@apply btn-branch': {},
        },
        '.card-branch': {
          '@apply relative bg-surface border-3 border-bark-200 rounded-soft shadow-leaf-soft overflow-hidden transition-all duration-300 ease-soft hover:-translate-y-1 hover:rotate-1 hover:shadow-floating hover:border-leaf-500': {},
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '4px',
            background: 'var(--leaf-500)',
            opacity: '0.7',
          },
        },
        // Legacy card mapping
        '.card-game': {
          '@apply card-branch': {},
        },
        '.input-bark': {
          '@apply bg-surface border-3 border-bark-200 rounded-leaf px-4 py-3 font-sans text-foreground placeholder:text-bark-400 transition-colors focus:outline-none focus:border-leaf-500 focus:shadow-leaf-soft': {},
        },
        // Legacy input mapping
        '.input-game': {
          '@apply input-bark': {},
        },
        '.tactile-element': {
          '@apply transition-all duration-200 ease-bounce cursor-pointer select-none hover:-translate-y-0.5 active:translate-y-0 active:scale-98': {},
        },
      }
      addComponents(components)
    },
  ],
};

export default config;