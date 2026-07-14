#!/usr/bin/env node
/* eslint-disable no-console */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { spawnSync } from 'child_process'
import Papa from 'papaparse'
import { getTransportSourceOperation } from '../../config/transport-sources.mjs'

const { unparse: unparseCsv } = Papa

const ROOT = process.cwd()
const SOURCE_PDF = join(ROOT, 'gtfs', 'pdf', 'bus', 'ichibata_bus_connection', 'oki_2026_dia.pdf')
const RAW_DIR = join(ROOT, 'gtfs', 'raw', 'bus', 'ichibata_bus_connection', '2026-04-01')
const CURRENT_DIR = join(ROOT, 'gtfs', 'current', 'bus', 'ichibata_bus_connection')
const REPORT_DIR = join(ROOT, 'gtfs', 'reports', 'bus', 'ichibata_bus_connection')

const FEED_START = '20260401'
const FEED_END = '20261231'
const FEED_VERSION = 'oki_2026_dia_20260401-20261231'
const ICHIBATA_SOURCE = getTransportSourceOperation('ichibata-bus-connection')
const SOURCE_URL = ICHIBATA_SOURCE.sourceUrl
const SOURCE_PAGE_URL = ICHIBATA_SOURCE.officialUrl

const AGENCY_ID = 'agency_ichibata_bus_connection_a97e48aa'
const ROUTE_ID = 'route_ichibata_bus_connection_https_bus_ichibata_8927b51c'

const STOPS = [
  stop(
    'matsue_station',
    '松江駅',
    '松江駅前バスターミナル9番のりば',
    35.464361000000004,
    133.06285
  ),
  stop(
    'fuzoku_gakuen_iriguchi',
    '附属学園入口',
    '松江駅発の接続バス経由停留所',
    35.479461000000065,
    133.063467
  ),
  stop(
    'rainbow_plaza_mae',
    'レインボープラザ前',
    '松江駅行き接続バス経由停留所',
    35.480441344319814,
    133.06465342327292
  ),
  stop(
    'shichirui_port',
    '七類港',
    'フェリーはフェリーターミナル正面バス停、高速船は接岸岸壁そば',
    35.57113300000003,
    133.23002099999997
  ),
  stop(
    'sakaiminato_port',
    '境港',
    'フェリーはJR境港駅前バスのりば、高速船は接岸岸壁そば',
    35.54510346994129,
    133.22338314132912
  )
]

const ROUTES = [{
  route_id: ROUTE_ID,
  agency_id: AGENCY_ID,
  route_short_name: '松江・七類・境港間時刻表',
  route_long_name: '一畑バス・隠岐汽船接続バス / 松江・七類・境港間時刻表 / 隠岐汽船連絡バス時刻表 2026年3月から（PDFが表示されます。）',
  route_desc: '一畑バス・隠岐汽船接続バス / 隠岐汽船連絡バス時刻表 2026年3月から（PDFが表示されます。）',
  route_type: '3',
  route_url: SOURCE_URL,
  route_color: '00833E',
  route_text_color: 'FFFFFF'
}]

