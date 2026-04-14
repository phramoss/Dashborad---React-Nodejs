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
        brand: {
          DEFAULT: '#428D94',
          muted:   'rgba(66,141,148,0.15)',
        },
        surface: {
          DEFAULT: '#2D2F33',
          dark:    '#030303',
          light:   '#3A3D42',
          border:  'rgba(66,141,148,0.20)',
        },
        text: {
          primary:   '#c9c9c9',
          secondary: '#c9c9c9',
          muted:     '#c9c9c9',
        },
        // ✅ Restaurado — usado nos KPIs e gráficos
        chart: {
          teal:    '#00D4AA',
          purple:  '#7B5EA7',
          blue:    '#4A90D9',
          orange:  '#F5A623',
          pink:    '#E056A0',
          yellow:  '#F7DC6F',
        },
        // ✅ Restaurado — usado nos badges de variação dos KPIs
        status: {
          success: '#00D4AA',
          warning: '#F5A623',
          danger:  '#E74C3C',
          info:    '#4A90D9',
        },
      },
      fontFamily: {
        sans:    ['Roboto', 'system-ui', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
        display: ['Barlow Condensed', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.35)',
        glow: 'none',
      },
    },
  },
  plugins: [],
}