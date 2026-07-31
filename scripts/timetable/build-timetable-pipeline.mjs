#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { generateOkiAirportBusTrips } from '../gtfs/generate-oki-airport-bus.mjs'
import {
  buildPublicTimetable,
  DEFAULT_OUTPUT_FILE,
  PUBLIC_TIMETABLE_SOURCES
} from './build-public-timetable.mjs'
import { validateJalFarePolicy } from './validate-jal-fares.mjs'

const ROOT = process.cwd()
const JAL_INPUT_FILE = join(ROOT, 'gtfs', 'raw', 'air', 'jal_oki_timetable.json')
const AIRPORT_BUS_OUTPUT_FILE = join(ROOT, 'gtfs', 'generated', 'bus', 'oki_airport_bus_timetable.json')

const parseArgs = (argv) => {
  const args = { dryRun: false }
  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '--check') {
      args.dryRun = true
    } else {
      throw new Error(`未知の引数です: ${arg}`)
    }
  }
  return args
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

const writeJson = (filePath, data) => {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
}

export const buildTimetablePipeline = ({
  root = ROOT,
  dryRun = false,
  jalInputFile = join(root, 'gtfs', 'raw', 'air', 'jal_oki_timetable.json'),
  airportBusOutputFile = join(root, 'gtfs', 'generated', 'bus', 'oki_airport_bus_timetable.json'),
  timetableOutputFile = root === ROOT
    ? DEFAULT_OUTPUT_FILE
    : join(root, 'gtfs', 'generated', 'public', 'timetable.json')
} = {}) => {
  const airTrips = readJsonArray(jalInputFile)
  const busTrips = generateOkiAirportBusTrips(airTrips)
  const sources = PUBLIC_TIMETABLE_SOURCES.map(source => (
    source.id === 'oki-airport-bus'
      ? { ...source, trips: busTrips }
      : source
  ))
  const result = buildPublicTimetable(sources, { root })
  const jalFareSummary = validateJalFarePolicy(result.trips)

  if (!dryRun) {
    writeJson(airportBusOutputFile, busTrips)
    writeJson(timetableOutputFile, result.trips)
  }

  return {
    ...result,
    jalFareSummary,
    busTrips,
    jalInputFile,
    airportBusOutputFile,
    timetableOutputFile,
    dryRun
  }
}

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const result = buildTimetablePipeline({
    root: ROOT,
    dryRun: args.dryRun,
    jalInputFile: JAL_INPUT_FILE,
    airportBusOutputFile: AIRPORT_BUS_OUTPUT_FILE,
    timetableOutputFile: DEFAULT_OUTPUT_FILE
  })

  console.log('JAL便から隠岐空港連絡バスと公開時刻表を生成しました')
  console.log(`airportBusTrips=${result.busTrips.length}`)
  console.log(`total=${result.summary.total}`)
  console.log(`byName=${JSON.stringify(result.summary.byName)}`)
  console.log(`byMode=${JSON.stringify(result.summary.byMode)}`)
  console.log(`jalFares=${JSON.stringify(result.jalFareSummary)}`)

  if (result.dryRun) {
    console.log('[dry-run] 管理対象ファイルへの書き込みは行いません')
    return
  }

  console.log(`written=${pathToFileURL(result.airportBusOutputFile).href}`)
  console.log(`written=${pathToFileURL(result.timetableOutputFile).href}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
}
