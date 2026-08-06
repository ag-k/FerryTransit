#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'fs'
import { basename, join, resolve } from 'path'
import { spawnSync } from 'child_process'
import Papa from 'papaparse'

const ROOT = process.cwd()
const SOURCE_DIR = join(ROOT, 'gtfs', 'pdf', 'bus', 'ama', 'r8')
const SOURCE_META_PATH = join(ROOT, 'gtfs', 'sources', 'ama.bus.json')
const TEMPLATE_DIR = join(ROOT, 'gtfs', 'current', 'bus', 'ama')
const RAW_DIR = join(ROOT, 'gtfs', 'raw', 'bus', 'ama', '2026-06-11')
const CURRENT_DIR = join(ROOT, 'gtfs', 'current', 'bus', 'ama')
const REPORT_DIR = join(ROOT, 'gtfs', 'reports', 'bus', 'ama')

const FEED_START = '20260102'
const FEED_END = '20261231'
const FEED_VERSION = 'R8_20260611'
const LEGACY_END_DATE = '20260531'

const ROUTE_FILES_TO_COPY = [
  'agency.txt',
  'routes.txt',
  'stops.txt',
  'fare_attributes.txt',
  'fare_rules.txt',
  'transfers.txt',
  'translations.txt'
]

const JAPAN_HOLIDAYS_2026 = [
  '20260101',
  '20260112',
  '20260211',
  '20260223',
  '20260320',
  '20260429',
  '20260503',
  '20260504',
  '20260505',
  '20260506',
  '20260720',
  '20260811',
  '20260921',
  '20260922',
  '20260923',
  '20261012',
  '20261103',
  '20261123'
]

const TOYODA_FORWARD_FULL = ids([
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113,
  114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126
])
const TOYODA_FORWARD_BRANCH = ids([100, 109])
const TOYODA_FORWARD_SKIP_NORTH = ids([
  100, 101, 102, 103, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117,
  118, 119, 120, 121, 122, 123, 124, 125, 126
])
const TOYODA_FORWARD_SKIP_NORTH_AND_WEST = ids([
  100, 101, 102, 103, 108, 109, 110, 111, 112, 113, 114, 115, 116, 120,
  121, 122, 123, 124, 125, 126
])
const TOYODA_FORWARD_SKIP_WEST = ids([
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113,
  114, 115, 116, 120, 121, 122, 123, 124, 125, 126
])

const TOYODA_REVERSE_FULL = [...TOYODA_FORWARD_FULL].reverse()
const TOYODA_REVERSE_BRANCH = ids([109, 108, 103, 102, 100])
const TOYODA_REVERSE_SKIP_NORTH = without(TOYODA_REVERSE_FULL, ids([104, 105, 106, 107]))
const TOYODA_REVERSE_SKIP_NORTH_AND_WEST = without(TOYODA_REVERSE_FULL, ids([104, 105, 106, 107, 117, 118, 119]))
const TOYODA_REVERSE_SKIP_WEST = without(TOYODA_REVERSE_FULL, ids([117, 118, 119]))
const TOYODA_REVERSE_NO_CLINIC = without(TOYODA_REVERSE_FULL, ids([113]))

const TOYODA_FORWARD_PATTERNS = [
  [
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_BRANCH,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_SKIP_NORTH,
    TOYODA_FORWARD_SKIP_NORTH_AND_WEST,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_BRANCH
  ],
  [
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_BRANCH,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_SKIP_NORTH,
    TOYODA_FORWARD_SKIP_NORTH_AND_WEST,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_BRANCH
  ],
  [
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_BRANCH,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_SKIP_WEST,
    TOYODA_FORWARD_FULL,
    TOYODA_FORWARD_BRANCH
  ]
]

