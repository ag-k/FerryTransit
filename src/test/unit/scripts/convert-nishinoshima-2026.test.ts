import { readFileSync } from 'fs'
import { resolve } from 'path'
import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import {
  buildBusTripsForRoute,
  toNishinoshimaBusStopCode,
  type BusSearchFeed
} from '@/utils/gtfsBusTimetable'

type CsvRow = Record<string, string>

const GTFS_DIR = resolve(process.cwd(), 'gtfs/current/bus/nishinoshima')

const readCsv = (name: string): CsvRow[] => Papa.parse<CsvRow>(
  readFileSync(resolve(GTFS_DIR, name), 'utf-8'),
  { header: true, skipEmptyLines: true }
).data.map(row => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [key, value.trim()])
))

const calendar = readCsv('calendar.txt')
const calendarDates = readCsv('calendar_dates.txt')
const trips = readCsv('trips.txt')
const stopTimes = readCsv('stop_times.txt')
const busSearchFeed = JSON.parse(readFileSync(
  resolve(process.cwd(), 'gtfs/public-data/data/bus-search/nishinoshima.json'),
  'utf-8'
)) as BusSearchFeed

const activeServiceIdsOn = (date: string): Set<string> => {
  const dayColumns = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ]
  const day = new Date(Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8))
  )).getUTCDay()
  const active = new Set(calendar
    .filter(row => row.start_date <= date && row.end_date >= date && row[dayColumns[day]!] === '1')
    .map(row => row.service_id))

  for (const exception of calendarDates.filter(row => row.date === date)) {
    if (exception.exception_type === '1') active.add(exception.service_id)
    if (exception.exception_type === '2') active.delete(exception.service_id)
  }
  return active
}

const activeTripsOn = (date: string): CsvRow[] => {
  const serviceIds = activeServiceIdsOn(date)
  return trips.filter(trip => serviceIds.has(trip.service_id))
}

const stopIdsForTrip = (tripId: string): string[] => stopTimes
  .filter(stopTime => stopTime.trip_id === tripId)
  .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
  .map(stopTime => stopTime.stop_id)

