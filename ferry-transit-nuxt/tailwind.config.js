/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
    "./nuxt.config.{js,ts}"
  ],
  safelist: [
    // Force include dark mode classes for navigation
    'dark:bg-gray-900',
    'dark:bg-gray-800',
    'dark:bg-gray-700',
    'dark:bg-slate-900',
    'dark:bg-slate-800',
    'dark:bg-slate-700',
    'dark:text-white',
    'dark:text-gray-100',
    'dark:text-gray-200',
    'dark:text-gray-300',
    'dark:border-gray-700',
    'dark:border-gray-600',
    'dark:hover:bg-gray-700',
    'dark:hover:bg-gray-600',
    'dark:hover:bg-slate-700',
    'dark:hover:bg-slate-600'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}