const TOYODA_REVERSE_PATTERNS = [
  [
    TOYODA_REVERSE_BRANCH,
    TOYODA_REVERSE_SKIP_NORTH,
    TOYODA_REVERSE_FULL,
    TOYODA_REVERSE_BRANCH,
    TOYODA_REVERSE_FULL,
    TOYODA_REVERSE_SKIP_NORTH_AND_WEST,
    TOYODA_REVERSE_SKIP_WEST,
    TOYODA_REVERSE_NO_CLINIC
  ],
  [
    TOYODA_REVERSE_BRANCH,
    TOYODA_REVERSE_SKIP_NORTH,
    TOYODA_REVERSE_FULL,
    TOYODA_REVERSE_BRANCH,
    TOYODA_REVERSE_FULL,
    TOYODA_REVERSE_SKIP_NORTH_AND_WEST,
    TOYODA_REVERSE_SKIP_WEST,
    TOYODA_REVERSE_NO_CLINIC
  ],
  [
    TOYODA_REVERSE_BRANCH,
    TOYODA_REVERSE_SKIP_NORTH,
    TOYODA_REVERSE_FULL,
    TOYODA_REVERSE_BRANCH,
    TOYODA_REVERSE_SKIP_WEST,
    TOYODA_REVERSE_SKIP_NORTH,
    TOYODA_REVERSE_SKIP_WEST,
    TOYODA_REVERSE_NO_CLINIC
  ]
]

const AMA_WEEKDAY_PATTERNS = [
  { routeId: '21', stops: ids([111, 112, 201, 202, 203, 204, 209, 118, 119, 120, 121, 126]) },
  { routeId: '22', stops: ids([207, 205, 206, 208, 209, 118, 119, 120, 121, 115, 113, 111]) },
  { routeId: '23', stops: ids([126, 113, 201, 202, 203, 204, 205, 206, 207, 208, 209, 118, 119, 120, 125, 126, 113, 111]) },
  { routeId: '24', stops: ids([111, 113, 201, 202, 203, 204, 209, 118, 117, 116, 115, 114, 113, 112, 111]) },
  { routeId: '25', stops: ids([111, 112, 113, 126, 125, 123, 120, 118, 209, 208, 205, 206, 207, 204, 203, 202, 201, 112, 113, 111]) },
  { routeId: '26', stops: ids([111, 112, 113, 126, 125, 123, 120, 118, 209, 208, 205, 206, 207, 204, 203, 202, 201, 112, 113, 111]) },
  { routeId: '27', stops: ids([126, 125, 123, 120, 118, 209, 208, 205, 206, 207, 204, 203, 202, 201, 112, 111]) }
]

const AMA_WEEKDAY_SHORT_LOOP = { routeId: '28', stops: ids([126, 113, 115, 118, 209, 205, 206, 207, 204, 203, 202, 201, 112, 113, 126, 113, 111]) }

const AMA_HOLIDAY_PATTERNS = [
  { routeId: '21', stops: ids([111, 112, 115, 209, 204, 202, 201, 202, 203, 204, 205, 206, 207, 208, 126, 111]) },
  { routeId: '29', stops: ids([126, 123, 120, 118, 209, 205, 206, 207, 204, 203, 202, 201, 112, 126, 111]) },
  { routeId: '25', stops: ids([111, 112, 126, 125, 123, 120, 118, 209, 208, 205, 206, 207, 204, 203, 202, 201, 112, 111]) },
  { routeId: '26', stops: ids([111, 112, 126, 125, 123, 120, 118, 209, 208, 205, 206, 207, 204, 203, 202, 201, 112, 111]) },
  { routeId: '27', stops: ids([126, 125, 123, 120, 118, 209, 208, 205, 206, 207, 204, 203, 202, 201, 112, 111]) }
]

const AMA_HOLIDAY_LONG_LOOP = { routeId: '23', stops: ids([126, 113, 201, 202, 203, 204, 205, 206, 207, 208, 209, 118, 119, 120, 126, 113, 111]) }

function ids(values) {
  return values.map(value => `${value}_01`)
}

function without(values, excludes) {
  const excludeSet = new Set(excludes)
  return values.filter(value => !excludeSet.has(value))
}

function readCsv(filePath) {
  const text = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data
}

