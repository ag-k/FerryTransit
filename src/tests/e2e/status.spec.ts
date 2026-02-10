import { expect, test } from '@playwright/test'
import { setupPublicPageStubs } from './utils/test-helpers'

test.describe('運航状況', () => {
  test.beforeEach(async ({ page }) => {
    await setupPublicPageStubs(page)
  })

  test('各船の運航状況が表示される', async ({ page }) => {
    await page.goto('/status')

    await expect(page.getByRole('heading', { level: 2, name: /運航状況|Service Status/ })).toBeVisible()

    const isokazeCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /いそかぜ|Isokaze/ }) })
    await expect(isokazeCard.getByText(/通常運航|Normal service/).first()).toBeVisible()

    const dozenCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /フェリーどうぜん.+内航船|Ferry Dōzen|Ferry Dozen|Inter-Island Ferry/ }) })
    await expect(dozenCard.getByText(/通常運航|Normal service/).first()).toBeVisible()

    const ferryCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /フェリー|Ferry/ }) }).first()
    await expect(ferryCard.getByText(/定期運航|in Operation/).first()).toBeVisible()
    await expect(ferryCard.getByText(/\(\s*in Operation\s*\)/)).toBeVisible()
  })
})
