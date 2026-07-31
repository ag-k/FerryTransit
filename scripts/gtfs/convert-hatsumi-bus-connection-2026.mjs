#!/usr/bin/env node
/* eslint-disable no-console */

import { cpSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import Papa from 'papaparse'
import { getTransportSourceOperation } from '../../config/transport-sources.mjs'

const { unparse: unparseCsv } = Papa

const ROOT = process.cwd()
const RAW_DIR = join(ROOT, 'gtfs', 'raw', 'bus', 'hatsumi_bus_connection', '2026-06-08')
const CURRENT_DIR = join(ROOT, 'gtfs', 'current', 'bus', 'hatsumi_bus_connection')
const REPORT_DIR = join(ROOT, 'gtfs', 'reports', 'bus', 'hatsumi_bus_connection')

const FEED_START = '20260608'
const FEED_END = '20261231'
const FEED_VERSION = 'hatsumi_20260608-20261231'
const HATSUMI_SOURCE = getTransportSourceOperation('oki-kouiki-bus')
const SOURCE_URL = HATSUMI_SOURCE.sourceUrl
const SOURCE_PAGE_URL = HATSUMI_SOURCE.officialUrl

const AGENCY_ID = 'agency_hatsumi_bus'
const ROUTE_ID = 'route_hatsumi_bus_connection_shichirui_sakaiminato'

const STOPS = [
  stop(
    'shichirui_port',
    '七類港',
    '七類港ターミナル正面バス停。高速船到着便は接岸岸壁から発車',
    35.57113300000003,
    133.23002099999997
  ),
  stop(
    'sakaiminato_station',
    '境港駅',
    '境港駅前バス停',
    35.54510346994129,
    133.22338314132912
  )
]

const ROUTES = [{
  route_id: ROUTE_ID,
  agency_id: AGENCY_ID,
  route_short_name: '七類港⇔境港駅',
  route_long_name: 'はつみ交通・隠岐汽船連絡バス（七類・境港線）',
  route_desc: '隠岐汽船のフェリー・高速船に接続する七類港―境港駅間の連絡バス',
  route_type: '3',
  route_url: SOURCE_URL,
  route_color: '005BAC',
  route_text_color: 'FFFFFF'
}]

const PERIODS = [
  period('20260608_20260807', '20260608', '20260807', [
    trip('sakaiminato_to_shichirui', '08:24', '08:39', '七類港 9:00発 フェリー'),
    trip('sakaiminato_to_shichirui', '16:07', '16:22', '七類港 16:50発 高速船'),
    trip('shichirui_to_sakaiminato', '10:05', '10:20', '七類港 10:03着 高速船'),
    trip('shichirui_to_sakaiminato', '18:10', '18:25', '七類港 18:05着 フェリー'),
    trip('sakaiminato_to_shichirui', '13:25', '13:40', '境港 13:20着 フェリー')
  ]),
  period('20260808_20260816', '20260808', '20260816', [
    trip('sakaiminato_to_shichirui', '08:24', '08:39', '七類港 9:00発 / 9:30発 フェリー'),
    trip('sakaiminato_to_shichirui', '14:04', '14:19', '七類港 14:45発 フェリー'),
    trip('sakaiminato_to_shichirui', '16:07', '16:22', '七類港 16:50発 高速船'),
    trip('shichirui_to_sakaiminato', '14:25', '14:40', '七類港 14:20着 フェリー'),
    trip('shichirui_to_sakaiminato', '15:14', '15:29', '七類港 15:12着 高速船'),
    trip('shichirui_to_sakaiminato', '18:30', '18:45', '七類港 18:25着 フェリー'),
    trip('shichirui_to_sakaiminato', '20:05', '20:20', '七類港 20:00着 フェリー'),
    trip('sakaiminato_to_shichirui', '10:00', '10:15', '境港 9:58着 高速船'),
    trip('sakaiminato_to_shichirui', '13:25', '13:40', '境港 13:20着 フェリー')
  ]),
  period('20260817_20260831', '20260817', '20260831', [
    trip('sakaiminato_to_shichirui', '08:24', '08:39', '七類港 9:00発 フェリー'),
    trip('sakaiminato_to_shichirui', '16:07', '16:22', '七類港 16:50発 高速船'),
    trip('shichirui_to_sakaiminato', '10:05', '10:20', '七類港 10:03着 高速船'),
    trip('shichirui_to_sakaiminato', '18:10', '18:25', '七類港 18:05着 フェリー'),
    trip('sakaiminato_to_shichirui', '13:25', '13:40', '境港 13:20着 フェリー')
  ]),
  period('20260901_20261031', '20260901', '20261031', [
    trip('sakaiminato_to_shichirui', '08:24', '08:39', '七類港 9:00発 フェリー'),
    trip('sakaiminato_to_shichirui', '15:02', '15:17', '七類港 15:45発 高速船'),
    trip('shichirui_to_sakaiminato', '10:05', '10:20', '七類港 10:03着 高速船'),
    trip('shichirui_to_sakaiminato', '18:10', '18:25', '七類港 18:05着 フェリー'),
    trip('sakaiminato_to_shichirui', '13:25', '13:40', '境港 13:20着 フェリー')
  ]),
  period('20261101_20261130', '20261101', '20261130', [
    trip('sakaiminato_to_shichirui', '08:24', '08:39', '七類港 9:00発 フェリー'),
    trip('shichirui_to_sakaiminato', '18:10', '18:25', '七類港 18:05着 フェリー'),
    trip('sakaiminato_to_shichirui', '10:19', '10:34', '境港 10:17着 高速船'),
    trip('sakaiminato_to_shichirui', '13:25', '13:40', '境港 13:20着 フェリー')
  ]),
  period('20261201_20261231', '20261201', '20261231', [
    trip('sakaiminato_to_shichirui', '08:24', '08:39', '七類港 9:00発 フェリー'),
    trip('shichirui_to_sakaiminato', '18:10', '18:25', '七類港 18:05着 フェリー'),
    trip('sakaiminato_to_shichirui', '13:25', '13:40', '境港 13:20着 フェリー')
  ])
]

function stop(stopId, stopName, stopDesc, lat, lon) {
  return {
    stop_id: stopId,
    stop_code: stopId,
    stop_name: stopName,
    stop_desc: stopDesc,
    stop_lat: lat.toFixed(14).replace(/0+$/, '').replace(/\.$/, ''),
    stop_lon: lon.toFixed(14).replace(/0+$/, '').replace(/\.$/, ''),
    zone_id: '',
    stop_url: '',
    location_type: '0',
    parent_station: '',
    platform_code: ''
  }
}

function trip(direction, departureTime, arrivalTime, connection) {
  return { direction, departureTime, arrivalTime, connection }
}

function period(id, startDate, endDate, trips) {
  return {
    serviceId: `service_hatsumi_${id}`,
    startDate,
    endDate,
    trips
  }
}

function agencyRows() {
  return [{
    agency_id: AGENCY_ID,
    agency_name: 'はつみ交通株式会社',
    agency_url: SOURCE_PAGE_URL,
    agency_timezone: 'Asia/Tokyo',
    agency_lang: 'ja',
    agency_phone: '0852-76-2845'
  }]
}

function calendarRows() {
  return PERIODS.map(periodRow => ({
    service_id: periodRow.serviceId,
    monday: '1',
    tuesday: '1',
    wednesday: '1',
    thursday: '1',
    friday: '1',
    saturday: '1',
    sunday: '1',
    start_date: periodRow.startDate,
    end_date: periodRow.endDate
  }))
}

function fareAttributesRows() {
  return [{
    fare_id: 'HATSUMI_CONNECTION_ADULT',
    price: '500',
    currency_type: 'JPY',
    payment_method: '0',
    transfers: '0',
    agency_id: AGENCY_ID
  }]
}

function fareRulesRows() {
  return [{
    fare_id: 'HATSUMI_CONNECTION_ADULT',
    route_id: ROUTE_ID,
    origin_id: '',
    destination_id: '',
    contains_id: ''
  }]
}

function feedInfoRows() {
  return [{
    feed_publisher_name: 'はつみ交通株式会社',
    feed_publisher_url: SOURCE_PAGE_URL,
    feed_lang: 'ja',
    feed_start_date: FEED_START,
    feed_end_date: FEED_END,
    feed_version: FEED_VERSION
  }]
}

function buildTripsAndStopTimes() {
  const trips = []
  const stopTimes = []

  for (const periodRow of PERIODS) {
    periodRow.trips.forEach((tripRow, index) => {
      addTrip({ trips, stopTimes }, periodRow, tripRow, index + 1)
    })
  }

  return { trips, stopTimes }
}

function addTrip(context, periodRow, tripRow, sequence) {
  const toShichirui = tripRow.direction === 'sakaiminato_to_shichirui'
  const tripId = [
    'HATSUMI',
    periodRow.startDate,
    toShichirui ? 'SAKAIMINATO_SHICHIRUI' : 'SHICHIRUI_SAKAIMINATO',
    tripRow.departureTime.replace(':', ''),
    String(sequence).padStart(2, '0')
  ].join('_')
  const stops = toShichirui
    ? ['sakaiminato_station', 'shichirui_port']
    : ['shichirui_port', 'sakaiminato_station']
  const times = [tripRow.departureTime, tripRow.arrivalTime]

  context.trips.push({
    route_id: ROUTE_ID,
    service_id: periodRow.serviceId,
    trip_id: tripId,
    trip_headsign: toShichirui ? '七類港' : '境港駅',
    direction_id: toShichirui ? '0' : '1',
    block_id: '',
    trip_short_name: '七類港⇔境港駅',
    shape_id: '',
    jp_trip_desc: `接続船: ${tripRow.connection}`,
    jp_pattern_id: tripRow.direction
  })

  stops.forEach((stopId, index) => {
    const time = `${times[index]}:00`
    context.stopTimes.push({
      trip_id: tripId,
      arrival_time: time,
      departure_time: time,
      stop_id: stopId,
      stop_sequence: String(index + 1),
      stop_headsign: '',
      pickup_type: '',
      drop_off_type: '',
      timepoint: '1'
    })
  })
}

function minutes(value) {
  const [hours, mins] = value.split(':').map(Number)
  return hours * 60 + mins
}

function nextDate(date) {
  const parsed = new Date(Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8))
  ))
  parsed.setUTCDate(parsed.getUTCDate() + 1)
  return [
    parsed.getUTCFullYear(),
    String(parsed.getUTCMonth() + 1).padStart(2, '0'),
    String(parsed.getUTCDate()).padStart(2, '0')
  ].join('')
}

