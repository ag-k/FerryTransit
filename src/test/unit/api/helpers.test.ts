import { describe, it, expect } from 'vitest'

// APIで使用するヘルパー関数をテスト
describe('APIヘルパー関数', () => {
  describe('calculateDuration', () => {
    it('同じ日内の時間差を計算できること', () => {
      const duration = calculateDuration('08:00', '08:12')
      expect(duration).toBe(12)
    })

    it('日付をまたぐ時間差を計算できること', () => {
      const duration = calculateDuration('23:50', '00:10')
      expect(duration).toBe(20) // 23:50から24:00まで10分 + 00:00から00:10まで10分
    })

    it('正午をまたぐ時間差を計算できること', () => {
      const duration = calculateDuration('10:00', '14:30')
      expect(duration).toBe(270) // 4時間30分 = 270分
    })

    it('分単位の正確な計算ができること', () => {
      const duration = calculateDuration('08:15', '09:45')
      expect(duration).toBe(90) // 1時間30分 = 90分
    })
  })

  describe('getShipType', () => {
    it('RAINBOWを含む船名はhighspeedになること', () => {
      expect(getShipType('RAINBOWJET')).toBe('highspeed')
      expect(getShipType('RAINBOW2')).toBe('highspeed')
      expect(getShipType('SUPER-RAINBOW')).toBe('highspeed')
    })

    it('FERRYを含む船名はferryになること', () => {
      expect(getShipType('FERRY_DOZEN')).toBe('ferry')
      expect(getShipType('FERRY_KUNIGA')).toBe('ferry')
      expect(getShipType('NEW-FERRY')).toBe('ferry')
    })

    it('その他の船名はlocalになること', () => {
      expect(getShipType('ISOKAZE')).toBe('local')
      expect(getShipType('NISHIKAZE')).toBe('local')
      expect(getShipType('SAIKAI')).toBe('local')
    })
  })

  describe('getPortName', () => {
    it('港コードから日本語名を取得できること', () => {
      expect(getPortName('BEPPU')).toBe('別府')
      expect(getPortName('HISHIURA')).toBe('菱浦')
      expect(getPortName('SAIGO')).toBe('西郷')
      expect(getPortName('KURI')).toBe('来居')
      expect(getPortName('AMA')).toBe('海士')
    })

    it('未知の港コードはそのまま返されること', () => {
      expect(getPortName('UNKNOWN')).toBe('UNKNOWN')
      expect(getPortName('TEST')).toBe('TEST')
    })
  })

  describe('データ整形関数', () => {
    it('時刻表データが正しく整形されること', () => {
      const mockTrip = {
        trip_id: '123',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        name: 'FERRY_DOZEN',
        departure: 'BEPPU',
        departure_time: '08:00',
        arrival: 'HISHIURA',
        arrival_time: '08:12'
      }

      const formatted = formatTimetableTrip(mockTrip)

      expect(formatted.tripId).toBe('123')
      expect(formatted.name).toBe('FERRY_DOZEN')
      expect(formatted.departure).toBe('BEPPU')
      expect(formatted.arrival).toBe('HISHIURA')
      expect(formatted.departureTime).toBe('08:00')
      expect(formatted.arrivalTime).toBe('08:12')
      expect(formatted.duration).toBe(12)
      expect(formatted.type).toBe('ferry')
      expect(formatted.status).toBe(0)
    })

    it('乗換案内データが正しく整形されること', () => {
      const mockTrip = {
        trip_id: '123',
        name: 'FERRY_DOZEN',
        departure: 'BEPPU',
        departure_time: '08:00',
        arrival: 'HISHIURA',
        arrival_time: '08:12'
      }

      const date = '2025-11-02'
      const fare = 410

      const formatted = formatTransitRoute(mockTrip, date, fare)

      expect(formatted.id).toBe('route_123')
      expect(formatted.totalFare).toBe(410)
      expect(formatted.duration).toBe(12)
      expect(formatted.segments).toHaveLength(1)
      
      const segment = formatted.segments[0]
      expect(segment.tripId).toBe('123')
      expect(segment.ship).toBe('FERRY_DOZEN')
      expect(segment.fare).toBe(410)
      // JST 08:00 は UTC 23:00（前日）
      expect(segment.departureTime).toBe('2025-11-01T23:00:00.000Z')
      expect(segment.arrivalTime).toBe('2025-11-01T23:12:00.000Z')
    })
  })
})

// ヘルパー関数の実際の実装（テスト用にコピー）
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

function getShipType(shipName: string): string {
  if (shipName.includes('RAINBOW')) return 'highspeed'
  if (shipName.includes('FERRY')) return 'ferry'
  return 'local'
}

function getPortName(portCode: string): string {
  const portNames: Record<string, string> = {
    'BEPPU': '別府',
    'HISHIURA': '菱浦',
    'KURI': '来居',
    'SAIGO': '西郷',
    'HONDO': '本土',
    'SHICHIRUI': '七類',
    'DOZEN': '西ノ島',
    'DOGO': '知夫',
    'NISHINOSHIMA': '西ノ島',
    'CHIBU': '知夫里',
    'AMA': '海士',
    'OKI': '隠岐'
  }
  
  return portNames[portCode] || portCode
}

function formatTimetableTrip(trip: any): any {
  return {
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
    status: 0
  }
}

function formatTransitRoute(trip: any, date: string, fare: number): any {
  // UTCで日付を扱うために日付文字列をパース
  const departureDateTime = new Date(`${date}T${trip.departure_time}:00+09:00`) // JST指定
  const arrivalDateTime = new Date(`${date}T${trip.arrival_time}:00+09:00`) // JST指定
  
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
      status: 0
    }]
  }
}
