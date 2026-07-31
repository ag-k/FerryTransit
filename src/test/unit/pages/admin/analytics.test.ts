import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AnalyticsPage from '~/pages/admin/analytics.vue'

const mockGetPvTrend = vi.fn()
const mockGetHourlyDistribution = vi.fn()
const mockGetPopularRoutes = vi.fn()
const mockGetPortDistribution = vi.fn()
const mockToastError = vi.fn()

vi.mock('~/composables/useAnalytics', () => ({
  useAnalytics: () => ({
    getPvTrend: (...args: unknown[]) => mockGetPvTrend(...args),
    getHourlyDistribution: (...args: unknown[]) => mockGetHourlyDistribution(...args),
    getPopularRoutes: (...args: unknown[]) => mockGetPopularRoutes(...args),
    getPortDistribution: (...args: unknown[]) => mockGetPortDistribution(...args)
  })
}))

vi.stubGlobal('useNuxtApp', () => ({
  $toast: {
    error: mockToastError
  }
}))

describe('Admin Analytics Page', () => {
  const mountPage = async () => {
    const wrapper = mount(AnalyticsPage, {
      global: {
        stubs: {
          AnalyticsLineChart: {
            props: ['data'],
            template: '<div data-test="line-chart">{{ data.length }}</div>'
          },
          AnalyticsMultiLineChart: {
            props: ['data'],
            template: '<div data-test="multi-line-chart">{{ data.length }}</div>'
          },
          AnalyticsPieChart: {
            props: ['data'],
            template: '<div data-test="pie-chart">{{ data.length }}</div>'
          }
        }
      }
    })
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPvTrend.mockResolvedValue([
      { date: '2026-07-29', pv: 20, search: 5 },
      { date: '2026-07-30', pv: 30, search: 8 }
    ])
    mockGetHourlyDistribution.mockResolvedValue([
      { hour: 8, pv: 10, search: 2 },
      { hour: 9, pv: 12, search: 3 }
    ])
    mockGetPopularRoutes.mockResolvedValue([
      {
        routeKey: 'SAIGO-HISHIURA',
        depId: 'SAIGO',
        arrId: 'HISHIURA',
        count: 7
      }
    ])
    mockGetPortDistribution.mockResolvedValue({
      departure: [{ id: 'SAIGO', name: 'SAIGO', count: 7, percentage: 100 }],
      arrival: [{ id: 'HISHIURA', name: 'HISHIURA', count: 7, percentage: 100 }]
    })
  })

  it('現行の集計データを読み込み、港名を表示する', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('PV推移')
    expect(wrapper.text()).toContain('検索回数推移')
    expect(wrapper.text()).toContain('西郷港 → 菱浦港')
    expect(wrapper.findAll('[data-test="line-chart"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="multi-line-chart"]').text()).toBe('2')
    expect(wrapper.findAll('[data-test="pie-chart"]')).toHaveLength(3)
    expect(mockGetHourlyDistribution).toHaveBeenCalledOnce()
  })

  it('取得に失敗した場合はエラー通知し、データなし表示に戻る', async () => {
    mockGetPvTrend.mockRejectedValueOnce(new Error('permission denied'))

    const wrapper = await mountPage()

    expect(mockToastError).toHaveBeenCalledWith('統計情報の取得に失敗しました')
    expect(wrapper.text()).toContain('対象期間にデータがありません')
  })
})
