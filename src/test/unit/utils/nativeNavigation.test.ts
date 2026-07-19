import { describe, expect, it } from 'vitest'
import { isAppRootPath } from '@/utils/nativeNavigation'

describe('isAppRootPath', () => {
  it.each(['/', '/en', '/en/', '/ja', '/ja/'])('treats %s as an app root', (path) => {
    expect(isAppRootPath(path)).toBe(true)
  })

  it.each(['/transit', '/status', '/en/transit', '/ja/settings', ''])('does not treat %s as an app root', (path) => {
    expect(isAppRootPath(path)).toBe(false)
  })
})
