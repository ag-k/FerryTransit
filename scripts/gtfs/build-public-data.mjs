#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { BUS_FEED_CONFIGS } from '../generated/bus-feed-config.mjs'
import { formatGtfsDate, normalizeGtfsTime, readCsvRows, writeJson } from '../lib/transport-data.mjs'

const ROOT = process.cwd()
const PUBLIC_DATA_TARGET_ROOT = join(ROOT, 'gtfs', 'public-data', 'data')
const GTFS_TARGET_ROOT = join(PUBLIC_DATA_TARGET_ROOT, 'gtfs')
const BUS_SEARCH_TARGET_DIR = join(PUBLIC_DATA_TARGET_ROOT, 'bus-search')

const readCsv = (filePath) => existsSync(filePath) ? readCsvRows(filePath) : []
const writeCompactJson = (filePath, data) => writeJson(filePath, data, { compact: true })

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toBusStopCode(config, stopId) {
  return `${config.stopPrefix}${stopId.replace(/[^a-zA-Z0-9]/g, '_')}`
}

function trimSeconds(value) {
  return normalizeGtfsTime(value) || String(value || '').slice(0, 5)
}

function activeDaysFromCalendar(row) {
  const activeDays = []
  if (row.sunday === '1') activeDays.push(0)
  if (row.monday === '1') activeDays.push(1)
  if (row.tuesday === '1') activeDays.push(2)
  if (row.wednesday === '1') activeDays.push(3)
  if (row.thursday === '1') activeDays.push(4)
  if (row.friday === '1') activeDays.push(5)
  if (row.saturday === '1') activeDays.push(6)
  return activeDays
}

function buildCompactServices(calendar, calendarDates) {
  const services = {}

  for (const row of calendar) {
    services[row.service_id] = {
      startDate: formatGtfsDate(row.start_date),
      endDate: formatGtfsDate(row.end_date),
      activeDays: activeDaysFromCalendar(row),
      addedDates: [],
      removedDates: []
    }
  }

  for (const row of calendarDates) {
    const date = formatGtfsDate(row.date)
    let service = services[row.service_id]
    if (!service) {
      service = {
        startDate: date,
        endDate: date,
        activeDays: [],
        addedDates: [],
        removedDates: []
      }
      services[row.service_id] = service
    } else {
      if (date < service.startDate) service.startDate = date
      if (date > service.endDate) service.endDate = date
    }

    if (row.exception_type === '1') {
      service.addedDates.push(date)
    } else if (row.exception_type === '2') {
      service.removedDates.push(date)
    }
  }

  return services
}

function buildPublicData(mode, id) {
  const gtfsDir = join(ROOT, 'gtfs', 'current', mode, id)
  const targetDir = join(GTFS_TARGET_ROOT, mode, id)

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

  if (mode !== 'bus') return null

  return buildBusSearchFeed({
    id,
    routes,
    stops,
    trips,
    stopTimes,
    calendar,
    calendarDates,
    metadata
  })
}