function writeCsv(filePath, rows, columns) {
  mkdirSync(join(filePath, '..'), { recursive: true })
  writeFileSync(filePath, `${Papa.unparse(rows, { columns, newline: '\n' })}\n`, 'utf-8')
}

function normalizeText(text) {
  return text
    .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ':')
}

function extractPdfPages(pdfPath) {
  const python = process.env.GTFS_PYTHON || 'python3'
  const code = `
import json
import sys
from pypdf import PdfReader

out = []
for path in sys.argv[1:]:
    reader = PdfReader(path)
    out.append([page.extract_text() or "" for page in reader.pages])
print(json.dumps(out, ensure_ascii=False))
`
  const result = spawnSync(python, ['-c', code, pdfPath], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 20
  })

  if (result.status !== 0) {
    throw new Error([
      `PDF テキスト抽出に失敗しました: ${basename(pdfPath)}`,
      result.stderr.trim(),
      'python3 と pypdf が必要です。別の Python を使う場合は GTFS_PYTHON を指定してください。'
    ].filter(Boolean).join('\n'))
  }

  return JSON.parse(result.stdout)[0].map(normalizeText)
}

function parsePeriods(pageText) {
  const periods = []
  const re = /(\d{1,2})月(\d{1,2})日\s*～\s*(?:(\d{1,2})月)?(\d{1,2})日/g
  let match
  while ((match = re.exec(pageText)) !== null) {
    const startMonth = Number(match[1])
    const startDay = Number(match[2])
    const endMonth = Number(match[3] || match[1])
    const endDay = Number(match[4])
    periods.push({
      startDate: ymd(2026, startMonth, startDay),
      endDate: ymd(2026, endMonth, endDay)
    })
  }
  if (periods.length === 0) {
    throw new Error('PDF ページから運行期間を抽出できませんでした。')
  }
  return periods
}

function ymd(year, month, day) {
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
}

function timeRows(pageText) {
  return pageText
    .split(/\n/)
    .map(line => [...line.matchAll(/※?\d{1,2}:\d{2}/g)].map(match => match[0].replace(/^※/, '')))
    .filter(times => times.length > 1)
}

function splitToyodaRows(pageText) {
  const forwardText = pageText.split(/隠岐汽船乗場発\s*豊田行便/)[0]
  const reverseText = pageText.split(/隠岐汽船乗場発\s*豊田行便/)[1]
  if (!reverseText) {
    throw new Error('豊田線 PDF から上下便の区切りを抽出できませんでした。')
  }
  return {
    forward: timeRows(forwardText),
    reverse: timeRows(reverseText)
  }
}

function splitAmaRows(pageText) {
  const [weekdayText, holidayText] = pageText.split(/土、日、祝日運行便/)
  if (!weekdayText || !holidayText) {
    throw new Error('海士島線 PDF から平日/土日祝の区切りを抽出できませんでした。')
  }
  return {
    weekday: timeRows(weekdayText),
    holiday: timeRows(holidayText)
  }
}

function buildServices(periods, kind, indexPrefix, indexOffset = 0) {
  return periods.map((period, index) => {
    const serviceId = `R8_${indexPrefix}_${String(index + indexOffset + 1).padStart(2, '0')}_${kind}`
    return {
      ...period,
      serviceId,
      kind
    }
  })
}

function calendarRow(service) {
  const weekday = service.kind === 'weekday'
  return {
    service_id: service.serviceId,
    monday: weekday ? '1' : '0',
    tuesday: weekday ? '1' : '0',
    wednesday: weekday ? '1' : '0',
    thursday: weekday ? '1' : '0',
    friday: weekday ? '1' : '0',
    saturday: weekday ? '0' : '1',
    sunday: weekday ? '0' : '1',
    start_date: service.startDate,
    end_date: service.endDate
  }
}

