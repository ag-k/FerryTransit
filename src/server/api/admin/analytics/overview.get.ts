import { firestore } from '~/server/utils/firebase-admin'
import { requireAdminAuth } from '~/server/utils/admin-auth'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from 'date-fns'

export default defineEventHandler(async (event) => {
  // 管理者認証の確認
  await requireAdminAuth(event)
  
  try {
    const query = getQuery(event)
    const period = (query.period as string) || 'month'
    
    const now = new Date()
    let startDate: Date
    let endDate: Date
    
    switch (period) {
      case 'day':
        startDate = startOfDay(now)
        endDate = endOfDay(now)
        break
      case 'week':
        startDate = subDays(now, 7)
        endDate = now
        break
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      default:
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
    }
    
    // ページビュー統計
    const pageViewsSnapshot = await firestore.collection('pageViews')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get()
    
    const pageViews = pageViewsSnapshot.size
    
    // ユニークユーザー数
    const uniqueUsers = new Set(
      pageViewsSnapshot.docs.map(doc => doc.data().userId || doc.data().sessionId)
    ).size
    
    // 人気ページ
    const pageStats: Record<string, number> = {}
    pageViewsSnapshot.docs.forEach(doc => {
      const page = doc.data().page || 'unknown'
      pageStats[page] = (pageStats[page] || 0) + 1
    })
    
    const popularPages = Object.entries(pageStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([page, count]) => ({ page, count }))
    
    // 検索統計
    const searchLogsSnapshot = await firestore.collection('searchLogs')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .where('type', '==', 'route')
      .get()
    
    const routeSearchCount: Record<string, number> = {}
    searchLogsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const route = `${data.departure} → ${data.arrival}`
      routeSearchCount[route] = (routeSearchCount[route] || 0) + 1
    })
    
    const popularRoutes = Object.entries(routeSearchCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }))
    
    // エラー統計
    const errorLogsSnapshot = await firestore.collection('errorLogs')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get()
    
    const errorCount = errorLogsSnapshot.size
    
    // KPI計算
    const avgPagesPerSession = pageViews / (uniqueUsers || 1)
    const searchConversionRate = (searchLogsSnapshot.size / pageViews) * 100
    
    return {
      period: {
        start: startDate,
        end: endDate
      },
      kpis: {
        pageViews,
        uniqueUsers,
        avgPagesPerSession: parseFloat(avgPagesPerSession.toFixed(2)),
        searchConversionRate: parseFloat(searchConversionRate.toFixed(2)),
        errorCount
      },
      popularPages,
      popularRoutes,
      trends: {
        pageViewsTrend: 15.3,  // 仮の値
        uniqueUsersTrend: 8.7,  // 仮の値
        errorTrend: -5.2       // 仮の値
      }
    }
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch analytics'
    })
  }
})