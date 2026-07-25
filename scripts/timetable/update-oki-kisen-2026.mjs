#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { validateTimetable } from './build-public-timetable.mjs'

const ROOT = process.cwd()
const DEFAULT_SOURCE_FILE = join(ROOT, 'gtfs', 'raw', 'ferry', 'oki-kisen-2026.json')
const DEFAULT_TIMETABLE_FILE = join(ROOT, 'timetable.json')
const REPLACEMENT_START = '2026-04-01'
const MANAGED_NAMES = new Set([
  'FERRY_OKI',
  'FERRY_SHIRASHIMA',
  'FERRY_KUNIGA',
  'RAINBOWJET'
])
const DATE_PATTERN = /^\d{4}\/\d{2}\/\d{2}$/
const TIME_PATTERN = /^\d{1,2}:\d{2}$/

const normalizeDate = value => String(value).replaceAll('/', '-')

export const validateOkiKisenSource = (data) => {
  if (!data?.source?.id || !data?.source?.url || !data?.source?.sha256) {
    throw new Error('出典情報（id/url/sha256）が不足しています')
  }
  if (!Array.isArray(data.schedules) || data.schedules.length === 0) {
    throw new Error('schedules は1件以上必要です')
  }

  const sourceIds = new Set([
    data.source.id,
    ...(data.additional_sources || []).map(source => source.id)
  ])
  const scheduleIds = new Set()
  for (const schedule of data.schedules) {
    if (!schedule.id || scheduleIds.has(schedule.id)) {
      throw new Error(`schedule id が空または重複しています: ${schedule.id ?? ''}`)
    }
    scheduleIds.add(schedule.id)
    if (schedule.source_id && !sourceIds.has(schedule.source_id)) {
      throw new Error(`未登録の source_id です: ${schedule.source_id}`)
    }
    if (!MANAGED_NAMES.has(schedule.name)) {
      throw new Error(`管理対象外の船名です: ${schedule.name}`)
    }
    if (!DATE_PATTERN.test(schedule.start_date) || !DATE_PATTERN.test(schedule.end_date)) {
      throw new Error(`日付形式が不正です: ${schedule.id}`)
    }
    if (normalizeDate(schedule.start_date) > normalizeDate(schedule.end_date)) {
      throw new Error(`開始日が終了日より後です: ${schedule.id}`)
    }
    if (!Array.isArray(schedule.legs) || schedule.legs.length === 0) {
      throw new Error(`legs が空です: ${schedule.id}`)
    }
    schedule.legs.forEach((leg, index) => {
      if (!Array.isArray(leg) || leg.length !== 4 || leg.some(value => String(value).trim() === '')) {
        throw new Error(`区間形式が不正です: ${schedule.id}[${index}]`)
      }
      if (!TIME_PATTERN.test(leg[1]) || !TIME_PATTERN.test(leg[3])) {
        throw new Error(`時刻形式が不正です: ${schedule.id}[${index}]`)
      }
    })
  }
  return data
}

export const buildOkiKisenTrips = (data, firstTripId) => {
  validateOkiKisenSource(data)
  let tripId = firstTripId
  const trips = []

  for (const schedule of data.schedules) {
    const firstId = tripId
    schedule.legs.forEach((leg, index) => {
      const [departure, departureTime, arrival, arrivalTime] = leg
      trips.push({
        trip_id: String(tripId),
        next_id: index === schedule.legs.length - 1 ? '' : String(tripId + 1),
        start_date: schedule.start_date,
        end_date: schedule.end_date,
        name: schedule.name,
        departure,
        departure_time: departureTime,
        arrival,
        arrival_time: arrivalTime
      })
      tripId++
    })
    if (Number(trips.at(-schedule.legs.length).trip_id) !== firstId) {
      throw new Error(`trip_id の採番に失敗しました: ${schedule.id}`)
    }
  }
  return trips
}

export const updateOkiKisenTimetable = (currentTrips, sourceData) => {
  const preserved = currentTrips.filter((trip) => {
    if (!MANAGED_NAMES.has(trip.name)) return true
    return normalizeDate(trip.end_date) < REPLACEMENT_START
  })
  const maxTripId = Math.max(0, ...preserved.map(trip => Number(trip.trip_id)).filter(Number.isFinite))
  const added = buildOkiKisenTrips(sourceData, maxTripId + 1)
  const trips = [...preserved, ...added]
  validateTimetable(trips)
  return {
    trips,
    removed: currentTrips.length - preserved.length,
    added: added.length
  }
}

const parseArgs = (argv) => {
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
  const result = updateOkiKisenTimetable(currentTrips, sourceData)
  console.log(`source=${sourceData.source.url}`)
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
