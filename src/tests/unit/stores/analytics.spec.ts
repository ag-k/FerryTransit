import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnalyticsStore } from '~/stores/analytics'

// Mock Firebase
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $firebase: {
      db: null,
      analytics: null
    }
  })
}))

describe('Analytics Store', () => {
  let store: ReturnType<typeof useAnalyticsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAnalyticsStore()
  })

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      expect(store.analytics).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.realtimeData.activeUsers).toBe(0)
      expect(store.realtimeData.currentPageViews.size).toBe(0)
      expect(store.realtimeData.recentErrors.length).toBe(0)
      expect(store.sessionData.sessionId).toBeNull()
    })

    it('should have correct date range', () => {
      const now = new Date()
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      expect(store.dateRange.end.getDate()).toBe(now.getDate())
      expect(store.dateRange.start.getDate()).toBe(weekAgo.getDate())
    })
  })

  describe('Getters', () => {
    beforeEach(() => {
      store.analytics = {
        pageViews: [
          { date: '2025-01-01', views: 1000, uniqueUsers: 500, averageDuration: 180 },
          { date: '2025-01-02', views: 1500, uniqueUsers: 700, averageDuration: 200 }
        ],
        userStats: {
          totalUsers: 5000,
          newUsers: 1000,
          returningUsers: 4000,
          averageSessionDuration: 220
        },
        deviceStats: {
          desktop: 40,
          mobile: 50,
          tablet: 10,
          ios: 25,
          android: 25
        },
        locationStats: [],
        searchStats: [
          { fromPort: '西郷', toPort: '本土七類', searchCount: 1500, conversionRate: 0.8, lastSearched: new Date() },
          { fromPort: '本土七類', toPort: '西郷', searchCount: 1200, conversionRate: 0.75, lastSearched: new Date() },
          { fromPort: '西郷', toPort: '菱浦', searchCount: 800, conversionRate: 0.6, lastSearched: new Date() },
          { fromPort: '菱浦', toPort: '西郷', searchCount: 700, conversionRate: 0.45, lastSearched: new Date() }
        ]
      }
    })

    it('should calculate total page views', () => {
      expect(store.totalPageViews).toBe(2500)
    })

    it('should get average session duration', () => {
      expect(store.averageSessionDuration).toBe(220)
    })

    it('should get top search routes', () => {
      const topRoutes = store.topSearchRoutes
      expect(topRoutes).toHaveLength(4)
      expect(topRoutes[0].fromPort).toBe('西郷')
      expect(topRoutes[0].toPort).toBe('本土七類')
      expect(topRoutes[0].searchCount).toBe(1500)
    })

    it('should get popular routes (conversion rate > 0.5)', () => {
      const popularRoutes = store.popularRoutes
      expect(popularRoutes).toHaveLength(3)
      expect(popularRoutes.every(route => route.conversionRate > 0.5)).toBe(true)
    })

    it('should calculate error rate', () => {
      store.realtimeData.recentErrors = [
        { message: 'Error 1', timestamp: new Date() },
        { message: 'Error 2', timestamp: new Date() }
      ]
      const errorRate = store.errorRate
      expect(errorRate).toBeCloseTo(0.08, 2) // 2/2500 * 100
    })

    it('should calculate bounce rate', () => {
      const bounceRate = store.bounceRate
      expect(bounceRate).toBeCloseTo(30, 0) // デフォルトの30%
    })
  })

  describe('Actions', () => {
    describe('fetchAnalytics', () => {
      it('should load dummy data when Firebase is not available', async () => {
        await store.fetchAnalytics()
        
        expect(store.analytics).not.toBeNull()
        expect(store.analytics?.pageViews.length).toBeGreaterThan(0)
        expect(store.analytics?.userStats.totalUsers).toBe(12345)
        expect(store.analytics?.searchStats.length).toBe(5)
        expect(store.isLoading).toBe(false)
      })

      it('should update date range when provided', async () => {
        const newStart = new Date('2025-01-01')
        const newEnd = new Date('2025-01-07')
        
        await store.fetchAnalytics(newStart, newEnd)
        
        expect(store.dateRange.start).toEqual(newStart)
        expect(store.dateRange.end).toEqual(newEnd)
      })

      it('should handle errors gracefully', async () => {
        // エラーが発生してもダミーデータを返すことを確認
        await store.fetchAnalytics()
        expect(store.analytics).not.toBeNull()
      })
    })

    describe('trackPageView', () => {
      it('should initialize session if not exists', async () => {
        await store.trackPageView('/test-page')
        
        expect(store.sessionData.sessionId).not.toBeNull()
        expect(store.sessionData.sessionStart).not.toBeNull()
        expect(store.sessionData.pageViews).toContain('/test-page')
      })

      it('should update realtime page view count', async () => {
        await store.trackPageView('/test-page')
        await store.trackPageView('/test-page')
        
        expect(store.realtimeData.currentPageViews.get('/test-page')).toBe(2)
      })
    })

    describe('trackSearch', () => {
      it('should track search without errors', async () => {
        // Firebaseがない場合でもエラーなく実行されることを確認
        await expect(store.trackSearch('西郷', '本土七類')).resolves.not.toThrow()
      })
    })

    describe('trackError', () => {
      it('should add error to recent errors list', async () => {
        const error = new Error('Test error')
        await store.trackError(error, { page: '/test-page' })
        
        expect(store.realtimeData.recentErrors).toHaveLength(1)
        expect(store.realtimeData.recentErrors[0].message).toBe('Test error')
        expect(store.realtimeData.recentErrors[0].page).toBe('/test-page')
      })

      it('should maintain maximum 20 recent errors', async () => {
        // 25個のエラーを追加
        for (let i = 0; i < 25; i++) {
          await store.trackError(new Error(`Error ${i}`))
        }
        
        expect(store.realtimeData.recentErrors).toHaveLength(20)
        expect(store.realtimeData.recentErrors[0].message).toBe('Error 5')
        expect(store.realtimeData.recentErrors[19].message).toBe('Error 24')
      })
    })

    describe('Session management', () => {
      it('should initialize session with unique ID', () => {
        store.initializeSession()
        
        expect(store.sessionData.sessionId).toMatch(/^\d+-[a-z0-9]{9}$/)
        expect(store.sessionData.sessionStart).toBeInstanceOf(Date)
        expect(store.sessionData.pageViews).toEqual([])
        expect(store.sessionData.duration).toBe(0)
      })

      it('should track session end', async () => {
        store.initializeSession()
        const sessionId = store.sessionData.sessionId
        
        await store.trackSessionEnd()
        
        // セッションデータが記録されることを確認（Firebaseがないので実際の記録はされない）
        expect(store.sessionData.sessionId).toBe(sessionId)
      })
    })

    describe('Utility actions', () => {
      it('should update active users count', () => {
        store.updateActiveUsers(150)
        expect(store.realtimeData.activeUsers).toBe(150)
      })

      it('should clear realtime data', () => {
        store.realtimeData.activeUsers = 100
        store.realtimeData.currentPageViews.set('/test', 5)
        store.realtimeData.recentErrors.push({
          message: 'Test error',
          timestamp: new Date()
        })
        
        store.clearRealtimeData()
        
        expect(store.realtimeData.activeUsers).toBe(0)
        expect(store.realtimeData.currentPageViews.size).toBe(0)
        expect(store.realtimeData.recentErrors).toHaveLength(0)
      })
    })

    describe('trackUserEvent', () => {
      it('should track custom events without errors', async () => {
        await expect(
          store.trackUserEvent('button_click', { button: 'search' })
        ).resolves.not.toThrow()
      })
    })

    describe('updateUserStats', () => {
      it('should update user stats for new users', async () => {
        await expect(store.updateUserStats('new')).resolves.not.toThrow()
      })

      it('should update user stats for returning users', async () => {
        await expect(store.updateUserStats('returning')).resolves.not.toThrow()
      })
    })

    describe('updateDeviceStats', () => {
      it('should update device stats', async () => {
        await expect(
          store.updateDeviceStats({ type: 'mobile', os: 'iOS' })
        ).resolves.not.toThrow()
      })
    })
  })
})