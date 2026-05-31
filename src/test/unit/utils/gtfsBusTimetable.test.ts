import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearBusSearchFeedCacheForTests,
  getAllPortConnectedBusStopCodes,
  getBusStopPortBadgeLabel,
  getBusStopConnectedPortId,
  getConnectedBusStopsForPort,
  getBusStopTownLabelKey,
  getLocationTypeForCode,
  isAmaBusStopCode,
  isChibuBusStopCode,
  isNishinoshimaBusStopCode,
  isOkinoshimaBusStopCode,
  isTripActiveOnDate,
  loadBusRouteLabelsForStops,
  loadBusStopsIndex,
  loadBusTripsForRoute,
  loadAmaBusTimetable,
  loadChibuBusTimetable,
  loadNishinoshimaBusTimetable,
  loadOkinoshimaBusTimetable,
  normalizeAmaBusRouteName,
  normalizeChibuBusRouteName,
  normalizeNishinoshimaBusRouteName,
  normalizeOkinoshimaBusRouteName,
  toAmaBusStopCode,
  toChibuBusStopCode,
  toNishinoshimaBusStopCode,
  toOkinoshimaBusStopCode
} from '@/utils/gtfsBusTimetable'
import type { Trip } from '@/types'

describe('gtfsBusTimetable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearBusSearchFeedCacheForTests()
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
    expect(getBusStopConnectedPortId(toAmaBusStopCode('126_01'))).toBe('HISHIURA')
    expect(getBusStopPortBadgeLabel(stopCode)).toBeNull()
  })

  it('西ノ島町営バス停コードを停留所として扱う', () => {
    const stopCode = toNishinoshimaBusStopCode('nishinoshima_001')

    expect(stopCode).toBe('BUS_NISHINOSHIMA_nishinoshima_001')
    expect(isNishinoshimaBusStopCode(stopCode)).toBe(true)
    expect(isNishinoshimaBusStopCode('BUS_AMA_100_01')).toBe(false)
    expect(getLocationTypeForCode(stopCode)).toBe('STOP')
    expect(getBusStopTownLabelKey(stopCode)).toBe('NISHINOSHIMA_CHO')
    expect(getBusStopPortBadgeLabel(toNishinoshimaBusStopCode('nishinoshima_006'))).toBe('別府港')
    expect(getBusStopConnectedPortId(toNishinoshimaBusStopCode('nishinoshima_006'))).toBe('BEPPU')
  })

  it('知夫村営バス停コードを停留所として扱う', () => {
    const stopCode = toChibuBusStopCode('kuri_naikosen')

    expect(stopCode).toBe('BUS_CHIBU_kuri_naikosen')
    expect(isChibuBusStopCode(stopCode)).toBe(true)
    expect(isChibuBusStopCode('BUS_NISHINOSHIMA_nishinoshima_001')).toBe(false)
    expect(getLocationTypeForCode(stopCode)).toBe('STOP')
    expect(getBusStopTownLabelKey(stopCode)).toBe('CHIBU_MURA')
    expect(getBusStopPortBadgeLabel(stopCode)).toBe('来居港')
    expect(getBusStopConnectedPortId(stopCode)).toBe('KURI')
    expect(getConnectedBusStopsForPort('KURI')).toEqual([
      'BUS_CHIBU_kuri_naikosen',
      'BUS_CHIBU_kuri_ferry',
      'BUS_CHIBU_kuri_office'
    ])
  })

  it('隠岐の島町バス停コードを停留所として扱う', () => {
    const stopCode = toOkinoshimaBusStopCode('port_mae')

    expect(stopCode).toBe('BUS_OKINOSHIMA_port_mae')
    expect(isOkinoshimaBusStopCode(stopCode)).toBe(true)
    expect(isOkinoshimaBusStopCode('BUS_CHIBU_kuri_naikosen')).toBe(false)
    expect(getLocationTypeForCode(stopCode)).toBe('STOP')
    expect(getBusStopTownLabelKey(stopCode)).toBe('OKINOSHIMA_CHO')
    expect(getBusStopPortBadgeLabel(stopCode)).toBe('西郷港')
    expect(getBusStopConnectedPortId(stopCode)).toBe('SAIGO')
    expect(getAllPortConnectedBusStopCodes()).toContain('BUS_OKINOSHIMA_port_mae')
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

  it('隠岐の島町のバス路線名を表示用に整える', () => {
    expect(normalizeOkinoshimaBusRouteName('隠岐一畑交通 五箇線')).toBe('五箇線')
    expect(normalizeOkinoshimaBusRouteName('隠岐の島町営バス 都万西部線')).toBe('都万西部線')
    expect(normalizeOkinoshimaBusRouteName('町営バス')).toBe('')
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

    expect(fetchMock).toHaveBeenCalledWith('/data/gtfs/bus/ama/routes.json')
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

    expect(fetchMock).toHaveBeenCalledWith('/data/gtfs/bus/nishinoshima/routes.json')
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

    expect(fetchMock).toHaveBeenCalledWith('/data/gtfs/bus/chibu/routes.json')
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

  it('隠岐の島町GTFS JSONから事業者別のバス時刻表を生成する', async () => {
    const fixtures: Record<string, unknown> = {
      'routes.json': [
        { routeId: 'OKI_ICHIBATA_GOKA', agencyId: 'OKI_ICHIBATA', shortName: '五箇線', longName: '隠岐一畑交通 五箇線' },
        { routeId: 'OKINOSHIMA_TOWN_GOKA', agencyId: 'OKINOSHIMA_TOWN', shortName: '五箇循環線', longName: '隠岐の島町営バス 五箇循環線' }
      ],
      'stops.json': [
        { stopId: 'port_mae', name: 'ポート前', lat: 36.2012, lon: 133.3364 },
        { stopId: 'goka_branch', name: '五箇支所', lat: 36.2669, lon: 133.2387 },
        { stopId: 'kumi', name: '久見', lat: 36.307, lon: 133.211 }
      ],
      'trips.json': [
        { routeId: 'OKI_ICHIBATA_GOKA', serviceId: 'daily', tripId: 'ichibata_1', headsign: '五箇支所', shortName: '五箇線' },
        { routeId: 'OKINOSHIMA_TOWN_GOKA', serviceId: 'daily', tripId: 'town_1', headsign: '久見', shortName: '五箇循環線' }
      ],
      'stopTimes.json': [
        { tripId: 'ichibata_1', arrivalTime: '08:29:00', departureTime: '08:29:00', stopId: 'port_mae', stopSequence: 1 },
        { tripId: 'ichibata_1', arrivalTime: '09:14:00', departureTime: '09:14:00', stopId: 'goka_branch', stopSequence: 2 },
        { tripId: 'town_1', arrivalTime: '06:51:00', departureTime: '06:51:00', stopId: 'goka_branch', stopSequence: 1 },
        { tripId: 'town_1', arrivalTime: '07:02:00', departureTime: '07:02:00', stopId: 'kumi', stopSequence: 2 }
      ],
      'calendar.json': [
        {
          service_id: 'daily',
          monday: '1',
          tuesday: '1',
          wednesday: '1',
          thursday: '1',
          friday: '1',
          saturday: '1',
          sunday: '1',
          start_date: '20260101',
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

    const result = await loadOkinoshimaBusTimetable()

    expect(result.stopCodes).toEqual([
      'BUS_OKINOSHIMA_port_mae',
      'BUS_OKINOSHIMA_goka_branch',
      'BUS_OKINOSHIMA_kumi'
    ])
    expect(result.stopLocations.BUS_OKINOSHIMA_port_mae).toMatchObject({
      id: 'BUS_OKINOSHIMA_port_mae',
      name: 'ポート前',
      operatorId: 'OKINOSHIMA',
      townLabelKey: 'OKINOSHIMA_CHO'
    })
    expect(result.trips).toHaveLength(2)
    expect(result.trips[0]).toMatchObject({
      name: 'OKI_ICHIBATA_BUS',
      operatorId: 'OKI_ICHIBATA',
      departure: 'BUS_OKINOSHIMA_port_mae',
      arrival: 'BUS_OKINOSHIMA_goka_branch',
      price: 500,
      via: '五箇線'
    })
    expect(result.trips[1]).toMatchObject({
      name: 'OKINOSHIMA_TOWN_BUS',
      operatorId: 'OKINOSHIMA_TOWN',
      departure: 'BUS_OKINOSHIMA_goka_branch',
      arrival: 'BUS_OKINOSHIMA_kumi',
      price: 300,
      via: '五箇循環線'
    })
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

  it('bus-search停留所インデックスから停留所一覧だけを読み込む', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        version: 1,
        generatedAt: '2026-05-25T00:00:00.000Z',
        stops: [
          ['BUS_AMA_100_01', '豊田', 36.105471, 133.125968, 'AMA_TOWN', 'AMA_CHO'],
          ['BUS_CHIBU_nibu_bus', '仁夫', 36.00669672, 133.03282616, 'CHIBU_VILLAGE', 'CHIBU_MURA']
        ]
      })
    } as Response))
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadBusStopsIndex()

    expect(fetchMock).toHaveBeenCalledWith('/data/bus-search/stops.json')
    expect(result.stopCodes).toEqual(['BUS_AMA_100_01', 'BUS_CHIBU_nibu_bus'])
    expect(result.locationLabels.BUS_AMA_100_01).toBe('豊田')
    expect(result.stopLocations.BUS_CHIBU_nibu_bus).toMatchObject({
      id: 'BUS_CHIBU_nibu_bus',
      name: '仁夫',
      operatorId: 'CHIBU_VILLAGE',
      townLabelKey: 'CHIBU_MURA'
    })
  })

  it('bus-searchデータから指定区間の候補だけを生成する', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        version: 1,
        feedId: 'ama',
        generatedAt: '2026-05-25T00:00:00.000Z',
        operatorId: 'AMA_TOWN',
        townLabelKey: 'AMA_CHO',
        tripName: 'AMA_TOWN_BUS',
        fare: 200,
        routes: {
          R8_AMA: {
            agencyId: '',
            shortName: '',
            longName: '海士島線1'
          }
        },
        stops: [
          ['BUS_AMA_100_01', '豊田', 36.105471, 133.125968],
          ['BUS_AMA_100_02', '隠岐神社前', 36.097104, 133.098744],
          ['BUS_AMA_126_01', '隠岐汽船乗り場', 36.105058, 133.076744]
        ],
        services: {
          svc_weekday: {
            startDate: '2026-01-01',
            endDate: '2026-01-31',
            activeDays: [1],
            addedDates: [],
            removedDates: ['2026-01-05']
          }
        },
        trips: [
          {
            tripId: 'trip_1',
            routeId: 'R8_AMA',
            serviceId: 'svc_weekday',
            headsign: '隠岐汽船乗り場',
            shortName: '',
            stops: [
              ['BUS_AMA_100_01', '08:00', '08:00'],
              ['BUS_AMA_100_02', '08:10', '08:10'],
              ['BUS_AMA_126_01', '08:20', '08:20']
            ]
          }
        ],
        departuresByStop: {
          BUS_AMA_100_01: [[0, 0]],
          BUS_AMA_100_02: [[0, 1]]
        }
      })
    } as Response))
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadBusTripsForRoute(
      'BUS_AMA_100_01',
      'BUS_AMA_126_01',
      '2026-01-12'
    )

    expect(fetchMock).toHaveBeenCalledWith('/data/bus-search/ama.json')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      activeDays: [1],
      removedDates: ['2026-01-05'],
      name: 'AMA_TOWN_BUS',
      mode: 'BUS',
      departure: 'BUS_AMA_100_01',
      arrival: 'BUS_AMA_126_01',
      departureTime: '08:00',
      arrivalTime: '08:20',
      price: 200,
      via: '海士島線'
    })

    const removedDateResult = await loadBusTripsForRoute(
      'BUS_AMA_100_01',
      'BUS_AMA_126_01',
      '2026-01-05'
    )
    expect(removedDateResult).toEqual([])
  })

  it('海士町バスの福井小学校前経由便は平日と土日祝で出し分ける', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        version: 1,
        feedId: 'ama',
        generatedAt: '2026-05-25T00:00:00.000Z',
        operatorId: 'AMA_TOWN',
        townLabelKey: 'AMA_CHO',
        tripName: 'AMA_TOWN_BUS',
        fare: 200,
        routes: {
          '21': {
            agencyId: '',
            shortName: '',
            longName: '海士島線1'
          },
          '22': {
            agencyId: '',
            shortName: '',
            longName: '海士島線2'
          },
          '23': {
            agencyId: '',
            shortName: '',
            longName: '海士島線3'
          }
        },
        stops: [
          ['BUS_AMA_111_01', '役場前', 36.096178, 133.097043],
          ['BUS_AMA_118_01', '西入口', 36.086348, 133.079677],
          ['BUS_AMA_119_01', '福井', 36.089481, 133.079881],
          ['BUS_AMA_120_01', '福井分かれ', 36.092452, 133.083025],
          ['BUS_AMA_121_01', '福井小学校前', 36.098056, 133.085833],
          ['BUS_AMA_126_01', '隠岐汽船乗り場', 36.105058, 133.076744]
        ],
        services: {
          weekday: {
            startDate: '2026-03-09',
            endDate: '2026-05-31',
            activeDays: [1, 2, 3, 4, 5],
            addedDates: [],
            removedDates: []
          },
          holiday: {
            startDate: '2026-03-09',
            endDate: '2026-05-31',
            activeDays: [0, 6],
            addedDates: [],
            removedDates: []
          }
        },
        trips: [
          {
            tripId: 'weekday_fukui_school_to_port',
            routeId: '21',
            serviceId: 'weekday',
            headsign: '隠岐汽船乗り場',
            shortName: '',
            stops: [
              ['BUS_AMA_111_01', '07:25', '07:25'],
              ['BUS_AMA_118_01', '07:51', '07:51'],
              ['BUS_AMA_119_01', '07:52', '07:52'],
              ['BUS_AMA_120_01', '07:53', '07:53'],
              ['BUS_AMA_121_01', '07:55', '07:55'],
              ['BUS_AMA_126_01', '08:03', '08:03']
            ]
          },
          {
            tripId: 'holiday_fukui_branch_to_port',
            routeId: '23',
            serviceId: 'holiday',
            headsign: '隠岐汽船乗り場',
            shortName: '',
            stops: [
              ['BUS_AMA_111_01', '08:10', '08:10'],
              ['BUS_AMA_118_01', '09:01', '09:01'],
              ['BUS_AMA_119_01', '09:02', '09:02'],
              ['BUS_AMA_120_01', '09:03', '09:03'],
              ['BUS_AMA_126_01', '09:10', '09:10']
            ]
          }
        ],
        departuresByStop: {
          BUS_AMA_121_01: [[0, 4]],
          BUS_AMA_120_01: [[0, 3], [1, 3]]
        }
      })
    } as Response))
    vi.stubGlobal('fetch', fetchMock)

    const weekdayResult = await loadBusTripsForRoute(
      'BUS_AMA_121_01',
      'BUS_AMA_126_01',
      '2026-05-29'
    )
    const saturdayResult = await loadBusTripsForRoute(
      'BUS_AMA_121_01',
      'BUS_AMA_126_01',
      '2026-05-30'
    )
    const saturdayBranchResult = await loadBusTripsForRoute(
      'BUS_AMA_120_01',
      'BUS_AMA_126_01',
      '2026-05-30'
    )

    expect(weekdayResult).toHaveLength(1)
    expect(weekdayResult[0]).toMatchObject({
      serviceId: 'weekday',
      departure: 'BUS_AMA_121_01',
      departureTime: '07:55',
      arrival: 'BUS_AMA_126_01',
      arrivalTime: '08:03',
      via: '海士島線'
    })
    expect(saturdayResult).toEqual([])
    expect(saturdayBranchResult).toHaveLength(1)
    expect(saturdayBranchResult[0]).toMatchObject({
      serviceId: 'holiday',
      departure: 'BUS_AMA_120_01',
      departureTime: '09:03',
      arrival: 'BUS_AMA_126_01',
      arrivalTime: '09:10',
      via: '海士島線'
    })
  })

  it('bus-searchデータから指定区間の路線表示を取得する', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        version: 1,
        feedId: 'ama',
        generatedAt: '2026-05-25T00:00:00.000Z',
        operatorId: 'AMA_TOWN',
        townLabelKey: 'AMA_CHO',
        tripName: 'AMA_TOWN_BUS',
        fare: 200,
        routes: {
          TOYODA: {
            agencyId: '',
            shortName: '',
            longName: '豊田線'
          }
        },
        stops: [
          ['BUS_AMA_100_01', '豊田', 36.105471, 133.125968],
          ['BUS_AMA_126_01', '隠岐汽船乗り場', 36.105058, 133.076744]
        ],
        services: {},
        trips: [
          {
            tripId: 'trip_1',
            routeId: 'TOYODA',
            serviceId: 'svc_weekday',
            headsign: '隠岐汽船乗り場',
            shortName: '',
            stops: [
              ['BUS_AMA_100_01', '08:00', '08:00'],
              ['BUS_AMA_126_01', '08:20', '08:20']
            ]
          },
          {
            tripId: 'trip_2',
            routeId: 'TOYODA',
            serviceId: 'svc_weekday',
            headsign: '隠岐汽船乗り場',
            shortName: '',
            stops: [
              ['BUS_AMA_100_01', '09:00', '09:00'],
              ['BUS_AMA_126_01', '09:20', '09:20']
            ]
          }
        ],
        departuresByStop: {
          BUS_AMA_100_01: [[0, 0], [1, 0]]
        }
      })
    } as Response))
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadBusRouteLabelsForStops('BUS_AMA_100_01', 'BUS_AMA_126_01')

    expect(fetchMock).toHaveBeenCalledWith('/data/bus-search/ama.json')
    expect(result).toEqual([
      {
        operatorId: 'AMA_TOWN',
        tripName: 'AMA_TOWN_BUS',
        routeName: '豊田線'
      }
    ])
  })
})
