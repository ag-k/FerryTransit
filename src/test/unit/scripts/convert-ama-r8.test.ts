import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import Papa from 'papaparse'

type CsvRow = Record<string, string>

type Feed = {
  calendar: CsvRow[]
  calendarDates: CsvRow[]
  trips: CsvRow[]
  stopTimesByTrip: Map<string, CsvRow[]>
}

const legacyDir = resolve('gtfs/raw/bus/ama/2025-12-22')
const outputDir = resolve('gtfs/current/bus/ama')

function readCsv(dir: string, name: string): CsvRow[] {
  return Papa.parse<CsvRow>(readFileSync(join(dir, name), 'utf8'), {
    header: true,
    skipEmptyLines: true
  }).data.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value.trim()])))
}

function loadFeed(dir: string): Feed {
  const stopTimesByTrip = new Map<string, CsvRow[]>()
  for (const row of readCsv(dir, 'stop_times.txt')) {
    const tripId = row.trip_id!
    const rows = stopTimesByTrip.get(tripId) || []
    rows.push(row)
    stopTimesByTrip.set(tripId, rows)
  }
  for (const rows of stopTimesByTrip.values()) {
    rows.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
  }
  return {
    calendar: readCsv(dir, 'calendar.txt'),
    calendarDates: readCsv(dir, 'calendar_dates.txt'),
    trips: readCsv(dir, 'trips.txt'),
    stopTimesByTrip
  }
}

function toGtfsDate(date: string) {
  return date.replaceAll('-', '')
}

function activeServiceIds(feed: Feed, date: string) {
  const gtfsDate = toGtfsDate(date)
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  const dayColumn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day]!
  const active = new Set(feed.calendar
    .filter(row => row.start_date! <= gtfsDate && gtfsDate <= row.end_date! && row[dayColumn] === '1')
    .map(row => row.service_id!))
  for (const row of feed.calendarDates.filter(row => row.date === gtfsDate)) {
    if (row.exception_type === '1') active.add(row.service_id!)
    if (row.exception_type === '2') active.delete(row.service_id!)
  }
  return active
}

function activeTripSignatures(feed: Feed, date: string) {
  const services = activeServiceIds(feed, date)
  return feed.trips
    .filter(trip => services.has(trip.service_id!))
    .map((trip) => {
      const stops = (feed.stopTimesByTrip.get(trip.trip_id!) || [])
        .map(row => `${row.stop_id}@${row.departure_time}`)
        .join('>')
      return `${trip.route_id}|${trip.direction_id}|${trip.trip_headsign}|${stops}`
    })
    .sort()
}

function routeResults(feed: Feed, date: string, departureStopId = '111_01', arrivalStopId = '126_01') {
  const services = activeServiceIds(feed, date)
  const results: string[] = []
  for (const trip of feed.trips.filter(row => services.has(row.service_id!))) {
    const stops = feed.stopTimesByTrip.get(trip.trip_id!) || []
    const departureIndex = stops.findIndex(row => row.stop_id === departureStopId)
    const arrivalIndex = stops.findIndex((row, index) => index > departureIndex && row.stop_id === arrivalStopId)
    if (departureIndex < 0 || arrivalIndex < 0) continue
    results.push(`${stops[departureIndex]!.departure_time!.slice(0, 5)}→${stops[arrivalIndex]!.arrival_time!.slice(0, 5)}`)
  }
  return results.sort()
}