function assertScheduleDefinition() {
  if (PERIODS[0]?.startDate !== FEED_START || PERIODS.at(-1)?.endDate !== FEED_END) {
    throw new Error('フィード期間と期間別時刻表の開始・終了が一致しません')
  }

  for (let index = 1; index < PERIODS.length; index++) {
    if (PERIODS[index]?.startDate !== nextDate(PERIODS[index - 1].endDate)) {
      throw new Error(`期間別時刻表に空白または重複があります: ${PERIODS[index - 1].endDate}`)
    }
  }

  const trips = PERIODS.flatMap(periodRow => periodRow.trips)
  if (trips.length !== 31) {
    throw new Error(`公式PDFの便数と一致しません: expected=31 actual=${trips.length}`)
  }

  for (const tripRow of trips) {
    if (!['sakaiminato_to_shichirui', 'shichirui_to_sakaiminato'].includes(tripRow.direction)) {
      throw new Error(`未知の運行方向です: ${tripRow.direction}`)
    }
    if (minutes(tripRow.arrivalTime) - minutes(tripRow.departureTime) !== 15) {
      throw new Error(`所要時間が15分ではありません: ${tripRow.departureTime}-${tripRow.arrivalTime}`)
    }
  }
}

function writeCsv(filePath, rows, columns) {
  mkdirSync(join(filePath, '..'), { recursive: true })
  if (rows.length === 0) {
    writeFileSync(filePath, `${columns.join(',')}\n`, 'utf-8')
    return
  }
  const normalizedRows = rows.map(row => Object.fromEntries(
    columns.map(column => [column, row[column] ?? ''])
  ))
  writeFileSync(filePath, `${unparseCsv(normalizedRows, { columns, newline: '\n' })}\n`, 'utf-8')
}