const PERIODS = [
  shichirui('20260401_20260430', '20260401', '20260430', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発'],
    ['15:40', '15:45', '16:20', 'レインボーJ 16:50発']
  ], [
    ['10:03', '10:38', '10:43', 'レインボーJ 10:03着'],
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20260501_20260506', '20260501', '20260506', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発'],
    ['15:40', '15:45', '16:20', 'レインボーJ 16:50発']
  ], [
    ['15:12', '15:47', '15:52', 'レインボーJ 15:12着'],
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20260507_20260524', '20260507', '20260524', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発'],
    ['15:40', '15:45', '16:20', 'レインボーJ 16:50発']
  ], [
    ['10:03', '10:38', '10:43', 'レインボーJ 10:03着'],
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20260525_20260529', '20260525', '20260529', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発']
  ], [
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20260530_20260531', '20260530', '20260531', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発'],
    ['15:40', '15:45', '16:20', 'レインボーJ 16:50発']
  ], [
    ['10:03', '10:38', '10:43', 'レインボーJ 10:03着'],
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20260601_20260717', '20260601', '20260717', [
    ['07:50', '07:55', '08:30', 'おき 9:00発'],
    ['15:40', '15:45', '16:20', 'レインボーJ 16:50発']
  ], [
    ['10:03', '10:38', '10:43', 'レインボーJ 10:03着'],
    ['18:10', '18:45', '18:50', 'おき 18:05着']
  ]),
  shichirui('20260718_20260807', '20260718', '20260807', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発'],
    ['15:40', '15:45', '16:20', 'レインボーJ 16:50発']
  ], [
    ['10:03', '10:38', '10:43', 'レインボーJ 10:03着'],
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20260808_20260816', '20260808', '20260816', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発'],
    ['13:35', '13:40', '14:15', 'おき 14:45発'],
    ['15:40', '15:45', '16:20', 'レインボーJ 16:50発']
  ], [
    ['14:25', '15:00', '15:05', 'おき 14:20着'],
    ['15:12', '15:47', '15:52', 'レインボーJ 15:12着'],
    ['18:35', '19:10', '19:15', 'くにが 18:25着'],
    ['20:05', '20:40', '20:45', 'おき 20:00着']
  ]),
  shichirui('20260817_20260831', '20260817', '20260831', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発'],
    ['15:40', '15:45', '16:20', 'レインボーJ 16:50発']
  ], [
    ['10:03', '10:38', '10:43', 'レインボーJ 10:03着'],
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20260901_20261009', '20260901', '20261009', [
    ['07:50', '07:55', '08:30', 'おき 9:00発'],
    ['14:35', '14:40', '15:15', 'レインボーJ 15:45発']
  ], [
    ['10:03', '10:38', '10:43', 'レインボーJ 10:03着'],
    ['18:10', '18:45', '18:50', 'おき 18:05着']
  ]),
  shichirui('20261010_20261031', '20261010', '20261031', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発'],
    ['14:35', '14:40', '15:15', 'レインボーJ 15:45発']
  ], [
    ['10:03', '10:38', '10:43', 'レインボーJ 10:03着'],
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20261101_20261108', '20261101', '20261108', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発']
  ], [
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  shichirui('20261109_20261220', '20261109', '20261220', [
    ['07:50', '07:55', '08:30', 'おき 9:00発']
  ], [
    ['18:10', '18:45', '18:50', 'おき 18:05着']
  ]),
  shichirui('20261221_20261231', '20261221', '20261231', [
    ['07:50', '07:55', '08:30', 'おき 9:00発 / くにが 9:30発']
  ], [
    ['17:45', '18:20', '18:25', 'くにが 17:35着'],
    ['18:00', '18:35', '18:40', 'おき 17:55着']
  ]),
  sakaiminato('20260401_20260430', '20260401', '20260430', [
    ['13:15', '13:20', '13:55', 'しらしま 14:25発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20260501_20260506', '20260501', '20260506', [
    ['10:50', '10:55', '11:30', 'レインボーJ 12:00発'],
    ['13:15', '13:20', '13:55', 'しらしま 14:25発']
  ], [
    ['09:58', '10:33', '10:38', 'レインボーJ 9:58着'],
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20260507_20260531', '20260507', '20260531', [
    ['13:15', '13:20', '13:55', 'しらしま 14:25発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20260601_20260717', '20260601', '20260717', [
    ['13:00', '13:05', '13:40', 'しらしま 14:10発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20260718_20260807', '20260718', '20260807', [
    ['13:15', '13:20', '13:55', 'しらしま 14:25発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20260808_20260816', '20260808', '20260816', [
    ['13:15', '13:20', '13:55', 'しらしま 14:25発'],
    ['10:50', '10:55', '11:30', 'レインボーJ 12:00発']
  ], [
    ['09:58', '10:33', '10:38', 'レインボーJ 9:58着'],
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20260817_20260831', '20260817', '20260831', [
    ['13:15', '13:20', '13:55', 'しらしま 14:25発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20260901_20261009', '20260901', '20261009', [
    ['13:00', '13:05', '13:40', 'しらしま 14:10発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20261010_20261031', '20261010', '20261031', [
    ['13:15', '13:20', '13:55', 'しらしま 14:25発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20261101_20261108', '20261101', '20261108', [
    ['13:15', '13:20', '13:55', 'しらしま 14:25発'],
    ['14:00', '14:05', '14:40', 'レインボーJ 15:10発']
  ], [
    ['10:17', '10:52', '10:57', 'レインボーJ 10:17着'],
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20261109_20261130', '20261109', '20261130', [
    ['13:00', '13:05', '13:40', 'しらしま 14:10発'],
    ['14:00', '14:05', '14:40', 'レインボーJ 15:10発']
  ], [
    ['10:17', '10:52', '10:57', 'レインボーJ 10:17着'],
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20261201_20261220', '20261201', '20261220', [
    ['13:00', '13:05', '13:40', 'しらしま 14:10発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
  ]),
  sakaiminato('20261221_20261231', '20261221', '20261231', [
    ['13:15', '13:20', '13:55', 'しらしま 14:25発']
  ], [
    ['13:25', '14:00', '14:05', 'しらしま 13:20着']
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

function shichirui(id, startDate, endDate, outbound, inbound) {
  return period(`shichirui_${id}`, 'shichirui', '七類港', '松江⇔七類港', startDate, endDate, outbound, inbound)
}

function sakaiminato(id, startDate, endDate, outbound, inbound) {
  return period(`sakaiminato_${id}`, 'sakaiminato', '境港', '松江⇔境港', startDate, endDate, outbound, inbound)
}

function period(id, line, portName, shortName, startDate, endDate, outbound, inbound) {
  return {
    serviceId: `service_${id}`,
    line,
    portName,
    shortName,
    startDate,
    endDate,
    outbound,
    inbound
  }
}

function agencyRows() {
  return [{
    agency_id: AGENCY_ID,
    agency_name: '一畑バス株式会社',
    agency_url: 'https://bus.ichibata.co.jp/oki-kisen/oki-kisen-sichirui/',
    agency_timezone: 'Asia/Tokyo',
    agency_lang: 'ja',
    agency_phone: '0852-20-5205'
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
    fare_id: 'ICHIBATA_CONNECTION_MAX_ADULT',
    price: '1200',
    currency_type: 'JPY',
    payment_method: '0',
    transfers: '0',
    agency_id: AGENCY_ID
  }]
}

function fareRulesRows() {
  return [{
    fare_id: 'ICHIBATA_CONNECTION_MAX_ADULT',
    route_id: ROUTE_ID,
    origin_id: '',
    destination_id: '',
    contains_id: ''
  }]
}

function feedInfoRows() {
  return [{
    feed_publisher_name: '一畑バス株式会社',
    feed_publisher_url: SOURCE_PAGE_URL,
    feed_lang: 'ja',
    feed_start_date: FEED_START,
    feed_end_date: FEED_END,
    feed_version: FEED_VERSION
  }]
}

function portStopId(periodRow) {
  if (periodRow.line === 'shichirui') return 'shichirui_port'
  if (periodRow.line === 'sakaiminato') return 'sakaiminato_port'
  throw new Error(`未知のlineです: ${periodRow.line}`)
}

function buildTripsAndStopTimes() {
  const trips = []
  const stopTimes = []

  for (const periodRow of PERIODS) {
    periodRow.outbound.forEach((times, index) => {
      addTrip({ trips, stopTimes }, periodRow, 'outbound', index + 1, times)
    })
    periodRow.inbound.forEach((times, index) => {
      addTrip({ trips, stopTimes }, periodRow, 'inbound', index + 1, times)
    })
  }

  return { trips, stopTimes }
}

function addTrip(context, periodRow, direction, sequence, [time1, time2, time3, connection]) {
  const isOutbound = direction === 'outbound'
  const directionCode = isOutbound ? 'OUT' : 'IN'
  const tripId = [
    'ICHIBATA',
    periodRow.line.toUpperCase(),
    periodRow.startDate,
    directionCode,
    time1.replace(':', ''),
    String(sequence).padStart(2, '0')
  ].join('_')
  const stops = isOutbound
    ? ['matsue_station', 'fuzoku_gakuen_iriguchi', portStopId(periodRow)]
    : [portStopId(periodRow), 'rainbow_plaza_mae', 'matsue_station']
  const times = [time1, time2, time3]

  context.trips.push({
    route_id: ROUTE_ID,
    service_id: periodRow.serviceId,
    trip_id: tripId,
    trip_headsign: isOutbound ? periodRow.portName : '松江駅',
    direction_id: isOutbound ? '0' : '1',
    block_id: '',
    trip_short_name: periodRow.shortName,
    shape_id: '',
    jp_trip_desc: `接続船: ${connection}`,
    jp_pattern_id: `${periodRow.line}_${direction}`
  })

  stops.forEach((stopId, index) => {
    const time = withSeconds(times[index])
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

function withSeconds(value) {
  return `${value}:00`
}

function extractPdfText(pdfPath) {
  const python = process.env.GTFS_PYTHON || 'python3'
  const result = spawnSync(python, ['-c', `
from pypdf import PdfReader
import sys
reader = PdfReader(sys.argv[1])
print(reader.pages[0].extract_text(extraction_mode="layout"))
`, pdfPath], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  })
  if (result.status !== 0) {
    throw new Error([
      'PDF テキスト抽出に失敗しました',
      result.stderr.trim(),
      'python3 と pypdf が必要です。別の Python を使う場合は GTFS_PYTHON を指定してください。'
    ].filter(Boolean).join('\n'))
  }
  return result.stdout
}

function assertSourcePdf() {
  if (!existsSync(SOURCE_PDF)) {
    throw new Error(`PDF 原本が見つかりません: ${SOURCE_PDF}`)
  }

  const text = extractPdfText(SOURCE_PDF).replace(/\s+/g, '')
  for (const expected of [
    '松江駅⇔七類港',
    '松江駅⇔境港',
    '２０２６年４月１日～４月３０日',
    '２０２６年１２月２１日～１２月３１日',
    '隠岐汽船が欠航した場合'
  ]) {
    if (!text.includes(expected)) {
      throw new Error(`PDF 原本の確認に失敗しました。期待する文字列が見つかりません: ${expected}`)
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
  assertSourcePdf()

  const { trips, stopTimes } = writeGtfs(args.outputDir)
  if (args.updateCurrent && resolve(args.outputDir) !== resolve(CURRENT_DIR)) {
    cpSync(args.outputDir, CURRENT_DIR, { recursive: true })
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  const report = {
    convertedAt: new Date().toISOString(),
    sourcePdf: SOURCE_PDF,
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
      '公式PDFの松江駅-七類港、松江駅-境港の接続バス時刻表をGTFSに転記',
      'PDFの掲出期間は2026年4月1日から2027年2月28日だが、このfeedは2026年内の2026年12月31日までを対象に生成',
      '隠岐汽船欠航時は接続バスも運休する注記があるが、静的GTFSではリアルタイム運休として表現できないため資料注記として保持',
      '船舶時刻はjp_trip_descに接続船情報として保持し、stop_timesはバス停発着時刻のみを出力',
      '七類港と境港のフェリー/高速船のりば差分はstop_descに保持し、時刻表列名に合わせて各港1停留所として扱う',
      '運賃は松江駅発着の大人片道1,200円を最大運賃としてfare_attributesとbus-searchに保持。附属学園入口/レインボープラザ前発着は公式運賃表で1,100円'
    ]
  }
  writeFileSync(join(REPORT_DIR, '2026-04-01.conversion.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf-8')

  console.log(`一畑バス・隠岐汽船接続バス GTFS を生成しました: ${args.outputDir}`)
  if (args.updateCurrent) {
    console.log(`current も更新しました: ${CURRENT_DIR}`)
  }
  console.log(`routes=${ROUTES.length}, stops=${STOPS.length}, trips=${trips.length}, stop_times=${stopTimes.length}`)
}

main()
