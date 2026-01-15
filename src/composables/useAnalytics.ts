import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { doc, getDoc, getDocs, collection, where, orderBy, query, setDoc, increment } from 'firebase/firestore'

// ========================================
// アクセス統計機能（新実装）
// ========================================

/**
 * アクセス統計の追跡・取得を行うcomposable
 */
export const useAnalytics = () => {
  const nuxtApp = typeof useNuxtApp === 'function' ? useNuxtApp() : null
  const $firebase = nuxtApp?.$firebase
  const $isOffline = nuxtApp?.$isOffline ?? false

  const getDb = () => {
    if (!$firebase?.db) {
      throw new Error('Firebase plugin not initialized')
    }
    return $firebase.db
  }
  
  // ========================================
  // タイムゾーン関連ユーティリティ
  // ========================================
  
  const TIMEZONE = 'Asia/Tokyo'
  
  /**
   * 現在時刻をAsia/Tokyoタイムゾーンで取得
   */
  const getTokyoDate = (date: Date = new Date()): Date => {
    return toZonedTime(date, TIMEZONE)
  }
  
  /**
   * 日付キーの生成 (YYYY-MM-DD)
   */
  const getDateKey = (date: Date = new Date()): string => {
    return format(getTokyoDate(date), 'yyyy-MM-dd')
  }
  
  /**
   * 月キーの生成 (YYYY-MM)
   */
  const getMonthKey = (date: Date = new Date()): string => {
    return format(getTokyoDate(date), 'yyyy-MM')
  }
  
  /**
   * 時間キーの生成 (YYYY-MM-DD-HH)
   */
  const getHourKey = (date: Date = new Date()): string => {
    return `${getDateKey(date)}-${format(getTokyoDate(date), 'HH')}`
  }
  
  /**
   * 時間帯を取得 (00-23)
   */
  const getHour = (date: Date = new Date()): number => {
    return parseInt(format(getTokyoDate(date), 'HH'), 10)
  }
  
  // ========================================
  // トラッキング機能
  // ========================================
  
  /**
   * PVのトラッキング
   * ルート遷移ごとに呼び出し、日次/月次/時間別のPVをインクリメント
   */
  const trackPageView = async ({ pagePath }: { pagePath: string }) => {
    // オフライン時はスキップ
    if ($isOffline || !$firebase?.db) {
      return
    }
    
    try {
      const dateKey = getDateKey()
      const monthKey = getMonthKey()
      const hourKey = getHourKey()
      const timestamp = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      
      // 日次統計のインクリメント
      await updateAnalyticsDoc(`analytics_daily/${dateKey}`, {
        dateKey,
        pvTotal: increment(1),
        updatedAt: timestamp
      })
      
      // 月次統計のインクリメント
      await updateAnalyticsDoc(`analytics_monthly/${monthKey}`, {
        monthKey,
        pvTotal: increment(1),
        updatedAt: timestamp
      })
      
      // 時間別統計のインクリメント
      await updateAnalyticsDoc(`analytics_hourly/${hourKey}`, {
        hourKey,
        pvTotal: increment(1),
        updatedAt: timestamp
      })
    } catch (error) {
      // エラーはログに出力のみで、ユーザーには通知しない
      console.warn('Failed to track page view:', error)
    }
  }
  
  /**
   * 検索のトラッキング
   * 検索実行時に呼び出し、検索回数と条件をインクリメント
   */
  const trackSearch = async ({ depId, arrId, datetime }: { depId: string; arrId: string; datetime?: string }) => {
    // オフライン時はスキップ
    if ($isOffline || !$firebase?.db) {
      return
    }
    
    try {
      const searchDate = datetime ? new Date(datetime) : new Date()
      const dateKey = getDateKey(searchDate)
      const monthKey = getMonthKey(searchDate)
      const hourKey = getHourKey(searchDate)
      const hour = getHour(searchDate)
      const routeKey = `${depId}-${arrId}`
      const hourKeyStr = hour.toString().padStart(2, '0')
      const timestamp = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      
      // 日次統計のインクリメント
      await updateAnalyticsDoc(`analytics_daily/${dateKey}`, {
        dateKey,
        searchTotal: increment(1),
        [`routeCounts.${routeKey}`]: increment(1),
        [`departureCounts.${depId}`]: increment(1),
        [`arrivalCounts.${arrId}`]: increment(1),
        [`hourCounts.${hourKeyStr}`]: increment(1),
        updatedAt: timestamp
      })
      
      // 月次統計のインクリメント
      await updateAnalyticsDoc(`analytics_monthly/${monthKey}`, {
        monthKey,
        searchTotal: increment(1),
        [`routeCounts.${routeKey}`]: increment(1),
        [`departureCounts.${depId}`]: increment(1),
        [`arrivalCounts.${arrId}`]: increment(1),
        [`hourCounts.${hourKeyStr}`]: increment(1),
        updatedAt: timestamp
      })
      
      // 時間別統計のインクリメント
      await updateAnalyticsDoc(`analytics_hourly/${hourKey}`, {
        hourKey,
        searchTotal: increment(1),
        [`routeCounts.${routeKey}`]: increment(1),
        [`departureCounts.${depId}`]: increment(1),
        [`arrivalCounts.${arrId}`]: increment(1),
        updatedAt: timestamp
      })
    } catch (error) {
      // エラーはログに出力のみで、ユーザーには通知しない
      console.warn('Failed to track search:', error)
    }
  }
  
  /**
   * ドキュメントの更新（存在しない場合はマージで作成）
   */
  const updateAnalyticsDoc = async (docPath: string, data: any) => {
    const [collectionName, docId] = docPath.split('/')
    const docRef = doc(getDb(), collectionName, docId)
    await setDoc(docRef, data, { merge: true })
  }
  
  // ========================================
  // 統計データ取得機能
  // ========================================
  
  /**
   * 日次統計の取得
   */
  const getDailyAnalytics = async (dateKey: string) => {
    const docRef = doc(getDb(), 'analytics_daily', dateKey)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data()
    }
    return null
  }
  
  /**
   * 月次統計の取得
   */
  const getMonthlyAnalytics = async (monthKey: string) => {
    const docRef = doc(getDb(), 'analytics_monthly', monthKey)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data()
    }
    return null
  }
  
  /**
   * 時間別統計の取得
   */
  const getHourlyAnalytics = async (hourKey: string) => {
    const docRef = doc(getDb(), 'analytics_hourly', hourKey)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data()
    }
    return null
  }
  
  /**
   * 期間内の統計データを取得
   */
  const getAnalyticsInRange = async (
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'monthly' | 'hourly' = 'daily'
  ) => {
    const collectionName = `analytics_${granularity}`
    
    if (granularity === 'hourly') {
      // 時間別の場合は開始日から終了日までの全時間を取得
      const docs: any[] = []
      let currentDate = new Date(startDate)
      const endDateTime = endDate.getTime()
      
      while (currentDate.getTime() <= endDateTime) {
        const hourKey = getHourKey(currentDate)
        const docData = await getHourlyAnalytics(hourKey)
        
        if (docData) {
          docs.push({ id: hourKey, ...docData })
        }
        
        // 1時間進める
        currentDate.setHours(currentDate.getHours() + 1)
      }
      
      return docs
    } else {
      // 日次/月次の場合は範囲でクエリ
      const startKey = granularity === 'daily' ? getDateKey(startDate) : getMonthKey(startDate)
      const endKey = granularity === 'daily' ? getDateKey(endDate) : getMonthKey(endDate)
      
      // クエリ条件を構築
      const collectionRef = collection(getDb(), collectionName)
      const constraints = [
        where('__name__', '>=', startKey),
        where('__name__', '<=', endKey),
        orderBy('__name__')
      ]
      
      const q = query(collectionRef, ...constraints)
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }
  }
  
  /**
   * 人気航路Top 3を取得
   */
  const getPopularRoutes = async (
    startDate: Date,
    endDate: Date,
    limit: number = 3
  ) => {
    const docs = await getAnalyticsInRange(startDate, endDate, 'daily')
    
    // ルート別に集計
    const routeTotals: Record<string, number> = {}
    
    docs.forEach((doc: any) => {
      if (doc.routeCounts) {
        Object.entries(doc.routeCounts).forEach(([routeKey, count]) => {
          routeTotals[routeKey] = (routeTotals[routeKey] || 0) + (count as number)
        })
      }
    })
    
    // ソートして上位を取得
    const sorted = Object.entries(routeTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, limit)
    
    return sorted.map(([routeKey, count]) => {
      const [depId, arrId] = routeKey.split('-')
      return {
        routeKey,
        depId,
        arrId,
        count: count as number
      }
    })
  }
  
  /**
   * 時間帯別PV/検索の分布を取得
   */
  const getHourlyDistribution = async (startDate: Date, endDate: Date) => {
    const docs = await getAnalyticsInRange(startDate, endDate, 'hourly')
    const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // 時間帯別に集計
    const hourlyData: Array<{ hour: number; pv: number; search: number }> = []
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.push({
        hour,
        pv: 0,
        search: 0
      })
    }
    
    docs.forEach((doc: any) => {
      const hourKey = doc.hourKey?.split('-')[3]
      if (hourKey) {
        const hour = parseInt(hourKey, 10)
        if (hour >= 0 && hour < 24) {
          hourlyData[hour].pv += doc.pvTotal || 0
          hourlyData[hour].search += doc.searchTotal || 0
        }
      }
    })
    
    // 期間が複数日の場合は平均化
    if (daysCount > 1) {
      hourlyData.forEach(data => {
        data.pv = Math.round(data.pv / daysCount)
        data.search = Math.round(data.search / daysCount)
      })
    }
    
    return hourlyData
  }
  
  /**
   * 出発地/到着地別の分布を取得
   */
  const getPortDistribution = async (startDate: Date, endDate: Date) => {
    const docs = await getAnalyticsInRange(startDate, endDate, 'daily')
    
    // 出発地/到着地別に集計
    const departureTotals: Record<string, number> = {}
    const arrivalTotals: Record<string, number> = {}
    
    docs.forEach((doc: any) => {
      if (doc.departureCounts) {
        Object.entries(doc.departureCounts).forEach(([portId, count]) => {
          departureTotals[portId] = (departureTotals[portId] || 0) + (count as number)
        })
      }
      if (doc.arrivalCounts) {
        Object.entries(doc.arrivalCounts).forEach(([portId, count]) => {
          arrivalTotals[portId] = (arrivalTotals[portId] || 0) + (count as number)
        })
      }
    })
    
    const totalDepartures = Object.values(departureTotals).reduce((sum, count) => sum + count, 0)
    const totalArrivals = Object.values(arrivalTotals).reduce((sum, count) => sum + count, 0)
    
    const departureDistribution = Object.entries(departureTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([id, count]) => ({
        id,
        name: id, // 後でポート名に置換
        count: count as number,
        percentage: totalDepartures > 0 ? Math.round(((count as number) / totalDepartures) * 100) : 0
      }))
    
    const arrivalDistribution = Object.entries(arrivalTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([id, count]) => ({
        id,
        name: id, // 後でポート名に置換
        count: count as number,
        percentage: totalArrivals > 0 ? Math.round(((count as number) / totalArrivals) * 100) : 0
      }))
    
    return {
      departure: departureDistribution,
      arrival: arrivalDistribution
    }
  }
  
  /**
   * PV推移データを取得
   */
  const getPvTrend = async (startDate: Date, endDate: Date) => {
    const docs = await getAnalyticsInRange(startDate, endDate, 'daily')
    
    return docs.map((doc: any) => ({
      date: doc.dateKey,
      pv: doc.pvTotal || 0,
      search: doc.searchTotal || 0
    }))
  }

  // ========================================
  // レガシー実装（管理画面向け）
  // ========================================

  const getAdminCollection = async <T = any>(collectionName: string) => {
    if (typeof useAdminFirestore !== 'function') {
      return [] as T[]
    }
    let admin: { getCollection?: <D>(name: string) => Promise<D[]> } | null = null
    try {
      admin = useAdminFirestore()
    } catch {
      return [] as T[]
    }
    if (!admin || typeof admin.getCollection !== 'function') {
      return [] as T[]
    }
    const result = await admin.getCollection<T>(collectionName)
    return Array.isArray(result) ? result : ([] as T[])
  }

  const normalizeDate = (value: any) => {
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const isWithinRange = (value: any, start: Date, end: Date) => {
    const date = normalizeDate(value)
    if (!date) {
      return false
    }
    return date >= start && date <= end
  }

  const getDateRange = (period: 'day' | 'week' | 'month', baseDate: Date) => {
    const base = normalizeDate(baseDate) ?? new Date()
    if (period === 'week') {
      return {
        start: startOfDay(subDays(base, 6)),
        end: endOfDay(base)
      }
    }
    if (period === 'month') {
      return {
        start: startOfMonth(base),
        end: endOfMonth(base)
      }
    }
    return {
      start: startOfDay(base),
      end: endOfDay(base)
    }
  }

  const getPageViewStats = async (period: 'day' | 'week' | 'month', date: Date) => {
    const { start, end } = getDateRange(period, date)
    const pageViews = await getAdminCollection<any>('pageViews')
    const filtered = pageViews.filter((view) => isWithinRange(view.timestamp, start, end))

    const pageStats: Record<string, number> = {}
    const hourlyStats = Array(24).fill(0)

    filtered.forEach((view) => {
      const pagePath = view.page || view.path || 'unknown'
      pageStats[pagePath] = (pageStats[pagePath] || 0) + 1

      const timestamp = normalizeDate(view.timestamp)
      if (timestamp) {
        hourlyStats[timestamp.getHours()] += 1
      }
    })

    return {
      total: filtered.length,
      pageStats,
      hourlyStats
    }
  }

  const getUniqueUsersCount = async (startDate: Date, endDate: Date) => {
    const pageViews = await getAdminCollection<any>('pageViews')
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)
    const uniqueIds = new Set<string>()

    pageViews.forEach((view) => {
      if (!isWithinRange(view.timestamp, start, end)) {
        return
      }
      const id = view.userId || view.sessionId
      if (id) {
        uniqueIds.add(id)
      }
    })

    return uniqueIds.size
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (!previous) {
      return 0
    }
    return Math.round(((current - previous) / previous) * 10000) / 100
  }

  const calculateBounceRate = (sessions: any[]) => {
    if (sessions.length === 0) {
      return 0
    }
    const bounceCount = sessions.filter((session) => (session.pageCount ?? 0) <= 1).length
    return Math.round(((bounceCount / sessions.length) * 100) * 100) / 100
  }

  const getAccessTrends = async (startDate: Date, endDate: Date) => {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)
    const pageViews = await getAdminCollection<any>('pageViews')
    const filteredPageViews = pageViews.filter((view) => isWithinRange(view.timestamp, start, end))
    const uniqueUsers = await getUniqueUsersCount(startDate, endDate)

    const periodDays = Math.max(differenceInCalendarDays(end, start) + 1, 1)
    const previousStart = startOfDay(subDays(start, periodDays))
    const previousEnd = endOfDay(subDays(start, 1))

    const previousPageViews = await getAdminCollection<any>('pageViews')
    const filteredPreviousPageViews = previousPageViews.filter((view) =>
      isWithinRange(view.timestamp, previousStart, previousEnd)
    )
    const previousUniqueUsers = await getUniqueUsersCount(previousStart, previousEnd)

    const sessions = await getAdminCollection<any>('sessions')
    const filteredSessions = sessions.filter((session) => isWithinRange(session.startTime, start, end))

    const previousSessions = await getAdminCollection<any>('sessions')
    const filteredPreviousSessions = previousSessions.filter((session) =>
      isWithinRange(session.startTime, previousStart, previousEnd)
    )

    const total = filteredPageViews.length
    const avgSessionDuration = filteredSessions.length > 0
      ? Math.round(filteredSessions.reduce((sum, session) => sum + (session.duration || 0), 0) / filteredSessions.length)
      : 0
    const bounceRate = calculateBounceRate(filteredSessions)

    const hourlyData = Array(24).fill(0)
    filteredPageViews.forEach((view) => {
      const timestamp = normalizeDate(view.timestamp)
      if (timestamp) {
        hourlyData[timestamp.getHours()] += 1
      }
    })

    return {
      total,
      uniqueUsers,
      avgSessionDuration,
      bounceRate,
      hourlyData,
      growth: calculateGrowth(total, filteredPreviousPageViews.length),
      userGrowth: calculateGrowth(uniqueUsers, previousUniqueUsers),
      sessionGrowth: calculateGrowth(filteredSessions.length, filteredPreviousSessions.length),
      bounceGrowth: calculateGrowth(bounceRate, calculateBounceRate(filteredPreviousSessions))
    }
  }

  const getAccessTrend = async (days: number = 30) => {
    if (days <= 0) {
      return []
    }

    const pageViews = await getAdminCollection<any>('pageViews')
    const endDate = startOfDay(new Date())
    const dateCounts: Record<string, number> = {}

    pageViews.forEach((view) => {
      const timestamp = normalizeDate(view.timestamp)
      if (!timestamp) {
        return
      }
      const dateKey = format(timestamp, 'yyyy-MM-dd')
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1
    })

    return Array.from({ length: days }, (_, index) => {
      const date = subDays(endDate, index)
      const dateKey = format(date, 'yyyy-MM-dd')
      return {
        date: dateKey,
        count: dateCounts[dateKey] || 0
      }
    })
  }

  const PAGE_TITLES: Record<string, string> = {
    '/': 'ホーム',
    '/transit': '航路検索',
    '/timetable': '時刻表',
    '/fare': '運賃',
    '/status': '運航状況',
    '/news': 'お知らせ'
  }

  const getPopularPages = async (startDate: Date, endDate: Date, limit: number = 10) => {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)
    const pageViews = await getAdminCollection<any>('pageViews')
    const filtered = pageViews.filter((view) => isWithinRange(view.timestamp, start, end))

    const counts: Record<string, number> = {}
    filtered.forEach((view) => {
      const pagePath = view.page || view.path
      if (!pagePath) {
        return
      }
      counts[pagePath] = (counts[pagePath] || 0) + 1
    })

    return Object.entries(counts)
      .map(([path, views]) => ({
        path,
        views,
        title: PAGE_TITLES[path] || path
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)
  }

  const getReferrerStats = async (startDate: Date, endDate: Date) => {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)
    const pageViews = await getAdminCollection<any>('pageViews')
    const filtered = pageViews.filter((view) => isWithinRange(view.timestamp, start, end))

    const stats: Record<string, number> = {}
    filtered.forEach((view) => {
      const referrer = view.referrer
      if (!referrer) {
        stats.direct = (stats.direct || 0) + 1
        return
      }

      try {
        const hostname = new URL(referrer).hostname
        let key = hostname
        if (hostname.includes('google.')) {
          key = 'google'
        } else if (hostname.includes('yahoo.')) {
          key = 'yahoo'
        }
        stats[key] = (stats[key] || 0) + 1
      } catch {
        stats.direct = (stats.direct || 0) + 1
      }
    })

    return stats
  }

  const getErrorStats = async (startDate: Date, endDate: Date) => {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)
    const errorLogs = await getAdminCollection<any>('errorLogs')
    const filtered = errorLogs.filter((log) => isWithinRange(log.timestamp, start, end))

    const stats: Record<string, number> = {}
    filtered.forEach((log) => {
      const rawType = log.type ?? (log.status != null ? String(log.status) : null)
      const normalized = rawType === '404' || rawType === '500' || rawType === 'network' ? rawType : 'other'
      stats[normalized] = (stats[normalized] || 0) + 1
    })

    return stats
  }

  const getDeviceStats = async () => {
    const pageViews = await getAdminCollection<any>('pageViews')
    const deviceTypes: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 }
    const browsers: Record<string, number> = {}
    const os: Record<string, number> = {}

    pageViews.forEach((view) => {
      if (view.deviceType) {
        deviceTypes[view.deviceType] = (deviceTypes[view.deviceType] || 0) + 1
      }
      if (view.browser) {
        browsers[view.browser] = (browsers[view.browser] || 0) + 1
      }
      if (view.os) {
        os[view.os] = (os[view.os] || 0) + 1
      }
    })

    return {
      deviceTypes,
      browsers,
      os
    }
  }

  const getConversionStats = async (startDate: Date, endDate: Date) => {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)
    const searchLogs = await getAdminCollection<any>('searchLogs')
    const filtered = searchLogs.filter((log) => isWithinRange(log.timestamp, start, end))

    const totalSearches = filtered.length
    const successfulSearches = filtered.filter((log) => log.found).length
    const conversionRate = totalSearches > 0
      ? Math.round((successfulSearches / totalSearches) * 100)
      : 0

    const routeStats: Record<string, { total: number; success: number }> = {}
    filtered.forEach((log) => {
      const from = log.departure || log.fromPort
      const to = log.arrival || log.toPort
      if (!from || !to) {
        return
      }
      const routeKey = `${from} → ${to}`
      if (!routeStats[routeKey]) {
        routeStats[routeKey] = { total: 0, success: 0 }
      }
      routeStats[routeKey].total += 1
      if (log.found) {
        routeStats[routeKey].success += 1
      }
    })

    const routeConversions = Object.entries(routeStats)
      .map(([route, stats]) => ({
        route,
        total: stats.total,
        success: stats.success,
        rate: stats.total > 0 ? Math.round(((stats.success / stats.total) * 100) * 100) / 100 : 0
      }))
      .sort((a, b) => b.total - a.total)

    return {
      totalSearches,
      successfulSearches,
      conversionRate,
      routeConversions
    }
  }

  const getPageFlowStats = async (startDate: Date, endDate: Date) => {
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)
    const sessions = await getAdminCollection<any>('sessions')
    const filtered = sessions.filter((session) => isWithinRange(session.startTime, start, end))

    const transitions: Record<string, number> = {}
    filtered.forEach((session) => {
      const pageViews: string[] = session.pageViews || []
      if (pageViews.length < 2) {
        return
      }
      for (let i = 0; i < pageViews.length - 1; i += 1) {
        const transition = `${pageViews[i]} → ${pageViews[i + 1]}`
        transitions[transition] = (transitions[transition] || 0) + 1
      }
    })

    return Object.entries(transitions)
      .map(([transition, count]) => ({ transition, count }))
      .sort((a, b) => b.count - a.count)
  }
  
  return {
    // 新規実装
    trackPageView,
    trackSearch,
    getDailyAnalytics,
    getMonthlyAnalytics,
    getAnalyticsInRange,
    getPopularRoutes,
    getHourlyDistribution,
    getPortDistribution,
    getPvTrend,
    
    // レガシー実装（既存のコード互換性維持）
    getPageViewStats,
    getUniqueUsersCount,
    getAccessTrends,
    getPopularPages,
    getReferrerStats,
    getRouteSearchStats: async (limit: number = 10) => [],
    getErrorStats,
    getDeviceStats,
    getLocationStats: async (startDate: Date, endDate: Date, limit: number = 10) => [],
    getConversionStats,
    getPageFlowStats,
    getAccessTrend,
    calculateKPIs: async (period: 'day' | 'week' | 'month' = 'month') => ({
      current: { pageViews: 0, uniqueUsers: 0, avgSessionDuration: 0, bounceRate: 0 },
      previous: { pageViews: 0, uniqueUsers: 0, avgSessionDuration: 0, bounceRate: 0 },
      trends: { pageViewsTrend: 0, uniqueUsersTrend: 0, avgSessionTrend: 0, bounceRateTrend: 0 }
    })
  }
}
