import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5B6EE8',
          hover: '#4C5FD5',
          light: '#E8ECFC',
        },
        zendfi: {
          blue: '#5B6EE8',
          'blue-hover': '#4C5FD5',
          background: '#F6F9FC',
          border: '#E3E8EE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'zendfi': '12px',
      },
      boxShadow: {
        'zendfi': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'zendfi-lg': '0 4px 12px rgba(0, 0, 0, 0.12)',
        'zendfi-xl': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'zendfi-primary': '0 2px 8px rgba(91, 110, 232, 0.25)',
        'zendfi-primary-lg': '0 4px 12px rgba(91, 110, 232, 0.35)',
      },
      animation: {
        'slideUp': 'slideUp 0.3s ease-out',
        'fadeIn': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
