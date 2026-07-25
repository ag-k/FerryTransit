import { describe, expect, it } from 'vitest'
import { isAppRootPath, isIOSBackSwipe } from '@/utils/nativeNavigation'

describe('isAppRootPath', () => {
  it.each(['/', '/en', '/en/', '/ja', '/ja/'])('treats %s as an app root', (path) => {
    expect(isAppRootPath(path)).toBe(true)
  })

  it.each(['/transit', '/status', '/en/transit', '/ja/settings', ''])('does not treat %s as an app root', (path) => {
    expect(isAppRootPath(path)).toBe(false)
  })
})

describe('isIOSBackSwipe', () => {
  it('accepts a rightward single-screen-edge swipe', () => {
    expect(isIOSBackSwipe({ startX: 12, startY: 300, endX: 120, endY: 320 })).toBe(true)
  })

  it.each([
    ['starts away from the edge', { startX: 25, startY: 300, endX: 140, endY: 300 }],
    ['is too short', { startX: 10, startY: 300, endX: 89, endY: 300 }],
    ['moves left', { startX: 10, startY: 300, endX: 0, endY: 300 }],
    ['moves too far vertically', { startX: 10, startY: 300, endX: 120, endY: 365 }]
  ])('rejects a gesture that %s', (_reason, coordinates) => {
    expect(isIOSBackSwipe(coordinates)).toBe(false)
  })

  it('accepts the documented distance boundaries', () => {
    expect(isIOSBackSwipe({ startX: 24, startY: 300, endX: 104, endY: 364 })).toBe(true)
  })
})
