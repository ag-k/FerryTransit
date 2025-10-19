import { expect, test } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

test.describe('トップページ', () => {
  test.beforeEach(async ({ page }) => {
    await setupPublicPageStubs(page)
  })

  test('港を選択すると時刻表が表示される', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 2, name: '時刻表' })).toBeVisible()

    await page.getByLabel('出発地').selectOption('HONDO_SHICHIRUI')
    await page.getByLabel('目的地').selectOption('SAIGO')

    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('row', { name: /フェリーおき/ })).toContainText(['09:00', '11:25'])
  })

  test('ルート入れ替えボタンで出発地と到着地が入れ替わる', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('出発地').selectOption('HONDO_SHICHIRUI')
    await page.getByLabel('目的地').selectOption('SAIGO')

    await page.getByRole('button', { name: /出発地と到着地を入れ替え/ }).click()

    await expect(page.getByLabel('出発地')).toHaveValue('SAIGO')
    await expect(page.getByLabel('目的地')).toHaveValue('HONDO_SHICHIRUI')
  })
})
