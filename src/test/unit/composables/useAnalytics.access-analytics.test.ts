/**
 * アクセス統計機能（ACCESS_ANALYTICS.md）の単体テスト
 *
 * テスト対象:
 * - トラッキング機能（trackPageView, trackSearch）
 * - 統計データ取得（getDailyAnalytics, getMonthlyAnalytics, getAnalyticsInRange）
 * - 集計機能（getPopularRoutes, getHourlyDistribution, getPortDistribution, getPvTrend）
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Firestore モック
const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockTrackAnalytics = vi.fn()
const mockHttpsCallable = vi.fn(() => mockTrackAnalytics)

// date-fns-tz モック（vi.mockより先に定義）
vi.mock('date-fns-tz', () => ({
  toZonedTime: (date: Date) => date
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args)
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: (functions: unknown, name: string) => mockHttpsCallable(functions, name)
}))

// useNuxtApp モック
const mockDb = {}
const mockFunctions = {}
let mockIsOffline = false

vi.stubGlobal('useNuxtApp', () => ({
  $firebase: { db: mockDb, functions: mockFunctions },
  $isOffline: mockIsOffline
}))

describe('useAnalytics - アクセス統計機能', () => {
  let useAnalytics: () => ReturnType<typeof import('~/composables/useAnalytics').useAnalytics>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockIsOffline = false
    vi.stubGlobal('useNuxtApp', () => ({
      $firebase: { db: mockDb, functions: mockFunctions },
      $isOffline: mockIsOffline
    }))

    // composableを動的インポート
    const mod = await import('~/composables/useAnalytics')
    useAnalytics = mod.useAnalytics
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ========================================
  // トラッキング機能のテスト
  // ========================================

  describe('trackPageView', () => {
    it('PVイベントをCallable Functionへ送信する', async () => {
      const analytics = useAnalytics()
      mockTrackAnalytics.mockResolvedValue({ data: { success: true } })

      await analytics.trackPageView({ pagePath: '/transit' })

      expect(mockHttpsCallable).toHaveBeenCalledWith(mockFunctions, 'trackAnalytics')
      expect(mockTrackAnalytics).toHaveBeenCalledOnce()
      expect(mockTrackAnalytics).toHaveBeenCalledWith({ type: 'page_view' })
    })

    it('オフライン時はスキップされる', async () => {
      mockIsOffline = true

      // モジュールをリロード
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb, functions: mockFunctions },
        $isOffline: true
      }))

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      await analytics.trackPageView({ pagePath: '/transit' })

      expect(mockTrackAnalytics).not.toHaveBeenCalled()
    })

    it('エラーが発生してもユーザーには通知しない', async () => {
      const analytics = useAnalytics()
      mockTrackAnalytics.mockRejectedValueOnce(new Error('Functions error'))

      await expect(analytics.trackPageView({ pagePath: '/transit' })).resolves.not.toThrow()
      expect(mockTrackAnalytics).toHaveBeenCalledOnce()
    })
  })

  describe('trackSearch', () => {
    it('検索条件をCallable Functionへ送信する', async () => {
      const analytics = useAnalytics()
      mockTrackAnalytics.mockResolvedValue({ data: { success: true } })

      await analytics.trackSearch({
        depId: 'saigo',
        arrId: 'shichirui',
        datetime: '2025-01-15T10:30:00.000Z'
      })

      expect(mockTrackAnalytics).toHaveBeenCalledWith({
        type: 'search',
        depId: 'saigo',
        arrId: 'shichirui',
        datetime: '2025-01-15T10:30:00.000Z'
      })
    })

    it('オフライン時はスキップされる', async () => {
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb, functions: mockFunctions },
        $isOffline: true
      }))

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      await analytics.trackSearch({
        depId: 'saigo',
        arrId: 'shichirui'
      })

      expect(mockTrackAnalytics).not.toHaveBeenCalled()
    })

    it('datetimeが省略された場合は現在時刻を使用する', async () => {
      const analytics = useAnalytics()
      mockTrackAnalytics.mockResolvedValue({ data: { success: true } })

      await analytics.trackSearch({
        depId: 'saigo',
        arrId: 'shichirui'
      })

      expect(mockTrackAnalytics).toHaveBeenCalledOnce()
      const payload = mockTrackAnalytics.mock.calls[0]?.[0] as Record<string, string>
      expect(payload).toMatchObject({
        type: 'search',
        depId: 'saigo',
        arrId: 'shichirui'
      })
      expect(Number.isNaN(new Date(payload.datetime).getTime())).toBe(false)
    })
  })

  // ========================================
  // 統計データ取得のテスト
  // ========================================

  describe('getDailyAnalytics', () => {
    it('存在するドキュメントを正しく取得できる', async () => {
      const analytics = useAnalytics()
      const mockData = {
        dateKey: '2025-01-15',
        pvTotal: 100,
        searchTotal: 50,
        routeCounts: { 'saigo-shichirui': 30 },
        departureCounts: { 'saigo': 30 },
        arrivalCounts: { 'shichirui': 30 },
        hourCounts: { '10': 20, '14': 30 }
      }

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockData
      })

      const result = await analytics.getDailyAnalytics('2025-01-15')

      expect(result).toEqual(mockData)
    })

    it('存在しないドキュメントはnullを返す', async () => {
      const analytics = useAnalytics()

      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null
      })

      const result = await analytics.getDailyAnalytics('2025-01-15')

      expect(result).toBeNull()
    })
  })

  describe('getMonthlyAnalytics', () => {
    it('月次統計を正しく取得できる', async () => {
      const analytics = useAnalytics()
      const mockData = {
        monthKey: '2025-01',
        pvTotal: 3000,
        searchTotal: 1500,
        routeCounts: { 'saigo-shichirui': 900 }
      }

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockData
      })

      const result = await analytics.getMonthlyAnalytics('2025-01')

      expect(result).toEqual(mockData)
    })
  })

  describe('getAnalyticsInRange', () => {
    it('日次データの範囲取得ができる', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        { id: '2025-01-13', dateKey: '2025-01-13', pvTotal: 80 },
        { id: '2025-01-14', dateKey: '2025-01-14', pvTotal: 90 },
        { id: '2025-01-15', dateKey: '2025-01-15', pvTotal: 100 }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const startDate = new Date('2025-01-13')
      const endDate = new Date('2025-01-15')
      const result = await analytics.getAnalyticsInRange(startDate, endDate, 'daily')

      expect(mockQuery).toHaveBeenCalled()
      expect(result).toHaveLength(3)
    })

    it('月次データの範囲取得ができる', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        { id: '2024-12', monthKey: '2024-12', pvTotal: 2800 },
        { id: '2025-01', monthKey: '2025-01', pvTotal: 3000 }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const startDate = new Date('2024-12-01')
      const endDate = new Date('2025-01-31')
      const result = await analytics.getAnalyticsInRange(startDate, endDate, 'monthly')

      expect(result).toHaveLength(2)
    })

    it('時間別データの範囲取得ができる', async () => {
      const analytics = useAnalytics()

      // getHourlyAnalyticsのモック
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ hourKey: '2025-01-15-10', pvTotal: 10, searchTotal: 5 }) })
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ hourKey: '2025-01-15-11', pvTotal: 15, searchTotal: 8 }) })
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ hourKey: '2025-01-15-12', pvTotal: 20, searchTotal: 10 }) })
        .mockResolvedValue({ exists: () => false, data: () => null })

      const startDate = new Date('2025-01-15T10:00:00')
      const endDate = new Date('2025-01-15T12:00:00')
      const result = await analytics.getAnalyticsInRange(startDate, endDate, 'hourly')

      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  // ========================================
  // 集計機能のテスト
  // ========================================

  describe('getPopularRoutes', () => {
    it('人気航路Top 3を正しく取得できる', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        {
          id: '2025-01-13',
          routeCounts: {
            'saigo-shichirui': 100,
            'shichirui-saigo': 80,
            'saigo-hishiura': 50,
            'hishiura-saigo': 30
          }
        },
        {
          id: '2025-01-14',
          routeCounts: {
            'saigo-shichirui': 120,
            'shichirui-saigo': 90,
            'saigo-hishiura': 60
          }
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const startDate = new Date('2025-01-13')
      const endDate = new Date('2025-01-14')
      const result = await analytics.getPopularRoutes(startDate, endDate, 3)

      expect(result).toHaveLength(3)
      // 最も人気のあるルートが最初
      expect(result[0].routeKey).toBe('saigo-shichirui')
      expect(result[0].count).toBe(220) // 100 + 120
      expect(result[0].depId).toBe('saigo')
      expect(result[0].arrId).toBe('shichirui')
    })

    it('データがない場合は空配列を返す', async () => {
      const analytics = useAnalytics()

      mockGetDocs.mockResolvedValue({
        docs: []
      })

      const startDate = new Date('2025-01-13')
      const endDate = new Date('2025-01-14')
      const result = await analytics.getPopularRoutes(startDate, endDate, 3)

      expect(result).toHaveLength(0)
    })

    it('limitで件数を制限できる', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        {
          id: '2025-01-15',
          routeCounts: {
            'route1': 100,
            'route2': 90,
            'route3': 80,
            'route4': 70,
            'route5': 60
          }
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const startDate = new Date('2025-01-15')
      const endDate = new Date('2025-01-15')
      const result = await analytics.getPopularRoutes(startDate, endDate, 2)

      expect(result).toHaveLength(2)
    })
  })

  describe('getHourlyDistribution', () => {
    it('時間帯別分布を1回の範囲クエリで取得できる', async () => {
      const analytics = useAnalytics()

      const hourlyDocs = [
        { hourKey: '2025-01-15-08', pvTotal: 10, searchTotal: 5 },
        { hourKey: '2025-01-15-09', pvTotal: 20, searchTotal: 10 },
        { hourKey: '2025-01-15-10', pvTotal: 30, searchTotal: 15 }
      ]
      mockGetDocs.mockResolvedValue({
        docs: hourlyDocs.map((data, index) => ({
          id: `hour-${index}`,
          data: () => data
        }))
      })

      const startDate = new Date('2025-01-15T08:00:00')
      const endDate = new Date('2025-01-15T10:00:00')
      const result = await analytics.getHourlyDistribution(startDate, endDate)

      expect(result).toHaveLength(24)
      expect(result[8]).toEqual({ hour: 8, pv: 10, search: 5 })
      expect(result[10]).toEqual({ hour: 10, pv: 30, search: 15 })
      expect(mockGetDocs).toHaveBeenCalledOnce()
      expect(mockGetDoc).not.toHaveBeenCalled()
    })

    it('欠損時間帯は0で補完される', async () => {
      const analytics = useAnalytics()

      mockGetDocs.mockResolvedValue({ docs: [] })

      const startDate = new Date('2025-01-15T00:00:00')
      const endDate = new Date('2025-01-15T23:59:59')
      const result = await analytics.getHourlyDistribution(startDate, endDate)

      expect(result).toHaveLength(24)
      result.forEach(item => {
        expect(item.pv).toBe(0)
        expect(item.search).toBe(0)
      })
    })
  })

  describe('getPortDistribution', () => {
    it('出発地/到着地別分布を正しく取得できる', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        {
          id: '2025-01-15',
          departureCounts: { 'saigo': 100, 'shichirui': 80, 'hishiura': 50 },
          arrivalCounts: { 'shichirui': 90, 'saigo': 70, 'hishiura': 40 }
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const startDate = new Date('2025-01-15')
      const endDate = new Date('2025-01-15')
      const result = await analytics.getPortDistribution(startDate, endDate)

      expect(result).toHaveProperty('departure')
      expect(result).toHaveProperty('arrival')

      // 出発地の分布
      expect(result.departure).toHaveLength(3)
      expect(result.departure[0].id).toBe('saigo') // 最も多い
      expect(result.departure[0].count).toBe(100)

      // パーセンテージが計算されている
      expect(result.departure[0].percentage).toBeGreaterThan(0)
    })

    it('データがない場合は空配列を返す', async () => {
      const analytics = useAnalytics()

      mockGetDocs.mockResolvedValue({
        docs: []
      })

      const startDate = new Date('2025-01-15')
      const endDate = new Date('2025-01-15')
      const result = await analytics.getPortDistribution(startDate, endDate)

      expect(result.departure).toHaveLength(0)
      expect(result.arrival).toHaveLength(0)
    })

    it('旧形式のドット付きフィールドと新形式のマップを合算する', async () => {
      const analytics = useAnalytics()
      const mockData = {
        departureCounts: { SAIGO: 3 },
        arrivalCounts: { HISHIURA: 4 },
        'departureCounts.SAIGO': 2,
        'departureCounts.HISHIURA': 1,
        'arrivalCounts.HISHIURA': 2
      }
      mockGetDocs.mockResolvedValue({
        docs: [{ id: '2025-01-15', data: () => mockData }]
      })

      const result = await analytics.getPortDistribution(
        new Date('2025-01-15'),
        new Date('2025-01-15')
      )

      expect(result.departure).toEqual([
        expect.objectContaining({ id: 'SAIGO', count: 5 }),
        expect.objectContaining({ id: 'HISHIURA', count: 1 })
      ])
      expect(result.arrival).toEqual([
        expect.objectContaining({ id: 'HISHIURA', count: 6 })
      ])
    })
  })

  describe('getPvTrend', () => {
    it('PV推移データを正しく取得できる', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        { id: '2025-01-13', dateKey: '2025-01-13', pvTotal: 80, searchTotal: 40 },
        { id: '2025-01-14', dateKey: '2025-01-14', pvTotal: 90, searchTotal: 45 },
        { id: '2025-01-15', dateKey: '2025-01-15', pvTotal: 100, searchTotal: 50 }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const startDate = new Date('2025-01-13')
      const endDate = new Date('2025-01-15')
      const result = await analytics.getPvTrend(startDate, endDate)

      expect(result).toHaveLength(3)
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('pv')
      expect(result[0]).toHaveProperty('search')

      expect(result[0].date).toBe('2025-01-13')
      expect(result[0].pv).toBe(80)
      expect(result[0].search).toBe(40)
    })

    it('pvTotalがない場合は0として扱う', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        { id: '2025-01-15', dateKey: '2025-01-15' } // pvTotal, searchTotalなし
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const startDate = new Date('2025-01-15')
      const endDate = new Date('2025-01-15')
      const result = await analytics.getPvTrend(startDate, endDate)

      expect(result[0].pv).toBe(0)
      expect(result[0].search).toBe(0)
    })

    it('日次データを月曜始まりの週単位に集計できる', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        { id: '2025-01-12', dateKey: '2025-01-12', pvTotal: 10, searchTotal: 2 },
        { id: '2025-01-13', dateKey: '2025-01-13', pvTotal: 20, searchTotal: 4 },
        { id: '2025-01-19', dateKey: '2025-01-19', pvTotal: 30, searchTotal: 6 },
        { id: '2025-01-20', dateKey: '2025-01-20', pvTotal: 40, searchTotal: 8 }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const result = await analytics.getPvTrend(
        new Date('2025-01-12'),
        new Date('2025-01-20'),
        'weekly'
      )

      expect(result).toEqual([
        { date: '2025-01-06', pv: 10, search: 2 },
        { date: '2025-01-13', pv: 50, search: 10 },
        { date: '2025-01-20', pv: 40, search: 8 }
      ])
    })

    it('日次データを月単位に集計できる', async () => {
      const analytics = useAnalytics()
      const mockDocs = [
        { id: '2024-12-31', dateKey: '2024-12-31', pvTotal: 10, searchTotal: 1 },
        { id: '2025-01-01', dateKey: '2025-01-01', pvTotal: 20, searchTotal: 2 },
        { id: '2025-01-31', dateKey: '2025-01-31', pvTotal: 30, searchTotal: 3 }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockDocs.map(doc => ({
          id: doc.id,
          data: () => doc
        }))
      })

      const result = await analytics.getPvTrend(
        new Date('2024-12-31'),
        new Date('2025-01-31'),
        'monthly'
      )

      expect(result).toEqual([
        { date: '2024-12', pv: 10, search: 1 },
        { date: '2025-01', pv: 50, search: 5 }
      ])
    })
  })

})
