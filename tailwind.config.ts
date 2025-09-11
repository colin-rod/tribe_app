import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Animal Crossing Color Palette
      colors: {
        // Main theme colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        
        // Animal Crossing palette
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
      
      // Game-like border radius
      borderRadius: {
        'game-sm': 'var(--radius-small)',
        'game': 'var(--radius-medium)', 
        'game-lg': 'var(--radius-large)',
        'game-xl': 'var(--radius-xl)',
      },
      
      // Animal Crossing shadows
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'game': 'var(--shadow-medium)',
        'game-lg': 'var(--shadow-large)',
        'wooden': 'var(--shadow-wooden)',
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
        'gentle-sway': {
          '0%, 100%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
        },
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
        'gentle-sway': 'gentle-sway 3s ease-in-out infinite',
        'sparkle': 'sparkle 0.8s ease-out',
        'ripple': 'ripple 0.6s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'tactile-press': 'tactile-press 0.15s ease-out',
        'float': 'float 3s ease-in-out infinite',
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
        '.btn-game': {
          '@apply relative bg-ac-brown text-ac-cream border-3 border-ac-brown-dark rounded-game shadow-wooden font-display font-semibold transition-all duration-150 ease-bounce hover:bg-ac-brown-light hover:-translate-y-1 hover:shadow-game-lg active:translate-y-0 active:scale-95 text-shadow': {},
        },
        '.btn-game-sage': {
          '@apply btn-game bg-ac-sage text-ac-brown-dark border-ac-sage-dark hover:bg-ac-sage-light': {},
        },
        '.card-game': {
          '@apply relative bg-surface border-3 border-ac-brown-light rounded-game-lg shadow-game overflow-hidden transition-all duration-300 ease-soft hover:-translate-y-1 hover:rotate-1 hover:shadow-game-lg hover:border-ac-sage': {},
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '4px',
            background: 'var(--ac-sage)',
            opacity: '0.7',
          },
        },
        '.input-game': {
          '@apply bg-surface border-3 border-ac-brown-light rounded-game px-4 py-3 font-sans text-foreground placeholder:text-ac-brown transition-colors focus:outline-none focus:border-ac-sage focus:shadow-game': {},
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