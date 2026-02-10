import { expect, test } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

test.describe('トップページ', () => {
  test('港を選択すると時刻表が表示される', async ({ page }) => {
    await setupPublicPageStubs(page, { initialDeparture: 'HONDO_SHICHIRUI', initialArrival: 'SAIGO' })
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 2, name: /時刻表|Timetable/ })).toBeVisible()

    // fixtures の運航期間が 2025 年なので、日付を範囲内に合わせる
    await page.locator('input[type="date"]').fill('2025-01-07')

    await expect(page.getByRole('table')).toBeVisible()
    const ferryRow = page.getByRole('row', { name: /フェリーおき|Ferry Oki/ })
    await expect(ferryRow).toBeVisible()
    await expect(ferryRow).toContainText(/09:00/)
    await expect(ferryRow).toContainText(/11:25/)
  })

  test('ルート入れ替えボタンで出発地と到着地が入れ替わる', async ({ page }) => {
    await setupPublicPageStubs(page, { initialDeparture: 'HONDO_SHICHIRUI', initialArrival: 'SAIGO' })
    await page.goto('/')

    await page.getByRole('button', { name: /出発地と到着地を入れ替え|Reverse route/ }).click()

    const endpoints = page.getByTestId('route-endpoints-selector')
    const buttons = endpoints.locator('[data-testid="port-selector-button"]')
    await expect(buttons.first()).toContainText('西郷(隠岐の島町)')
    await expect(buttons.nth(1)).toContainText('七類(松江市)')
  })

  test('乗換を含むルートを検索ボタンが表示される（島前3島以外）', async ({ page }) => {
    await setupPublicPageStubs(page, { initialDeparture: 'HONDO_SHICHIRUI', initialArrival: 'SAIGO' })
    await page.goto('/')

    const transferButton = page.getByRole('button', { name: /乗換を含むルートを検索|Search routes with transfers/ })
    await expect(transferButton).toBeVisible()
  })

  test('島前3島間のルートでは乗換を含むルートを検索ボタンが表示されない', async ({ page }) => {
    await setupPublicPageStubs(page, { initialDeparture: 'BEPPU', initialArrival: 'HISHIURA' })
    await page.goto('/')

    const transferButton = () => page.getByRole('button', { name: /乗換を含むルートを検索|Search routes with transfers/ })
    await expect(transferButton()).not.toBeVisible()

    // 菱浦 → 来居
    await page.evaluate(() => {
      window.localStorage.setItem('departure', 'HISHIURA')
      window.localStorage.setItem('arrival', 'KURI')
    })
    await page.reload()
    await expect(transferButton()).not.toBeVisible()

    // 来居 → 別府
    await page.evaluate(() => {
      window.localStorage.setItem('departure', 'KURI')
      window.localStorage.setItem('arrival', 'BEPPU')
    })
    await page.reload()
    await expect(transferButton()).not.toBeVisible()
  })

  test('乗換を含むルートを検索ボタンをクリックすると乗換案内画面に遷移する', async ({ page }) => {
    await setupPublicPageStubs(page, { initialDeparture: 'HONDO_SHICHIRUI', initialArrival: 'SAIGO' })
    await page.goto('/')

    const transferButton = page.getByRole('button', { name: /乗換を含むルートを検索|Search routes with transfers/ })
    await transferButton.click()

    // URLが/transitに遷移し、パラメータが正しく設定されていることを確認
    await expect(page).toHaveURL(/\/transit/)
    await expect(page).toHaveURL(/departure=HONDO_SHICHIRUI/)
    await expect(page).toHaveURL(/arrival=SAIGO/)
    await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/)
    await expect(page).toHaveURL(/time=00:00/)
  })
})
