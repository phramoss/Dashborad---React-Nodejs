/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens inspired by the Power BI dark theme
        brand: {
          DEFAULT: '#00D4AA',    // Teal/mint - primary accent
          dark: '#00B894',
          light: '#00FFCC',
          muted: '#00D4AA33',
        },
        surface: {
          DEFAULT: '#1E2235',    // Card background
          dark: '#161929',       // Page background
          light: '#252B3F',      // Hover / elevated
          border: '#2D3554',     // Borders
        },
        text: {
          primary: '#E8EAF0',
          secondary: '#8892B0',
          muted: '#4A5280',
        },
        chart: {
          teal:    '#00D4AA',
          purple:  '#7B5EA7',
          blue:    '#4A90D9',
          orange:  '#F5A623',
          pink:    '#E056A0',
          yellow:  '#F7DC6F',
        },
        status: {
          success: '#00D4AA',
          warning: '#F5A623',
          danger:  '#E74C3C',
          info:    '#4A90D9',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Barlow Condensed', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.35)',
        glow: '0 0 20px rgba(0, 212, 170, 0.15)',
      },
    },
  },
  plugins: [],
}
