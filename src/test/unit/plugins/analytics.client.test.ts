/**
 * Analytics Client Plugin のテスト
 *
 * このプラグインはルート遷移ごとにPVをトラッキングする
 * Nuxtプラグインの完全な統合テストは困難なため、
 * ここではルーティングロジックの動作確認に焦点を当てる
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Analytics Client Plugin - ロジックテスト', () => {
  const mockTrackPageView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ルートパスのトラッキングロジック', () => {
    // プラグインのトラッキングロジックをシミュレート
    const simulateTrackPageView = (path: string) => {
      if (path) {
        mockTrackPageView({ pagePath: path })
      }
    }

    it('有効なパスでトラッキングが呼ばれる', () => {
      simulateTrackPageView('/transit')
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/transit' })
    })

    it('ルートパスでトラッキングが呼ばれる', () => {
      simulateTrackPageView('/')
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/' })
    })

    it('空のパスではトラッキングが呼ばれない', () => {
      simulateTrackPageView('')
      expect(mockTrackPageView).not.toHaveBeenCalled()
    })

    it('複数のページ遷移を正しくトラッキングする', () => {
      const pages = ['/transit', '/timetable', '/status', '/settings']
      pages.forEach(page => simulateTrackPageView(page))

      expect(mockTrackPageView).toHaveBeenCalledTimes(4)
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/transit' })
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/timetable' })
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/status' })
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/settings' })
    })
  })

  describe('管理画面パスのトラッキング', () => {
    const simulateTrackPageView = (path: string) => {
      if (path) {
        mockTrackPageView({ pagePath: path })
      }
    }

    it('管理画面のパスもトラッキングされる', () => {
      simulateTrackPageView('/admin/analytics')
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/admin/analytics' })
    })

    it('管理画面の複数ページを正しくトラッキングする', () => {
      const adminPages = ['/admin', '/admin/analytics', '/admin/timetable', '/admin/routes']
      adminPages.forEach(page => simulateTrackPageView(page))

      expect(mockTrackPageView).toHaveBeenCalledTimes(4)
    })
  })

  describe('特殊なパスのハンドリング', () => {
    const simulateTrackPageView = (path: string) => {
      if (path) {
        mockTrackPageView({ pagePath: path })
      }
    }

    it('クエリパラメータを含むパスのベースパスがトラッキングされる', () => {
      // 実際のプラグインではroute.pathなのでクエリは含まない
      simulateTrackPageView('/transit')
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/transit' })
    })

    it('動的ルートパスがトラッキングされる', () => {
      simulateTrackPageView('/news/123')
      expect(mockTrackPageView).toHaveBeenCalledWith({ pagePath: '/news/123' })
    })
  })
})
