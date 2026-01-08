import { expect, test } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

test.describe('乗換案内', () => {
  test('検索条件を入力すると経路候補が表示される', async ({ page }) => {
    await setupPublicPageStubs(page, { initialDeparture: 'HONDO_SHICHIRUI', initialArrival: 'SAIGO' })
    await page.goto('/transit')

    // fixtures の運航期間が 2025 年なので、日付を範囲内に合わせる
    await page.locator('input[type="date"]').fill('2025-01-07')
    await page.locator('input[type="time"]').fill('08:00')

    await page.getByRole('button', { name: '検索' }).click()

    // 検索結果が表示されるまで待つ
    await expect(page.getByRole('heading', { level: 3, name: '検索結果' })).toBeVisible({ timeout: 15000 })

    // 新UI: 結果はパネル形式（ヘッダに時刻と料金が出る）
    const firstResult = page.getByTestId('transit-result-header').first()
    await expect(firstResult).toBeVisible()
    await expect(firstResult.getByTestId('transit-header-times')).toBeVisible()
    await expect(firstResult.getByTestId('transit-header-summary')).toContainText(/[￥¥]\s*\d/)
  })

  test('ソートを「料金順」に変更できる', async ({ page }) => {
    await setupPublicPageStubs(page, { initialDeparture: 'HONDO_SHICHIRUI', initialArrival: 'SAIGO' })
    await page.goto('/transit')

    await page.locator('input[type="date"]').fill('2025-01-07')
    await page.locator('input[type="time"]').fill('08:00')
    await page.getByRole('button', { name: '検索' }).click()

    await expect(page.getByRole('heading', { level: 3, name: '検索結果' })).toBeVisible()

    const sortButton = page.getByRole('tab', { name: /料金が安い/ })
    await sortButton.click()
    await expect(sortButton).toHaveAttribute('aria-selected', 'true')
  })
})
