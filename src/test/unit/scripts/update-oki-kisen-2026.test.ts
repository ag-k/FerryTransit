import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import {
  buildOkiKisenTrips,
  updateOkiKisenTimetable,
  validateOkiKisenSource
} from '../../../../scripts/timetable/update-oki-kisen-2026.mjs'

const source = JSON.parse(readFileSync(
  resolve(process.cwd(), 'gtfs/raw/ferry/oki-kisen-2026.json'),
  'utf-8'
))

const activeOn = (trips: any[], date: string) => trips.filter(trip => (
  trip.start_date.replaceAll('/', '-') <= date
  && trip.end_date.replaceAll('/', '-') >= date
))

describe('隠岐汽船2026年6月更新ダイヤ', () => {
  it('出典付きの19期間・116区間として検証できる', () => {
    expect(validateOkiKisenSource(source)).toBe(source)
    const trips = buildOkiKisenTrips(source, 1000)
    expect(source.schedules).toHaveLength(19)
    expect(trips).toHaveLength(116)
    expect(trips[0].trip_id).toBe('1000')
    expect(trips.at(-1)?.trip_id).toBe('1115')
  })

  it('通常期・夏季特別期・高速船休航期の境界を反映する', () => {
    const trips = buildOkiKisenTrips(source, 1)
    expect(activeOn(trips, '2026-04-01')).toHaveLength(21)
    expect(activeOn(trips, '2026-05-01').filter(trip => trip.name === 'RAINBOWJET')).toHaveLength(9)
    expect(activeOn(trips, '2026-05-25').filter(trip => trip.name === 'RAINBOWJET')).toHaveLength(0)
    expect(activeOn(trips, '2026-05-30').filter(trip => trip.name === 'RAINBOWJET')).toHaveLength(6)
    expect(activeOn(trips, '2026-07-14').map(trip => trip.name)).toEqual([
      ...Array(5).fill('FERRY_OKI'),
      ...Array(7).fill('FERRY_SHIRASHIMA'),
      ...Array(6).fill('RAINBOWJET')
    ])
    expect(activeOn(trips, '2026-08-08')).toHaveLength(26)
    expect(activeOn(trips, '2026-08-08').filter(trip => trip.name === 'FERRY_KUNIGA')).toHaveLength(7)
    expect(activeOn(trips, '2026-12-01').filter(trip => trip.name === 'RAINBOWJET')).toHaveLength(0)
    expect(activeOn(trips, '2027-02-28').filter(trip => trip.name === 'FERRY_OKI')).toHaveLength(5)
    expect(activeOn(trips, '2027-03-01')).toHaveLength(0)
  })

  it('既存の対象期間を置換し、対象外の内航船を保持する', () => {
    const current = [
      { trip_id: '1', next_id: '', start_date: '2025/01/01', end_date: '2025/12/31', name: 'FERRY_OKI', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '2', next_id: '', start_date: '2026/01/01', end_date: '2026/12/31', name: 'FERRY_OKI', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '3', next_id: '', start_date: '2026/01/01', end_date: '2027/12/31', name: 'ISOKAZE', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' }
    ]
    const result = updateOkiKisenTimetable(current, source)
    expect(result.removed).toBe(1)
    expect(result.added).toBe(116)
    expect(result.trips.filter(trip => trip.name === 'ISOKAZE')).toHaveLength(1)
    expect(result.trips.filter(trip => trip.name === 'FERRY_OKI' && trip.end_date === '2025/12/31')).toHaveLength(1)
  })
})
