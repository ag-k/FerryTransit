import { describe, it, expect, beforeEach, vi } from 'vitest'
import { subDays } from 'date-fns'

// Mock useAdminFirestore
const mockGetCollection = vi.fn()
vi.mock('@/composables/useAdminFirestore', () => ({
  useAdminFirestore: () => ({
    getCollection: mockGetCollection
  })
}))

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn()
}))

describe('useAnalytics', () => {
  const mockUseAnalytics = async () => {
    const mod = await import('@/composables/useAnalytics')
    return mod.useAnalytics()
  }
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPageViewStats', () => {
    it('日別のページビュー統計を取得できる', async () => {
      const mockPageViews = [
        { page: '/', timestamp: new Date() },
        { page: '/', timestamp: new Date() },
        { page: '/timetable', timestamp: new Date() }
      ]
      
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getPageViewStats } = await mockUseAnalytics()
      const stats = await getPageViewStats('day', new Date())

      expect(mockGetCollection).toHaveBeenCalledWith(
        'pageViews',
        expect.any(Array)
      )
      expect(stats.total).toBe(3)
      expect(stats.byPage['/'].count).toBe(2)
      expect(stats.byPage['/timetable'].count).toBe(1)
    })

    it('週別の統計を取得できる', async () => {
      const mockPageViews = Array(50).fill(null).map((_, i) => ({
        page: i % 2 === 0 ? '/' : '/transit',
        timestamp: subDays(new Date(), i % 7)
      }))
      
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getPageViewStats } = await mockUseAnalytics()
      const stats = await getPageViewStats('week', new Date())

      expect(stats.total).toBe(50)
    })
  })

  describe('getAccessTrends', () => {
    it('アクセストレンドを計算できる', async () => {
      // 現在の期間のデータ
      const currentData = Array(100).fill(null).map(() => ({
        page: '/',
        sessionId: Math.random().toString(),
        userId: Math.random().toString(),
        duration: Math.floor(Math.random() * 300),
        bounced: Math.random() > 0.5
      }))
      
      // 前期間のデータ
      const previousData = Array(80).fill(null).map(() => ({
        page: '/',
        sessionId: Math.random().toString(),
        userId: Math.random().toString(),
        duration: Math.floor(Math.random() * 300),
        bounced: Math.random() > 0.5
      }))
      
      mockGetCollection
        .mockResolvedValueOnce(currentData)
        .mockResolvedValueOnce(previousData)

      const { getAccessTrends } = await mockUseAnalytics()
      const endDate = new Date()
      const startDate = subDays(endDate, 7)
      const trends = await getAccessTrends(startDate, endDate)

      expect(trends.total).toBe(100)
      expect(trends.growth).toBe(25) // (100-80)/80*100
      expect(trends.avgSessionDuration).toBeGreaterThan(0)
      expect(trends.bounceRate).toBeGreaterThanOrEqual(0)
      expect(trends.bounceRate).toBeLessThanOrEqual(100)
    })
  })

  describe('getPopularPages', () => {
    it('人気ページランキングを取得できる', async () => {
      const mockPageViews = [
        { page: '/', title: 'トップページ' },
        { page: '/', title: 'トップページ' },
        { page: '/', title: 'トップページ' },
        { page: '/timetable', title: '時刻表' },
        { page: '/timetable', title: '時刻表' },
        { page: '/transit', title: '乗換案内' }
      ]
      
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getPopularPages } = await mockUseAnalytics()
      const pages = await getPopularPages(
        subDays(new Date(), 7),
        new Date(),
        3
      )

      expect(pages).toHaveLength(3)
      expect(pages[0]).toEqual({
        path: '/',
        title: 'トップページ',
        views: 3
      })
      expect(pages[1].views).toBe(2)
      expect(pages[2].views).toBe(1)
    })
  })

  describe('getReferrerStats', () => {
    it('リファラー統計を取得できる', async () => {
      const mockSessions = [
        { referrer: 'https://google.com' },
        { referrer: 'https://google.com' },
        { referrer: 'https://yahoo.co.jp' },
        { referrer: 'direct' },
        { referrer: 'https://facebook.com' }
      ]
      
      mockGetCollection.mockResolvedValue(mockSessions)

      const { getReferrerStats } = await mockUseAnalytics()
      const stats = await getReferrerStats(
        subDays(new Date(), 7),
        new Date()
      )

      expect(stats).toEqual({
        google: 2,
        yahoo: 1,
        direct: 1,
        facebook: 1
      })
    })
  })

  describe('getRouteSearchStats', () => {
    it('人気の検索経路を取得できる', async () => {
      const mockSearches = [
        { from: '本土七類', to: '西郷' },
        { from: '本土七類', to: '西郷' },
        { from: '本土七類', to: '西郷' },
        { from: '西郷', to: '本土七類' },
        { from: '西郷', to: '本土七類' },
        { from: '西郷', to: '菱浦' }
      ]
      
      mockGetCollection.mockResolvedValue(mockSearches)

      const { getRouteSearchStats } = await mockUseAnalytics()
      const routes = await getRouteSearchStats(5)

      expect(routes).toHaveLength(3)
      expect(routes[0]).toEqual({
        from: '本土七類',
        to: '西郷',
        count: 3
      })
    })
  })

  describe('getErrorStats', () => {
    it('エラー統計を取得できる', async () => {
      const mockErrors = [
        { type: '404', message: 'Not Found' },
        { type: '404', message: 'Not Found' },
        { type: '500', message: 'Server Error' },
        { type: 'network', message: 'Network Error' }
      ]
      
      mockGetCollection.mockResolvedValue(mockErrors)

      const { getErrorStats } = await mockUseAnalytics()
      const stats = await getErrorStats(
        subDays(new Date(), 7),
        new Date()
      )

      expect(stats).toEqual({
        '404': 2,
        '500': 1,
        'network': 1,
        'other': 0
      })
    })
  })
})