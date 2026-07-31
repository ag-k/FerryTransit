import { describe, expect, it } from 'vitest'
import { shouldTrackAnalyticsPath } from '~/utils/analyticsTracking'

describe('Analytics Client Plugin - tracking policy', () => {
  it('Webの一般画面を計測する', () => {
    expect(shouldTrackAnalyticsPath({
      path: '/transit',
      isTestMode: false,
      isCapacitorBuild: false
    })).toBe(true)
  })

  it('Webの管理画面を計測しない', () => {
    expect(shouldTrackAnalyticsPath({
      path: '/admin/analytics',
      isTestMode: false,
      isCapacitorBuild: false
    })).toBe(false)
  })

  it('ブラウザテスト中は計測しない', () => {
    expect(shouldTrackAnalyticsPath({
      path: '/transit',
      isTestMode: true,
      isCapacitorBuild: false
    })).toBe(false)
  })

  it('Capacitorアプリの一般画面を計測する', () => {
    expect(shouldTrackAnalyticsPath({
      path: '/transit',
      isTestMode: false,
      isCapacitorBuild: true
    })).toBe(true)
  })

  it('パスが空の場合は計測しない', () => {
    expect(shouldTrackAnalyticsPath({
      path: '',
      isTestMode: false,
      isCapacitorBuild: false
    })).toBe(false)
  })
})
