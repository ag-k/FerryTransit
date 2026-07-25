import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import {
  buildDouzenTrips,
  updateDouzenTimetable,
  validateDouzenSource
} from '../../../../scripts/timetable/update-douzen-2026.mjs'

const source = JSON.parse(readFileSync(
  resolve(process.cwd(), 'gtfs/raw/ferry/oki-kanko-douzen-2026.json'),
  'utf-8'
))

const activeOn = (trips: any[], date: string) => trips.filter(trip => (
  trip.start_date.replaceAll('/', '-') <= date
  && trip.end_date.replaceAll('/', '-') >= date
))

describe('島前内航船フェリーどうぜん2026年6月変更ダイヤ', () => {
  it('出典付きの2パターン・3期間・60区間として検証できる', () => {
    expect(validateDouzenSource(source)).toBe(source)
    expect(Object.keys(source.patterns)).toHaveLength(2)
    expect(Object.values(source.patterns).every((pattern: any) => pattern.legs.length === 20)).toBe(true)
    expect(source.schedules).toHaveLength(3)

    const trips = buildDouzenTrips(source)
    expect(trips).toHaveLength(60)
    expect(trips[0].trip_id).toBe('763')
    expect(trips[20].trip_id).toBe('863')
    expect(trips[40].trip_id).toBe('783')
  })

  it('6月1日から12月30日まで空白なく20区間を提供する', () => {
    const trips = buildDouzenTrips(source)
    for (const date of [
      '2026-06-01',
      '2026-07-22',
      '2026-08-07',
      '2026-08-08',
      '2026-08-16',
      '2026-08-17',
      '2026-12-30'
    ]) {
      expect(activeOn(trips, date), date).toHaveLength(20)
    }
    expect(activeOn(trips, '2026-05-31')).toHaveLength(0)
    expect(activeOn(trips, '2026-12-31')).toHaveLength(0)
  })

  it('本日は2隻運航ダイヤを使用する', () => {
    const trips = activeOn(buildDouzenTrips(source), '2026-07-22')
    expect(trips).toContainEqual(expect.objectContaining({
      departure: 'BEPPU',
      departure_time: '13:15',
      arrival: 'HISHIURA',
      arrival_time: '13:27'
    }))
    expect(trips).toContainEqual(expect.objectContaining({
      departure: 'BEPPU',
      departure_time: '14:20',
      arrival: 'KURI',
      arrival_time: '14:51'
    }))
    expect(trips).not.toContainEqual(expect.objectContaining({
      departure: 'BEPPU',
      departure_time: '13:20'
    }))
  })

  it('8月8日から16日だけ3隻運航ダイヤを使用する', () => {
    const trips = activeOn(buildDouzenTrips(source), '2026-08-08')
    expect(trips).toContainEqual(expect.objectContaining({
      departure: 'BEPPU',
      departure_time: '13:20',
      arrival: 'HISHIURA',
      arrival_time: '13:32'
    }))
    expect(trips).toContainEqual(expect.objectContaining({
      departure: 'BEPPU',
      departure_time: '15:20',
      arrival: 'KURI',
      arrival_time: '15:51'
    }))

    const august17Trips = activeOn(buildDouzenTrips(source), '2026-08-17')
    expect(august17Trips).toContainEqual(expect.objectContaining({
      departure: 'BEPPU',
      departure_time: '13:15',
      arrival: 'HISHIURA',
      arrival_time: '13:27'
    }))
  })

  it('運航期間の空白を検出する', () => {
    const invalid = structuredClone(source)
    invalid.schedules[1].start_date = '2026/08/09'
    expect(() => validateDouzenSource(invalid)).toThrow('運航期間に空白または重複があります')
  })

  it('対象期間のフェリーどうぜんだけを置換する', () => {
    const current = [
      { trip_id: '1', next_id: '', start_date: '2025/01/01', end_date: '2025/12/31', name: 'FERRY_DOZEN', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '2', next_id: '', start_date: '2026/06/01', end_date: '2026/07/17', name: 'FERRY_DOZEN', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '3', next_id: '', start_date: '2026/12/31', end_date: '2027/01/03', name: 'FERRY_DOZEN', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' },
      { trip_id: '4', next_id: '', start_date: '2026/06/01', end_date: '2026/12/30', name: 'ISOKAZE', departure: 'A', departure_time: '1:00', arrival: 'B', arrival_time: '2:00' }
    ]
    const result = updateDouzenTimetable(current, source)
    expect(result.removed).toBe(1)
    expect(result.added).toBe(60)
    expect(result.trips).toContainEqual(current[0])
    expect(result.trips).toContainEqual(current[2])
    expect(result.trips).toContainEqual(current[3])
  })

  it('正本時刻表で本日のフェリーどうぜん20区間が有効になる', () => {
    const timetable = JSON.parse(readFileSync(resolve(process.cwd(), 'timetable.json'), 'utf-8'))
    const trips = activeOn(
      timetable.filter((trip: any) => trip.name === 'FERRY_DOZEN'),
      '2026-07-22'
    )
    expect(trips).toHaveLength(20)
    expect(trips).toContainEqual(expect.objectContaining({
      departure: 'BEPPU',
      departure_time: '13:15',
      arrival: 'HISHIURA',
      arrival_time: '13:27'
    }))
  })
})
