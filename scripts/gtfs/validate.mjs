#!/usr/bin/env node

import { existsSync } from 'fs'
import { join } from 'path'
import { formatGtfsDate, readCsv, writeReport } from '../lib/transport-data.mjs'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'agency.txt',
  'stops.txt',
  'routes.txt',
  'trips.txt',
  'stop_times.txt'
]

function readOptionalCsv(dir, name) {
  return readCsv(join(dir, name), { optional: true })
}

function requiredValue(row, key) {
  const value = row?.[key]
  return typeof value === 'string' && value.trim() !== ''
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

const writeValidationReport = (reportDir, report, checkOnly) => {
  if (checkOnly) return null
  return writeReport(reportDir, 'validation', report)
}

function main() {
  const argv = process.argv.slice(2)
  const checkOnly = argv.includes('--check')
  const positional = argv.filter(arg => arg !== '--check')
  const mode = positional[0] || 'bus'
  const id = positional[1] || 'ama'
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
    writeValidationReport(reportDir, { ok: false, checkedAt: new Date().toISOString(), mode, id, gtfsDir, issues, warnings }, checkOnly)
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
  const feedEndDate = formatGtfsDate(feed?.feed_end_date)
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

  writeValidationReport(reportDir, report, checkOnly)

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
