import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3030";
const HOST = process.env.PLAYWRIGHT_HOST ?? "localhost";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "./src/tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "ja-JP",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        // E2E should run without touching ignored .env files (sandbox blocks them).
        // Provide minimal Firebase config via env so the client plugin can initialize.
        command: [
          `NUXT_PUBLIC_FIREBASE_API_KEY=test`,
          `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=test`,
          `NUXT_PUBLIC_FIREBASE_PROJECT_ID=test`,
          `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=test`,
          `NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=test`,
          `NUXT_PUBLIC_FIREBASE_APP_ID=test`,
          `NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=`,
          `NUXT_PUBLIC_FIREBASE_USE_EMULATORS=false`,
          // Disable Google Maps in E2E (prevents map initialization from crashing tests)
          `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=`,
          `nuxt dev --hostname ${HOST} --port ${PORT}`,
        ].join(' '),
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