function writeGtfs(outputDir) {
  const { trips, stopTimes } = buildTripsAndStopTimes()

  writeCsv(join(outputDir, 'agency.txt'), agencyRows(), [
    'agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone'
  ])
  writeCsv(join(outputDir, 'stops.txt'), STOPS, [
    'stop_id', 'stop_code', 'stop_name', 'stop_desc', 'stop_lat', 'stop_lon',
    'zone_id', 'stop_url', 'location_type', 'parent_station', 'platform_code'
  ])
  writeCsv(join(outputDir, 'routes.txt'), ROUTES, [
    'route_id', 'agency_id', 'route_short_name', 'route_long_name',
    'route_desc', 'route_type', 'route_url', 'route_color', 'route_text_color'
  ])
  writeCsv(join(outputDir, 'calendar.txt'), calendarRows(), [
    'service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday', 'start_date', 'end_date'
  ])
  writeCsv(join(outputDir, 'calendar_dates.txt'), [], [
    'service_id', 'date', 'exception_type'
  ])
  writeCsv(join(outputDir, 'trips.txt'), trips, [
    'route_id', 'service_id', 'trip_id', 'trip_headsign', 'direction_id',
    'block_id', 'trip_short_name', 'shape_id', 'jp_trip_desc', 'jp_pattern_id'
  ])
  writeCsv(join(outputDir, 'stop_times.txt'), stopTimes, [
    'trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence',
    'stop_headsign', 'pickup_type', 'drop_off_type', 'timepoint'
  ])
  writeCsv(join(outputDir, 'fare_attributes.txt'), fareAttributesRows(), [
    'fare_id', 'price', 'currency_type', 'payment_method', 'transfers', 'agency_id'
  ])
  writeCsv(join(outputDir, 'fare_rules.txt'), fareRulesRows(), [
    'fare_id', 'route_id', 'origin_id', 'destination_id', 'contains_id'
  ])
  writeCsv(join(outputDir, 'feed_info.txt'), feedInfoRows(), [
    'feed_publisher_name', 'feed_publisher_url', 'feed_lang',
    'feed_start_date', 'feed_end_date', 'feed_version'
  ])
  writeCsv(join(outputDir, 'transfers.txt'), [], [
    'from_stop_id', 'to_stop_id', 'transfer_type', 'min_transfer_time'
  ])
  writeCsv(join(outputDir, 'translations.txt'), [], [
    'table_name', 'field_name', 'language', 'translation', 'record_id', 'record_sub_id', 'field_value'
  ])

  return { trips, stopTimes }
}

