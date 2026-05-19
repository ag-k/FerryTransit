#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'

const ROOT = process.cwd()

function readCsv(filePath) {
  if (!existsSync(filePath)) return []
  const text = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  })
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]
    throw new Error(`${filePath}: ${first.message}`)
  }
  return parsed.data
}

function writeJson(filePath, data) {
  mkdirSync(join(filePath, '..'), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function main() {
  const mode = process.argv[2] || 'bus'
  const id = process.argv[3] || 'ama'
  const gtfsDir = join(ROOT, 'gtfs', 'current', mode, id)
  const targetDir = join(ROOT, 'src', 'public', 'data', 'gtfs', mode, id)

  if (!existsSync(gtfsDir)) {
    throw new Error(`GTFS ディレクトリが見つかりません: ${gtfsDir}`)
  }

  const agencies = readCsv(join(gtfsDir, 'agency.txt'))
  const routes = readCsv(join(gtfsDir, 'routes.txt')).map(row => ({
    routeId: row.route_id,
    agencyId: row.agency_id,
    shortName: row.route_short_name || '',
    longName: row.route_long_name || '',
    description: row.route_desc || '',
    type: numberOrNull(row.route_type),
    color: row.route_color || '',
    textColor: row.route_text_color || ''
  }))

  const stops = readCsv(join(gtfsDir, 'stops.txt')).map(row => ({
    stopId: row.stop_id,
    code: row.stop_code || '',
    name: row.stop_name || '',
    description: row.stop_desc || '',
    lat: numberOrNull(row.stop_lat),
    lon: numberOrNull(row.stop_lon),
    zoneId: row.zone_id || '',
    url: row.stop_url || '',
    locationType: numberOrNull(row.location_type),
    platformCode: row.platform_code || ''
  }))

  const trips = readCsv(join(gtfsDir, 'trips.txt')).map(row => ({
    routeId: row.route_id,
    serviceId: row.service_id,
    tripId: row.trip_id,
    headsign: row.trip_headsign || '',
    directionId: numberOrNull(row.direction_id),
    blockId: row.block_id || '',
    shortName: row.trip_short_name || '',
    shapeId: row.shape_id || '',
    jpTripDesc: row.jp_trip_desc || '',
    jpPatternId: row.jp_pattern_id || ''
  }))

  const stopTimes = readCsv(join(gtfsDir, 'stop_times.txt')).map(row => ({
    tripId: row.trip_id,
    arrivalTime: row.arrival_time,
    departureTime: row.departure_time,
    stopId: row.stop_id,
    stopSequence: numberOrNull(row.stop_sequence),
    headsign: row.stop_headsign || '',
    pickupType: numberOrNull(row.pickup_type),
    dropOffType: numberOrNull(row.drop_off_type),
    timepoint: numberOrNull(row.timepoint)
  }))

  const calendar = readCsv(join(gtfsDir, 'calendar.txt'))
  const calendarDates = readCsv(join(gtfsDir, 'calendar_dates.txt'))
  const feedInfo = readCsv(join(gtfsDir, 'feed_info.txt'))[0] || {}

  const metadata = {
    id,
    mode,
    generatedAt: new Date().toISOString(),
    feed: {
      publisherName: feedInfo.feed_publisher_name || '',
      publisherUrl: feedInfo.feed_publisher_url || '',
      lang: feedInfo.feed_lang || '',
      startDate: feedInfo.feed_start_date || '',
      endDate: feedInfo.feed_end_date || '',
      version: feedInfo.feed_version || ''
    },
    counts: {
      agencies: agencies.length,
      routes: routes.length,
      stops: stops.length,
      trips: trips.length,
      stopTimes: stopTimes.length,
      calendarServices: calendar.length,
      calendarDates: calendarDates.length
    }
  }

  writeJson(join(targetDir, 'metadata.json'), metadata)
  writeJson(join(targetDir, 'routes.json'), routes)
  writeJson(join(targetDir, 'stops.json'), stops)
  writeJson(join(targetDir, 'trips.json'), trips)
  writeJson(join(targetDir, 'stopTimes.json'), stopTimes)
  writeJson(join(targetDir, 'calendar.json'), calendar)
  writeJson(join(targetDir, 'calendarDates.json'), calendarDates)

  console.log(`GTFS public data を生成しました: ${targetDir}`)
}

main()
