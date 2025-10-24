import { expect, test } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

test.describe('トップページ', () => {
  test.beforeEach(async ({ page }) => {
    await setupPublicPageStubs(page)
  })

  test('港を選択すると時刻表が表示される', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 2, name: /時刻表|Timetable/ })).toBeVisible()

    const visibleSelects = page.locator('select:visible')
    await expect(visibleSelects).toHaveCount(2)

    const departureSelect = visibleSelects.first()
    const arrivalSelect = visibleSelects.nth(1)

    await expect(departureSelect).toBeEnabled()
    await expect(arrivalSelect).toBeEnabled()

    await departureSelect.selectOption('HONDO_SHICHIRUI')
    await arrivalSelect.selectOption('SAIGO')

    await expect(page.getByRole('table')).toBeVisible()
    const ferryRow = page.getByRole('row', { name: /フェリーおき|Ferry Oki/ })
    await expect(ferryRow).toBeVisible()
    await expect(ferryRow).toContainText(/09:00/)
    await expect(ferryRow).toContainText(/11:25/)
  })

  test('ルート入れ替えボタンで出発地と到着地が入れ替わる', async ({ page }) => {
    await page.goto('/')

    const visibleSelects = page.locator('select:visible')
    await expect(visibleSelects).toHaveCount(2)

    const departureSelect = visibleSelects.first()
    const arrivalSelect = visibleSelects.nth(1)

    await expect(departureSelect).toBeEnabled()
    await expect(arrivalSelect).toBeEnabled()

    await departureSelect.selectOption('HONDO_SHICHIRUI')
    await arrivalSelect.selectOption('SAIGO')

    await page.getByRole('button', { name: /出発地と到着地を入れ替え|Reverse route/ }).click()

    await expect(visibleSelects.first()).toHaveValue('SAIGO')
    await expect(visibleSelects.nth(1)).toHaveValue('HONDO_SHICHIRUI')
  })
})
