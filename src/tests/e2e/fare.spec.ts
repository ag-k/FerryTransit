import { expect, test } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

test.describe('運賃表', () => {
  test.beforeEach(async ({ page }) => {
    await setupPublicPageStubs(page)
  })

  test('隠岐汽船フェリーの料金表が表示される', async ({ page }) => {
    await page.goto('/fare')

    await expect(page.getByRole('heading', { level: 2, name: /運賃表|Fare Table/ })).toBeVisible()
    await expect(page.getByText(/フェリーおき|Ferry Oki/)).toBeVisible()
    await expect(page.getByRole('cell', { name: /本土〜隠岐|Mainland\s*-\s*Oki/ }).first()).toBeVisible()
    await expect(page.getByRole('cell', { name: /￥?3,520|¥3,520/ }).first()).toBeVisible()
  })

  test('内航船タブを開くと共通運賃が表示される', async ({ page }) => {
    await page.goto('/fare')

    await page.getByRole('button', { name: /内航船|Local Ferry/ }).click()

    await expect(page.getByText(/島前内航船共通|Inter-Island Ferry Common/)).toBeVisible()
    await expect(page.getByRole('cell', { name: /¥300|￥300/ })).toBeVisible()
  })

  test('割引情報が翻訳済みの文言で表示される', async ({ page }) => {
    await page.goto('/fare')

    await expect(page.getByRole('heading', { level: 3, name: /割引情報|Discounts/ })).toBeVisible()
    await expect(page.getByRole('heading', { level: 4, name: /団体割引|Group Discount/ })).toBeVisible()
    await expect(page.getByText(/15名以上|15 or more/)).toBeVisible()
    await expect(page.getByRole('heading', { level: 4, name: 'DISCOUNT_GROUP' })).toHaveCount(0)
  })
})