function buildBusSearchFeed({ id, routes, stops, trips, stopTimes, calendar, calendarDates, metadata }) {
  const config = BUS_FEED_CONFIGS[id]
  if (!config) {
    throw new Error(`bus-search 未対応のフィードIDです: ${id}`)
  }

  const routesById = Object.fromEntries(
    routes.map(route => [
      route.routeId,
      {
        agencyId: route.agencyId || '',
        shortName: route.shortName || '',
        longName: route.longName || ''
      }
    ])
  )
  const stopRows = stops.map(stop => [
    toBusStopCode(config, stop.stopId),
    stop.name || '',
    stop.lat,
    stop.lon
  ])
  const stopCodeById = new Map(stops.map(stop => [stop.stopId, toBusStopCode(config, stop.stopId)]))
  const stopTimesByTripId = new Map()
  for (const stopTime of stopTimes) {
    const list = stopTimesByTripId.get(stopTime.tripId) || []
    list.push(stopTime)
    stopTimesByTripId.set(stopTime.tripId, list)
  }
  for (const list of stopTimesByTripId.values()) {
    list.sort((a, b) => Number(a.stopSequence) - Number(b.stopSequence))
  }

  const compactTrips = []
  const departuresByStop = {}
  for (const trip of trips) {
    const compactStopTimes = (stopTimesByTripId.get(trip.tripId) || [])
      .map(stopTime => [
        stopCodeById.get(stopTime.stopId),
        trimSeconds(stopTime.arrivalTime),
        trimSeconds(stopTime.departureTime)
      ])
      .filter(([stopCode]) => Boolean(stopCode))

    if (compactStopTimes.length < 2) continue

    const tripIndex = compactTrips.length
    compactTrips.push({
      tripId: trip.tripId,
      routeId: trip.routeId,
      serviceId: trip.serviceId,
      headsign: trip.headsign || '',
      shortName: trip.shortName || '',
      stops: compactStopTimes
    })

    compactStopTimes.forEach(([stopCode], stopIndex) => {
      departuresByStop[stopCode] ||= []
      departuresByStop[stopCode].push([tripIndex, stopIndex])
    })
  }

  const feed = {
    version: 1,
    feedId: id,
    generatedAt: metadata.generatedAt,
    operatorId: config.operatorId,
    townLabelKey: config.townLabelKey,
    tripName: config.tripName,
    fare: config.fare,
    routes: routesById,
    stops: stopRows,
    services: buildCompactServices(calendar, calendarDates),
    trips: compactTrips,
    departuresByStop
  }

  writeCompactJson(join(BUS_SEARCH_TARGET_DIR, `${id}.json`), feed)
  console.log(`bus-search data を生成しました: ${join(BUS_SEARCH_TARGET_DIR, `${id}.json`)}`)

  return {
    id,
    operatorId: config.operatorId,
    townLabelKey: config.townLabelKey,
    stops: stopRows.map(([code, name, lat, lng]) => [code, name, lat, lng, config.operatorId, config.townLabelKey])
  }
}

function writeBusStopsIndex(feeds) {
  const stops = feeds.flatMap(feed => feed?.stops || [])
  writeCompactJson(join(BUS_SEARCH_TARGET_DIR, 'stops.json'), {
    version: 1,
    generatedAt: new Date().toISOString(),
    feeds: feeds.filter(Boolean).map(feed => ({
      id: feed.id,
      operatorId: feed.operatorId,
      townLabelKey: feed.townLabelKey
    })),
    stops
  })
  console.log(`bus-search stop index を生成しました: ${join(BUS_SEARCH_TARGET_DIR, 'stops.json')}`)
}

function readExistingBusSearchFeedForIndex(id) {
  const filePath = join(BUS_SEARCH_TARGET_DIR, `${id}.json`)
  if (!existsSync(filePath)) return null

  const feed = JSON.parse(readFileSync(filePath, 'utf-8'))
  return {
    id: feed.feedId || id,
    operatorId: feed.operatorId,
    townLabelKey: feed.townLabelKey ?? null,
    stops: (feed.stops || []).map(([code, name, lat, lng]) => [
      code,
      name,
      lat,
      lng,
      feed.operatorId,
      feed.townLabelKey ?? null
    ])
  }
}

function listBusFeedIds() {
  const busRoot = join(ROOT, 'gtfs', 'current', 'bus')
  return readdirSync(busRoot)
    .filter(entry => statSync(join(busRoot, entry)).isDirectory())
    .sort()
}

function main() {
  const mode = process.argv[2] || 'bus'
  const id = process.argv[3]

  if (mode === 'bus' && !id) {
    const feeds = listBusFeedIds().map(feedId => buildPublicData('bus', feedId))
    writeBusStopsIndex(feeds)
    return
  }

  const feed = buildPublicData(mode, id || 'ama')
  if (mode === 'bus') {
    const feeds = listBusFeedIds()
      .map(feedId => feedId === id ? feed : readExistingBusSearchFeedForIndex(feedId))
      .filter(Boolean)
    writeBusStopsIndex(feeds)
  }
}

main()
