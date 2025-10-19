import { expect, test } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

test.describe('乗換案内', () => {
  test.beforeEach(async ({ page }) => {
    await setupPublicPageStubs(page)
  })

  test('検索条件を入力すると経路候補が表示される', async ({ page }) => {
    await page.goto('/transit')

    await page.getByLabel('出発地').first().selectOption('HONDO_SHICHIRUI')
    await page.getByLabel('目的地').first().selectOption('SAIGO')
    await page.getByLabel('時刻').fill('08:00')

    await page.getByRole('button', { name: '検索' }).click()

    await expect(page.getByRole('heading', { level: 3, name: '検索結果' })).toBeVisible()
    await expect(page.getByText('フェリーおき')).toBeVisible()
    await expect(page.getByText(/合計:\s*¥3,360/)).toBeVisible()
  })

  test('ソートを「料金順」に変更できる', async ({ page }) => {
    await page.goto('/transit')

    await page.getByLabel('出発地').first().selectOption('HONDO_SHICHIRUI')
    await page.getByLabel('目的地').first().selectOption('SAIGO')
    await page.getByLabel('時刻').fill('08:00')
    await page.getByRole('button', { name: '検索' }).click()

    await expect(page.getByRole('heading', { level: 3, name: '検索結果' })).toBeVisible()

    const sortButton = page.getByRole('tab', { name: /料金が安い/ })
    await sortButton.click()
    await expect(sortButton).toHaveAttribute('aria-selected', 'true')
  })
})
