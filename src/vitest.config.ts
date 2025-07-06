import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
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
      '@': resolve(__dirname, './'),
      '~': resolve(__dirname, './'),
      '#app': resolve(__dirname, './test/mocks/nuxt.ts'),
      '@/composables/useHolidayCalendar': resolve(__dirname, './test/mocks/nuxt.ts')
    }
  }
})