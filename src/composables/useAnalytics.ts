import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { doc, getDoc, getDocs, collection, where, orderBy, query, setDoc, increment } from 'firebase/firestore'

// ========================================
// アクセス統計機能（新実装）
// ========================================

/**
 * アクセス統計の追跡・取得を行うcomposable
 */
export const useAnalytics = () => {
  const { $firebase, $isOffline } = useNuxtApp()
  const db = $firebase.db
  
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
    if ($isOffline) {
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
    if ($isOffline) {
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
    const docRef = doc(db, collectionName, docId)
    await setDoc(docRef, data, { merge: true })
  }
  
  // ========================================
  // 統計データ取得機能
  // ========================================
  
  /**
   * 日次統計の取得
   */
  const getDailyAnalytics = async (dateKey: string) => {
    const docRef = doc(db, 'analytics_daily', dateKey)
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
    const docRef = doc(db, 'analytics_monthly', monthKey)
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
    const docRef = doc(db, 'analytics_hourly', hourKey)
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
      const collectionRef = collection(db, collectionName)
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
    getAccessTrends: async (startDate: Date, endDate: Date) => ({
      total: 0,
      uniqueUsers: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      hourlyData: Array(24).fill(0),
      growth: 0,
      userGrowth: 0,
      sessionGrowth: 0,
      bounceGrowth: 0
    }),
    getPopularPages: async (startDate: Date, endDate: Date, limit: number = 10) => [],
    getReferrerStats: async (startDate: Date, endDate: Date) => ({}),
    getRouteSearchStats: async (limit: number = 10) => [],
    getErrorStats: async (startDate: Date, endDate: Date) => ({}),
    getDeviceStats: async () => ({
      deviceTypes: { desktop: 0, mobile: 0, tablet: 0 },
      browsers: {},
      os: { ios: 0, android: 0, other: 0 }
    }),
    getLocationStats: async (startDate: Date, endDate: Date, limit: number = 10) => [],
    getConversionStats: async (startDate: Date, endDate: Date) => ({
      totalSearches: 0,
      successfulSearches: 0,
      conversionRate: 0,
      routeConversions: []
    }),
    getPageFlowStats: async (startDate: Date, endDate: Date) => [],
    getAccessTrend: async (days: number = 30) => [],
    calculateKPIs: async (period: 'day' | 'week' | 'month' = 'month') => ({
      current: { pageViews: 0, uniqueUsers: 0, avgSessionDuration: 0, bounceRate: 0 },
      previous: { pageViews: 0, uniqueUsers: 0, avgSessionDuration: 0, bounceRate: 0 },
      trends: { pageViewsTrend: 0, uniqueUsersTrend: 0, avgSessionTrend: 0, bounceRateTrend: 0 }
    })
  }
}
