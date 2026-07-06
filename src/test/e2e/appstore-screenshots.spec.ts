import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.APPSTORE_SCREENSHOT_DIR ?? 'output/appstore-screenshots/ios-6.7-ja'
)

const CSS_VIEWPORT = { width: 430, height: 932 }
const DEVICE_SCALE_FACTOR = 3
const SEARCH_DATE = '2025-01-07'
const SEARCH_TIME = '08:00'

const saveScreenshot = async (page: Page, fileName: string) => {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(700)
  await page.screenshot({
    path: path.join(OUTPUT_DIR, fileName),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
    scale: 'device'
  })
}

test.describe('App Store スクリーンショット', () => {
  test.describe.configure({ mode: 'serial' })

  test.use({
    viewport: CSS_VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    locale: 'ja-JP',
    colorScheme: 'light'
  })

  test.beforeAll(async () => {
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
  })

  test.beforeEach(async ({ page }) => {
    await setupPublicPageStubs(page, {
      initialDeparture: 'HONDO_SHICHIRUI',
      initialArrival: 'SAIGO'
    })
  })

  test('時刻表を検索済み状態で撮影', async ({ page }) => {
    await page.goto('/?departure=HONDO_SHICHIRUI&arrival=SAIGO')
    await page.locator('input[type="date"]').fill(SEARCH_DATE)

    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('row', { name: /フェリーおき|Ferry Oki/ })).toBeVisible()

    await saveScreenshot(page, '01_timetable.png')
  })

  test('乗換案内を検索済み状態で撮影', async ({ page }) => {
    await page.goto(
      `/transit?departure=HONDO_SHICHIRUI&arrival=SAIGO&date=${SEARCH_DATE}&time=${SEARCH_TIME}&isArrivalMode=0`
    )
    await page.locator('input[type="date"]').fill(SEARCH_DATE)
    await page.locator('input[type="time"]').fill(SEARCH_TIME)

    await page.getByRole('button', { name: '検索', exact: true }).click()
    await expect(page.getByTestId('transit-result-header').first()).toBeVisible({ timeout: 15000 })

    await saveScreenshot(page, '02_transit.png')
  })

  test('運航状況を撮影', async ({ page }) => {
    await page.goto('/status')

    await expect(page.getByText(/隠岐汽船フェリー|Oki Kisen Ferry/)).toBeVisible()
    await expect(page.getByText(/いそかぜ|Isokaze/)).toBeVisible()

    await saveScreenshot(page, '03_status.png')
  })
})
