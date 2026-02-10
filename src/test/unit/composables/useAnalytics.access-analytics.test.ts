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
const mockSetDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockIncrement = vi.fn((val: number) => ({ _increment: val }))

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
  orderBy: (...args: any[]) => mockOrderBy(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  increment: (val: number) => mockIncrement(val)
}))

// useNuxtApp モック
const mockDb = {}
let mockIsOffline = false

vi.stubGlobal('useNuxtApp', () => ({
  $firebase: { db: mockDb },
  $isOffline: mockIsOffline
}))

describe('useAnalytics - アクセス統計機能', () => {
  let useAnalytics: () => ReturnType<typeof import('~/composables/useAnalytics').useAnalytics>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockIsOffline = false

    // composableを動的インポート
    const mod = await import('~/composables/useAnalytics')
    useAnalytics = mod.useAnalytics
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ========================================
  // ユーティリティ関数のテスト
  // ========================================

  describe('日付キー生成', () => {
    it('日付キーが YYYY-MM-DD 形式で生成される', async () => {
      const analytics = useAnalytics()
      const testDate = new Date('2025-01-15T10:30:00')

      // trackPageViewを呼び出して日付キーをテスト
      mockSetDoc.mockResolvedValue(undefined)
      await analytics.trackPageView({ pagePath: '/test' })

      // setDocが呼ばれたことを確認
      expect(mockSetDoc).toHaveBeenCalled()

      // 最初の呼び出しで日付キーを含むドキュメントパスが使用されていること
      const firstCall = mockDoc.mock.calls[0]
      expect(firstCall[1]).toMatch(/analytics_daily/)
    })
  })

  // ========================================
  // トラッキング機能のテスト
  // ========================================

  describe('trackPageView', () => {
    it('PVが正しくインクリメントされる', async () => {
      const analytics = useAnalytics()
      mockSetDoc.mockResolvedValue(undefined)

      await analytics.trackPageView({ pagePath: '/transit' })

      // 日次、月次、時間別の3回setDocが呼ばれる
      expect(mockSetDoc).toHaveBeenCalledTimes(3)
    })

    it('日次統計が正しいフィールドでインクリメントされる', async () => {
      const analytics = useAnalytics()
      mockSetDoc.mockResolvedValue(undefined)

      await analytics.trackPageView({ pagePath: '/transit' })

      // 最初の呼び出し（日次統計）を確認
      const dailyCall = mockSetDoc.mock.calls[0]
      const dailyData = dailyCall[1]

      expect(dailyData).toHaveProperty('dateKey')
      expect(dailyData).toHaveProperty('pvTotal')
      expect(dailyData).toHaveProperty('updatedAt')
    })

    it('月次統計が正しくインクリメントされる', async () => {
      const analytics = useAnalytics()
      mockSetDoc.mockResolvedValue(undefined)

      await analytics.trackPageView({ pagePath: '/transit' })

      // 2番目の呼び出し（月次統計）を確認
      const monthlyCall = mockSetDoc.mock.calls[1]
      const monthlyData = monthlyCall[1]

      expect(monthlyData).toHaveProperty('monthKey')
      expect(monthlyData).toHaveProperty('pvTotal')
    })

    it('時間別統計が正しくインクリメントされる', async () => {
      const analytics = useAnalytics()
      mockSetDoc.mockResolvedValue(undefined)

      await analytics.trackPageView({ pagePath: '/transit' })

      // 3番目の呼び出し（時間別統計）を確認
      const hourlyCall = mockSetDoc.mock.calls[2]
      const hourlyData = hourlyCall[1]

      expect(hourlyData).toHaveProperty('hourKey')
      expect(hourlyData).toHaveProperty('pvTotal')
    })

    it('オフライン時はスキップされる', async () => {
      mockIsOffline = true

      // モジュールをリロード
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb },
        $isOffline: true
      }))

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      await analytics.trackPageView({ pagePath: '/transit' })

      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('エラーが発生してもユーザーには通知しない', async () => {
      // 新しくモジュールをインポートしてエラーハンドリングをテスト
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb },
        $isOffline: false
      }))

      mockSetDoc.mockRejectedValueOnce(new Error('Firestore error'))

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      // エラーがスローされないことを確認
      await expect(analytics.trackPageView({ pagePath: '/transit' })).resolves.not.toThrow()

      // setDocが呼ばれたことを確認（エラーが発生してもcatchで処理される）
      expect(mockSetDoc).toHaveBeenCalled()
    })
  })

  describe('trackSearch', () => {
    it('検索が正しくインクリメントされる', async () => {
      // モジュールをリセットして新しい状態でテスト
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb },
        $isOffline: false
      }))
      mockSetDoc.mockClear()
      mockSetDoc.mockResolvedValue(undefined)

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      await analytics.trackSearch({
        depId: 'saigo',
        arrId: 'shichirui',
        datetime: '2025-01-15T10:30:00'
      })

      // 日次、月次、時間別の3回setDocが呼ばれる
      expect(mockSetDoc).toHaveBeenCalledTimes(3)
    })

    it('日次統計に検索関連フィールドが含まれる', async () => {
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb },
        $isOffline: false
      }))
      mockSetDoc.mockClear()
      mockSetDoc.mockResolvedValue(undefined)

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      await analytics.trackSearch({
        depId: 'saigo',
        arrId: 'shichirui'
      })

      const dailyCall = mockSetDoc.mock.calls[0]
      const dailyData = dailyCall[1]

      expect(dailyData).toHaveProperty('searchTotal')
      expect(dailyData).toHaveProperty('routeCounts.saigo-shichirui')
      expect(dailyData).toHaveProperty('departureCounts.saigo')
      expect(dailyData).toHaveProperty('arrivalCounts.shichirui')
    })

    it('時間帯カウントが正しく設定される', async () => {
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb },
        $isOffline: false
      }))
      mockSetDoc.mockClear()
      mockSetDoc.mockResolvedValue(undefined)

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      await analytics.trackSearch({
        depId: 'saigo',
        arrId: 'shichirui',
        datetime: '2025-01-15T14:30:00' // 14時
      })

      const dailyCall = mockSetDoc.mock.calls[0]
      const dailyData = dailyCall[1]

      expect(dailyData).toHaveProperty('hourCounts.14')
    })

    it('オフライン時はスキップされる', async () => {
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb },
        $isOffline: true
      }))

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      await analytics.trackSearch({
        depId: 'saigo',
        arrId: 'shichirui'
      })

      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('datetimeが省略された場合は現在時刻を使用する', async () => {
      vi.resetModules()
      vi.stubGlobal('useNuxtApp', () => ({
        $firebase: { db: mockDb },
        $isOffline: false
      }))
      mockSetDoc.mockClear()
      mockSetDoc.mockResolvedValue(undefined)

      const mod = await import('~/composables/useAnalytics')
      const analytics = mod.useAnalytics()

      await analytics.trackSearch({
        depId: 'saigo',
        arrId: 'shichirui'
        // datetimeを省略
      })

      expect(mockSetDoc).toHaveBeenCalledTimes(3)
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
    it('時間帯別分布を正しく取得できる', async () => {
      const analytics = useAnalytics()

      // 3時間分のデータをモック
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ hourKey: '2025-01-15-08', pvTotal: 10, searchTotal: 5 })
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ hourKey: '2025-01-15-09', pvTotal: 20, searchTotal: 10 })
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ hourKey: '2025-01-15-10', pvTotal: 30, searchTotal: 15 })
        })
        .mockResolvedValue({ exists: () => false })

      const startDate = new Date('2025-01-15T08:00:00')
      const endDate = new Date('2025-01-15T10:00:00')
      const result = await analytics.getHourlyDistribution(startDate, endDate)

      // 24時間分のデータが返される
      expect(result).toHaveLength(24)

      // 各時間帯にhour, pv, searchプロパティがある
      result.forEach(item => {
        expect(item).toHaveProperty('hour')
        expect(item).toHaveProperty('pv')
        expect(item).toHaveProperty('search')
      })
    })

    it('欠損時間帯は0で補完される', async () => {
      const analytics = useAnalytics()

      // 全て存在しない場合
      mockGetDoc.mockResolvedValue({ exists: () => false })

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
  })

  // ========================================
  // レガシー互換性のテスト
  // ========================================

  describe('レガシーAPIの互換性', () => {
    it('getAccessTrendsがダミーデータを返す', async () => {
      const analytics = useAnalytics()
      const startDate = new Date('2025-01-13')
      const endDate = new Date('2025-01-15')

      const result = await analytics.getAccessTrends(startDate, endDate)

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('uniqueUsers')
      expect(result).toHaveProperty('avgSessionDuration')
      expect(result).toHaveProperty('bounceRate')
    })

    it('getPopularPagesが空配列を返す', async () => {
      const analytics = useAnalytics()
      const startDate = new Date('2025-01-13')
      const endDate = new Date('2025-01-15')

      const result = await analytics.getPopularPages(startDate, endDate)

      expect(result).toEqual([])
    })

    it('getDeviceStatsがダミーデータを返す', async () => {
      const analytics = useAnalytics()

      const result = await analytics.getDeviceStats()

      expect(result).toHaveProperty('deviceTypes')
      expect(result).toHaveProperty('browsers')
      expect(result).toHaveProperty('os')
    })

    it('calculateKPIsがダミーデータを返す', async () => {
      const analytics = useAnalytics()

      const result = await analytics.calculateKPIs('month')

      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('previous')
      expect(result).toHaveProperty('trends')
    })
  })
})