function calendarDateRows(service) {
  const rows = []
  for (const date of JAPAN_HOLIDAYS_2026) {
    if (date < service.startDate || date > service.endDate) continue
    if (service.kind === 'weekday') {
      rows.push({ service_id: service.serviceId, date, exception_type: '2' })
    } else if (isWeekday(date)) {
      rows.push({ service_id: service.serviceId, date, exception_type: '1' })
    }
  }
  return rows
}

function isWeekday(date) {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(4, 6)) - 1
  const day = Number(date.slice(6, 8))
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay()
  return weekday >= 1 && weekday <= 5
}

function formatGtfsTime(value) {
  const [hour, minute] = value.split(':')
  return `${hour.padStart(2, '0')}:${minute}:00`
}

function addTrip(context, tripSpec) {
  const { trips, stopTimes, stopNames } = context
  const stopIds = tripSpec.stopIds
  const times = tripSpec.times
  if (stopIds.length !== times.length) {
    throw new Error(`${tripSpec.tripId}: 停留所数 ${stopIds.length} と時刻数 ${times.length} が一致しません。`)
  }

  const headsign = stopNames.get(stopIds.at(-1)) || stopIds.at(-1)
  trips.push({
    route_id: tripSpec.routeId,
    service_id: tripSpec.serviceId,
    trip_id: tripSpec.tripId,
    trip_headsign: headsign,
    direction_id: tripSpec.directionId,
    block_id: '',
    trip_short_name: '',
    shape_id: '',
    jp_trip_desc: '',
    jp_pattern_id: tripSpec.patternId
  })

  stopIds.forEach((stopId, index) => {
    stopTimes.push({
      trip_id: tripSpec.tripId,
      arrival_time: formatGtfsTime(times[index]),
      departure_time: formatGtfsTime(times[index]),
      stop_id: stopId,
      stop_sequence: String(index + 1),
      stop_headsign: headsign,
      pickup_type: index === stopIds.length - 1 ? '1' : '0',
      drop_off_type: index === 0 ? '1' : '0',
      timepoint: '1'
    })
  })
}

function removeClinicForHoliday(stopIds, times) {
  const filteredStopIds = []
  const filteredTimes = []
  stopIds.forEach((stopId, index) => {
    if (stopId === '113_01') return
    filteredStopIds.push(stopId)
    filteredTimes.push(times[index])
  })
  return { stopIds: filteredStopIds, times: filteredTimes }
}

function convertToyodaPage(context, pageText, pageIndex, options = {}) {
  const periods = options.periods || parsePeriods(pageText)
  const rows = splitToyodaRows(pageText)
  const patternIndex = options.patternIndex ?? pageIndex
  const servicePageIndex = options.servicePageIndex ?? patternIndex
  const serviceIndexOffset = options.serviceIndexOffset || 0
  const forwardPatterns = TOYODA_FORWARD_PATTERNS[patternIndex]
  const reversePatterns = TOYODA_REVERSE_PATTERNS[patternIndex]

  if (rows.forward.length !== 8 || rows.reverse.length !== 8) {
    throw new Error(`豊田線 ${pageIndex + 1} ページ目の時刻行数が想定外です。`)
  }

  const services = [
    ...buildServices(periods, 'weekday', `TOYODA_P${servicePageIndex + 1}`, serviceIndexOffset),
    ...buildServices(periods, 'holiday', `TOYODA_P${servicePageIndex + 1}`, serviceIndexOffset)
  ]
  context.services.push(...services)

  for (const service of services) {
    const isHoliday = service.kind === 'holiday'
    rows.forward.forEach((times, rowIndex) => {
      let stopIds = forwardPatterns[rowIndex]
      let rowTimes = times
      if (isHoliday) {
        const filtered = removeClinicForHoliday(stopIds, rowTimes)
        stopIds = filtered.stopIds
        rowTimes = filtered.times
      }
      addTrip(context, {
        routeId: '10',
        serviceId: service.serviceId,
        tripId: `R8_10_${service.serviceId}_F${rowIndex + 1}_${times[0].replace(':', '')}`,
        patternId: `R8_TOYODA_F${patternIndex + 1}${rowIndex + 1}`,
        directionId: '0',
        stopIds,
        times: rowTimes
      })
    })

    rows.reverse.forEach((times, rowIndex) => {
      let stopIds = reversePatterns[rowIndex]
      let rowTimes = times
      if (isHoliday) {
        const filtered = removeClinicForHoliday(stopIds, rowTimes)
        stopIds = filtered.stopIds
        rowTimes = filtered.times
      }
      addTrip(context, {
        routeId: '10',
        serviceId: service.serviceId,
        tripId: `R8_10_${service.serviceId}_R${rowIndex + 1}_${times[0].replace(':', '')}`,
        patternId: `R8_TOYODA_R${patternIndex + 1}${rowIndex + 1}`,
        directionId: '1',
        stopIds,
        times: rowTimes
      })
    })
  }
}

