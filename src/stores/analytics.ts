import { defineStore } from 'pinia'
import type { Analytics, PageViewStats, SearchStats } from '~/types/analytics'
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, updateDoc, doc, increment } from 'firebase/firestore'
import { logEvent } from 'firebase/analytics'

interface AnalyticsState {
  analytics: Analytics | null
  dateRange: {
    start: Date
    end: Date
  }
  isLoading: boolean
  error: string | null
  realtimeData: {
    activeUsers: number
    currentPageViews: Map<string, number>
    recentErrors: Array<{
      message: string
      timestamp: Date
      page?: string
      userId?: string
    }>
  }
  sessionData: {
    sessionId: string | null
    sessionStart: Date | null
    pageViews: string[]
    duration: number
  }
}

export const useAnalyticsStore = defineStore('analytics', {
  state: (): AnalyticsState => ({
    analytics: null,
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 過去7日間
      end: new Date()
    },
    isLoading: false,
    error: null,
    realtimeData: {
      activeUsers: 0,
      currentPageViews: new Map(),
      recentErrors: []
    },
    sessionData: {
      sessionId: null,
      sessionStart: null,
      pageViews: [],
      duration: 0
    }
  }),

  getters: {
    totalPageViews: (state) => {
      if (!state.analytics?.pageViews) return 0
      return state.analytics.pageViews.reduce((sum, pv) => sum + pv.views, 0)
    },
    
    averageSessionDuration: (state) => {
      return state.analytics?.userStats.averageSessionDuration || 0
    },
    
    topSearchRoutes: (state) => {
      if (!state.analytics?.searchStats) return []
      return [...state.analytics.searchStats]
        .sort((a, b) => b.searchCount - a.searchCount)
        .slice(0, 10)
    },
    
    popularRoutes: (state) => {
      if (!state.analytics?.searchStats) return []
      return [...state.analytics.searchStats]
        .filter(stat => stat.conversionRate > 0.5)
        .sort((a, b) => b.searchCount - a.searchCount)
        .slice(0, 5)
    },
    
    errorRate: (state) => {
      const totalPageViews = state.totalPageViews
      const errorCount = state.realtimeData.recentErrors.length
      return totalPageViews > 0 ? (errorCount / totalPageViews) * 100 : 0
    },
    
    bounceRate: (state) => {
      if (!state.analytics?.pageViews || state.analytics.pageViews.length === 0) return 0
      const totalSessions = state.analytics.pageViews.reduce((sum, pv) => sum + pv.uniqueUsers, 0)
      const bouncedSessions = Math.floor(totalSessions * 0.3) // 仮の値、実際はセッションデータから計算
      return totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0
    }
  },

  actions: {
    async fetchAnalytics(startDate?: Date, endDate?: Date) {
      this.isLoading = true
      this.error = null
      
      if (startDate) this.dateRange.start = startDate
      if (endDate) this.dateRange.end = endDate
      
      try {
        const { $firebase } = useNuxtApp()
        if (!$firebase?.db) {
          // Firebaseが利用できない場合はダミーデータを返す
          return this.loadDummyData()
        }

        // ページビューデータの取得
        const pageViewsQuery = query(
          collection($firebase.db, 'analytics_pageviews'),
          where('date', '>=', Timestamp.fromDate(this.dateRange.start)),
          where('date', '<=', Timestamp.fromDate(this.dateRange.end)),
          orderBy('date', 'desc')
        )
        const pageViewsSnapshot = await getDocs(pageViewsQuery)
        const pageViews: PageViewStats[] = pageViewsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            date: data.date.toDate().toISOString().split('T')[0],
            views: data.views || 0,
            uniqueUsers: data.uniqueUsers || 0,
            averageDuration: data.averageDuration || 0
          }
        })

        // ユーザー統計の取得
        const userStatsQuery = query(
          collection($firebase.db, 'analytics_users'),
          orderBy('updatedAt', 'desc'),
          limit(1)
        )
        const userStatsSnapshot = await getDocs(userStatsQuery)
        const userStatsData = userStatsSnapshot.docs[0]?.data() || {}
        
        // デバイス統計の取得
        const deviceStatsQuery = query(
          collection($firebase.db, 'analytics_devices'),
          orderBy('updatedAt', 'desc'),
          limit(1)
        )
        const deviceStatsSnapshot = await getDocs(deviceStatsQuery)
        const deviceStatsData = deviceStatsSnapshot.docs[0]?.data() || {}
        
        // 地域統計の取得
        const locationStatsQuery = query(
          collection($firebase.db, 'analytics_locations'),
          orderBy('count', 'desc'),
          limit(10)
        )
        const locationStatsSnapshot = await getDocs(locationStatsQuery)
        const locationStats = locationStatsSnapshot.docs.map(doc => doc.data())
        
        // 検索統計の取得
        const searchStatsQuery = query(
          collection($firebase.db, 'analytics_searches'),
          orderBy('searchCount', 'desc'),
          limit(20)
        )
        const searchStatsSnapshot = await getDocs(searchStatsQuery)
        const searchStats = searchStatsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            ...data,
            lastSearched: data.lastSearched?.toDate() || new Date()
          }
        })
        
        this.analytics = {
          pageViews: pageViews.length > 0 ? pageViews : this.generateDummyPageViews(),
          userStats: {
            totalUsers: userStatsData.totalUsers || 0,
            newUsers: userStatsData.newUsers || 0,
            returningUsers: userStatsData.returningUsers || 0,
            averageSessionDuration: userStatsData.averageSessionDuration || 0
          },
          deviceStats: {
            desktop: deviceStatsData.desktop || 0,
            mobile: deviceStatsData.mobile || 0,
            tablet: deviceStatsData.tablet || 0,
            ios: deviceStatsData.ios || 0,
            android: deviceStatsData.android || 0
          },
          locationStats: locationStats.length > 0 ? locationStats : this.generateDummyLocationStats(),
          searchStats: searchStats.length > 0 ? searchStats : this.generateDummySearchStats()
        }
      } catch (error: any) {
        console.error('Failed to fetch analytics:', error)
        this.error = error.message || '分析データの取得に失敗しました'
        // エラー時はダミーデータを使用
        this.loadDummyData()
      } finally {
        this.isLoading = false
      }
    },
    
    loadDummyData() {
      this.analytics = {
        pageViews: this.generateDummyPageViews(),
        userStats: {
          totalUsers: 12345,
          newUsers: 3456,
          returningUsers: 8889,
          averageSessionDuration: 225
        },
        deviceStats: {
          desktop: 35,
          mobile: 55,
          tablet: 10,
          ios: 30,
          android: 25
        },
        locationStats: this.generateDummyLocationStats(),
        searchStats: this.generateDummySearchStats()
      }
    },
    
    generateDummyPageViews(): PageViewStats[] {
      const pageViews: PageViewStats[] = []
      const days = Math.floor((this.dateRange.end.getTime() - this.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      
      for (let i = 0; i <= days; i++) {
        const date = new Date(this.dateRange.start)
        date.setDate(date.getDate() + i)
        
        pageViews.push({
          date: date.toISOString().split('T')[0],
          views: Math.floor(Math.random() * 2000) + 1000,
          uniqueUsers: Math.floor(Math.random() * 800) + 400,
          averageDuration: Math.floor(Math.random() * 300) + 120
        })
      }
      return pageViews
    },
    
    generateDummyLocationStats() {
      return [
        { prefecture: '島根県', count: 4567, percentage: 37.1 },
        { prefecture: '鳥取県', count: 2345, percentage: 19.0 },
        { prefecture: '東京都', count: 1890, percentage: 15.3 },
        { prefecture: '大阪府', count: 1234, percentage: 10.0 },
        { prefecture: 'その他', count: 2309, percentage: 18.6 }
      ]
    },
    
    generateDummySearchStats() {
      return [
        { fromPort: '西郷', toPort: '本土七類', searchCount: 1234, conversionRate: 0.76, lastSearched: new Date() },
        { fromPort: '本土七類', toPort: '西郷', searchCount: 1098, conversionRate: 0.72, lastSearched: new Date() },
        { fromPort: '西郷', toPort: '菱浦', searchCount: 876, conversionRate: 0.68, lastSearched: new Date() },
        { fromPort: '菱浦', toPort: '西郷', searchCount: 765, conversionRate: 0.65, lastSearched: new Date() },
        { fromPort: '西郷', toPort: '別府', searchCount: 543, conversionRate: 0.58, lastSearched: new Date() }
      ]
    },

    async trackPageView(page: string, metadata?: { userId?: string; referrer?: string }) {
      try {
        const { $firebase } = useNuxtApp()
        
        // セッションデータの更新
        if (!this.sessionData.sessionId) {
          this.initializeSession()
        }
        this.sessionData.pageViews.push(page)
        
        // リアルタイムデータの更新
        const currentCount = this.realtimeData.currentPageViews.get(page) || 0
        this.realtimeData.currentPageViews.set(page, currentCount + 1)
        
        if ($firebase?.db) {
          // Firestoreにページビューを記録
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const docId = today.toISOString().split('T')[0]
          
          try {
            await updateDoc(doc($firebase.db, 'analytics_pageviews', docId), {
              views: increment(1),
              [`pages.${page.replace(/\//g, '_')}`]: increment(1),
              updatedAt: Timestamp.now()
            })
          } catch (e) {
            // ドキュメントが存在しない場合は作成
            await addDoc(collection($firebase.db, 'analytics_pageviews'), {
              date: Timestamp.fromDate(today),
              views: 1,
              uniqueUsers: 1,
              averageDuration: 0,
              pages: { [page.replace(/\//g, '_')]: 1 },
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            })
          }
          
          // 詳細なページビューログを記録
          await addDoc(collection($firebase.db, 'analytics_pageview_logs'), {
            page,
            timestamp: Timestamp.now(),
            sessionId: this.sessionData.sessionId,
            userId: metadata?.userId,
            referrer: metadata?.referrer,
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language
          })
        }
        
        // Firebase Analytics にイベントを送信
        if ($firebase?.analytics) {
          logEvent($firebase.analytics, 'page_view', {
            page_path: page,
            page_title: document.title
          })
        }
      } catch (error) {
        console.error('Failed to track page view:', error)
        await this.trackError(error)
      }
    },

    async trackSearch(fromPort: string, toPort: string, metadata?: { userId?: string; found?: boolean }) {
      try {
        const { $firebase } = useNuxtApp()
        
        if ($firebase?.db) {
          const searchId = `${fromPort}_${toPort}`
          
          try {
            // 既存の検索統計を更新
            await updateDoc(doc($firebase.db, 'analytics_searches', searchId), {
              searchCount: increment(1),
              lastSearched: Timestamp.now(),
              updatedAt: Timestamp.now()
            })
          } catch (e) {
            // 新規作成
            await addDoc(collection($firebase.db, 'analytics_searches'), {
              fromPort,
              toPort,
              searchCount: 1,
              conversionRate: metadata?.found ? 1 : 0,
              lastSearched: Timestamp.now(),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            })
          }
          
          // 検索ログを記録
          await addDoc(collection($firebase.db, 'analytics_search_logs'), {
            fromPort,
            toPort,
            timestamp: Timestamp.now(),
            sessionId: this.sessionData.sessionId,
            userId: metadata?.userId,
            found: metadata?.found || false
          })
        }
        
        // Firebase Analytics にイベントを送信
        if ($firebase?.analytics) {
          logEvent($firebase.analytics, 'search', {
            search_term: `${fromPort}-${toPort}`,
            from_port: fromPort,
            to_port: toPort
          })
        }
      } catch (error) {
        console.error('Failed to track search:', error)
        await this.trackError(error)
      }
    },

    async trackError(error: any, context?: { page?: string; action?: string }) {
      try {
        const { $firebase } = useNuxtApp()
        
        // リアルタイムエラーリストに追加
        this.realtimeData.recentErrors.push({
          message: error.message || String(error),
          timestamp: new Date(),
          page: context?.page || window.location.pathname,
          userId: undefined // TODO: ユーザー認証実装後に設定
        })
        
        // 最新の20件のみ保持
        if (this.realtimeData.recentErrors.length > 20) {
          this.realtimeData.recentErrors = this.realtimeData.recentErrors.slice(-20)
        }
        
        if ($firebase?.db) {
          // エラーログを記録
          await addDoc(collection($firebase.db, 'analytics_errors'), {
            message: error.message || String(error),
            stack: error.stack,
            timestamp: Timestamp.now(),
            sessionId: this.sessionData.sessionId,
            page: context?.page || window.location.pathname,
            action: context?.action,
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        }
        
        // Firebase Analytics にイベントを送信
        if ($firebase?.analytics) {
          logEvent($firebase.analytics, 'exception', {
            description: error.message || String(error),
            fatal: false
          })
        }
      } catch (err) {
        console.error('Failed to track error:', err)
      }
    },
    
    async trackUserEvent(eventName: string, parameters?: Record<string, any>) {
      try {
        const { $firebase } = useNuxtApp()
        
        if ($firebase?.db) {
          // カスタムイベントを記録
          await addDoc(collection($firebase.db, 'analytics_events'), {
            eventName,
            parameters,
            timestamp: Timestamp.now(),
            sessionId: this.sessionData.sessionId
          })
        }
        
        // Firebase Analytics にイベントを送信
        if ($firebase?.analytics) {
          logEvent($firebase.analytics, eventName, parameters)
        }
      } catch (error) {
        console.error('Failed to track user event:', error)
      }
    },
    
    async updateUserStats(type: 'new' | 'returning') {
      try {
        const { $firebase } = useNuxtApp()
        
        if ($firebase?.db) {
          const statsDoc = doc($firebase.db, 'analytics_users', 'current')
          
          if (type === 'new') {
            await updateDoc(statsDoc, {
              newUsers: increment(1),
              totalUsers: increment(1),
              updatedAt: Timestamp.now()
            })
          } else {
            await updateDoc(statsDoc, {
              returningUsers: increment(1),
              updatedAt: Timestamp.now()
            })
          }
        }
      } catch (error) {
        console.error('Failed to update user stats:', error)
      }
    },
    
    async updateDeviceStats(deviceInfo: { type: string; os: string }) {
      try {
        const { $firebase } = useNuxtApp()
        
        if ($firebase?.db) {
          const statsDoc = doc($firebase.db, 'analytics_devices', 'current')
          const deviceType = deviceInfo.type.toLowerCase() as 'desktop' | 'mobile' | 'tablet'
          const osType = deviceInfo.os.toLowerCase().includes('ios') ? 'ios' : 
                        deviceInfo.os.toLowerCase().includes('android') ? 'android' : null
          
          const updates: any = {
            [deviceType]: increment(1),
            updatedAt: Timestamp.now()
          }
          
          if (osType) {
            updates[osType] = increment(1)
          }
          
          await updateDoc(statsDoc, updates)
        }
      } catch (error) {
        console.error('Failed to update device stats:', error)
      }
    },
    
    async trackSessionEnd() {
      try {
        const { $firebase } = useNuxtApp()
        
        if (this.sessionData.sessionId && $firebase?.db) {
          const duration = Date.now() - (this.sessionData.sessionStart?.getTime() || Date.now())
          
          // セッションデータを記録
          await addDoc(collection($firebase.db, 'analytics_sessions'), {
            sessionId: this.sessionData.sessionId,
            startTime: Timestamp.fromDate(this.sessionData.sessionStart || new Date()),
            endTime: Timestamp.now(),
            duration: Math.floor(duration / 1000), // 秒単位
            pageViews: this.sessionData.pageViews,
            pageCount: this.sessionData.pageViews.length
          })
          
          // 平均セッション時間を更新
          await updateDoc(doc($firebase.db, 'analytics_users', 'current'), {
            averageSessionDuration: increment(Math.floor(duration / 1000))
          })
        }
      } catch (error) {
        console.error('Failed to track session end:', error)
      }
    },
    
    initializeSession() {
      this.sessionData = {
        sessionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionStart: new Date(),
        pageViews: [],
        duration: 0
      }
      
      // セッション終了時の処理を設定
      if (process.client) {
        window.addEventListener('beforeunload', () => {
          this.trackSessionEnd()
        })
      }
    },
    
    updateActiveUsers(count: number) {
      this.realtimeData.activeUsers = count
    },
    
    clearRealtimeData() {
      this.realtimeData.currentPageViews.clear()
      this.realtimeData.recentErrors = []
      this.realtimeData.activeUsers = 0
    }
  }
})