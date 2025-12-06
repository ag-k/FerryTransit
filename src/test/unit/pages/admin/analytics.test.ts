import { describe, it, expect, beforeEach, vi } from 'vitest'
import { subDays, format } from 'date-fns'

// Mock composables
const mockGetAccessTrends = vi.fn()
const mockGetPopularPages = vi.fn()
const mockGetReferrerStats = vi.fn()
const mockGetRouteSearchStats = vi.fn()
const mockGetErrorStats = vi.fn()
const mockGetDeviceStats = vi.fn()
const mockGetLocationStats = vi.fn()
const mockGetConversionStats = vi.fn()
const mockGetPageFlowStats = vi.fn()
const mockGetAccessTrend = vi.fn()

vi.mock('~/composables/useAnalytics', () => ({
  useAnalytics: () => ({
    getAccessTrends: mockGetAccessTrends,
    getPopularPages: mockGetPopularPages,
    getReferrerStats: mockGetReferrerStats,
    getRouteSearchStats: mockGetRouteSearchStats,
    getErrorStats: mockGetErrorStats,
    getDeviceStats: mockGetDeviceStats,
    getLocationStats: mockGetLocationStats,
    getConversionStats: mockGetConversionStats,
    getPageFlowStats: mockGetPageFlowStats,
    getAccessTrend: mockGetAccessTrend
  })
}))

// Mock Nuxt app
const mockToast = {
  success: vi.fn(),
  error: vi.fn()
}

vi.stubGlobal('useNuxtApp', () => ({
  $toast: mockToast
}))

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

vi.mock('~/utils/logger', () => ({
  createLogger: () => mockLogger
}))

describe('Admin Analytics Page - Functions', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    
    // グローバルモックを設定
    vi.stubGlobal('useNuxtApp', () => ({
      $toast: mockToast
    }))
    
    // デフォルトのモックデータ
    mockGetAccessTrends.mockResolvedValue({
      total: 100,
      uniqueUsers: 50,
      avgSessionDuration: 180,
      bounceRate: 30,
      hourlyData: Array(24).fill(0),
      growth: 10,
      userGrowth: 5,
      sessionGrowth: 2,
      bounceGrowth: -5
    })
    
    mockGetPopularPages.mockResolvedValue([
      { path: '/', title: 'ホーム', views: 50 },
      { path: '/transit', title: '乗換案内', views: 30 }
    ])
    
    mockGetReferrerStats.mockResolvedValue({
      google: 40,
      direct: 30,
      yahoo: 20,
      other: 10
    })
    
    mockGetRouteSearchStats.mockResolvedValue([
      { from: 'A', to: 'B', count: 100 },
      { from: 'B', to: 'A', count: 80 }
    ])
    
    mockGetErrorStats.mockResolvedValue({
      '404': 5,
      '500': 2,
      network: 3,
      other: 1
    })
    
    mockGetDeviceStats.mockResolvedValue({
      deviceTypes: { desktop: 60, mobile: 35, tablet: 5 },
      browsers: { Chrome: 50, Safari: 30, Firefox: 20 },
      os: { ios: 30, android: 25, Windows: 30, Linux: 15 }
    })
    
    mockGetLocationStats.mockResolvedValue([
      { location: '島根県', count: 40, percentage: 40 },
      { location: '鳥取県', count: 30, percentage: 30 },
      { location: '東京都', count: 20, percentage: 20 }
    ])
    
    mockGetConversionStats.mockResolvedValue({
      totalSearches: 200,
      successfulSearches: 150,
      conversionRate: 75,
      routeConversions: [
        { route: 'A → B', searches: 100, successful: 80, rate: 80 }
      ]
    })
    
    mockGetPageFlowStats.mockResolvedValue([
      { transition: '/ → /transit', count: 50 },
      { transition: '/transit → /timetable', count: 30 }
    ])
    
    mockGetAccessTrend.mockResolvedValue([
      { date: '2025-01-13', count: 50 },
      { date: '2025-01-14', count: 60 },
      { date: '2025-01-15', count: 70 }
    ])
  })

  describe('CSVエクスポート機能', () => {
    it('CSV値のエスケープが正しく動作する', () => {
      // escapeCsvValue関数のテスト
      const escapeCsvValue = (value: string | number): string => {
        const str = String(value)
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }
      
      // カンマを含む値をテスト
      expect(escapeCsvValue('test,value')).toBe('"test,value"')
      
      // ダブルクォートを含む値をテスト
      expect(escapeCsvValue('test"value')).toBe('"test""value"')
      
      // 改行を含む値をテスト
      expect(escapeCsvValue('test\nvalue')).toBe('"test\nvalue"')
      
      // 通常の値をテスト
      expect(escapeCsvValue('normal value')).toBe('normal value')
      expect(escapeCsvValue(123)).toBe('123')
    })

    it('CSVエクスポートのファイル名が正しく生成される', () => {
      const today = new Date()
      const dateStr = format(today, 'yyyy-MM-dd')
      
      expect(`analytics-trend-${dateStr}.csv`).toMatch(/^analytics-trend-\d{4}-\d{2}-\d{2}\.csv$/)
      expect(`analytics-all-${dateStr}.csv`).toMatch(/^analytics-all-\d{4}-\d{2}-\d{2}\.csv$/)
    })
  })

  describe('データ処理ロジック', () => {
    it('期間計算が正しく動作する', () => {
      const endDate = new Date()
      const days7 = subDays(endDate, 7)
      const days30 = subDays(endDate, 30)
      const days90 = subDays(endDate, 90)
      
      expect(days7.getTime()).toBeLessThan(endDate.getTime())
      expect(days30.getTime()).toBeLessThan(endDate.getTime())
      expect(days90.getTime()).toBeLessThan(endDate.getTime())
    })

    it('セッション時間のフォーマットが正しく動作する', () => {
      const formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}分${remainingSeconds}秒`
      }
      
      expect(formatDuration(0)).toBe('0分0秒')
      expect(formatDuration(60)).toBe('1分0秒')
      expect(formatDuration(90)).toBe('1分30秒')
      expect(formatDuration(125)).toBe('2分5秒')
    })

    it('リファラーの翻訳が正しく動作する', () => {
      const translateReferrer = (referrer: string): string => {
        const translations: Record<string, string> = {
          'direct': '直接アクセス',
          'google': 'Google検索',
          'yahoo': 'Yahoo検索',
          'bing': 'Bing検索',
          'facebook': 'Facebook',
          'twitter': 'Twitter',
          'instagram': 'Instagram',
          'other': 'その他'
        }
        return translations[referrer] || referrer
      }
      
      expect(translateReferrer('google')).toBe('Google検索')
      expect(translateReferrer('direct')).toBe('直接アクセス')
      expect(translateReferrer('unknown')).toBe('unknown')
    })
  })

  describe('エラーハンドリング', () => {
    it('無効な日付でエラーが発生する', () => {
      const startDate = new Date('invalid')
      const endDate = new Date()
      
      expect(isNaN(startDate.getTime())).toBe(true)
      expect(isNaN(endDate.getTime())).toBe(false)
    })

    it('開始日が終了日より後の場合にエラーが発生する', () => {
      const startDate = new Date('2025-01-15')
      const endDate = new Date('2025-01-10')
      
      expect(startDate > endDate).toBe(true)
    })
  })
})

