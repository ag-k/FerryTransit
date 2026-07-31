import { expect, test, type Page } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

const runTransitSearch = async (page: Page) => {
  await setupPublicPageStubs(page, { initialDeparture: 'HONDO_SHICHIRUI', initialArrival: 'SAIGO' })
  await page.goto('/transit')

  // fixtures の運航期間が 2025 年なので、日付を範囲内に合わせる
  await page.locator('input[type="date"]').fill('2025-01-07')
  await page.locator('input[type="time"]').fill('08:00')

  await page.getByRole('button', { name: '検索', exact: true }).click()

  // 検索結果が表示されるまで待つ
  await expect(page.getByRole('heading', { level: 3, name: '検索結果' })).toBeVisible({ timeout: 15000 })
}

test.describe('乗換案内', () => {
  test('伊丹から西郷のJAL便と空港バスを変動運賃として表示する', async ({ page }) => {
    await setupPublicPageStubs(page, {
      initialDeparture: 'AIRPORT_ITAMI',
      initialArrival: 'SAIGO'
    })
    await page.goto('/transit')

    await page.locator('input[type="date"]').fill('2026-07-31')
    await page.locator('input[type="time"]').fill('13:00')
    await page.getByRole('button', { name: '検索', exact: true }).click()

    await expect(page.getByRole('heading', { level: 3, name: '検索結果' })).toBeVisible({ timeout: 15000 })
    const firstResult = page.getByTestId('transit-result-header').first()
    await expect(firstResult).toContainText('13:45')
    await expect(firstResult).toContainText('15:00')
    await expect(firstResult.getByTestId('transit-route-fare')).toContainText('¥520 + 航空運賃（変動）')
    await expect(page.getByTestId('transit-segment-fare').filter({ hasText: '航空運賃は別途（変動）' }).first()).toBeVisible()

    const jalFareLink = page.getByRole('link', { name: 'JALで運賃を確認' }).first()
    await expect(jalFareLink).toHaveAttribute('href', 'https://www.jal.co.jp/domestic/ja-jp/flights-from-oki')
    await expect(jalFareLink).toHaveAttribute('target', '_blank')
  })

  test('西郷から伊丹でも空港バス運賃だけを総額表示しない', async ({ page }) => {
    await setupPublicPageStubs(page, {
      initialDeparture: 'SAIGO',
      initialArrival: 'AIRPORT_ITAMI'
    })
    await page.goto('/transit')

    await page.locator('input[type="date"]').fill('2026-07-31')
    await page.locator('input[type="time"]').fill('14:00')
    await page.getByRole('button', { name: '検索', exact: true }).click()

    const firstResult = page.getByTestId('transit-result-header').first()
    await expect(firstResult).toContainText('14:15')
    await expect(firstResult).toContainText('15:50')
    await expect(firstResult.getByTestId('transit-route-fare')).toContainText('¥520 + 航空運賃（変動）')
  })

  test('出雲から西郷でも変動航空運賃と既知のバス運賃を分けて表示する', async ({ page }) => {
    await setupPublicPageStubs(page, {
      initialDeparture: 'AIRPORT_IZUMO',
      initialArrival: 'SAIGO'
    })
    await page.goto('/transit')

    await page.locator('input[type="date"]').fill('2026-07-31')
    await page.locator('input[type="time"]').fill('08:30')
    await page.getByRole('button', { name: '検索', exact: true }).click()

    const firstResult = page.getByTestId('transit-result-header').first()
    await expect(firstResult).toContainText('9:00')
    await expect(firstResult).toContainText('9:55')
    await expect(firstResult.getByTestId('transit-route-fare')).toContainText('¥520 + 航空運賃（変動）')
  })

  test('西郷から出雲でも空港バス運賃だけを総額表示しない', async ({ page }) => {
    await setupPublicPageStubs(page, {
      initialDeparture: 'SAIGO',
      initialArrival: 'AIRPORT_IZUMO'
    })
    await page.goto('/transit')

    await page.locator('input[type="date"]').fill('2026-07-31')
    await page.locator('input[type="time"]').fill('09:00')
    await page.getByRole('button', { name: '検索', exact: true }).click()

    const firstResult = page.getByTestId('transit-result-header').first()
    await expect(firstResult).toContainText('9:10')
    await expect(firstResult).toContainText('10:30')
    await expect(firstResult.getByTestId('transit-route-fare')).toContainText('¥520 + 航空運賃（変動）')
  })

  test('英語・ダークモード・狭幅画面でも航空運賃の意味とリンクを保つ', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await setupPublicPageStubs(page, {
      initialDeparture: 'AIRPORT_ITAMI',
      initialArrival: 'SAIGO',
      language: 'en',
      theme: 'dark'
    })
    await page.goto('/en/transit')

    await page.locator('input[type="date"]').fill('2026-07-31')
    await page.locator('input[type="time"]').fill('13:00')
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    const firstResult = page.getByTestId('transit-result-header').first()
    await expect(firstResult.getByTestId('transit-route-fare')).toContainText('¥520 + variable airfare')
    await expect(page.getByText('Airfare charged separately (variable)', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Check fare on JAL' }).first()).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('境港から七類港へはつみ交通の直行便を表示する', async ({ page }) => {
    await setupPublicPageStubs(page, {
      initialDeparture: 'HONDO_SAKAIMINATO',
      initialArrival: 'HONDO_SHICHIRUI'
    })
    await page.goto('/transit')

    await page.locator('input[type="date"]').fill('2026-07-31')
    await page.locator('input[type="time"]').fill('08:00')
    await page.getByRole('button', { name: '検索', exact: true }).click()

    await expect(page.getByRole('heading', { level: 3, name: '検索結果' })).toBeVisible({ timeout: 15000 })
    const firstResult = page.getByTestId('transit-result-header').first()
    await expect(firstResult).toContainText('8:24')
    await expect(firstResult).toContainText('8:39')
    await expect(firstResult).toContainText('¥500')
    await expect(page.getByText(/はつみ交通 隠岐汽船連絡バス/).first()).toBeVisible()
  })

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
