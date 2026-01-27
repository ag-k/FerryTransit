import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DashboardPage from '../index.vue'

const mockGetPvTrend = vi.fn()
const mockGetDailyAnalytics = vi.fn()
const mockGetMonthlyAnalytics = vi.fn()
const mockGetPopularRoutes = vi.fn()
const mockGetUniqueUsersCount = vi.fn()
const mockGetErrorStats = vi.fn()

const mockGetCollection = vi.fn()
const mockGetDocument = vi.fn()

vi.mock('~/composables/useAnalytics', () => ({
  useAnalytics: () => ({
    getPvTrend: (...args: any[]) => mockGetPvTrend(...args),
    getDailyAnalytics: (...args: any[]) => mockGetDailyAnalytics(...args),
    getMonthlyAnalytics: (...args: any[]) => mockGetMonthlyAnalytics(...args),
    getPopularRoutes: (...args: any[]) => mockGetPopularRoutes(...args),
    getUniqueUsersCount: (...args: any[]) => mockGetUniqueUsersCount(...args),
    getErrorStats: (...args: any[]) => mockGetErrorStats(...args)
  })
}))

vi.mock('~/composables/useAdminFirestore', () => ({
  useAdminFirestore: () => ({
    getCollection: (...args: any[]) => mockGetCollection(...args),
    getDocument: (...args: any[]) => mockGetDocument(...args),
    logAdminAction: vi.fn()
  })
}))

describe('Admin Dashboard Page', () => {
  const mountDashboard = async () => {
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: {
          NuxtLink: { template: '<a><slot /></a>' }
        }
      }
    })
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetPvTrend.mockResolvedValue([
      { date: '2024-01-01', pv: 120, search: 30 },
      { date: '2024-01-02', pv: 180, search: 45 }
    ])
    mockGetDailyAnalytics.mockResolvedValue({ pvTotal: 120 })
    mockGetMonthlyAnalytics.mockResolvedValue({ pvTotal: 450 })
    mockGetPopularRoutes.mockResolvedValue([
      {
        routeKey: 'SAIGO-HONDO_SHICHIRUI',
        depId: 'SAIGO',
        arrId: 'HONDO_SHICHIRUI',
        count: 20
      }
    ])
    mockGetUniqueUsersCount.mockResolvedValue(12)
    mockGetErrorStats.mockResolvedValue({ 500: 2 })

    mockGetCollection.mockResolvedValue([
      {
        id: 'log-1',
        adminId: 'admin1',
        adminEmail: 'admin@example.com',
        action: 'update',
        target: 'timetable',
        targetId: 'timetable_001',
        timestamp: new Date('2024-01-02T00:00:00Z')
      }
    ])

    mockGetDocument.mockResolvedValue({
      id: 'global',
      site: {
        maintenanceMode: false,
        maintenanceMessage: ''
      },
      data: {
        autoBackup: true,
        backupInterval: 'daily'
      }
    })
  })

  it('統計カードと人気航路ランキングが表示される', async () => {
    const wrapper = await mountDashboard()

    const stats = wrapper.find('[data-test="dashboard-stats"]')
    expect(stats.exists()).toBe(true)
    expect(stats.text()).toContain('今日のアクセス数')

    const popularRoutes = wrapper.find('[data-test="dashboard-popular-routes"]')
    expect(popularRoutes.text()).toContain('人気航路ランキング')
    expect(popularRoutes.text()).toContain('西郷港')
  })

  it('最近のアクティビティが表示される', async () => {
    const wrapper = await mountDashboard()

    const activities = wrapper.find('[data-test="dashboard-activities"]')
    expect(activities.exists()).toBe(true)
    expect(activities.text()).toContain('最近のアクティビティ')
    expect(activities.text()).toContain('admin@example.com')
  })
})
