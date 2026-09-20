import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import {
  buildIsokazeTrips,
  updateIsokazeTimetable,
  validateIsokazeSource
} from '../../../../scripts/timetable/update-isokaze-2026.mjs'

const source = JSON.parse(readFileSync(
  resolve(process.cwd(), 'gtfs/raw/ferry/oki-kanko-isokaze-2026.json'),
  'utf-8'
))

const activeOn = (trips: any[], date: string) => trips.filter(trip => (
  trip.start_date.replaceAll('/', '-') <= date
  && trip.end_date.replaceAll('/', '-') >= date
))

describe('島前内航船いそかぜ2026年9月更新ダイヤ', () => {
  it('出典付きの2パターン・3期間・138区間として検証できる', () => {
    expect(validateIsokazeSource(source)).toBe(source)
    expect(Object.keys(source.patterns)).toHaveLength(2)
    expect(Object.values(source.patterns).every((pattern: any) => pattern.legs.length === 46)).toBe(true)
    expect(source.schedules).toHaveLength(3)

    const trips = buildIsokazeTrips(source, 1000)
    expect(trips).toHaveLength(138)
    expect(trips[0].trip_id).toBe('1000')
    expect(trips.at(-1)?.trip_id).toBe('1137')
  })

  it('公開済みのtrip_idを維持する', () => {
    const trips = buildIsokazeTrips(source)
    const firstTripIdByPeriod = Object.fromEntries(source.schedules.map((schedule: any) => {
      const firstTrip = trips.find(trip => trip.start_date === schedule.start_date)
      return [schedule.id, Number(firstTrip?.trip_id)]
    }))

    expect(firstTripIdByPeriod).toEqual({
      'two-vessel-regular-august': 3046,
      'two-vessel-september': 677,
      'two-vessel-regular-late': 585
    })
  })

  it('運航状況から追加する臨時便の予約ID帯を正式便に使用しない', () => {
    const trips = buildIsokazeTrips(source)
    const reservedTrips = trips.filter((trip) => {
      const tripId = Number(trip.trip_id)
      return tripId >= 1000 && tripId < 3000
    })

    expect(reservedTrips).toHaveLength(0)
  })

  it('8月17日から12月30日まで空白なく46区間を提供する', () => {
    const trips = buildIsokazeTrips(source, 1)
    for (const date of [
      '2026-08-17',
      '2026-08-31',
      '2026-09-01',
      '2026-10-31',
      '2026-11-01',
      '2026-12-30'
    ]) {
      expect(activeOn(trips, date), date).toHaveLength(46)
    }
    expect(activeOn(trips, '2026-08-16')).toHaveLength(0)
    expect(activeOn(trips, '2026-12-31')).toHaveLength(0)
  })

  it('9月1日から10月31日だけ■印の夕方便を使用する', () => {
    const septemberTrips = activeOn(buildIsokazeTrips(source, 1), '2026-09-01')
    expect(septemberTrips).toContainEqual(expect.objectContaining({
      departure: 'HISHIURA',
      departure_time: '17:39',
      arrival: 'KURI',
      arrival_time: '17:57'
    }))
    expect(septemberTrips).not.toContainEqual(expect.objectContaining({
      departure: 'HISHIURA',
      departure_time: '17:29',
      arrival: 'KURI'
    }))

    const octoberTrips = activeOn(buildIsokazeTrips(source, 1), '2026-10-31')
    expect(octoberTrips).toContainEqual(expect.objectContaining({
      departure: 'HISHIURA',
      departure_time: '17:39',
      arrival: 'KURI',
      arrival_time: '17:57'
    }))

    const novemberTrips = activeOn(buildIsokazeTrips(source, 1), '2026-11-01')
    expect(novemberTrips).toContainEqual(expect.objectContaining({
      departure: 'HISHIURA',
      departure_time: '17:29',
      arrival: 'KURI',
      arrival_time: '17:47'
    }))
  })

  it('運航期間の空白を検出する', () => {
    const invalid = structuredClone(source)
    invalid.schedules[1].start_date = '2026/09/02'
    expect(() => validateIsokazeSource(invalid)).toThrow('運航期間に空白または重複があります')
  })

  it('対象期間のいそかぜだけを置換する', () => {
    const current = [
      { trip_id: '1', next_id: '', start_date: '2025/01/01', end_date: '2025/12/31', name: 'ISOKAZE', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '2', next_id: '', start_date: '2026/06/01', end_date: '2026/08/16', name: 'ISOKAZE', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '5', next_id: '', start_date: '2026/08/17', end_date: '2026/12/30', name: 'ISOKAZE', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '3', next_id: '', start_date: '2026/12/31', end_date: '2027/01/03', name: 'ISOKAZE', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '4', next_id: '', start_date: '2026/06/01', end_date: '2026/12/30', name: 'FERRY_DOZEN', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' }
    ]
    const result = updateIsokazeTimetable(current, source)
    expect(result.removed).toBe(1)
    expect(result.added).toBe(138)
    expect(result.trips).toContainEqual(current[0])
    expect(result.trips).toContainEqual(current[1])
    expect(result.trips).toContainEqual(current[3])
    expect(result.trips).toContainEqual(current[4])
  })

  it('正本時刻表で更新後のいそかぜ46区間が有効になる', () => {
    const timetable = JSON.parse(readFileSync(resolve(process.cwd(), 'timetable.json'), 'utf-8'))
    const trips = activeOn(
      timetable.filter((trip: any) => trip.name === 'ISOKAZE'),
      '2026-10-31'
    )
    expect(trips).toHaveLength(46)
    expect(trips).toContainEqual(expect.objectContaining({
      departure: 'HISHIURA',
      departure_time: '17:39',
      arrival: 'KURI',
      arrival_time: '17:57'
    }))
  })
})
