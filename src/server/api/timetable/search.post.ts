import { createLogger } from '~/utils/logger'

const logger = createLogger('TimetableSearchPostApi')

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      departure, 
      arrival, 
      date, 
      ship, 
      startDate, 
      endDate, 
      limit = 100,
      offset = 0,
      sortBy = 'departure_time',
      sortOrder = 'asc'
    } = body

    // 時刻表データを取得
    const timetableResponse = await $fetch('/api/timetable')

    let filteredTrips = timetableResponse

    // 出発地でフィルタ
    if (departure) {
      const departureUpper = departure.toUpperCase()
      filteredTrips = filteredTrips.filter((trip: any) => 
        trip.departure === departureUpper
      )
    }

    // 到着地でフィルタ
    if (arrival) {
      const arrivalUpper = arrival.toUpperCase()
      filteredTrips = filteredTrips.filter((trip: any) => 
        trip.arrival === arrivalUpper
      )
    }

    // 船名でフィルタ
    if (ship) {
      const shipUpper = ship.toUpperCase()
      filteredTrips = filteredTrips.filter((trip: any) => 
        trip.name === shipUpper
      )
    }

    // 特定の日付でフィルタ
    if (date) {
      const searchDate = new Date(date)
      filteredTrips = filteredTrips.filter((trip: any) => {
        const startDate = new Date(trip.start_date)
        const endDate = new Date(trip.end_date)
        return searchDate >= startDate && searchDate <= endDate
      })
    }

    // 日付範囲でフィルタ
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      filteredTrips = filteredTrips.filter((trip: any) => {
        const tripStart = new Date(trip.start_date)
        const tripEnd = new Date(trip.end_date)
        return (tripStart >= start && tripStart <= end) || 
               (tripEnd >= start && tripEnd <= end) ||
               (tripStart <= start && tripEnd >= end)
      })
    }

    // ソート処理
    filteredTrips.sort((a: any, b: any) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'departure_time':
          aValue = a.departure_time
          bValue = b.departure_time
          break
        case 'arrival_time':
          aValue = a.arrival_time
          bValue = b.arrival_time
          break
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'start_date':
          aValue = new Date(a.start_date)
          bValue = new Date(b.start_date)
          break
        default:
          aValue = a.departure_time
          bValue = b.departure_time
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    })

    // 総件数を取得
    const totalCount = filteredTrips.length

    // ページネーション
    const paginatedTrips = filteredTrips.slice(offset, offset + limit)

    // 結果を整形
    const results = paginatedTrips.map((trip: any) => ({
      tripId: trip.trip_id,
      nextId: trip.next_id || null,
      startDate: trip.start_date,
      endDate: trip.end_date,
      name: trip.name,
      departure: trip.departure,
      departureTime: trip.departure_time,
      arrival: trip.arrival,
      arrivalTime: trip.arrival_time,
      duration: calculateDuration(trip.departure_time, trip.arrival_time),
      type: getShipType(trip.name),
      status: 0 // 仮に正常運航として設定
    }))

    return {
      success: true,
      data: {
        searchParams: {
          departure,
          arrival,
          date,
          ship,
          startDate,
          endDate,
          limit,
          offset,
          sortBy,
          sortOrder
        },
        results,
        pagination: {
          totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    }

  } catch (error) {
    logger.error('Timetable API error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: '時刻表の取得に失敗しました'
    })
  }
})

// 時刻から所要時間を計算（分）
function calculateDuration(departureTime: string, arrivalTime: string): number {
  const [depHour, depMin] = departureTime.split(':').map(Number)
  const [arrHour, arrMin] = arrivalTime.split(':').map(Number)
  
  const depMinutes = depHour * 60 + depMin
  const arrMinutes = arrHour * 60 + arrMin
  
  // 日付をまたぐ場合
  if (arrMinutes < depMinutes) {
    return (24 * 60) - depMinutes + arrMinutes
  }
  
  return arrMinutes - depMinutes
}

// 船名から船種を判定
function getShipType(shipName: string): string {
  if (shipName.includes('RAINBOW')) return 'highspeed'
  if (shipName.includes('FERRY')) return 'ferry'
  return 'local'
}
