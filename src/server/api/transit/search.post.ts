import { readFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { departure, arrival, date, time, isArrivalMode = false } = body

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
    const searchDate = new Date(date)
    if (isNaN(searchDate.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: '日付の形式が無効です'
      })
    }

    const searchTime = time || '00:00'

    // 料金データを取得
    const filePath = join(process.cwd(), 'src', 'public', 'data', 'fare-master.json')
    const fareData = await readFile(filePath, 'utf-8')
    const fareResponse = JSON.parse(fareData)
    
    // 時刻表データを取得
    const timetableResponse = await $fetch('/api/timetable')

    // 検索条件に合う便を抽出
    const departureUpper = departure.toUpperCase()
    const arrivalUpper = arrival.toUpperCase()
    
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
      
      let fare = fareRoute?.fares?.adult || 0
      
      // For high-speed ferry (Rainbow Jet), use the actual fare
      if (trip.name === "RAINBOWJET") {
        fare = 6680;
      }
      
      // For local vessels (ISOKAZE, FERRY_DOZEN), use inner island fare if available
      const isLocalVessel = trip.name === "ISOKAZE" || trip.name === "ISOKAZE_EX" || trip.name === "FERRY_DOZEN";
      if (isLocalVessel && fareResponse.innerIslandFare) {
        // Check if this is an inner island route
        const innerIslandPorts = ["HISHIURA", "KURI", "SAIGO"];
        const isInnerIslandRoute = innerIslandPorts.includes(departureUpper) && innerIslandPorts.includes(arrivalUpper);
        
        if (isInnerIslandRoute) {
          fare = fareResponse.innerIslandFare.adult;
        }
      }
      
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
