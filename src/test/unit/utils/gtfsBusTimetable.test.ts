import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getBusStopTownLabelKey,
  getLocationTypeForCode,
  isAmaBusStopCode,
  isNishinoshimaBusStopCode,
  isTripActiveOnDate,
  loadAmaBusTimetable,
  loadNishinoshimaBusTimetable,
  normalizeAmaBusRouteName,
  normalizeNishinoshimaBusRouteName,
  toAmaBusStopCode,
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
  })

  it('西ノ島町営バス停コードを停留所として扱う', () => {
    const stopCode = toNishinoshimaBusStopCode('nishinoshima_001')

    expect(stopCode).toBe('BUS_NISHINOSHIMA_nishinoshima_001')
    expect(isNishinoshimaBusStopCode(stopCode)).toBe(true)
    expect(isNishinoshimaBusStopCode('BUS_AMA_100_01')).toBe(false)
    expect(getLocationTypeForCode(stopCode)).toBe('STOP')
    expect(getBusStopTownLabelKey(stopCode)).toBe('NISHINOSHIMA_CHO')
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

  it('GTFS JSONから下流停留所ペアのバス時刻表を生成する', async () => {
    const fixtures: Record<string, unknown> = {
      'routes.json': [
        { routeId: 'R8_AMA', longName: '海士島線1' }
      ],
      'stops.json': [
        { stopId: '100-01', name: '菱浦港' },
        { stopId: '100-02', name: '隠岐神社' },
        { stopId: '100-03', name: '海士町役場' }
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
        { stopId: 'nishinoshima_001', name: '宇賀' },
        { stopId: 'nishinoshima_007', name: '別府交通センター' }
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
})
