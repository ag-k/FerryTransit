import { createPinia } from 'pinia'
import { useRouteSearch } from '~/composables/useRouteSearch'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { departure, arrival, date, time, isArrivalMode = false } = query

    // バリデーション
    if (!departure || !arrival) {
      throw createError({
        statusCode: 400,
        statusMessage: '出発地と目的地は必須です'
      })
    }

    if (!date) {
      throw createError({
        statusCode: 400,
        statusMessage: '日付は必須です'
      })
    }

    // 日付と時刻のパース
    const searchDate = new Date(date as string)
    if (isNaN(searchDate.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: '日付の形式が無効です'
      })
    }

    const searchTime = (time as string) || '00:00'

    // Piniaストアを初期化
    const pinia = createPinia()
    
    // 料金ストアとフェリーストアを初期化
    const { useFareStore } = await import('~/stores/fare')
    const { useFerryStore } = await import('~/stores/ferry')
    
    const fareStore = useFareStore(pinia)
    const ferryStore = useFerryStore(pinia)

    // データ読み込み
    await Promise.all([
      fareStore.loadFareMaster(),
      ferryStore.loadTimetableData()
    ])

    // ルート検索
    const { searchRoutes } = useRouteSearch()
    const results = await searchRoutes(
      (departure as string).toUpperCase(),
      (arrival as string).toUpperCase(),
      searchDate,
      searchTime,
      isArrivalMode === 'true'
    )

    // 結果の整形
    const formattedResults = results.map(route => ({
      id: route.id,
      departureTime: route.departureTime.toISOString(),
      arrivalTime: route.arrivalTime.toISOString(),
      totalFare: route.totalFare,
      duration: Math.round((route.arrivalTime.getTime() - route.departureTime.getTime()) / (1000 * 60)),
      segments: route.segments.map(segment => ({
        tripId: segment.tripId,
        ship: segment.ship,
        departure: segment.departure,
        arrival: segment.arrival,
        departureTime: segment.departureTime.toISOString(),
        arrivalTime: segment.arrivalTime.toISOString(),
        fare: segment.fare,
        status: segment.status
      }))
    }))

    return {
      success: true,
      data: {
        searchParams: {
          departure,
          arrival,
          date,
          time: searchTime,
          isArrivalMode
        },
        results: formattedResults,
        count: formattedResults.length
      }
    }

  } catch (error) {
    console.error('Transit search API error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '乗換案内の検索に失敗しました'
    })
  }
})
