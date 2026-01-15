/**
 * アクセス統計機能 型定義のテスト
 *
 * TypeScriptの型が正しく定義されていることを確認
 */

import { describe, it, expect } from 'vitest'
import type {
  AnalyticsDaily,
  AnalyticsMonthly,
  AnalyticsHourly,
  TrackPageViewParams,
  TrackSearchParams,
  PopularRoute,
  PopularRouteWithNames,
  HourlyDistribution,
  PortDistribution,
  PeriodPreset,
  CustomPeriod,
  AnalyticsSummary,
  ChartData,
  MultiSeriesChartData
} from '~/types/analytics'

describe('Analytics Types', () => {
  describe('AnalyticsDaily', () => {
    it('日次統計の型が正しく定義されている', () => {
      const daily: AnalyticsDaily = {
        dateKey: '2025-01-15',
        pvTotal: 100,
        searchTotal: 50,
        routeCounts: { 'saigo-shichirui': 30 },
        departureCounts: { 'saigo': 30 },
        arrivalCounts: { 'shichirui': 30 },
        hourCounts: { '10': 20 },
        updatedAt: { seconds: 1736899200, nanoseconds: 0 }
      }

      expect(daily.dateKey).toBe('2025-01-15')
      expect(daily.pvTotal).toBe(100)
      expect(daily.searchTotal).toBe(50)
    })

    it('routeCountsが空でも有効', () => {
      const daily: AnalyticsDaily = {
        dateKey: '2025-01-15',
        pvTotal: 0,
        searchTotal: 0,
        routeCounts: {},
        departureCounts: {},
        arrivalCounts: {},
        hourCounts: {},
        updatedAt: { seconds: 0, nanoseconds: 0 }
      }

      expect(Object.keys(daily.routeCounts)).toHaveLength(0)
    })
  })

  describe('AnalyticsMonthly', () => {
    it('月次統計の型が正しく定義されている', () => {
      const monthly: AnalyticsMonthly = {
        monthKey: '2025-01',
        pvTotal: 3000,
        searchTotal: 1500,
        routeCounts: { 'saigo-shichirui': 900 },
        departureCounts: { 'saigo': 900 },
        arrivalCounts: { 'shichirui': 900 },
        hourCounts: { '10': 500 },
        updatedAt: { seconds: 1736899200, nanoseconds: 0 }
      }

      expect(monthly.monthKey).toMatch(/^\d{4}-\d{2}$/)
      expect(monthly.pvTotal).toBe(3000)
    })
  })

  describe('AnalyticsHourly', () => {
    it('時間別統計の型が正しく定義されている', () => {
      const hourly: AnalyticsHourly = {
        hourKey: '2025-01-15-10',
        pvTotal: 25,
        searchTotal: 12,
        routeCounts: { 'saigo-shichirui': 8 },
        departureCounts: { 'saigo': 8 },
        arrivalCounts: { 'shichirui': 8 },
        updatedAt: { seconds: 1736899200, nanoseconds: 0 }
      }

      expect(hourly.hourKey).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}$/)
    })
  })

  describe('TrackPageViewParams', () => {
    it('PVトラッキング引数の型が正しく定義されている', () => {
      const params: TrackPageViewParams = {
        pagePath: '/transit'
      }

      expect(params.pagePath).toBe('/transit')
    })
  })

  describe('TrackSearchParams', () => {
    it('検索トラッキング引数の型が正しく定義されている', () => {
      const params: TrackSearchParams = {
        depId: 'saigo',
        arrId: 'shichirui',
        datetime: '2025-01-15T10:30:00'
      }

      expect(params.depId).toBe('saigo')
      expect(params.arrId).toBe('shichirui')
      expect(params.datetime).toBeDefined()
    })

    it('datetimeは省略可能', () => {
      const params: TrackSearchParams = {
        depId: 'saigo',
        arrId: 'shichirui'
      }

      expect(params.datetime).toBeUndefined()
    })
  })

  describe('PopularRoute', () => {
    it('人気航路の型が正しく定義されている', () => {
      const route: PopularRoute = {
        routeKey: 'saigo-shichirui',
        depId: 'saigo',
        arrId: 'shichirui',
        count: 150
      }

      expect(route.routeKey).toBe('saigo-shichirui')
      expect(route.depId).toBe('saigo')
      expect(route.arrId).toBe('shichirui')
      expect(route.count).toBe(150)
    })
  })

  describe('PopularRouteWithNames', () => {
    it('ルート名付き人気航路の型が正しく定義されている', () => {
      const route: PopularRouteWithNames = {
        routeKey: 'saigo-shichirui',
        depId: 'saigo',
        arrId: 'shichirui',
        count: 150,
        depName: '西郷',
        arrName: '七類'
      }

      expect(route.depName).toBe('西郷')
      expect(route.arrName).toBe('七類')
    })
  })

  describe('HourlyDistribution', () => {
    it('時間帯別分布の型が正しく定義されている', () => {
      const distribution: HourlyDistribution = {
        hour: 10,
        pv: 50,
        search: 25
      }

      expect(distribution.hour).toBeGreaterThanOrEqual(0)
      expect(distribution.hour).toBeLessThanOrEqual(23)
      expect(distribution.pv).toBe(50)
      expect(distribution.search).toBe(25)
    })
  })

  describe('PortDistribution', () => {
    it('ポート分布の型が正しく定義されている', () => {
      const distribution: PortDistribution = {
        id: 'saigo',
        name: '西郷',
        count: 100,
        percentage: 45
      }

      expect(distribution.id).toBe('saigo')
      expect(distribution.name).toBe('西郷')
      expect(distribution.percentage).toBeLessThanOrEqual(100)
    })
  })

  describe('PeriodPreset', () => {
    it('期間プリセットが正しく定義されている', () => {
      const presets: PeriodPreset[] = [
        'today',
        'yesterday',
        'last7days',
        'last30days',
        'thisMonth',
        'lastMonth',
        'last3Months',
        'lastYear',
        'custom'
      ]

      expect(presets).toContain('today')
      expect(presets).toContain('custom')
      expect(presets).toHaveLength(9)
    })
  })

  describe('CustomPeriod', () => {
    it('カスタム期間の型が正しく定義されている', () => {
      const period: CustomPeriod = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31')
      }

      expect(period.startDate).toBeInstanceOf(Date)
      expect(period.endDate).toBeInstanceOf(Date)
      expect(period.startDate < period.endDate).toBe(true)
    })
  })

  describe('AnalyticsSummary', () => {
    it('統計サマリーの型が正しく定義されている', () => {
      const summary: AnalyticsSummary = {
        pvTotal: 1000,
        searchTotal: 500,
        popularRoutes: [
          { routeKey: 'saigo-shichirui', depId: 'saigo', arrId: 'shichirui', count: 150 }
        ]
      }

      expect(summary.pvTotal).toBe(1000)
      expect(summary.popularRoutes).toHaveLength(1)
    })
  })

  describe('ChartData', () => {
    it('グラフデータの型が正しく定義されている', () => {
      const data: ChartData = {
        label: '2025-01-15',
        value: 100
      }

      expect(data.label).toBe('2025-01-15')
      expect(data.value).toBe(100)
    })
  })

  describe('MultiSeriesChartData', () => {
    it('複系列グラフデータの型が正しく定義されている', () => {
      const data: MultiSeriesChartData = {
        label: '10:00',
        pv: 50,
        search: 25
      }

      expect(data.label).toBe('10:00')
      expect(data.pv).toBe(50)
      expect(data.search).toBe(25)
    })
  })
})
