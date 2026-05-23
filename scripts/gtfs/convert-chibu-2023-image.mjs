#!/usr/bin/env node
/* eslint-disable no-console */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import Papa from 'papaparse'

// eslint-disable-next-line import/no-named-as-default-member
const { unparse: unparseCsv } = Papa

const ROOT = process.cwd()
const SOURCE_IMAGE = join(ROOT, 'gtfs', 'pdf', 'bus', 'chibu', '20230201_chibu_bus_timetable.jpg')
const RAW_DIR = join(ROOT, 'gtfs', 'raw', 'bus', 'chibu', '2023-02-01')
const CURRENT_DIR = join(ROOT, 'gtfs', 'current', 'bus', 'chibu')
const REPORT_DIR = join(ROOT, 'gtfs', 'reports', 'bus', 'chibu')

const FEED_START = '20260101'
const FEED_END = '20261231'
const FEED_VERSION = '20230201_20260101-20261231'
const SOURCE_URL = 'https://chibu.jp/access.html'

const ROUTES = [
  {
    route_id: 'CHIBU_VILLAGE_BUS',
    agency_id: 'CHIBU_VILLAGE',
    route_short_name: '村営バス',
    route_long_name: '知夫村営バス',
    route_desc: '知夫村内を結ぶ村営バス',
    route_type: '3',
    route_url: SOURCE_URL,
    route_color: '047857',
    route_text_color: 'FFFFFF'
  }
]

const STOPS = [
  stop('kuri_naikosen', '来居内航船', '来居港内（内航船乗り場）', 36.0243794, 133.0401959),
  stop('nibu_bus', '仁夫', '仁夫バス停', 36.00669672, 133.03282616),
  stop('nibu_mitaya', '仁夫美田屋前', '仁夫 美田屋前', 36.00662, 133.0327),
  stop('usuge_bus', '薄毛', '薄毛バス停', 36.00562588, 133.05737786),
  stop('taku_bus', '多沢', '多沢バス停', 36.0089692, 133.04858535),
  stop('taku_shofukuen', '多沢招福苑', '多沢 招福苑', 36.00935, 133.0489),
  stop('kori_school', '郡学校前', '郡 学校前', 36.01349392, 133.04180702),
  stop('kori_community', '郡コミュニティ', '郡 コミュニティ', 36.01349392, 133.04180702),
  stop('kuri_ferry', '来居フェリー', '来居港フェリーターミナル', 36.0249446, 133.03939755),
  stop('kuri_office', '来居事務所', '来居 事務所', 36.0249446, 133.03939755),
  stop('furumi_bus', '古海', '古海バス停', 36.0293181, 133.02505562),
  stop('oe_clinic', '大江診療所', '大江 診療所', 36.01276648, 133.04056315)
]

