import { defineConfig } from '@playwright/test'

const PORT = process.env.PLAYWRIGHT_PORT ?? '4173'
const HOST = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    locale: 'ja-JP',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'webkit',
      use: {}
    }
  ],
  webServer: {
    command: `node scripts/serve-spa.mjs --host ${HOST} --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
})