function parseArgs(argv) {
  return {
    outputDir: valueAfter(argv, '--output') || RAW_DIR,
    updateCurrent: argv.includes('--current')
  }
}

function valueAfter(argv, key) {
  const index = argv.indexOf(key)
  if (index === -1) return null
  return argv[index + 1] || null
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  assertScheduleDefinition()

  const { trips, stopTimes } = writeGtfs(args.outputDir)
  if (args.updateCurrent && resolve(args.outputDir) !== resolve(CURRENT_DIR)) {
    cpSync(args.outputDir, CURRENT_DIR, { recursive: true })
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  const report = {
    convertedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    sourcePageUrl: SOURCE_PAGE_URL,
    outputDir: args.outputDir,
    currentUpdated: args.updateCurrent,
    feedStartDate: FEED_START,
    feedEndDate: FEED_END,
    feedVersion: FEED_VERSION,
    routeId: ROUTE_ID,
    agencyId: AGENCY_ID,
    counts: {
      agencies: agencyRows().length,
      routes: ROUTES.length,
      stops: STOPS.length,
      services: calendarRows().length,
      calendarDates: 0,
      trips: trips.length,
      stopTimes: stopTimes.length
    },
    notes: [
      '2026年6月8日から12月31日までのはつみ交通公式PDFをGTFSに転記',
      '6月8日-8月7日、8月8日-16日、8月17日-31日、9月1日-10月31日、11月、12月の6期間を収録',
      '隠岐汽船欠航時は接続バスも運休するが、静的GTFSではリアルタイム運休として表現しない',
      '接続する船舶時刻はjp_trip_descに保持し、stop_timesはバス停発着時刻のみを出力',
      '運賃は大人片道500円をfare_attributesとbus-searchに保持'
    ]
  }
  writeFileSync(join(REPORT_DIR, '2026-06-08.conversion.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf-8')

  console.log(`はつみ交通・隠岐汽船連絡バス GTFS を生成しました: ${args.outputDir}`)
  if (args.updateCurrent) {
    console.log(`current も更新しました: ${CURRENT_DIR}`)
  }
  console.log(`routes=${ROUTES.length}, stops=${STOPS.length}, trips=${trips.length}, stop_times=${stopTimes.length}`)
}

main()
