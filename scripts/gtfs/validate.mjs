#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'agency.txt',
  'stops.txt',
  'routes.txt',
  'trips.txt',
  'stop_times.txt'
]

function readCsv(filePath) {
  const text = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  })
  return {
    rows: parsed.data,
    errors: parsed.errors
  }
}

function readOptionalCsv(dir, name) {
  const path = join(dir, name)
  if (!existsSync(path)) return { rows: [], errors: [], missing: true }
  return readCsv(path)
}

function requiredValue(row, key) {
  const value = row?.[key]
  return typeof value === 'string' && value.trim() !== ''
}

function parseGtfsDate(value) {
  if (!/^\d{8}$/.test(value || '')) return null
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function validateRequiredRows(rows, file, keys, issues) {
  rows.forEach((row, index) => {
    for (const key of keys) {
      if (!requiredValue(row, key)) {
        issues.push({ code: 'missing_required_value', file, row: index + 2, field: key })
      }
    }
  })
}

function writeReport(reportDir, report) {
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `${new Date().toISOString().slice(0, 10)}.validation.json`)
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8')
}

function main() {
  const mode = process.argv[2] || 'bus'
  const id = process.argv[3] || 'ama'
  const gtfsDir = join(ROOT, 'gtfs', 'current', mode, id)
  const reportDir = join(ROOT, 'gtfs', 'reports', mode, id)

  const issues = []
  const warnings = []

  if (!existsSync(gtfsDir)) {
    throw new Error(`GTFS ディレクトリが見つかりません: ${gtfsDir}`)
  }

  for (const fileName of REQUIRED_FILES) {
    if (!existsSync(join(gtfsDir, fileName))) {
      issues.push({ code: 'missing_required_file', file: fileName })
    }
  }

  if (issues.length > 0) {
    writeReport(reportDir, { ok: false, checkedAt: new Date().toISOString(), mode, id, gtfsDir, issues, warnings })
    process.exitCode = 1
    return
  }

  const agency = readCsv(join(gtfsDir, 'agency.txt'))
  const stops = readCsv(join(gtfsDir, 'stops.txt'))
  const routes = readCsv(join(gtfsDir, 'routes.txt'))
  const trips = readCsv(join(gtfsDir, 'trips.txt'))
  const stopTimes = readCsv(join(gtfsDir, 'stop_times.txt'))
  const calendar = readOptionalCsv(gtfsDir, 'calendar.txt')
  const calendarDates = readOptionalCsv(gtfsDir, 'calendar_dates.txt')
  const feedInfo = readOptionalCsv(gtfsDir, 'feed_info.txt')

  for (const [file, result] of Object.entries({ agency, stops, routes, trips, stop_times: stopTimes, calendar, calendar_dates: calendarDates, feed_info: feedInfo })) {
    for (const error of result.errors || []) {
      issues.push({ code: 'csv_parse_error', file: `${file}.txt`, message: error.message, row: error.row })
    }
  }

  const stopIds = new Set(stops.rows.map(row => row.stop_id).filter(Boolean))
  const routeIds = new Set(routes.rows.map(row => row.route_id).filter(Boolean))
  const serviceIds = new Set([
    ...calendar.rows.map(row => row.service_id).filter(Boolean),
    ...calendarDates.rows.map(row => row.service_id).filter(Boolean)
  ])
  const tripIds = new Set(trips.rows.map(row => row.trip_id).filter(Boolean))

  validateRequiredRows(stops.rows, 'stops.txt', ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'], issues)
  validateRequiredRows(routes.rows, 'routes.txt', ['route_id', 'agency_id', 'route_type'], issues)
  validateRequiredRows(trips.rows, 'trips.txt', ['route_id', 'service_id', 'trip_id'], issues)
  validateRequiredRows(stopTimes.rows, 'stop_times.txt', ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence'], issues)

  for (const row of trips.rows) {
    if (requiredValue(row, 'route_id') && !routeIds.has(row.route_id)) {
      issues.push({ code: 'unknown_route_id', file: 'trips.txt', trip_id: row.trip_id, route_id: row.route_id })
    }
    if (requiredValue(row, 'service_id') && serviceIds.size > 0 && !serviceIds.has(row.service_id)) {
      issues.push({ code: 'unknown_service_id', file: 'trips.txt', trip_id: row.trip_id, service_id: row.service_id })
    }
  }

  for (const row of stopTimes.rows) {
    if (requiredValue(row, 'trip_id') && !tripIds.has(row.trip_id)) {
      issues.push({ code: 'unknown_trip_id', file: 'stop_times.txt', trip_id: row.trip_id })
    }
    if (requiredValue(row, 'stop_id') && !stopIds.has(row.stop_id)) {
      issues.push({ code: 'unknown_stop_id', file: 'stop_times.txt', trip_id: row.trip_id, stop_id: row.stop_id })
    }
  }

  const feed = feedInfo.rows[0]
  const feedEndDate = parseGtfsDate(feed?.feed_end_date)
  if (feedEndDate && feedEndDate < new Date().toISOString().slice(0, 10)) {
    warnings.push({ code: 'feed_expired', file: 'feed_info.txt', feed_end_date: feed.feed_end_date })
  }

  const summary = {
    agencyCount: agency.rows.length,
    routeCount: routes.rows.length,
    stopCount: stops.rows.length,
    tripCount: trips.rows.length,
    stopTimeCount: stopTimes.rows.length,
    serviceCount: serviceIds.size,
    feedStartDate: feed?.feed_start_date || null,
    feedEndDate: feed?.feed_end_date || null,
    feedVersion: feed?.feed_version || null
  }

  const report = {
    ok: issues.length === 0,
    checkedAt: new Date().toISOString(),
    mode,
    id,
    gtfsDir,
    summary,
    issues,
    warnings
  }

  writeReport(reportDir, report)

  if (issues.length > 0) {
    console.error(`GTFS 検証に失敗しました: ${issues.length} 件`)
    process.exitCode = 1
    return
  }

  console.log(`GTFS 検証 OK: routes=${summary.routeCount}, stops=${summary.stopCount}, trips=${summary.tripCount}, stop_times=${summary.stopTimeCount}`)
  if (warnings.length > 0) {
    console.warn(`警告: ${warnings.length} 件`)
  }
}

main()
