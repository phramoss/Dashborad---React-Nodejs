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
        bg:      'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          dark:    'var(--bg)',
          light:   'var(--surface-light)',
          border:  'var(--border)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          muted:   'var(--brand-alpha)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-primary)',
          muted:     'var(--text-muted)',
        },
        filter: 'var(--filter-bg)',
        chart: {
          teal:   '#428D94',
          red:    '#A70000',
          purple: '#7B5EA7',
          blue:   '#4A90D9',
          orange: '#F5A623',
          pink:   '#E056A0',
          yellow: '#F7DC6F',
        },
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
      borderRadius: { lg: '0.75rem', xl: '1rem' },
      boxShadow: { card: '0 4px 24px rgba(0,0,0,0.35)', glow: 'none' },
    },
  },
  plugins: [],
}