function amaWeekdayPattern(pageIndex, rowIndex, times) {
  if (rowIndex === 2 && times.length === 17) return AMA_WEEKDAY_SHORT_LOOP
  return AMA_WEEKDAY_PATTERNS[rowIndex]
}

function amaHolidayPattern(rowIndex, times) {
  if (rowIndex === 1 && times.length === 17) return AMA_HOLIDAY_LONG_LOOP
  return AMA_HOLIDAY_PATTERNS[rowIndex]
}

function convertAmaPage(context, pageText, pageIndex, options = {}) {
  const periods = options.periods || parsePeriods(pageText)
  const rows = splitAmaRows(pageText)
  const patternIndex = options.patternIndex ?? pageIndex
  const servicePageIndex = options.servicePageIndex ?? patternIndex
  const serviceIndexOffset = options.serviceIndexOffset || 0
  if (rows.weekday.length !== 7 || rows.holiday.length !== 5) {
    throw new Error(`海士島線 ${pageIndex + 1} ページ目の時刻行数が想定外です。`)
  }

  const weekdayServices = buildServices(periods, 'weekday', `AMA_P${servicePageIndex + 1}`, serviceIndexOffset)
  const holidayServices = buildServices(periods, 'holiday', `AMA_P${servicePageIndex + 1}`, serviceIndexOffset)
  context.services.push(...weekdayServices, ...holidayServices)

  for (const service of weekdayServices) {
    rows.weekday.forEach((times, rowIndex) => {
      const pattern = amaWeekdayPattern(patternIndex, rowIndex, times)
      addTrip(context, {
        routeId: pattern.routeId,
        serviceId: service.serviceId,
        tripId: `R8_${pattern.routeId}_${service.serviceId}_W${rowIndex + 1}_${times[0].replace(':', '')}`,
        patternId: `R8_AMA_W${patternIndex + 1}${rowIndex + 1}`,
        directionId: '0',
        stopIds: pattern.stops,
        times
      })
    })
  }

  for (const service of holidayServices) {
    rows.holiday.forEach((times, rowIndex) => {
      const pattern = amaHolidayPattern(rowIndex, times)
      addTrip(context, {
        routeId: pattern.routeId,
        serviceId: service.serviceId,
        tripId: `R8_${pattern.routeId}_${service.serviceId}_H${rowIndex + 1}_${times[0].replace(':', '')}`,
        patternId: `R8_AMA_H${patternIndex + 1}${rowIndex + 1}`,
        directionId: '0',
        stopIds: pattern.stops,
        times
      })
    })
  }
}

function buildFeedInfo() {
  return [{
    feed_publisher_name: '海士町',
    feed_publisher_url: 'http://www.town.ama.shimane.jp/',
    feed_lang: 'ja',
    feed_start_date: FEED_START,
    feed_end_date: FEED_END,
    feed_version: FEED_VERSION
  }]
}

function copyStaticGtfsFiles(outputDir) {
  for (const fileName of ROUTE_FILES_TO_COPY) {
    const source = join(TEMPLATE_DIR, fileName)
    if (!existsSync(source)) {
      throw new Error(`テンプレート GTFS ファイルが見つかりません: ${source}`)
    }
    const target = join(outputDir, fileName)
    if (resolve(source) === resolve(target)) continue
    cpSync(source, target)
  }
}