const feedDates = (): string[] => {
  const dates: string[] = []
  const current = new Date(Date.UTC(2026, 2, 1))
  const end = new Date(Date.UTC(2026, 11, 31))
  while (current <= end) {
    dates.push([
      current.getUTCFullYear(),
      String(current.getUTCMonth() + 1).padStart(2, '0'),
      String(current.getUTCDate()).padStart(2, '0')
    ].join(''))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

describe('西ノ島町営バス2026年時刻表の●印区間', () => {
  it('6便は8月31日まで国賀12:58発として全区間を運行する', () => {
    const sixTrips = activeTripsOn('20260831')
      .filter(trip => trip.direction_id === '0' && trip.trip_short_name === '6便')

    expect(sixTrips).toHaveLength(1)
    expect(sixTrips[0]?.trip_id).toBe('T09_KUNIGA_1258')
    expect(stopIdsForTrip(sixTrips[0]!.trip_id)).toEqual([
      'nishinoshima_022',
      'nishinoshima_021',
      'nishinoshima_020',
      'nishinoshima_019',
      'nishinoshima_018',
      'nishinoshima_017',
      'nishinoshima_016',
      'nishinoshima_015',
      'nishinoshima_014',
      'nishinoshima_013',
      'nishinoshima_012',
      'nishinoshima_011',
      'nishinoshima_010',
      'nishinoshima_009',
      'nishinoshima_008',
      'nishinoshima_007',
      'nishinoshima_006',
      'nishinoshima_005'
    ])
  })

  it('6便は9月1日も国賀を除く由良車庫13:05発以降を運行する', () => {
    const sixTrips = activeTripsOn('20260901')
      .filter(trip => trip.direction_id === '0' && trip.trip_short_name === '6便')

    expect(sixTrips).toHaveLength(1)
    expect(sixTrips[0]?.trip_id).toBe('T09_KUNIGA_1258_BASE')
    expect(stopIdsForTrip(sixTrips[0]!.trip_id)).toEqual([
      'nishinoshima_021',
      'nishinoshima_020',
      'nishinoshima_019',
      'nishinoshima_018',
      'nishinoshima_017',
      'nishinoshima_016',
      'nishinoshima_015',
      'nishinoshima_014',
      'nishinoshima_013',
      'nishinoshima_012',
      'nishinoshima_011',
      'nishinoshima_010',
      'nishinoshima_009',
      'nishinoshima_008',
      'nishinoshima_007',
      'nishinoshima_006',
      'nishinoshima_005'
    ])
  })

  it('●印の4便は季節境界の前後で重複せず、国賀区間だけを切り替える', () => {
    const expected = [
      ['0', '6便'],
      ['0', '8便'],
      ['1', '5便'],
      ['1', '7便']
    ]

    for (const date of ['20260630', '20260701', '20260831', '20260901']) {
      for (const [directionId, shortName] of expected) {
        const matching = activeTripsOn(date)
          .filter(trip => trip.direction_id === directionId && trip.trip_short_name === shortName)
        expect(matching, `${date} ${directionId} ${shortName}`).toHaveLength(1)

        const stopIds = stopIdsForTrip(matching[0]!.trip_id)
        const includesKuniga = stopIds.includes('nishinoshima_022')
        expect(includesKuniga, `${date} ${directionId} ${shortName}`)
          .toBe(date >= '20260701' && date <= '20260831')
      }
    }
  })

  it('アプリの9月1日検索で由良車庫13:05発の6便を返し、国賀12:58発は返さない', () => {
    const yura = toNishinoshimaBusStopCode('nishinoshima_021')
    const kuniga = toNishinoshimaBusStopCode('nishinoshima_022')
    const hospital = toNishinoshimaBusStopCode('nishinoshima_005')

    const fromYura = buildBusTripsForRoute(busSearchFeed, yura, hospital, '2026-09-01')
      .filter(trip => trip.departureTime === '13:05' && trip.arrivalTime === '13:36')
    expect(fromYura).toEqual([
      expect.objectContaining({
        serviceId: 'kuniga_summer_base',
        departure: yura,
        arrival: hospital
      })
    ])

    const fromKuniga = buildBusTripsForRoute(busSearchFeed, kuniga, hospital, '2026-09-01')
      .filter(trip => trip.departureTime === '12:58')
    expect(fromKuniga).toHaveLength(0)
  })
})

describe('西ノ島町営バス2026年時刻表の◎印区間', () => {
  it('◎印の4便は期間境界の前後で重複せず、国賀区間だけを切り替える', () => {
    const affectedTrips = [
      ['0', '5便'],
      ['0', '7便'],
      ['1', '3便'],
      ['1', '6便']
    ]

    for (const date of ['20260414', '20260415', '20261021', '20261022']) {
      const shouldIncludeKuniga = date >= '20260415' && date <= '20261021'

      for (const [directionId, shortName] of affectedTrips) {
        const matching = activeTripsOn(date)
          .filter(trip => trip.direction_id === directionId && trip.trip_short_name === shortName)
        expect(matching, `${date} ${directionId} ${shortName}`).toHaveLength(1)
        expect(
          stopIdsForTrip(matching[0]!.trip_id).includes('nishinoshima_022'),
          `${date} ${directionId} ${shortName}`
        ).toBe(shouldIncludeKuniga)
      }
    }
  })

  it('アプリの4月14日検索で国賀を除く5便の通常区間を返す', () => {
    const yura = toNishinoshimaBusStopCode('nishinoshima_021')
    const ferry = toNishinoshimaBusStopCode('nishinoshima_006')
    const kuniga = toNishinoshimaBusStopCode('nishinoshima_022')

    const fromYura = buildBusTripsForRoute(busSearchFeed, yura, ferry, '2026-04-14')
      .filter(trip => trip.departureTime === '11:34' && trip.arrivalTime === '12:01')
    expect(fromYura).toEqual([
      expect.objectContaining({ serviceId: 'kuniga_spring_fall_base_star_on' })
    ])

    const fromKuniga = buildBusTripsForRoute(busSearchFeed, kuniga, ferry, '2026-04-14')
      .filter(trip => trip.departureTime === '11:27')
    expect(fromKuniga).toHaveLength(0)
  })
})

describe('西ノ島町営バス2026年時刻表の★印区間', () => {
  const affectedTrips = [
    ['0', '1便', 'nishinoshima_004'],
    ['0', '4便', 'nishinoshima_001'],
    ['0', '5便', 'nishinoshima_004'],
    ['0', '7便', 'nishinoshima_004'],
    ['0', '9便', 'nishinoshima_001'],
    ['1', '1便', 'nishinoshima_004'],
    ['1', '4便', 'nishinoshima_001'],
    ['1', '5便', 'nishinoshima_004'],
    ['1', '7便', 'nishinoshima_004'],
    ['1', '9便', 'nishinoshima_001']
  ]

  it('一部区間だけに★が付く10便は運行日ごとに通常区間と★区間を切り替える', () => {
    const dates = [
      ['20260712', false],
      ['20260718', true],
      ['20260816', true],
      ['20260822', false],
      ['20260901', true],
      ['20260906', false],
      ['20260921', false]
    ] as const

    for (const [date, shouldIncludeStarSection] of dates) {
      for (const [directionId, shortName, starStopId] of affectedTrips) {
        const matching = activeTripsOn(date)
          .filter(trip => trip.direction_id === directionId && trip.trip_short_name === shortName)
        expect(matching, `${date} ${directionId} ${shortName}`).toHaveLength(1)
        expect(
          stopIdsForTrip(matching[0]!.trip_id).includes(starStopId),
          `${date} ${directionId} ${shortName}`
        ).toBe(shouldIncludeStarSection)
      }
    }
  })

  it('別府方面1便は★運行日に大山7:30まで運行し、★運休日は隠岐汽船で終了する', () => {
    const weekdayTrip = activeTripsOn('20260901')
      .find(trip => trip.direction_id === '0' && trip.trip_short_name === '1便')
    const sundayTrip = activeTripsOn('20260906')
      .find(trip => trip.direction_id === '0' && trip.trip_short_name === '1便')

    expect(weekdayTrip).toBeDefined()
    expect(stopIdsForTrip(weekdayTrip!.trip_id).at(-1)).toBe('nishinoshima_004')
    expect(sundayTrip).toBeDefined()
    expect(stopIdsForTrip(sundayTrip!.trip_id).at(-1)).toBe('nishinoshima_006')
  })

  it('アプリの日曜検索では4便の通常区間だけを返し、夏季全便運行日は宇賀まで返す', () => {
    const yura = toNishinoshimaBusStopCode('nishinoshima_021')
    const ferry = toNishinoshimaBusStopCode('nishinoshima_006')
    const uga = toNishinoshimaBusStopCode('nishinoshima_001')

    const sundayBase = buildBusTripsForRoute(busSearchFeed, yura, ferry, '2026-09-06')
      .filter(trip => trip.departureTime === '10:10' && trip.arrivalTime === '10:37')
    expect(sundayBase).toEqual([
      expect.objectContaining({ serviceId: 'star_base_only' })
    ])

    const sundayExtension = buildBusTripsForRoute(busSearchFeed, yura, uga, '2026-09-06')
      .filter(trip => trip.departureTime === '10:10' && trip.arrivalTime === '10:52')
    expect(sundayExtension).toHaveLength(0)

    const summerSaturdayExtension = buildBusTripsForRoute(busSearchFeed, yura, uga, '2026-07-18')
      .filter(trip => trip.departureTime === '10:10' && trip.arrivalTime === '10:52')
    expect(summerSaturdayExtension).toEqual([
      expect.objectContaining({ serviceId: 'star_weekday_plus_summer' })
    ])
  })
})

describe('西ノ島町営バス2026年時刻表の記号付き便の重複防止', () => {
  it('フィード全期間で◎・●・★の影響を受ける14便が欠落も重複もしない', () => {
    const affectedTrips = [
      ['0', '1便'],
      ['0', '4便'],
      ['0', '5便'],
      ['0', '6便'],
      ['0', '7便'],
      ['0', '8便'],
      ['0', '9便'],
      ['1', '1便'],
      ['1', '3便'],
      ['1', '4便'],
      ['1', '5便'],
      ['1', '6便'],
      ['1', '7便'],
      ['1', '9便']
    ]

    for (const date of feedDates()) {
      for (const [directionId, shortName] of affectedTrips) {
        const matching = activeTripsOn(date)
          .filter(trip => trip.direction_id === directionId && trip.trip_short_name === shortName)
        expect(matching, `${date} ${directionId} ${shortName}`).toHaveLength(1)
      }
    }
  })
})
