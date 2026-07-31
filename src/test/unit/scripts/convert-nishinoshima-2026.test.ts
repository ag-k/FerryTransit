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