function writeGtfs(outputDir, context, sourceInfo) {
  copyStaticGtfsFiles(outputDir)

  const calendarRows = context.services.map(calendarRow)
  const exceptionRows = context.services.flatMap(calendarDateRows)

  writeCsv(join(outputDir, 'calendar.txt'), calendarRows, [
    'service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday', 'start_date', 'end_date'
  ])
  writeCsv(join(outputDir, 'calendar_dates.txt'), exceptionRows, [
    'service_id', 'date', 'exception_type'
  ])
  writeCsv(join(outputDir, 'trips.txt'), context.trips, [
    'route_id', 'service_id', 'trip_id', 'trip_headsign', 'direction_id',
    'block_id', 'trip_short_name', 'shape_id', 'jp_trip_desc', 'jp_pattern_id'
  ])
  writeCsv(join(outputDir, 'stop_times.txt'), context.stopTimes, [
    'trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence',
    'stop_headsign', 'pickup_type', 'drop_off_type', 'timepoint'
  ])
  writeCsv(join(outputDir, 'feed_info.txt'), buildFeedInfo(), [
    'feed_publisher_name', 'feed_publisher_url', 'feed_lang', 'feed_start_date',
    'feed_end_date', 'feed_version'
  ])
  writeFileSync(join(outputDir, 'source_info.json'), `${JSON.stringify(sourceInfo, null, 2)}\n`, 'utf-8')
}

function parseArgs(argv) {
  return {
    outputDir: valueAfter(argv, '--output') || RAW_DIR,
    updateCurrent: argv.includes('--current'),
    writeReport: !argv.includes('--no-report')
  }
}

function valueAfter(argv, key) {
  const index = argv.indexOf(key)
  if (index === -1) return null
  return argv[index + 1] || null
}

function readSourceMetadata() {
  return JSON.parse(readFileSync(SOURCE_META_PATH, 'utf-8'))
}

function sourceDocumentPath(document) {
  return resolve(ROOT, document.file)
}

function verifySourceDocuments(documents) {
  for (const document of documents) {
    const filePath = sourceDocumentPath(document)
    if (!existsSync(filePath)) throw new Error(`PDF 原本が見つかりません: ${filePath}`)
    const actualHash = createHash('sha256').update(readFileSync(filePath)).digest('hex')
    if (actualHash !== document.sha256) {
      throw new Error(`PDF原本のSHA-256が一致しません: ${document.file} expected=${document.sha256} actual=${actualHash}`)
    }
  }
}

function clipPeriods(periods, { startDate = FEED_START, endDate = FEED_END } = {}) {
  return periods.flatMap((period) => {
    const clipped = {
      startDate: period.startDate < startDate ? startDate : period.startDate,
      endDate: period.endDate > endDate ? endDate : period.endDate
    }
    return clipped.startDate <= clipped.endDate ? [clipped] : []
  })
}

