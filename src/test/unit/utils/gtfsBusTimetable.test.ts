import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getBusStopPortBadgeLabel,
  getBusStopTownLabelKey,
  getLocationTypeForCode,
  isAmaBusStopCode,
  isChibuBusStopCode,
  isNishinoshimaBusStopCode,
  isTripActiveOnDate,
  loadAmaBusTimetable,
  loadChibuBusTimetable,
  loadNishinoshimaBusTimetable,
  normalizeAmaBusRouteName,
  normalizeChibuBusRouteName,
  normalizeNishinoshimaBusRouteName,
  toAmaBusStopCode,
  toChibuBusStopCode,
  toNishinoshimaBusStopCode
} from '@/utils/gtfsBusTimetable'
import type { Trip } from '@/types'

describe('gtfsBusTimetable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('海士町バス停コードを停留所として扱う', () => {
    const stopCode = toAmaBusStopCode('100-01')

    expect(stopCode).toBe('BUS_AMA_100_01')
    expect(isAmaBusStopCode(stopCode)).toBe(true)
    expect(isAmaBusStopCode('BEPPU')).toBe(false)
    expect(getLocationTypeForCode(stopCode)).toBe('STOP')
    expect(getLocationTypeForCode('BEPPU')).toBe('PORT')
    expect(getBusStopTownLabelKey(stopCode)).toBe('AMA_CHO')
    expect(getBusStopPortBadgeLabel(toAmaBusStopCode('126_01'))).toBe('菱浦港')
    expect(getBusStopPortBadgeLabel(stopCode)).toBeNull()
  })

  it('西ノ島町営バス停コードを停留所として扱う', () => {
    const stopCode = toNishinoshimaBusStopCode('nishinoshima_001')

    expect(stopCode).toBe('BUS_NISHINOSHIMA_nishinoshima_001')
    expect(isNishinoshimaBusStopCode(stopCode)).toBe(true)
    expect(isNishinoshimaBusStopCode('BUS_AMA_100_01')).toBe(false)
    expect(getLocationTypeForCode(stopCode)).toBe('STOP')
    expect(getBusStopTownLabelKey(stopCode)).toBe('NISHINOSHIMA_CHO')
  })

  it('知夫村営バス停コードを停留所として扱う', () => {
    const stopCode = toChibuBusStopCode('kuri_naikosen')

    expect(stopCode).toBe('BUS_CHIBU_kuri_naikosen')
    expect(isChibuBusStopCode(stopCode)).toBe(true)
    expect(isChibuBusStopCode('BUS_NISHINOSHIMA_nishinoshima_001')).toBe(false)
    expect(getLocationTypeForCode(stopCode)).toBe('STOP')
    expect(getBusStopTownLabelKey(stopCode)).toBe('CHIBU_MURA')
    expect(getBusStopPortBadgeLabel(stopCode)).toBe('来居港')
  })

  it('海士島線の枝番を表示用にまとめる', () => {
    expect(normalizeAmaBusRouteName('海士島線1')).toBe('海士島線')
    expect(normalizeAmaBusRouteName('海士島線9')).toBe('海士島線')
    expect(normalizeAmaBusRouteName('豊田線')).toBe('豊田線')
    expect(normalizeAmaBusRouteName('')).toBe('海士町バス')
  })

  it('西ノ島町営バスの路線名を表示用に整える', () => {
    expect(normalizeNishinoshimaBusRouteName('西ノ島町営バス 宇賀線')).toBe('宇賀線')
    expect(normalizeNishinoshimaBusRouteName('町営バス')).toBe('')
    expect(normalizeNishinoshimaBusRouteName('波止線')).toBe('波止線')
  })

  it('知夫村営バスの路線名を表示用に整える', () => {
    expect(normalizeChibuBusRouteName('知夫村営バス')).toBe('')
    expect(normalizeChibuBusRouteName('村営バス')).toBe('')
    expect(normalizeChibuBusRouteName('来居方面')).toBe('来居方面')
  })

  it('GTFSカレンダー由来の曜日と例外日で運行日を判定する', () => {
    const trip: Trip = {
      tripId: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      name: 'AMA_TOWN_BUS',
      departure: 'BUS_AMA_100_01',
      departureTime: '08:00',
      arrival: 'BUS_AMA_100_02',
      arrivalTime: '08:10',
      activeDays: [1],
      addedDates: ['2026-01-06'],
      removedDates: ['2026-01-05'],
      status: 0
    }

    expect(isTripActiveOnDate(trip, new Date('2026-01-12'), '2026-01-12')).toBe(true)
    expect(isTripActiveOnDate(trip, new Date('2026-01-05'), '2026-01-05')).toBe(false)
    expect(isTripActiveOnDate(trip, new Date('2026-01-06'), '2026-01-06')).toBe(true)
    expect(isTripActiveOnDate(trip, new Date('2026-01-11'), '2026-01-11')).toBe(false)
    expect(isTripActiveOnDate(trip, new Date('2026-02-02'), '2026-02-02')).toBe(false)
  })

  it('calendar_datesのみのserviceは追加日だけ運行と判定する', () => {
    const trip: Trip = {
      tripId: 1,
      startDate: '2026-08-08',
      endDate: '2026-08-16',
      name: 'NISHINOSHIMA_TOWN_BUS',
      departure: 'BUS_NISHINOSHIMA_nishinoshima_006',
      departureTime: '14:20',
      arrival: 'BUS_NISHINOSHIMA_nishinoshima_022',
      arrivalTime: '14:55',
      activeDays: [],
      addedDates: ['2026-08-08', '2026-08-16'],
      status: 0
    }

    expect(isTripActiveOnDate(trip, new Date('2026-08-08'), '2026-08-08')).toBe(true)
    expect(isTripActiveOnDate(trip, new Date('2026-08-09'), '2026-08-09')).toBe(false)
    expect(isTripActiveOnDate(trip, new Date('2026-08-16'), '2026-08-16')).toBe(true)
  })

  it('GTFS JSONから下流停留所ペアのバス時刻表を生成する', async () => {
    const fixtures: Record<string, unknown> = {
      'routes.json': [
        { routeId: 'R8_AMA', longName: '海士島線1' }
      ],
      'stops.json': [
        { stopId: '100-01', name: '菱浦港', lat: 36.105471, lon: 133.125968 },
        { stopId: '100-02', name: '隠岐神社', lat: 36.097104, lon: 133.098744 },
        { stopId: '100-03', name: '海士町役場', lat: 36.096178, lon: 133.097043 }
      ],
      'trips.json': [
        { routeId: 'R8_AMA', serviceId: 'svc_weekday', tripId: 'trip_1', headsign: '海士町役場' }
      ],
      'stopTimes.json': [
        { tripId: 'trip_1', arrivalTime: '08:00:00', departureTime: '08:00:00', stopId: '100-01', stopSequence: 1 },
        { tripId: 'trip_1', arrivalTime: '08:10:00', departureTime: '08:10:00', stopId: '100-02', stopSequence: 2 },
        { tripId: 'trip_1', arrivalTime: '08:20:00', departureTime: '08:20:00', stopId: '100-03', stopSequence: 3 }
      ],
      'calendar.json': [
        {
          service_id: 'svc_weekday',
          monday: '1',
          tuesday: '0',
          wednesday: '0',
          thursday: '0',
          friday: '0',
          saturday: '0',
          sunday: '0',
          start_date: '20260101',
          end_date: '20260131'
        }
      ],
      'calendarDates.json': [
        { service_id: 'svc_weekday', date: '20260105', exception_type: '2' }
      ]
    }

    const fetchMock = vi.fn((input: string | URL | Request) => {
      const fileName = String(input).split('/').pop() ?? ''
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fixtures[fileName])
      } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadAmaBusTimetable()

    expect(fetchMock).toHaveBeenCalledWith('/data/gtfs/bus/ama/routes.json', { cache: 'no-store' })
    expect(result.stopCodes).toEqual(['BUS_AMA_100_01', 'BUS_AMA_100_02', 'BUS_AMA_100_03'])
    expect(result.locationLabels.BUS_AMA_100_02).toBe('隠岐神社')
    expect(result.stopLocations.BUS_AMA_100_02).toMatchObject({
      id: 'BUS_AMA_100_02',
      name: '隠岐神社',
      lat: 36.097104,
      lng: 133.098744,
      operatorId: 'AMA_TOWN',
      townLabelKey: 'AMA_CHO'
    })
    expect(result.trips).toHaveLength(3)
    expect(result.trips[0]).toMatchObject({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      activeDays: [1],
      removedDates: ['2026-01-05'],
      name: 'AMA_TOWN_BUS',
      mode: 'BUS',
      departure: 'BUS_AMA_100_01',
      arrival: 'BUS_AMA_100_02',
      departureTime: '08:00',
      arrivalTime: '08:10',
      price: 200,
      via: '海士島線'
    })
    expect(result.trips[2]).toMatchObject({
      departure: 'BUS_AMA_100_02',
      arrival: 'BUS_AMA_100_03'
    })
  })

  it('西ノ島町営バスGTFS JSONからバス時刻表を生成する', async () => {
    const fixtures: Record<string, unknown> = {
      'routes.json': [
        { routeId: 'NISHINOSHIMA_UGA', shortName: '宇賀線', longName: '西ノ島町営バス 宇賀線' }
      ],
      'stops.json': [
        { stopId: 'nishinoshima_001', name: '宇賀', lat: 36.119464, lon: 133.076013 },
        { stopId: 'nishinoshima_007', name: '別府交通センター', lat: 36.108989, lon: 133.040918 }
      ],
      'trips.json': [
        { routeId: 'NISHINOSHIMA_UGA', serviceId: 'svc_daily', tripId: 'trip_1', headsign: '宇賀', shortName: '宇賀線' }
      ],
      'stopTimes.json': [
        { tripId: 'trip_1', arrivalTime: '07:07:00', departureTime: '07:07:00', stopId: 'nishinoshima_007', stopSequence: 1 },
        { tripId: 'trip_1', arrivalTime: '07:17:00', departureTime: '07:17:00', stopId: 'nishinoshima_001', stopSequence: 2 }
      ],
      'calendar.json': [
        {
          service_id: 'svc_daily',
          monday: '1',
          tuesday: '1',
          wednesday: '1',
          thursday: '1',
          friday: '1',
          saturday: '1',
          sunday: '1',
          start_date: '20260301',
          end_date: '20261231'
        }
      ],
      'calendarDates.json': []
    }

    const fetchMock = vi.fn((input: string | URL | Request) => {
      const fileName = String(input).split('/').pop() ?? ''
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fixtures[fileName])
      } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadNishinoshimaBusTimetable()

    expect(fetchMock).toHaveBeenCalledWith('/data/gtfs/bus/nishinoshima/routes.json', { cache: 'no-store' })
    expect(result.stopCodes).toEqual([
      'BUS_NISHINOSHIMA_nishinoshima_001',
      'BUS_NISHINOSHIMA_nishinoshima_007'
    ])
    expect(result.locationLabels.BUS_NISHINOSHIMA_nishinoshima_007).toBe('別府交通センター')
    expect(result.stopLocations.BUS_NISHINOSHIMA_nishinoshima_001).toMatchObject({
      id: 'BUS_NISHINOSHIMA_nishinoshima_001',
      name: '宇賀',
      lat: 36.119464,
      lng: 133.076013,
      operatorId: 'NISHINOSHIMA_TOWN',
      townLabelKey: 'NISHINOSHIMA_CHO'
    })
    expect(result.trips).toHaveLength(1)
    expect(result.trips[0]).toMatchObject({
      startDate: '2026-03-01',
      endDate: '2026-12-31',
      name: 'NISHINOSHIMA_TOWN_BUS',
      mode: 'BUS',
      operatorId: 'NISHINOSHIMA_TOWN',
      departure: 'BUS_NISHINOSHIMA_nishinoshima_007',
      arrival: 'BUS_NISHINOSHIMA_nishinoshima_001',
      departureTime: '07:07',
      arrivalTime: '07:17',
      price: 200,
      via: '宇賀線'
    })
  })

  it('知夫村営バスGTFS JSONからバス時刻表を生成する', async () => {
    const fixtures: Record<string, unknown> = {
      'routes.json': [
        { routeId: 'CHIBU_VILLAGE_BUS', shortName: '村営バス', longName: '知夫村営バス' }
      ],
      'stops.json': [
        { stopId: 'kuri_naikosen', name: '来居内航船', lat: 36.0243794, lon: 133.0401959 },
        { stopId: 'nibu_bus', name: '仁夫', lat: 36.00669672, lon: 133.03282616 }
      ],
      'trips.json': [
        { routeId: 'CHIBU_VILLAGE_BUS', serviceId: 'weekday_except_holidays', tripId: 'trip_1', headsign: '仁夫', shortName: '1便' }
      ],
      'stopTimes.json': [
        { tripId: 'trip_1', arrivalTime: '07:15:00', departureTime: '07:15:00', stopId: 'kuri_naikosen', stopSequence: 1 },
        { tripId: 'trip_1', arrivalTime: '07:24:00', departureTime: '07:24:00', stopId: 'nibu_bus', stopSequence: 2 }
      ],
      'calendar.json': [
        {
          service_id: 'weekday_except_holidays',
          monday: '1',
          tuesday: '1',
          wednesday: '1',
          thursday: '1',
          friday: '1',
          saturday: '0',
          sunday: '0',
          start_date: '20260101',
          end_date: '20261231'
        }
      ],
      'calendarDates.json': [
        { service_id: 'weekday_except_holidays', date: '20260101', exception_type: '2' }
      ]
    }

    const fetchMock = vi.fn((input: string | URL | Request) => {
      const fileName = String(input).split('/').pop() ?? ''
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fixtures[fileName])
      } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadChibuBusTimetable()

    expect(fetchMock).toHaveBeenCalledWith('/data/gtfs/bus/chibu/routes.json', { cache: 'no-store' })
    expect(result.stopCodes).toEqual(['BUS_CHIBU_kuri_naikosen', 'BUS_CHIBU_nibu_bus'])
    expect(result.stopLocations.BUS_CHIBU_kuri_naikosen).toMatchObject({
      id: 'BUS_CHIBU_kuri_naikosen',
      name: '来居内航船',
      operatorId: 'CHIBU_VILLAGE',
      townLabelKey: 'CHIBU_MURA'
    })
    expect(result.trips).toHaveLength(1)
    expect(result.trips[0]).toMatchObject({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      name: 'CHIBU_VILLAGE_BUS',
      mode: 'BUS',
      operatorId: 'CHIBU_VILLAGE',
      departure: 'BUS_CHIBU_kuri_naikosen',
      arrival: 'BUS_CHIBU_nibu_bus',
      departureTime: '07:15',
      arrivalTime: '07:24',
      price: 100
    })
    expect(result.trips[0]?.via).toBeUndefined()
  })

  it('同一trip内の同一停留所時刻ペアは重複表示用Tripにしない', async () => {
    const fixtures: Record<string, unknown> = {
      'routes.json': [
        { routeId: 'NISHINOSHIMA_HATO', shortName: '波止線', longName: '西ノ島町営バス 波止線' }
      ],
      'stops.json': [
        { stopId: 'nishinoshima_026', name: '波止' },
        { stopId: 'nishinoshima_006', name: '隠岐汽船（別府港）' }
      ],
      'trips.json': [
        { routeId: 'NISHINOSHIMA_HATO', serviceId: 'svc_daily', tripId: 'hato_1', headsign: '隠岐汽船', shortName: '波止線' }
      ],
      'stopTimes.json': [
        { tripId: 'hato_1', arrivalTime: '11:46:00', departureTime: '11:46:00', stopId: 'nishinoshima_026', stopSequence: 1 },
        { tripId: 'hato_1', arrivalTime: '11:46:00', departureTime: '11:46:00', stopId: 'nishinoshima_026', stopSequence: 2 },
        { tripId: 'hato_1', arrivalTime: '12:03:00', departureTime: '12:03:00', stopId: 'nishinoshima_006', stopSequence: 3 }
      ],
      'calendar.json': [
        {
          service_id: 'svc_daily',
          monday: '1',
          tuesday: '1',
          wednesday: '1',
          thursday: '1',
          friday: '1',
          saturday: '1',
          sunday: '1',
          start_date: '20260301',
          end_date: '20261231'
        }
      ],
      'calendarDates.json': []
    }

    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
      const fileName = String(input).split('/').pop() ?? ''
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fixtures[fileName])
      } as Response)
    }))

    const result = await loadNishinoshimaBusTimetable()

    expect(result.trips).toHaveLength(1)
    expect(result.trips[0]).toMatchObject({
      departure: 'BUS_NISHINOSHIMA_nishinoshima_026',
      arrival: 'BUS_NISHINOSHIMA_nishinoshima_006',
      departureTime: '11:46',
      arrivalTime: '12:03',
      via: '波止線'
    })
  })

  it('calendar_datesのみで定義された期間限定便も読み込む', async () => {
    const fixtures: Record<string, unknown> = {
      'routes.json': [
        { routeId: 'NISHINOSHIMA_KUNIGA', shortName: '国賀線', longName: '西ノ島町営バス 国賀線' }
      ],
      'stops.json': [
        { stopId: 'nishinoshima_006', name: '隠岐汽船（別府港）' },
        { stopId: 'nishinoshima_022', name: '国賀' }
      ],
      'trips.json': [
        {
          routeId: 'NISHINOSHIMA_KUNIGA',
          serviceId: 'range_0501_0506_0808_0816',
          tripId: 'special_kuniga',
          headsign: '国賀',
          shortName: '5/1-5/6・8/8-8/16'
        }
      ],
      'stopTimes.json': [
        { tripId: 'special_kuniga', arrivalTime: '14:20:00', departureTime: '14:20:00', stopId: 'nishinoshima_006', stopSequence: 1 },
        { tripId: 'special_kuniga', arrivalTime: '14:55:00', departureTime: '14:55:00', stopId: 'nishinoshima_022', stopSequence: 2 }
      ],
      'calendar.json': [],
      'calendarDates.json': [
        { service_id: 'range_0501_0506_0808_0816', date: '20260808', exception_type: '1' },
        { service_id: 'range_0501_0506_0808_0816', date: '20260816', exception_type: '1' }
      ]
    }

    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
      const fileName = String(input).split('/').pop() ?? ''
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fixtures[fileName])
      } as Response)
    }))

    const result = await loadNishinoshimaBusTimetable()

    expect(result.trips).toHaveLength(1)
    expect(result.trips[0]).toMatchObject({
      startDate: '2026-08-08',
      endDate: '2026-08-16',
      activeDays: [],
      addedDates: ['2026-08-08', '2026-08-16'],
      departure: 'BUS_NISHINOSHIMA_nishinoshima_006',
      arrival: 'BUS_NISHINOSHIMA_nishinoshima_022',
      departureTime: '14:20',
      arrivalTime: '14:55',
      via: '国賀線'
    })
  })
})
