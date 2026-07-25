#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { validateTimetable } from './build-public-timetable.mjs'

const ROOT = process.cwd()
const DEFAULT_SOURCE_FILE = join(ROOT, 'gtfs', 'raw', 'ferry', 'oki-kanko-douzen-2026.json')
const DEFAULT_TIMETABLE_FILE = join(ROOT, 'timetable.json')
const MANAGED_NAME = 'FERRY_DOZEN'
const DATE_PATTERN = /^\d{4}\/\d{2}\/\d{2}$/
const TIME_PATTERN = /^\d{1,2}:\d{2}$/
const ALLOWED_PORTS = new Set(['BEPPU', 'HISHIURA', 'KURI'])

const normalizeDate = value => String(value).replaceAll('/', '-')

const addOneDay = value => {
  const [year, month, day] = normalizeDate(value).split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0')
  ].join('/')
}

const overlaps = (trip, startDate, endDate) => {
  const tripStart = normalizeDate(trip.start_date ?? trip.startDate)
  const tripEnd = normalizeDate(trip.end_date ?? trip.endDate)
  return tripStart <= normalizeDate(endDate) && tripEnd >= normalizeDate(startDate)
}

export const validateDouzenSource = data => {
  const source = data?.source
  if (!source?.id || !source?.url || !source?.sha256) {
    throw new Error('出典情報（id/url/sha256）が不足しています')
  }
  if (!DATE_PATTERN.test(source.coverage_start) || !DATE_PATTERN.test(source.coverage_end)) {
    throw new Error('出典のcoverage_start/coverage_endが不正です')
  }
  if (normalizeDate(source.coverage_start) > normalizeDate(source.coverage_end)) {
    throw new Error('出典の対象期間が逆転しています')
  }

  const patterns = data.patterns
  if (!patterns || typeof patterns !== 'object' || Array.isArray(patterns)) {
    throw new Error('patternsがありません')
  }
  const patternEntries = Object.entries(patterns)
  if (patternEntries.length === 0) {
    throw new Error('patternsは1件以上必要です')
  }
  for (const [patternId, pattern] of patternEntries) {
    if (!Array.isArray(pattern.legs) || pattern.legs.length === 0) {
      throw new Error(`legsが空です: ${patternId}`)
    }
    pattern.legs.forEach((leg, index) => {
      if (!Array.isArray(leg) || leg.length !== 4 || leg.some(value => String(value).trim() === '')) {
        throw new Error(`区間形式が不正です: ${patternId}[${index}]`)
      }
      const [departure, departureTime, arrival, arrivalTime] = leg
      if (!ALLOWED_PORTS.has(departure) || !ALLOWED_PORTS.has(arrival)) {
        throw new Error(`港コードが不正です: ${patternId}[${index}]`)
      }
      if (!TIME_PATTERN.test(departureTime) || !TIME_PATTERN.test(arrivalTime)) {
        throw new Error(`時刻形式が不正です: ${patternId}[${index}]`)
      }
    })
  }

  if (!Array.isArray(data.schedules) || data.schedules.length === 0) {
    throw new Error('schedulesは1件以上必要です')
  }
  const scheduleIds = new Set()
  const tripIds = new Set()
  let expectedStart = source.coverage_start
  for (const schedule of data.schedules) {
    if (!schedule.id || scheduleIds.has(schedule.id)) {
      throw new Error(`schedule idが空または重複しています: ${schedule.id ?? ''}`)
    }
    scheduleIds.add(schedule.id)
    if (!patterns[schedule.pattern_id]) {
      throw new Error(`未登録のpattern_idです: ${schedule.pattern_id ?? ''}`)
    }
    if (!Number.isInteger(schedule.first_trip_id) || schedule.first_trip_id <= 0) {
      throw new Error(`first_trip_idが不正です: ${schedule.id}`)
    }
    for (let offset = 0; offset < patterns[schedule.pattern_id].legs.length; offset++) {
      const tripId = schedule.first_trip_id + offset
      if (tripIds.has(tripId)) {
        throw new Error(`trip_idの割当が重複しています: ${tripId}`)
      }
      tripIds.add(tripId)
    }
    if (!DATE_PATTERN.test(schedule.start_date) || !DATE_PATTERN.test(schedule.end_date)) {
      throw new Error(`日付形式が不正です: ${schedule.id}`)
    }
    if (normalizeDate(schedule.start_date) > normalizeDate(schedule.end_date)) {
      throw new Error(`開始日が終了日より後です: ${schedule.id}`)
    }
    if (schedule.start_date !== expectedStart) {
      throw new Error(`運航期間に空白または重複があります: ${schedule.id} (expected ${expectedStart})`)
    }
    expectedStart = addOneDay(schedule.end_date)
  }
  if (expectedStart !== addOneDay(source.coverage_end)) {
    throw new Error(`運航期間の終端がcoverage_endと一致しません: ${expectedStart}`)
  }

  return data
}