function documentById(documents, id) {
  const document = documents.find((item) => item.id === id)
  if (!document) throw new Error(`海士町バスのPDF定義が見つかりません: ${id}`)
  return document
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const sourceMetadata = readSourceMetadata()
  const legacyDocuments = sourceMetadata.legacySourceDocuments || []
  const revisionDocuments = sourceMetadata.sourceDocuments || []
  verifySourceDocuments([...legacyDocuments, ...revisionDocuments])

  const legacyToyodaPdf = sourceDocumentPath(documentById(legacyDocuments, 'toyoda-20251222'))
  const legacyAmaPdf = sourceDocumentPath(documentById(legacyDocuments, 'ama-20251222'))
  const revisionToyodaPdf = sourceDocumentPath(documentById(revisionDocuments, 'toyoda-20260611'))
  const revisionAmaPdf = sourceDocumentPath(documentById(revisionDocuments, 'ama-20260611'))

  const stopNames = new Map(readCsv(join(TEMPLATE_DIR, 'stops.txt')).map(row => [row.stop_id, row.stop_name]))
  const context = {
    services: [],
    trips: [],
    stopTimes: [],
    stopNames
  }

  const legacyToyodaPages = extractPdfPages(legacyToyodaPdf)
  const legacyAmaPages = extractPdfPages(legacyAmaPdf)
  const revisionToyodaPages = extractPdfPages(revisionToyodaPdf)
  const revisionAmaPages = extractPdfPages(revisionAmaPdf)

  convertToyodaPage(context, legacyToyodaPages[0], 0)
  convertToyodaPage(context, legacyToyodaPages[1], 1, {
    periods: clipPeriods(parsePeriods(legacyToyodaPages[1]), { endDate: LEGACY_END_DATE })
  })
  convertToyodaPage(context, legacyToyodaPages[2], 2, {
    periods: clipPeriods(parsePeriods(legacyToyodaPages[2]), { endDate: LEGACY_END_DATE })
  })
  convertToyodaPage(context, revisionToyodaPages[0], 0, {
    patternIndex: 1,
    servicePageIndex: 1,
    serviceIndexOffset: 1
  })
  convertToyodaPage(context, revisionToyodaPages[1], 1, {
    patternIndex: 2,
    servicePageIndex: 2,
    serviceIndexOffset: 1
  })

  convertAmaPage(context, legacyAmaPages[0], 0)
  convertAmaPage(context, legacyAmaPages[1], 1, {
    periods: clipPeriods(parsePeriods(legacyAmaPages[1]), { endDate: LEGACY_END_DATE })
  })
  convertAmaPage(context, legacyAmaPages[2], 2, {
    periods: clipPeriods(parsePeriods(legacyAmaPages[2]), { endDate: LEGACY_END_DATE })
  })
  convertAmaPage(context, revisionAmaPages[0], 0, {
    patternIndex: 1,
    servicePageIndex: 1,
    serviceIndexOffset: 1
  })
  convertAmaPage(context, revisionAmaPages[1], 1, {
    patternIndex: 2,
    servicePageIndex: 2,
    serviceIndexOffset: 1
  })
  convertAmaPage(context, revisionAmaPages[2], 2, {
    patternIndex: 3,
    servicePageIndex: 3
  })

  const convertedAt = new Date().toISOString()
  const sourceInfo = {
    version: 1,
    sourceId: sourceMetadata.sourceId || 'ama-town',
    sourceUpdatedAt: sourceMetadata.currentRawDate,
    officialPageUpdatedAt: sourceMetadata.officialPageUpdatedAt,
    convertedAt,
    feedVersion: FEED_VERSION,
    legacyEndDate: '2026-05-31',
    documents: [...legacyDocuments, ...revisionDocuments]
  }

  writeGtfs(args.outputDir, context, sourceInfo)
  if (args.updateCurrent) {
    writeGtfs(CURRENT_DIR, context, sourceInfo)
  }

  const report = {
    convertedAt,
    sourceDir: SOURCE_DIR,
    outputDir: args.outputDir,
    currentUpdated: args.updateCurrent,
    feedStartDate: FEED_START,
    feedEndDate: FEED_END,
    feedVersion: FEED_VERSION,
    sourceDocuments: sourceInfo.documents,
    counts: {
      services: context.services.length,
      trips: context.trips.length,
      stopTimes: context.stopTimes.length
    }
  }
  if (args.writeReport) {
    mkdirSync(REPORT_DIR, { recursive: true })
    writeFileSync(join(REPORT_DIR, '2026-06-11.r8-pdf-conversion.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf-8')
  }

  console.log(`R8 PDF から GTFS を生成しました: ${args.outputDir}`)
  if (args.updateCurrent) {
    console.log(`current も更新しました: ${CURRENT_DIR}`)
  }
  console.log(`services=${context.services.length}, trips=${context.trips.length}, stop_times=${context.stopTimes.length}`)
}

main()