const TRIPS = [
  {
    trip_id: 'CHIBU_01_0715',
    trip_short_name: '1便',
    trip_headsign: '来居・郡',
    jp_trip_desc: '1便。★印の古海は前日17:00までに予約。',
    stops: [
      ['kuri_naikosen', '07:15:00'],
      ['nibu_bus', '07:24:00'],
      ['usuge_bus', '07:35:00'],
      ['taku_bus', '07:40:00'],
      ['kori_school', '07:43:00'],
      ['kuri_naikosen', '07:47:00'],
      ['furumi_bus', '07:55:00'],
      ['kuri_naikosen', '08:06:00']
    ]
  },
  {
    trip_id: 'CHIBU_02_0815',
    trip_short_name: '2便',
    trip_headsign: '来居・郡',
    jp_trip_desc: '2便。☆印は30分前までに予約受付時のみ玄関まで送迎。',
    stops: [
      ['kori_community', '08:15:00'],
      ['nibu_bus', '08:20:00'],
      ['nibu_mitaya', '08:21:00'],
      ['oe_clinic', '08:27:00'],
      ['usuge_bus', '08:32:00'],
      ['taku_bus', '08:37:00'],
      ['taku_shofukuen', '08:39:00'],
      ['kori_school', '08:41:00'],
      ['kuri_naikosen', '08:45:00'],
      ['furumi_bus', '08:52:00'],
      ['kuri_naikosen', '08:58:00']
    ]
  },
  {
    trip_id: 'CHIBU_03_0948',
    trip_short_name: '3便',
    trip_headsign: '来居',
    jp_trip_desc: '3便。☆印は30分前までに予約受付時のみ玄関まで送迎。',
    stops: [
      ['kori_community', '09:48:00'],
      ['taku_shofukuen', '09:50:00'],
      ['taku_bus', '09:52:00'],
      ['usuge_bus', '09:57:00'],
      ['nibu_bus', '10:08:00'],
      ['kori_school', '10:13:00'],
      ['kuri_ferry', '10:17:00']
    ]
  },
  {
    trip_id: 'CHIBU_04_1123',
    trip_short_name: '4便',
    trip_headsign: '来居',
    jp_trip_desc: '4便。来居フェリー以降の停留所は原本上「降車専用」のみで時刻未記載。',
    stops: [
      ['kori_community', '11:23:00'],
      ['kori_school', '11:24:00'],
      ['kuri_ferry', '11:28:00']
    ]
  }
]

const WEEKDAY_SERVICE_ID = 'weekday_except_holidays'
const HOLIDAYS_AND_SUSPENSIONS_2026 = [
  '20260101',
  '20260112',
  '20260211',
  '20260223',
  '20260320',
  '20260429',
  '20260504',
  '20260505',
  '20260506',
  '20260720',
  '20260811',
  '20260813',
  '20260814',
  '20260921',
  '20260922',
  '20260923',
  '20261012',
  '20261103',
  '20261123',
  '20261229',
  '20261230',
  '20261231'
]

function stop(id, name, desc, lat, lon) {
  return {
    stop_id: id,
    stop_code: id,
    stop_name: name,
    stop_desc: desc,
    stop_lat: String(lat),
    stop_lon: String(lon),
    zone_id: '',
    stop_url: '',
    location_type: '0',
    parent_station: '',
    platform_code: ''
  }
}

function agencyRows() {
  return [{
    agency_id: 'CHIBU_VILLAGE',
    agency_name: '知夫村',
    agency_url: 'https://www.vill.chibu.lg.jp/',
    agency_timezone: 'Asia/Tokyo',
    agency_lang: 'ja',
    agency_phone: '08514-2-2321'
  }]
}

function calendarRows() {
  return [{
    service_id: WEEKDAY_SERVICE_ID,
    monday: '1',
    tuesday: '1',
    wednesday: '1',
    thursday: '1',
    friday: '1',
    saturday: '0',
    sunday: '0',
    start_date: FEED_START,
    end_date: FEED_END
  }]
}

function calendarDateRows() {
  return HOLIDAYS_AND_SUSPENSIONS_2026.map(date => ({
    service_id: WEEKDAY_SERVICE_ID,
    date,
    exception_type: '2'
  }))
}

function tripRows() {
  return TRIPS.map((trip, index) => ({
    route_id: 'CHIBU_VILLAGE_BUS',
    service_id: WEEKDAY_SERVICE_ID,
    trip_id: trip.trip_id,
    trip_headsign: trip.trip_headsign,
    direction_id: '0',
    block_id: '',
    trip_short_name: trip.trip_short_name,
    shape_id: '',
    jp_trip_desc: trip.jp_trip_desc,
    jp_pattern_id: `CHIBU_PATTERN_${String(index + 1).padStart(2, '0')}`
  }))
}

function stopTimeRows() {
  return TRIPS.flatMap(trip => trip.stops.map(([stopId, time], index) => ({
    trip_id: trip.trip_id,
    arrival_time: time,
    departure_time: time,
    stop_id: stopId,
    stop_sequence: String(index + 1),
    stop_headsign: '',
    pickup_type: '0',
    drop_off_type: '0',
    timepoint: '1'
  })))
}

