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
          DEFAULT: '#00d4aa',
          dark:    '#00bb91',
          light:   '#14e8be',
          muted:   '#00d4aa33',
        },
        surface: {
          DEFAULT: '#1e2235',
          dark:    '#161929',
          light:   '#282c3f',
          border:  '#2d3554',
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
        glow: '0 0 20px rgba(0, 212, 170, 0.15)',
      },
    },
  },
  plugins: [],
}