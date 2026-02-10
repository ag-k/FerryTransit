/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/components/**/*.{js,vue,ts}',
    './src/layouts/**/*.vue',
    './src/pages/**/*.vue',
    './src/plugins/**/*.{js,ts}',
    './src/app.vue',
    './src/error.vue',
    './nuxt.config.{js,ts}'
  ],
  // NOTE:
  // `content` が Vue/TS を網羅しているため、基本的に safelist は不要です。
  // safelist を増やすと「具体色 + dark:」が二重管理になりやすいので、原則 empty で運用します。
  safelist: [],
  theme: {
    extend: {
      colors: {
        // Design tokens (CSS variables in `src/assets/css/main.scss`)
        'app-bg': 'hsl(var(--app-bg) / <alpha-value>)',
        'app-surface': 'hsl(var(--app-surface) / <alpha-value>)',
        'app-surface-2': 'hsl(var(--app-surface-2) / <alpha-value>)',
        'app-border': 'hsl(var(--app-border) / <alpha-value>)',
        'app-fg': 'hsl(var(--app-fg) / <alpha-value>)',
        'app-muted': 'hsl(var(--app-muted) / <alpha-value>)',
        'app-primary': 'hsl(var(--app-primary) / <alpha-value>)',
        'app-primary-2': 'hsl(var(--app-primary-2) / <alpha-value>)',

        // Nav gradient tokens (optional, but keeps nav "tone" consistent)
        'app-nav-from': 'hsl(var(--app-nav-from) / <alpha-value>)',
        'app-nav-to': 'hsl(var(--app-nav-to) / <alpha-value>)'
      },
      fontFamily: {
        sans: [
          '"Inter"',
          '"BIZ UDPGothic"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'sans-serif'
        ]
      }
    }
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
            width: '0px',
            height: '0px',
            background: 'transparent'
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'transparent',
            display: 'none'
          },
          '&::-webkit-scrollbar-corner': {
            background: 'transparent'
          }
        }
      })
    }
  ]
}