export const buildDouzenTrips = data => {
  validateDouzenSource(data)
  const trips = []

  for (const schedule of data.schedules) {
    const legs = data.patterns[schedule.pattern_id].legs
    let tripId = schedule.first_trip_id
    legs.forEach((leg, index) => {
      const [departure, departureTime, arrival, arrivalTime] = leg
      trips.push({
        trip_id: String(tripId),
        next_id: index === legs.length - 1 ? '' : String(tripId + 1),
        start_date: schedule.start_date,
        end_date: schedule.end_date,
        name: MANAGED_NAME,
        departure,
        departure_time: departureTime,
        arrival,
        arrival_time: arrivalTime
      })
      tripId++
    })
  }

  return trips
}

export const updateDouzenTimetable = (currentTrips, sourceData) => {
  validateDouzenSource(sourceData)
  const coverageStart = sourceData.source.coverage_start
  const coverageEnd = sourceData.source.coverage_end
  const preserved = currentTrips.filter(trip => (
    trip.name !== MANAGED_NAME || !overlaps(trip, coverageStart, coverageEnd)
  ))
  const added = buildDouzenTrips(sourceData)
  const trips = [...preserved, ...added].sort((left, right) => {
    const leftId = Number(left.trip_id ?? left.tripId)
    const rightId = Number(right.trip_id ?? right.tripId)
    if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
      return leftId - rightId
    }
    return String(left.trip_id ?? left.tripId).localeCompare(String(right.trip_id ?? right.tripId))
  })
  validateTimetable(trips)
  return {
    trips,
    removed: currentTrips.length - preserved.length,
    added: added.length
  }
}

const parseArgs = argv => {
  const args = {
    sourceFile: DEFAULT_SOURCE_FILE,
    timetableFile: DEFAULT_TIMETABLE_FILE,
    dryRun: false
  }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--dry-run' || arg === '--check') {
      args.dryRun = true
    } else if (arg === '--source') {
      args.sourceFile = resolve(ROOT, argv[++index])
    } else if (arg === '--timetable') {
      args.timetableFile = resolve(ROOT, argv[++index])
    } else {
      throw new Error(`未知の引数です: ${arg}`)
    }
  }
  return args
}

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const currentTrips = JSON.parse(readFileSync(args.timetableFile, 'utf-8'))
  const sourceData = JSON.parse(readFileSync(args.sourceFile, 'utf-8'))
  const result = updateDouzenTimetable(currentTrips, sourceData)
  console.log(`source=${sourceData.source.url}`)
  console.log(`sha256=${sourceData.source.sha256}`)
  console.log(`coverage=${sourceData.source.coverage_start}..${sourceData.source.coverage_end}`)
  console.log(`removed=${result.removed}`)
  console.log(`added=${result.added}`)
  console.log(`total=${result.trips.length}`)
  if (args.dryRun) {
    console.log('[dry-run] 正本への書き込みは行いません')
    return
  }
  writeFileSync(args.timetableFile, `${JSON.stringify(result.trips)}\n`, 'utf-8')
  console.log(`written=${pathToFileURL(args.timetableFile).href}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
}
