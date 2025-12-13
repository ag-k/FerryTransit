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

  test('乗換を含むルートを検索ボタンが表示される（島前3島以外）', async ({ page }) => {
    await page.goto('/')

    const visibleSelects = page.locator('select:visible')
    const departureSelect = visibleSelects.first()
    const arrivalSelect = visibleSelects.nth(1)

    await departureSelect.selectOption('HONDO_SHICHIRUI')
    await arrivalSelect.selectOption('SAIGO')

    const transferButton = page.getByRole('button', { name: /乗換を含むルートを検索|Search routes with transfers/ })
    await expect(transferButton).toBeVisible()
  })

  test('島前3島間のルートでは乗換を含むルートを検索ボタンが表示されない', async ({ page }) => {
    await page.goto('/')

    const visibleSelects = page.locator('select:visible')
    const departureSelect = visibleSelects.first()
    const arrivalSelect = visibleSelects.nth(1)

    // 別府 → 菱浦
    await departureSelect.selectOption('BEPPU')
    await arrivalSelect.selectOption('HISHIURA')

    const transferButton = page.getByRole('button', { name: /乗換を含むルートを検索|Search routes with transfers/ })
    await expect(transferButton).not.toBeVisible()

    // 菱浦 → 来居
    await departureSelect.selectOption('HISHIURA')
    await arrivalSelect.selectOption('KURI')

    await expect(transferButton).not.toBeVisible()

    // 来居 → 別府
    await departureSelect.selectOption('KURI')
    await arrivalSelect.selectOption('BEPPU')

    await expect(transferButton).not.toBeVisible()
  })

  test('乗換を含むルートを検索ボタンをクリックすると乗換案内画面に遷移する', async ({ page }) => {
    await page.goto('/')

    const visibleSelects = page.locator('select:visible')
    const departureSelect = visibleSelects.first()
    const arrivalSelect = visibleSelects.nth(1)

    await departureSelect.selectOption('HONDO_SHICHIRUI')
    await arrivalSelect.selectOption('SAIGO')

    const transferButton = page.getByRole('button', { name: /乗換を含むルートを検索|Search routes with transfers/ })
    await transferButton.click()

    // URLが/transitに遷移し、パラメータが正しく設定されていることを確認
    await expect(page).toHaveURL(/\/transit/)
    await expect(page).toHaveURL(/departure=HONDO_SHICHIRUI/)
    await expect(page).toHaveURL(/arrival=SAIGO/)
    await expect(page).toHaveURL(/time=00:00/)
  })
})