function fareAttributesRows() {
  return [{
    fare_id: 'CHIBU_FLAT_ADULT',
    price: '100',
    currency_type: 'JPY',
    payment_method: '0',
    transfers: '0',
    agency_id: 'CHIBU_VILLAGE'
  }]
}

function fareRulesRows() {
  return [{
    fare_id: 'CHIBU_FLAT_ADULT',
    route_id: 'CHIBU_VILLAGE_BUS',
    origin_id: '',
    destination_id: '',
    contains_id: ''
  }]
}

function feedInfoRows() {
  return [{
    feed_publisher_name: '知夫村',
    feed_publisher_url: SOURCE_URL,
    feed_lang: 'ja',
    feed_start_date: FEED_START,
    feed_end_date: FEED_END,
    feed_version: FEED_VERSION
  }]
}

function writeCsv(filePath, rows, columns) {
  mkdirSync(join(filePath, '..'), { recursive: true })
  const normalizedRows = rows.map(row => Object.fromEntries(
    columns.map(column => [column, row[column] ?? ''])
  ))
  writeFileSync(filePath, `${unparseCsv(normalizedRows, { columns, newline: '\n' })}\n`, 'utf-8')
}

function writeGtfs(outputDir) {
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
  writeCsv(join(outputDir, 'calendar_dates.txt'), calendarDateRows(), [
    'service_id', 'date', 'exception_type'
  ])
  writeCsv(join(outputDir, 'trips.txt'), tripRows(), [
    'route_id', 'service_id', 'trip_id', 'trip_headsign', 'direction_id',
    'block_id', 'trip_short_name', 'shape_id', 'jp_trip_desc', 'jp_pattern_id'
  ])
  writeCsv(join(outputDir, 'stop_times.txt'), stopTimeRows(), [
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
  if (!existsSync(SOURCE_IMAGE)) {
    throw new Error(`時刻表画像が見つかりません: ${SOURCE_IMAGE}`)
  }

  writeGtfs(args.outputDir)
  if (args.updateCurrent && resolve(args.outputDir) !== resolve(CURRENT_DIR)) {
    cpSync(args.outputDir, CURRENT_DIR, { recursive: true })
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  const report = {
    convertedAt: new Date().toISOString(),
    sourceImage: SOURCE_IMAGE,
    sourceUrl: SOURCE_URL,
    outputDir: args.outputDir,
    currentUpdated: args.updateCurrent,
    feedStartDate: FEED_START,
    feedEndDate: FEED_END,
    feedVersion: FEED_VERSION,
    counts: {
      routes: ROUTES.length,
      stops: STOPS.length,
      services: calendarRows().length,
      calendarDates: calendarDateRows().length,
      trips: tripRows().length,
      stopTimes: stopTimeRows().length
    },
    notes: [
      '公式ページ掲載の時刻表画像を原本として、時刻が明記された停留所のみ stop_times に転記',
      '土・日・祝日・お盆期間・年末年始は運休として calendar/calendar_dates に反映',
      '1便の★印古海は予約制注記を jp_trip_desc に保持',
      '2便・3便の☆印送迎注記を jp_trip_desc に保持',
      '5便および各便の降車専用のみの停留所は時刻未記載のため stop_times には含めていない'
    ]
  }
  writeFileSync(join(REPORT_DIR, '2023-02-01.image-conversion.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf-8')

  console.log(`知夫村営バス時刻表画像から GTFS を生成しました: ${args.outputDir}`)
  if (args.updateCurrent) {
    console.log(`current も更新しました: ${CURRENT_DIR}`)
  }
  console.log(`routes=${ROUTES.length}, stops=${STOPS.length}, trips=${TRIPS.length}, stop_times=${stopTimeRows().length}`)
}

main()
