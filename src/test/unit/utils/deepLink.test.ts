import { describe, expect, it, vi } from 'vitest'
import { navigateToDeepLink, parseDeepLinkPath } from '@/utils/deepLink'

describe('parseDeepLinkPath', () => {
  it.each([
    ['ferrytransit://status', '/status'],
    ['ferrytransit://app/transit?from=saigo#results', '/transit?from=saigo#results'],
    ['ferrytransit://app', '/'],
  ])('%sをアプリ内パスへ変換する', (url, expected) => {
    expect(parseDeepLinkPath(url)).toBe(expected)
  })

  it.each([null, '', 'https://example.com/status', 'not a url'])(
    '対象外URL %s は無視する',
    (url) => {
      expect(parseDeepLinkPath(url)).toBeNull()
    },
  )
})

describe('navigateToDeepLink', () => {
  it('コールド起動時にrouterの準備完了後でreplaceする', async () => {
    const calls: string[] = []
    const router = {
      isReady: vi.fn(async () => {
        calls.push('ready')
      }),
      replace: vi.fn(async (path: string) => {
        calls.push(`replace:${path}`)
      }),
    }

    await expect(navigateToDeepLink(router, 'ferrytransit://transit')).resolves.toBe('/transit')
    expect(calls).toEqual(['ready', 'replace:/transit'])
  })

  it('対象外URLではrouterを操作しない', async () => {
    const router = {
      isReady: vi.fn(async () => undefined),
      replace: vi.fn(async () => undefined),
    }

    await expect(navigateToDeepLink(router, 'https://example.com')).resolves.toBeNull()
    expect(router.isReady).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
  })
})
