/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        panel: {
          bg: 'rgba(30, 30, 30, 0.95)',
          'bg-light': 'rgba(255, 255, 255, 0.95)',
          border: 'rgba(255, 255, 255, 0.1)',
          'border-light': 'rgba(0, 0, 0, 0.1)'
        }
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 150ms ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
