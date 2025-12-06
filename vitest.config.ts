import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,ts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '.nuxt',
      'dist',
      'src/tests/e2e/**',
      'src/functions/node_modules/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        '.nuxt',
        'test',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './src'),
      '#app': resolve(__dirname, './src/test/mocks/nuxt.ts'),
      '#imports': resolve(__dirname, './src/test/mocks/nuxt.ts'),
      '@/composables/useHolidayCalendar': resolve(__dirname, './src/test/mocks/nuxt.ts')
    }
  }
})
