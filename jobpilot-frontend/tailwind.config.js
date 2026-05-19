/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode: Blacks & Grays
        black: '#0a0a0a',
        'black-2': '#141414',
        'black-3': '#1c1c1c',
        'gray-1': '#2a2a2a',
        'gray-2': '#3d3d3d',
        'gray-3': '#6b6b6b',
        'gray-4': '#a8a8a8',
        white: '#fafafa',

        // Accent (Red)
        accent: {
          DEFAULT: '#ff2d2d',  // primary red
          light: '#ff4545',    // glow/hover
          dark: '#cc0000',     // active/pressed
        },

        // Semantic
        success: '#4ade80',    // green
        warning: '#facc15',    // amber
        error: '#ff2d2d',      // red
        info: '#3b82f6',       // blue

        // Aliases for compatibility
        ink: '#fafafa',        // text
        charcoal: '#a8a8a8',   // secondary text
        ash: '#6b6b6b',        // labels
        mist: '#2a2a2a',       // borders
        cream: '#0a0a0a',      // background
      },
      fontSize: {
        xs: ['12px', '1.4'],
        sm: ['14px', '1.5'],
        base: ['16px', '1.6'],
        lg: ['20px', '1.3'],
        xl: ['24px', '1.3'],
        '2xl': ['32px', '1.2'],
        '3xl': ['48px', '1.1'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        base: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(25, 20, 16, 0.08)',
        md: '0 2px 8px rgba(25, 20, 16, 0.08)',
        lg: '0 4px 16px rgba(25, 20, 16, 0.12)',
      },
      transitionDuration: {
        fast: '100ms',
        base: '150ms',
        slow: '200ms',
      },
    },
  },
  plugins: [],
}
