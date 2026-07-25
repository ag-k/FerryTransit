#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, isAbsolute, join, resolve } from 'path'
import { pathToFileURL } from 'url'

const ROOT = process.cwd()
export const DEFAULT_OUTPUT_FILE = join(ROOT, 'gtfs', 'generated', 'public', 'timetable.json')

export const PUBLIC_TIMETABLE_SOURCES = [
  {
    id: 'ferry',
    label: 'Ferry timetable',
    file: 'timetable.json'
  },
  {
    id: 'jal-oki-air',
    label: 'JAL Oki air timetable',
    file: 'gtfs/raw/air/jal_oki_timetable.json',
    replaceNames: ['JAL_OKI_ITAMI', 'JAL_OKI_IZUMO']
  },
  {
    id: 'oki-airport-bus',
    label: 'Oki airport shuttle bus timetable',
    file: 'gtfs/generated/bus/oki_airport_bus_timetable.json',
    replaceNames: ['OKI_AIRPORT_BUS']
  }
]

const REQUIRED_FIELDS = [
  'trip_id',
  'start_date',
  'end_date',
  'name',
  'departure',
  'departure_time',
  'arrival',
  'arrival_time'
]

const DATE_PATTERN = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/
const TIME_PATTERN = /^\d{1,2}:\d{2}(?::\d{2})?$/

const parseArgs = (argv) => {
  const args = {
    outputFile: DEFAULT_OUTPUT_FILE,
    dryRun: false
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--out') {
      const value = argv[++i]
      if (!value) throw new Error('--out には出力先ファイルを指定してください')
      args.outputFile = resolve(ROOT, value)
    } else if (arg.startsWith('--out=')) {
      args.outputFile = resolve(ROOT, arg.slice('--out='.length))
    } else {
      throw new Error(`未知の引数です: ${arg}`)
    }
  }

  return args
}

const resolveProjectPath = (filePath, root = ROOT) => {
  return isAbsolute(filePath) ? filePath : join(root, filePath)
}

const readJsonArray = (filePath) => {
  if (!existsSync(filePath)) {
    throw new Error(`時刻表ソースが見つかりません: ${filePath}`)
  }

  const data = JSON.parse(readFileSync(filePath, 'utf-8'))
  if (!Array.isArray(data)) {
    throw new Error(`時刻表ソースは配列である必要があります: ${filePath}`)
  }

  return data
}

const getTripId = (trip) => trip.trip_id ?? trip.tripId
const getNextId = (trip) => trip.next_id ?? trip.nextId
const getTripName = (trip) => trip.name

const toId = (value) => String(value ?? '').trim()

export const summarizeTimetable = (trips) => {
  const byName = {}
  const byMode = {}

  for (const trip of trips) {
    const name = String(getTripName(trip) || 'UNKNOWN')
    const mode = String(trip.mode || 'FERRY')
    byName[name] = (byName[name] || 0) + 1
    byMode[mode] = (byMode[mode] || 0) + 1
  }

  return {
    total: trips.length,
    byName,
    byMode
  }
}

export const validateTimetable = (trips) => {
  const errors = []
  const seenIds = new Set()
  const ids = new Set()

  trips.forEach((trip, index) => {
    for (const field of REQUIRED_FIELDS) {
      if (trip[field] === undefined || trip[field] === null || String(trip[field]).trim() === '') {
        errors.push(`index=${index}: 必須項目 ${field} が空です`)
      }
    }

    const tripId = toId(getTripId(trip))
    if (!tripId) {
      errors.push(`index=${index}: trip_id が空です`)
    } else if (seenIds.has(tripId)) {
      errors.push(`index=${index}: trip_id が重複しています: ${tripId}`)
    } else {
      seenIds.add(tripId)
      ids.add(tripId)
    }

    if (trip.start_date && !DATE_PATTERN.test(String(trip.start_date))) {
      errors.push(`trip_id=${tripId || index}: start_date の形式が不正です: ${trip.start_date}`)
    }
    if (trip.end_date && !DATE_PATTERN.test(String(trip.end_date))) {
      errors.push(`trip_id=${tripId || index}: end_date の形式が不正です: ${trip.end_date}`)
    }
    if (trip.departure_time && !TIME_PATTERN.test(String(trip.departure_time))) {
      errors.push(`trip_id=${tripId || index}: departure_time の形式が不正です: ${trip.departure_time}`)
    }
    if (trip.arrival_time && !TIME_PATTERN.test(String(trip.arrival_time))) {
      errors.push(`trip_id=${tripId || index}: arrival_time の形式が不正です: ${trip.arrival_time}`)
    }

    if (trip.active_days !== undefined) {
      if (!Array.isArray(trip.active_days)) {
        errors.push(`trip_id=${tripId || index}: active_days は配列である必要があります`)
      } else {
        for (const day of trip.active_days) {
          if (!Number.isInteger(day) || day < 0 || day > 6) {
            errors.push(`trip_id=${tripId || index}: active_days の値が不正です: ${day}`)
          }
        }
      }
    }
  })

  trips.forEach((trip, index) => {
    const nextId = toId(getNextId(trip))
    if (nextId && !ids.has(nextId)) {
      const tripId = toId(getTripId(trip)) || index
      errors.push(`trip_id=${tripId}: next_id の参照先が見つかりません: ${nextId}`)
    }
  })

  if (errors.length > 0) {
    throw new Error(`公開時刻表の検証に失敗しました:\n${errors.join('\n')}`)
  }

  return {
    tripIds: ids.size
  }
}

export const buildPublicTimetable = (sources = PUBLIC_TIMETABLE_SOURCES, options = {}) => {
  const root = options.root ?? ROOT
  const trips = []
  const sourceSummaries = []

  for (const source of sources) {
    const filePath = resolveProjectPath(source.file, root)
    const sourceTrips = source.trips === undefined
      ? readJsonArray(filePath)
      : source.trips
    if (!Array.isArray(sourceTrips)) {
      throw new Error(`時刻表ソースは配列である必要があります: ${source.id}`)
    }
    let removed = 0

    if (source.replaceNames?.length) {
      const replaceNames = new Set(source.replaceNames)
      for (let i = trips.length - 1; i >= 0; i--) {
        if (replaceNames.has(getTripName(trips[i]))) {
          trips.splice(i, 1)
          removed++
        }
      }
    }

    trips.push(...sourceTrips)
    sourceSummaries.push({
      id: source.id,
      file: filePath,
      count: sourceTrips.length,
      removed
    })
  }

  const validation = validateTimetable(trips)

  return {
    trips,
    sourceSummaries,
    summary: summarizeTimetable(trips),
    validation
  }
}

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const result = buildPublicTimetable()

  console.log('公開時刻表をコード管理ソースから生成しました')
  for (const source of result.sourceSummaries) {
    const removedSuffix = source.removed ? `, replaced=${source.removed}` : ''
    console.log(`- ${source.id}: ${source.count}${removedSuffix}`)
  }
  console.log(`total=${result.summary.total}`)
  console.log(`byName=${JSON.stringify(result.summary.byName)}`)
  console.log(`byMode=${JSON.stringify(result.summary.byMode)}`)

  if (args.dryRun) {
    console.log(`[dry-run] write skipped: ${args.outputFile}`)
    return
  }

  mkdirSync(dirname(args.outputFile), { recursive: true })
  writeFileSync(args.outputFile, `${JSON.stringify(result.trips, null, 2)}\n`, 'utf-8')
  console.log(`written: ${pathToFileURL(args.outputFile).href}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
}
