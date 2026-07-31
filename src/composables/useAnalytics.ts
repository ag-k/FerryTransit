import { format, parseISO, startOfWeek } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import type { AnalyticsTrendGranularity } from '~/types/analytics'
import { createLogger } from '~/utils/logger'

export const getAnalyticsCounterMap = (
  source: Record<string, unknown>,
  fieldName: string
): Record<string, number> => {
  const counters: Record<string, number> = {}
  const nested = source[fieldName]

  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    Object.entries(nested as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        counters[key] = (counters[key] || 0) + value
      }
    })
  }

  const legacyPrefix = `${fieldName}.`
  Object.entries(source).forEach(([key, value]) => {
    if (!key.startsWith(legacyPrefix) || typeof value !== 'number' || !Number.isFinite(value)) {
      return
    }

    const counterKey = key.slice(legacyPrefix.length)
    if (counterKey) {
      counters[counterKey] = (counters[counterKey] || 0) + value
    }
  })

  return counters
}

export const useAnalytics = () => {
  const nuxtApp = typeof useNuxtApp === 'function' ? useNuxtApp() : null
  const $firebase = nuxtApp?.$firebase
  const $isOffline = nuxtApp?.$isOffline ?? false
  const logger = createLogger('Analytics')
  const timezone = 'Asia/Tokyo'

  const getDb = () => {
    if (!$firebase?.db) {
      throw new Error('Firebase plugin not initialized')
    }
    return $firebase.db
  }

  const getFunctions = () => {
    if (!$firebase?.functions) {
      throw new Error('Firebase Functions not initialized')
    }
    return $firebase.functions
  }

  const getTokyoDate = (date: Date = new Date()) => toZonedTime(date, timezone)
  const getDateKey = (date: Date = new Date()) => format(getTokyoDate(date), 'yyyy-MM-dd')
  const getMonthKey = (date: Date = new Date()) => format(getTokyoDate(date), 'yyyy-MM')
  const getHourKey = (date: Date = new Date()) => {
    return `${getDateKey(date)}-${format(getTokyoDate(date), 'HH')}`
  }

  const trackPageView = async ({ pagePath: _pagePath }: { pagePath: string }) => {
    if ($isOffline || !$firebase?.functions) {
      return
    }

    try {
      const track = httpsCallable(getFunctions(), 'trackAnalytics')
      await track({ type: 'page_view' })
    } catch (error) {
      logger.warn('Failed to track page view:', error)
    }
  }

  const trackSearch = async ({
    depId,
    arrId,
    datetime
  }: {
    depId: string
    arrId: string
    datetime?: string
  }) => {
    if ($isOffline || !$firebase?.functions) {
      return
    }

    try {
      const track = httpsCallable(getFunctions(), 'trackAnalytics')
      await track({
        type: 'search',
        depId,
        arrId,
        datetime: datetime ?? new Date().toISOString()
      })
    } catch (error) {
      logger.warn('Failed to track search:', error)
    }
  }

  const getDailyAnalytics = async (dateKey: string) => {
    const docSnap = await getDoc(doc(getDb(), 'analytics_daily', dateKey))
    return docSnap.exists() ? docSnap.data() : null
  }

  const getMonthlyAnalytics = async (monthKey: string) => {
    const docSnap = await getDoc(doc(getDb(), 'analytics_monthly', monthKey))
    return docSnap.exists() ? docSnap.data() : null
  }

  const getAnalyticsInRange = async (
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'monthly' | 'hourly' = 'daily'
  ): Promise<Array<Record<string, unknown> & { id: string }>> => {
    const collectionName = `analytics_${granularity}`
    const getKey = granularity === 'daily'
      ? getDateKey
      : granularity === 'monthly'
        ? getMonthKey
        : getHourKey
    const startKey = getKey(startDate)
    const endKey = getKey(endDate)
    const rangeQuery = query(
      collection(getDb(), collectionName),
      where('__name__', '>=', startKey),
      where('__name__', '<=', endKey),
      orderBy('__name__')
    )
    const querySnapshot = await getDocs(rangeQuery)

    return querySnapshot.docs.map(snapshot => ({
      id: snapshot.id,
      ...(snapshot.data() as Record<string, unknown>)
    }))
  }

  const getPopularRoutes = async (
    startDate: Date,
    endDate: Date,
    limitValue: number = 3
  ) => {
    const documents = await getAnalyticsInRange(startDate, endDate, 'daily')
    const routeTotals: Record<string, number> = {}

    documents.forEach((document) => {
      const routeCounts = getAnalyticsCounterMap(document, 'routeCounts')
      Object.entries(routeCounts).forEach(([routeKey, count]) => {
        routeTotals[routeKey] = (routeTotals[routeKey] || 0) + count
      })
    })

    return Object.entries(routeTotals)
      .sort(([, first], [, second]) => second - first)
      .slice(0, limitValue)
      .map(([routeKey, count]) => {
        const [depId = '', arrId = ''] = routeKey.split('-')
        return {
          routeKey,
          depId,
          arrId,
          count
        }
      })
  }

  const getHourlyDistribution = async (startDate: Date, endDate: Date) => {
    const documents = await getAnalyticsInRange(startDate, endDate, 'hourly')
    const daysCount = Math.max(
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      1
    )
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      pv: 0,
      search: 0
    }))

    documents.forEach((document) => {
      const hourText = typeof document.hourKey === 'string'
        ? document.hourKey.split('-')[3]
        : undefined
      const hour = hourText ? Number.parseInt(hourText, 10) : -1
      if (hour >= 0 && hour < 24) {
        const bucket = hourlyData[hour]
        if (bucket) {
          bucket.pv += typeof document.pvTotal === 'number' ? document.pvTotal : 0
          bucket.search += typeof document.searchTotal === 'number'
            ? document.searchTotal
            : 0
        }
      }
    })

    if (daysCount > 1) {
      hourlyData.forEach((data) => {
        data.pv = Math.round(data.pv / daysCount)
        data.search = Math.round(data.search / daysCount)
      })
    }

    return hourlyData
  }

  const getPortDistribution = async (startDate: Date, endDate: Date) => {
    const documents = await getAnalyticsInRange(startDate, endDate, 'daily')
    const departureTotals: Record<string, number> = {}
    const arrivalTotals: Record<string, number> = {}

    documents.forEach((document) => {
      Object.entries(getAnalyticsCounterMap(document, 'departureCounts'))
        .forEach(([portId, count]) => {
          departureTotals[portId] = (departureTotals[portId] || 0) + count
        })
      Object.entries(getAnalyticsCounterMap(document, 'arrivalCounts'))
        .forEach(([portId, count]) => {
          arrivalTotals[portId] = (arrivalTotals[portId] || 0) + count
        })
    })

    const buildDistribution = (totals: Record<string, number>) => {
      const total = Object.values(totals).reduce((sum, count) => sum + count, 0)
      return Object.entries(totals)
        .sort(([, first], [, second]) => second - first)
        .map(([id, count]) => ({
          id,
          name: id,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0
        }))
    }

    return {
      departure: buildDistribution(departureTotals),
      arrival: buildDistribution(arrivalTotals)
    }
  }

  const getPvTrend = async (
    startDate: Date,
    endDate: Date,
    granularity: AnalyticsTrendGranularity = 'daily'
  ) => {
    const documents = await getAnalyticsInRange(startDate, endDate, 'daily')
    const buckets = new Map<string, { date: string; pv: number; search: number }>()

    documents.forEach((document) => {
      const dateKey = typeof document.dateKey === 'string' ? document.dateKey : document.id
      let bucketKey = dateKey

      if (granularity === 'weekly') {
        bucketKey = format(
          startOfWeek(parseISO(dateKey), { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        )
      } else if (granularity === 'monthly') {
        bucketKey = dateKey.slice(0, 7)
      }

      const bucket = buckets.get(bucketKey) ?? {
        date: bucketKey,
        pv: 0,
        search: 0
      }
      bucket.pv += typeof document.pvTotal === 'number' ? document.pvTotal : 0
      bucket.search += typeof document.searchTotal === 'number' ? document.searchTotal : 0
      buckets.set(bucketKey, bucket)
    })

    return [...buckets.values()].sort((first, second) => {
      return first.date.localeCompare(second.date)
    })
  }

  return {
    trackPageView,
    trackSearch,
    getDailyAnalytics,
    getMonthlyAnalytics,
    getAnalyticsInRange,
    getPopularRoutes,
    getHourlyDistribution,
    getPortDistribution,
    getPvTrend
  }
}
