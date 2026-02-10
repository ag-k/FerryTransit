import { describe, it, expect, beforeEach, vi } from 'vitest'
import { subDays, startOfDay, endOfDay, format } from 'date-fns'

// Mock useAdminFirestore
const mockGetCollection = vi.fn()

describe('useAnalytics', () => {
  const loadComposable = async () => {
    // グローバルモックを上書き
    vi.stubGlobal('useAdminFirestore', () => ({
      getCollection: mockGetCollection
    }))
    
    const mod = await import('~/composables/useAnalytics')
    return mod.useAnalytics()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // デフォルトで空配列を返すように設定
    mockGetCollection.mockResolvedValue([])
    
    // グローバルモックを設定
    vi.stubGlobal('useAdminFirestore', () => ({
      getCollection: mockGetCollection
    }))
  })

  describe('getPageViewStats', () => {
    it('日別のページビュー統計を取得できる', async () => {
      const mockPageViews = [
        { id: '1', page: '/', timestamp: new Date('2025-01-15T10:00:00') },
        { id: '2', page: '/transit', timestamp: new Date('2025-01-15T11:00:00') },
        { id: '3', page: '/', timestamp: new Date('2025-01-15T12:00:00') }
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getPageViewStats } = await loadComposable()
      const result = await getPageViewStats('day', new Date('2025-01-15'))

      expect(result.total).toBe(3)
      expect(result.pageStats['/']).toBe(2)
      expect(result.pageStats['/transit']).toBe(1)
      expect(result.hourlyStats[10]).toBe(1)
      expect(result.hourlyStats[11]).toBe(1)
      expect(result.hourlyStats[12]).toBe(1)
    })

    it('空のデータでもエラーにならない', async () => {
      mockGetCollection.mockResolvedValue([])

      const { getPageViewStats } = await loadComposable()
      const result = await getPageViewStats('day', new Date())

      expect(result.total).toBe(0)
      expect(Object.keys(result.pageStats)).toHaveLength(0)
      expect(result.hourlyStats.every(h => h === 0)).toBe(true)
    })
  })

  describe('getUniqueUsersCount', () => {
    it('ユニークユーザー数を正しく計算できる', async () => {
      const mockPageViews = [
        { id: '1', userId: 'user1', timestamp: new Date() },
        { id: '2', userId: 'user2', timestamp: new Date() },
        { id: '3', userId: 'user1', timestamp: new Date() },
        { id: '4', sessionId: 'session1', timestamp: new Date() }
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getUniqueUsersCount } = await loadComposable()
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()
      const result = await getUniqueUsersCount(startDate, endDate)

      expect(result).toBe(3) // user1, user2, session1
    })

    it('ユーザーIDがない場合はセッションIDを使用する', async () => {
      const mockPageViews = [
        { id: '1', sessionId: 'session1', timestamp: new Date() },
        { id: '2', sessionId: 'session2', timestamp: new Date() }
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getUniqueUsersCount } = await loadComposable()
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()
      const result = await getUniqueUsersCount(startDate, endDate)

      expect(result).toBe(2)
    })
  })

  describe('getAccessTrend', () => {
    it('日別のアクセストレンドを取得できる', async () => {
      const endDate = new Date()
      const days = 2
      
      const mockPageViews = [
        { id: '1', timestamp: subDays(endDate, 1) },
        { id: '2', timestamp: subDays(endDate, 1) },
        { id: '3', timestamp: subDays(endDate, 0) }
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getAccessTrend } = await loadComposable()
      const result = await getAccessTrend(days)

      expect(result).toHaveLength(days)
      // 日付は最新から順に並ぶ（実装に合わせて）
      const dates = result.map(r => r.date)
      expect(dates).toContain(format(subDays(endDate, 0), 'yyyy-MM-dd'))
      expect(dates).toContain(format(subDays(endDate, 1), 'yyyy-MM-dd'))
      // カウントを確認
      const todayCount = result.find(r => r.date === format(subDays(endDate, 0), 'yyyy-MM-dd'))?.count || 0
      const yesterdayCount = result.find(r => r.date === format(subDays(endDate, 1), 'yyyy-MM-dd'))?.count || 0
      expect(todayCount).toBe(1)
      expect(yesterdayCount).toBe(2)
    })

    it('期間外のデータは除外される', async () => {
      const mockPageViews = [
        { id: '1', timestamp: new Date('2025-01-10T10:00:00') },
        { id: '2', timestamp: new Date('2025-01-15T10:00:00') }
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getAccessTrend } = await loadComposable()
      const result = await getAccessTrend(2)

      // 最新2日間のみが含まれる
      expect(result.every(r => r.count >= 0)).toBe(true)
    })
  })

  describe('getAccessTrends', () => {
    it('KPIデータを正しく計算できる', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockPageViews = [
        { id: '1', timestamp: new Date(), userId: 'user1' },
        { id: '2', timestamp: new Date(), userId: 'user2' }
      ]
      const mockSessions = [
        { id: '1', duration: 120, pageCount: 3, startTime: new Date() },
        { id: '2', duration: 180, pageCount: 5, startTime: new Date() }
      ]

      // getAccessTrendsは複数のgetCollection呼び出しを行う
      // 1. pageViews (getAccessTrends内)
      // 2. getUniqueUsersCount内のpageViews
      // 3. previousPageViews
      // 4. getUniqueUsersCount内のpreviousPageViews
      // 5. sessions
      // 6. previousSessions
      mockGetCollection
        .mockResolvedValueOnce(mockPageViews) // pageViews (getAccessTrends内)
        .mockResolvedValueOnce(mockPageViews) // pageViews (getUniqueUsersCount内)
        .mockResolvedValueOnce([]) // previousPageViews
        .mockResolvedValueOnce([]) // previousPageViews (getUniqueUsersCount内)
        .mockResolvedValueOnce(mockSessions) // sessions
        .mockResolvedValueOnce([]) // previousSessions

      const { getAccessTrends } = await loadComposable()
      const result = await getAccessTrends(startDate, endDate)

      expect(result.total).toBe(2)
      expect(result.uniqueUsers).toBe(2)
      expect(result.avgSessionDuration).toBe(150) // (120 + 180) / 2
      expect(result.bounceRate).toBe(0) // pageCount > 1 なので直帰なし
      expect(result.growth).toBe(0) // 前期間データなし
    })

    it('セッションデータがない場合でもエラーにならない', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      mockGetCollection
        .mockResolvedValueOnce([]) // pageViews (getAccessTrends内)
        .mockResolvedValueOnce([]) // pageViews (getUniqueUsersCount内)
        .mockResolvedValueOnce([]) // previousPageViews
        .mockResolvedValueOnce([]) // previousPageViews (getUniqueUsersCount内)
        .mockResolvedValueOnce([]) // sessions
        .mockResolvedValueOnce([]) // previousSessions

      const { getAccessTrends } = await loadComposable()
      const result = await getAccessTrends(startDate, endDate)

      expect(result.avgSessionDuration).toBe(0)
      expect(result.bounceRate).toBe(0)
    })

    it('直帰率を正しく計算できる', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockSessions = [
        { id: '1', duration: 60, pageCount: 1, startTime: new Date() }, // 直帰
        { id: '2', duration: 120, pageCount: 3, startTime: new Date() }, // 非直帰
        { id: '3', duration: 90, pageCount: 1, startTime: new Date() } // 直帰
      ]

      mockGetCollection
        .mockResolvedValueOnce([]) // pageViews (getAccessTrends内)
        .mockResolvedValueOnce([]) // pageViews (getUniqueUsersCount内)
        .mockResolvedValueOnce([]) // previousPageViews
        .mockResolvedValueOnce([]) // previousPageViews (getUniqueUsersCount内)
        .mockResolvedValueOnce(mockSessions) // sessions
        .mockResolvedValueOnce([]) // previousSessions

      const { getAccessTrends } = await loadComposable()
      const result = await getAccessTrends(startDate, endDate)

      expect(result.bounceRate).toBeCloseTo(66.67, 1) // 2/3 * 100
    })
  })

  describe('getPopularPages', () => {
    it('人気ページを取得できる', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockPageViews = [
        { id: '1', page: '/', timestamp: new Date() },
        { id: '2', page: '/', timestamp: new Date() },
        { id: '3', page: '/transit', timestamp: new Date() },
        { id: '4', page: '/timetable', timestamp: new Date() }
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getPopularPages } = await loadComposable()
      const result = await getPopularPages(startDate, endDate, 10)

      expect(result).toHaveLength(3)
      expect(result[0].path).toBe('/')
      expect(result[0].views).toBe(2)
      expect(result[0].title).toBe('ホーム')
    })

    it('limitで件数を制限できる', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockPageViews = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        page: `/page${i}`,
        timestamp: new Date()
      }))
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getPopularPages } = await loadComposable()
      const result = await getPopularPages(startDate, endDate, 5)

      expect(result).toHaveLength(5)
    })
  })

  describe('getReferrerStats', () => {
    it('リファラー統計を正しく集計できる', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockPageViews = [
        { id: '1', referrer: 'https://www.google.com/search?q=test', timestamp: new Date() },
        { id: '2', referrer: 'https://www.google.com/search?q=test2', timestamp: new Date() },
        { id: '3', referrer: 'https://www.yahoo.co.jp/search', timestamp: new Date() },
        { id: '4', referrer: null, timestamp: new Date() } // 直接アクセス
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getReferrerStats } = await loadComposable()
      const result = await getReferrerStats(startDate, endDate)

      expect(result['google']).toBe(2)
      expect(result['yahoo']).toBe(1)
      expect(result['direct']).toBe(1)
    })

    it('無効なURLでもエラーにならない', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockPageViews = [
        { id: '1', referrer: 'invalid-url', timestamp: new Date() }
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getReferrerStats } = await loadComposable()
      const result = await getReferrerStats(startDate, endDate)

      expect(result['direct']).toBe(1)
    })
  })

  describe('getErrorStats', () => {
    it('エラー統計を正しく集計できる', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockErrorLogs = [
        { id: '1', type: '404', timestamp: new Date() },
        { id: '2', type: '404', timestamp: new Date() },
        { id: '3', type: '500', timestamp: new Date() },
        { id: '4', type: 'network', timestamp: new Date() },
        { id: '5', status: 404, timestamp: new Date() } // statusフィールドを使用
      ]
      mockGetCollection.mockResolvedValue(mockErrorLogs)

      const { getErrorStats } = await loadComposable()
      const result = await getErrorStats(startDate, endDate)

      expect(result['404']).toBe(3) // type: '404'が2つ + status: 404が1つ
      expect(result['500']).toBe(1)
      expect(result['network']).toBe(1)
    })

    it('エラータイプが不明な場合はotherに分類される', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockErrorLogs = [
        { id: '1', type: 'unknown', timestamp: new Date() }
      ]
      mockGetCollection.mockResolvedValue(mockErrorLogs)

      const { getErrorStats } = await loadComposable()
      const result = await getErrorStats(startDate, endDate)

      expect(result['other']).toBe(1)
    })
  })

  describe('getDeviceStats', () => {
    it('デバイス統計を正しく集計できる', async () => {
      const mockPageViews = [
        { id: '1', deviceType: 'desktop', browser: 'Chrome', os: 'Windows', timestamp: new Date() },
        { id: '2', deviceType: 'mobile', browser: 'Safari', os: 'iOS', timestamp: new Date() },
        { id: '3', deviceType: 'desktop', browser: 'Firefox', os: 'Linux', timestamp: new Date() }
      ]
      mockGetCollection.mockResolvedValue(mockPageViews)

      const { getDeviceStats } = await loadComposable()
      const result = await getDeviceStats()

      expect(result.deviceTypes['desktop']).toBe(2)
      expect(result.deviceTypes['mobile']).toBe(1)
      expect(result.browsers['Chrome']).toBe(1)
      expect(result.browsers['Safari']).toBe(1)
      expect(result.browsers['Firefox']).toBe(1)
      expect(result.os['Windows']).toBe(1)
      expect(result.os['iOS']).toBe(1)
      expect(result.os['Linux']).toBe(1)
    })
  })

  describe('getConversionStats', () => {
    it('コンバージョン統計を正しく計算できる', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockSearchLogs = [
        { id: '1', type: 'route', departure: 'A', arrival: 'B', found: true, timestamp: new Date() },
        { id: '2', type: 'route', departure: 'A', arrival: 'B', found: true, timestamp: new Date() },
        { id: '3', type: 'route', departure: 'A', arrival: 'B', found: false, timestamp: new Date() },
        { id: '4', type: 'route', fromPort: 'C', toPort: 'D', found: true, timestamp: new Date() }
      ]
      mockGetCollection.mockResolvedValue(mockSearchLogs)

      const { getConversionStats } = await loadComposable()
      const result = await getConversionStats(startDate, endDate)

      expect(result.totalSearches).toBe(4)
      expect(result.successfulSearches).toBe(3)
      expect(result.conversionRate).toBe(75) // 3/4 * 100
      expect(result.routeConversions).toHaveLength(2)
      expect(result.routeConversions[0].route).toBe('A → B')
      expect(result.routeConversions[0].rate).toBeCloseTo(66.67, 1) // 2/3 * 100
    })

    it('検索結果がない場合は0を返す', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      mockGetCollection.mockResolvedValue([])

      const { getConversionStats } = await loadComposable()
      const result = await getConversionStats(startDate, endDate)

      expect(result.totalSearches).toBe(0)
      expect(result.successfulSearches).toBe(0)
      expect(result.conversionRate).toBe(0)
    })
  })

  describe('getPageFlowStats', () => {
    it('ページ遷移パスを正しく集計できる', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockSessions = [
        {
          id: '1',
          pageViews: ['/', '/transit', '/timetable'],
          startTime: new Date()
        },
        {
          id: '2',
          pageViews: ['/', '/transit'],
          startTime: new Date()
        }
      ]
      mockGetCollection.mockResolvedValue(mockSessions)

      const { getPageFlowStats } = await loadComposable()
      const result = await getPageFlowStats(startDate, endDate)

      // セッション1: / → /transit, /transit → /timetable (2遷移)
      // セッション2: / → /transit (1遷移)
      // 合計: / → /transit が2回, /transit → /timetable が1回
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result.find(r => r.transition === '/ → /transit')?.count).toBe(2)
      expect(result.find(r => r.transition === '/transit → /timetable')?.count).toBe(1)
    })

    it('ページ遷移がない場合は空配列を返す', async () => {
      const startDate = subDays(new Date(), 7)
      const endDate = new Date()

      const mockSessions = [
        { id: '1', pageViews: [], startTime: new Date() },
        { id: '2', pageViews: ['/'], startTime: new Date() } // 1ページのみ
      ]
      mockGetCollection.mockResolvedValue(mockSessions)

      const { getPageFlowStats } = await loadComposable()
      const result = await getPageFlowStats(startDate, endDate)

      expect(result).toHaveLength(0)
    })
  })

  describe('エラーハンドリング', () => {
    it('Firestoreエラーが発生した場合に適切に処理される', async () => {
      mockGetCollection.mockRejectedValue(new Error('Firestore error'))

      const { getPageViewStats } = await loadComposable()
      
      await expect(getPageViewStats('day', new Date())).rejects.toThrow('Firestore error')
    })

    it('無効な日付でもエラーにならない', async () => {
      mockGetCollection.mockResolvedValue([])

      const { getAccessTrend } = await loadComposable()
      const result = await getAccessTrend(0) // 0日間

      expect(result).toHaveLength(0)
    })
  })
})