function datesBetween(start: string, end: string) {
  const dates: string[] = []
  for (let date = new Date(`${start}T00:00:00Z`); date <= new Date(`${end}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

const revised = loadFeed(outputDir)
const legacy = loadFeed(legacyDir)

describe('海士町バス R8 2026年6月11日改訂', () => {
  it('8月6日は通常ダイヤ、8月10日は繁忙期ダイヤを返す', () => {
    const august6 = routeResults(revised, '2026-08-06')
    expect(august6).toContain('12:36→12:50')
    expect(august6).toContain('13:05→13:25')
    expect(august6).not.toContain('12:16→12:30')
    expect(august6).not.toContain('12:35→12:55')

    const august10 = routeResults(revised, '2026-08-10')
    expect(august10).toContain('12:16→12:30')
    expect(august10).toContain('12:35→12:55')
    expect(august10).not.toContain('12:36→12:50')
    expect(august10).not.toContain('13:05→13:25')
  })

  it.each([
    ['2026-08-07', true],
    ['2026-08-08', false],
    ['2026-08-16', false],
    ['2026-08-17', true]
  ])('%s の夏期境界を正しいダイヤへ割り当てる', (date, normal) => {
    const results = routeResults(revised, date)
    expect(results.includes('12:36→12:50')).toBe(normal)
    expect(results.includes('12:16→12:30')).toBe(!normal)
    expect(results.includes('13:05→13:25')).toBe(normal)
    expect(results.includes('12:35→12:55')).toBe(!normal)
  })

  it.each([
    '2026-10-09',
    '2026-10-10',
    '2026-11-08',
    '2026-11-09',
    '2026-12-20',
    '2026-12-21'
  ])('%s で旧季節ダイヤへ戻らない', (date) => {
    const results = routeResults(revised, date)
    expect(results).toContain('12:36→12:50')
    expect(results).toContain('13:05→13:25')
    expect(results).not.toContain('12:16→12:30')
    expect(results).not.toContain('12:35→12:55')
  })

  it('1月2日〜5月31日は旧版から便・停留所・時刻を変更しない', () => {
    for (const date of datesBetween('2026-01-02', '2026-05-31')) {
      expect(activeTripSignatures(revised, date), date).toEqual(activeTripSignatures(legacy, date))
    }
  })

  it('旧版との差分日は公式改訂の対象4期間だけに限定される', () => {
    const changedDates = datesBetween('2026-01-02', '2026-12-31')
      .filter(date => JSON.stringify(activeTripSignatures(revised, date)) !== JSON.stringify(activeTripSignatures(legacy, date)))
    const expectedDates = [
      ...datesBetween('2026-07-18', '2026-08-07'),
      ...datesBetween('2026-08-17', '2026-08-31'),
      ...datesBetween('2026-10-10', '2026-11-08'),
      ...datesBetween('2026-12-21', '2026-12-31')
    ]
    expect(changedDates).toEqual(expectedDates)
  })

  it('配信元・改訂日・PDFハッシュを変換成果物に記録する', () => {
    const sourceInfo = JSON.parse(readFileSync(join(outputDir, 'source_info.json'), 'utf8'))
    expect(sourceInfo).toMatchObject({
      sourceId: 'ama-town',
      sourceUpdatedAt: '2026-06-11',
      feedVersion: 'R8_20260611',
      legacyEndDate: '2026-05-31'
    })
    expect(sourceInfo.documents).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'toyoda-20260611', sha256: '55f04419fff498da59f6d7cd89791bc1b6f01929ced6af7f92c26ff6feb64f0b' }),
      expect.objectContaining({ id: 'ama-20260611', sha256: 'db2f84de76797985ee601dec37a2208822ff0b8544d5fec1cf525ee25e7e86c1' })
    ]))
  })

  it('bus-search JSONにも出典日・URL・ハッシュとフィード版を公開する', () => {
    const feed = JSON.parse(readFileSync(resolve('gtfs/public-data/data/bus-search/ama.json'), 'utf8'))
    expect(feed).toMatchObject({
      feedId: 'ama',
      feedVersion: 'R8_20260611',
      source: {
        sourceId: 'ama-town',
        updatedAt: '2026-06-11',
        officialPageUpdatedAt: '2026-07-01',
        legacyEndDate: '2026-05-31'
      }
    })
    expect(feed.source.urls).toHaveLength(2)
    expect(feed.source.documents).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'toyoda-20260611', sha256: '55f04419fff498da59f6d7cd89791bc1b6f01929ced6af7f92c26ff6feb64f0b' }),
      expect.objectContaining({ id: 'ama-20260611', sha256: 'db2f84de76797985ee601dec37a2208822ff0b8544d5fec1cf525ee25e7e86c1' })
    ]))
  })
})
