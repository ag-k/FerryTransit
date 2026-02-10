import { expect, test, type Page } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

const runTransitSearch = async (page: Page) => {
  await setupPublicPageStubs(page, { initialDeparture: 'HONDO_SHICHIRUI', initialArrival: 'SAIGO' })
  await page.goto('/transit')

  // fixtures の運航期間が 2025 年なので、日付を範囲内に合わせる
  await page.locator('input[type="date"]').fill('2025-01-07')
  await page.locator('input[type="time"]').fill('08:00')

  await page.getByRole('button', { name: '検索' }).click()

  // 検索結果が表示されるまで待つ
  await expect(page.getByRole('heading', { level: 3, name: '検索結果' })).toBeVisible({ timeout: 15000 })
}

test.describe('乗換案内', () => {
  test('検索条件を入力すると経路候補が表示される', async ({ page }) => {
    await runTransitSearch(page)

    // 新UI: 結果はパネル形式（ヘッダに時刻と料金が出る）
    const firstResult = page.getByTestId('transit-result-header').first()
    await expect(firstResult).toBeVisible()
    await expect(firstResult.getByTestId('transit-header-times')).toBeVisible()
    await expect(firstResult.getByTestId('transit-header-summary')).toContainText(/[￥¥]\s*\d/)
  })

  test('ソートを「料金順」に変更できる', async ({ page }) => {
    await runTransitSearch(page)

    const sortButton = page.getByRole('tab', { name: /料金が安い/ })
    await sortButton.click()
    await expect(sortButton).toHaveAttribute('aria-selected', 'true')
  })

  test('モバイルのソートドロップダウンで料金順に変更できる', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await runTransitSearch(page)

    const sortSelect = page.getByRole('combobox', { name: /並び替え/ })
    await expect(sortSelect).toBeVisible()
    await sortSelect.selectOption('cheap')
    await expect(sortSelect).toHaveValue('cheap')
  })

  test('経路マップモーダルに経路概要が表示される', async ({ page }) => {
    await runTransitSearch(page)

    await page.getByTitle('マップで表示').first().click()

    await expect(page.getByRole('heading', { name: '経路マップ' })).toBeVisible()
    await expect(page.getByText('総所要時間')).toBeVisible()
    await expect(page.getByText('合計運賃')).toBeVisible()
  })

  test('港詳細モーダルに乗り場情報が表示される', async ({ page }) => {
    await runTransitSearch(page)

    await page.locator('table').getByRole('link').first().click()

    await expect(page.getByText('乗り場')).toBeVisible()
    await expect(page.getByText(/隠岐汽船フェリー/)).toBeVisible()
  })
})
