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

    // 料金データを取得
    const fareResponse = await $fetch('/api/fare')
    
    // 時刻表データを取得
    const timetableResponse = await $fetch('/api/timetable')

    // 検索条件に合う便を抽出
    const departureUpper = (departure as string).toUpperCase()
    const arrivalUpper = (arrival as string).toUpperCase()
    
    const matchingTrips = timetableResponse.filter((trip: any) => {
      // 日付範囲のチェック
      const startDate = new Date(trip.start_date)
      const endDate = new Date(trip.end_date)
      const isValidDate = searchDate >= startDate && searchDate <= endDate
      
      // 路線のチェック
      const isValidRoute = trip.departure === departureUpper && trip.arrival === arrivalUpper
      
      return isValidDate && isValidRoute
    })

    // 結果を整形
    const results = matchingTrips.map((trip: any) => {
      // 料金検索
      const fareRoute = fareResponse.routes?.find((route: any) => 
        route.departure === departureUpper && route.arrival === arrivalUpper
      )
      
      const fare = fareRoute?.fares?.adult || 0
      
      // 時刻を組み立て
      const departureDateTime = new Date(`${date} ${trip.departure_time}`)
      const arrivalDateTime = new Date(`${date} ${trip.arrival_time}`)
      
      return {
        id: `route_${trip.trip_id}`,
        departureTime: departureDateTime.toISOString(),
        arrivalTime: arrivalDateTime.toISOString(),
        totalFare: fare,
        duration: Math.round((arrivalDateTime.getTime() - departureDateTime.getTime()) / (1000 * 60)),
        segments: [{
          tripId: String(trip.trip_id),
          ship: trip.name,
          departure: trip.departure,
          arrival: trip.arrival,
          departureTime: departureDateTime.toISOString(),
          arrivalTime: arrivalDateTime.toISOString(),
          fare: fare,
          status: 0 // 仮に正常運航として設定
        }]
      }
    })

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
        results,
        count: results.length
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
