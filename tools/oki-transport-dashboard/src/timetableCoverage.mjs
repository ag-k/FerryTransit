import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FIREBASE_STORAGE_BUCKETS } from '../../../scripts/lib/firebase-publish-target.mjs'
import { firebaseObjectUrl } from '../../../scripts/lib/storage-manifest.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const LOCAL_TIMETABLE_PATH = join(REPO_ROOT, 'gtfs', 'generated', 'public', 'timetable.json')
const LOCAL_BUS_SEARCH_DIR = join(REPO_ROOT, 'gtfs', 'public-data', 'data', 'bus-search')
const TIMETABLE_STORAGE_PATH = 'data/timetable.json'
const TIMETABLE_MANIFEST_PATH = 'data/manifests/public-timetable.json'
const GTFS_MANIFEST_PATH = 'data/manifests/gtfs-public-data.json'
const PRODUCTION_BUCKET = FIREBASE_STORAGE_BUCKETS.prod
const BUS_FEED_IDS = ['ama', 'nishinoshima', 'chibu', 'okinoshima', 'ichibata_bus_connection', 'hatsumi_bus_connection']

const KNOWN_OPERATORS = {
  OKI_KISEN: { id: 'OKI_KISEN', name: '隠岐汽船株式会社', order: 10 },
  OKI_KANKO: { id: 'OKI_KANKO', name: '隠岐観光株式会社', order: 20 },
  JAL: { id: 'JAL', name: '日本航空株式会社', order: 30 },
  OKI_ICHIBATA: { id: 'OKI_ICHIBATA', name: '隠岐一畑交通株式会社', order: 40 },
  OKINOSHIMA_TOWN: { id: 'OKINOSHIMA_TOWN', name: '隠岐の島町', order: 50 },
  AMA_TOWN: { id: 'AMA_TOWN', name: '海士町', order: 60 },
  NISHINOSHIMA_TOWN: { id: 'NISHINOSHIMA_TOWN', name: '西ノ島町', order: 70 },
  CHIBU_VILLAGE: { id: 'CHIBU_VILLAGE', name: '知夫村', order: 80 },
  ICHIBATA_BUS: { id: 'ICHIBATA_BUS', name: '一畑バス株式会社', order: 90 },
  HATSUMI_BUS: { id: 'HATSUMI_BUS', name: 'はつみ交通株式会社', order: 100 }
}

const BUS_SERVICE_DEFINITIONS = {
  ama: { serviceId: 'AMA_TOWN_BUS', serviceName: '海士町島内巡回バス', operatorId: 'AMA_TOWN', group: '島前バス', order: 100 },
  nishinoshima: { serviceId: 'NISHINOSHIMA_TOWN_BUS', serviceName: '西ノ島町営バス', operatorId: 'NISHINOSHIMA_TOWN', group: '島前バス', order: 110 },
  chibu: { serviceId: 'CHIBU_VILLAGE_BUS', serviceName: '知夫村営バス', operatorId: 'CHIBU_VILLAGE', group: '島前バス', order: 120 },
  ichibata_bus_connection: { serviceId: 'ICHIBATA_BUS_CONNECTION', serviceName: '一畑バス・隠岐汽船接続バス', operatorId: 'ICHIBATA_BUS', group: '連絡バス', order: 150 },
  hatsumi_bus_connection: { serviceId: 'HATSUMI_BUS_CONNECTION', serviceName: 'はつみ交通・隠岐汽船連絡バス', operatorId: 'HATSUMI_BUS', group: '連絡バス', order: 160 }
}

const SERVICE_OPERATOR_IDS = {
  FERRY_OKI: 'OKI_KISEN',
  FERRY_SHIRASHIMA: 'OKI_KISEN',
  FERRY_KUNIGA: 'OKI_KISEN',
  RAINBOWJET: 'OKI_KISEN',
  ISOKAZE: 'OKI_KANKO',
  FERRY_DOZEN: 'OKI_KANKO'
}

const LOCATION_LABELS = {
  HONDO_SHICHIRUI: '七類港',
  HONDO_SAKAIMINATO: '境港',
  SAIGO: '西郷港',
  HISHIURA: '菱浦港',
  BEPPU: '別府港',
  KURI: '来居港',
  AIRPORT_OKI: '隠岐空港',
  AIRPORT_IZUMO: '出雲空港',
  AIRPORT_ITAMI: '大阪（伊丹）空港',
  BUS_OKINOSHIMA_eigyosho: '隠岐一畑交通営業所'
}

const SERVICE_LABELS = {
  FERRY_OKI: 'フェリーおき',
  FERRY_SHIRASHIMA: 'フェリーしらしま',
  FERRY_KUNIGA: 'フェリーくにが',
  RAINBOWJET: 'レインボージェット',
  ISOKAZE: '内航船いそかぜ',
  FERRY_DOZEN: '内航船フェリーどうぜん',
  JAL_OKI_ITAMI: 'JAL 大阪（伊丹）線',
  JAL_OKI_IZUMO: 'JAL 出雲線',
  OKI_AIRPORT_BUS: '隠岐空港連絡バス'
}

const SERVICE_ORDER = {
  FERRY_OKI: 10,
  FERRY_SHIRASHIMA: 20,
  FERRY_KUNIGA: 30,
  RAINBOWJET: 40,
  ISOKAZE: 50,
  FERRY_DOZEN: 60,
  JAL_OKI_ITAMI: 70,
  JAL_OKI_IZUMO: 80,
  OKI_AIRPORT_BUS: 90
}

const SERVICE_GROUPS = {
  FERRY_OKI: '船舶',
  FERRY_SHIRASHIMA: '船舶',
  FERRY_KUNIGA: '船舶',
  RAINBOWJET: '船舶',
  ISOKAZE: '船舶',
  FERRY_DOZEN: '船舶',
  JAL_OKI_ITAMI: '航空',
  JAL_OKI_IZUMO: '航空',
  OKI_AIRPORT_BUS: '島後バス'
}

export async function loadPublishedTimetableCoverage(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date()
  const year = normalizeYear(options.year, now.getFullYear())
  let loaded

  try {
    loaded = await loadProductionTimetable(options.fetchImpl || fetch)
  } catch (error) {
    loaded = await loadLocalTimetable(options.localPath || LOCAL_TIMETABLE_PATH)
    loaded.source.warning = `本番Storageを取得できないためローカル生成物を表示しています: ${error.message}`
  }

  let busLoaded
  try {
    busLoaded = await loadProductionBusFeeds(options.fetchImpl || fetch)
  } catch (error) {
    busLoaded = await loadLocalBusFeeds(options.localBusSearchDir || LOCAL_BUS_SEARCH_DIR)
    const warning = `バス配信データはローカル生成物を表示しています: ${error.message}`
    loaded.source.warning = loaded.source.warning ? `${loaded.source.warning} / ${warning}` : warning
    loaded.source.fallback = true
  }

  loaded.source.busFeedCount = busLoaded.feeds.length
  loaded.source.busTripCount = busLoaded.feeds.reduce((total, feed) => total + (feed.trips?.length || 0), 0)
  loaded.source.gtfsGitSha = busLoaded.gitSha || null

  return {
    ...buildTimetableCoverage(loaded.trips, { year, now, busFeeds: busLoaded.feeds }),
    source: loaded.source
  }
}

export function buildTimetableCoverage(trips, options = {}) {
  if (!Array.isArray(trips)) throw new Error('時刻表データは配列である必要があります')
  const now = options.now instanceof Date ? options.now : new Date()
  const year = normalizeYear(options.year, now.getFullYear())
  const dates = buildYearDates(year, now)
  const serviceMap = new Map()

  for (const trip of trips) {
    const departure = String(trip?.departure || '').trim()
    const arrival = String(trip?.arrival || '').trim()
    const serviceId = String(trip?.name || '').trim()
    if (!serviceId || !departure || !arrival) continue
    const operator = resolveOperator(trip)
    const rowId = `${operator.id}:${serviceId}`
    const current = serviceMap.get(rowId) || {
      id: rowId,
      operator,
      serviceId,
      serviceName: SERVICE_LABELS[serviceId] || serviceId,
      serviceOrder: SERVICE_ORDER[serviceId] || 999,
      routes: new Map(),
      trips: []
    }
    current.routes.set(`${departure}:${arrival}`, {
      departure,
      departureLabel: locationLabel(departure),
      arrival,
      arrivalLabel: locationLabel(arrival)
    })
    current.trips.push(trip)
    serviceMap.set(rowId, current)
  }

  const timetableRows = [...serviceMap.values()].map((service) => {
    const coverage = dates.map((date) => service.trips.some((trip) => isTripActiveOnDate(trip, date.ymd)))
    const availableDays = coverage.filter(Boolean).length
    return {
      id: service.id,
      operatorId: service.operator.id,
      operatorName: service.operator.name,
      operatorOrder: service.operator.order,
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      group: SERVICE_GROUPS[service.serviceId] || 'その他',
      serviceOrder: service.serviceOrder,
      routes: [...service.routes.values()],
      coverage: coverage.map((available) => available ? '1' : '0').join(''),
      availableDays,
      missingDays: dates.length - availableDays,
      coverageRate: roundRate(availableDays, dates.length)
    }
  })
  const rows = [...timetableRows, ...buildBusCoverageRows(options.busFeeds || [], dates)].sort((a, b) => (
    a.operatorOrder - b.operatorOrder ||
    a.operatorName.localeCompare(b.operatorName, 'ja') ||
    a.serviceOrder - b.serviceOrder ||
    a.serviceName.localeCompare(b.serviceName, 'ja')
  ))

  const availableServiceDays = rows.reduce((total, row) => total + row.availableDays, 0)
  const serviceDays = rows.length * dates.length
  const years = collectAvailableYears([
    ...trips,
    ...(options.busFeeds || []).flatMap((feed) => Object.values(feed.services || {}))
  ], year)

  return {
    version: 1,
    year,
    years,
    generatedAt: now.toISOString(),
    dates,
    months: buildMonths(dates),
    rows: rows.map(({ operatorOrder, serviceOrder, ...row }) => row),
    summary: {
      operatorCount: new Set(rows.map((row) => row.operatorId)).size,
      serviceCount: rows.length,
      dayCount: dates.length,
      availableServiceDays,
      missingServiceDays: serviceDays - availableServiceDays,
      coverageRate: roundRate(availableServiceDays, serviceDays),
      fullyCoveredServices: rows.filter((row) => row.missingDays === 0).length,
      servicesWithGaps: rows.filter((row) => row.missingDays > 0).length
    }
  }
}

export function isTripActiveOnDate(trip, dateYmd) {
  const startYmd = normalizeYmd(trip?.start_date ?? trip?.startDate)
  const endYmd = normalizeYmd(trip?.end_date ?? trip?.endDate)
  if (!startYmd || !endYmd || dateYmd < startYmd || dateYmd > endYmd) return false

  const addedDates = new Set(normalizeDateList(trip?.added_dates ?? trip?.addedDates))
  const removedDates = new Set(normalizeDateList(trip?.removed_dates ?? trip?.removedDates))
  if (removedDates.has(dateYmd)) return false
  if (addedDates.has(dateYmd)) return true

  const activeDays = trip?.active_days ?? trip?.activeDays
  if (activeDays === undefined || activeDays === null) return true
  if (!Array.isArray(activeDays) || activeDays.length === 0) return false
  const [year, month, day] = dateYmd.split('-').map(Number)
  return activeDays.map(Number).includes(new Date(Date.UTC(year, month - 1, day)).getUTCDay())
}

function buildBusCoverageRows(feeds, dates) {
  const groups = []
  for (const feed of feeds) {
    if (!feed || typeof feed !== 'object') continue
    if (feed.feedId === 'okinoshima') {
      groups.push(
        busGroup(feed, {
          serviceId: 'OKI_ICHIBATA_ROUTE_BUS',
          serviceName: '隠岐一畑交通 路線バス',
          operatorId: 'OKI_ICHIBATA',
          group: '島後バス',
          order: 130,
          routeAgencyId: 'OKI_ICHIBATA'
        }),
        busGroup(feed, {
          serviceId: 'OKINOSHIMA_TOWN_BUS',
          serviceName: '隠岐の島町営バス',
          operatorId: 'OKINOSHIMA_TOWN',
          group: '島後バス',
          order: 140,
          routeAgencyId: 'OKINOSHIMA_TOWN'
        })
      )
      continue
    }
    const definition = BUS_SERVICE_DEFINITIONS[feed.feedId]
    if (definition) groups.push(busGroup(feed, definition))
  }

  return groups.filter((group) => group.serviceIds.size > 0).map((group) => {
    const operator = KNOWN_OPERATORS[group.operatorId] || {
      id: group.operatorId,
      name: group.operatorId,
      order: 999
    }
    const services = [...group.serviceIds]
      .map((serviceId) => group.feed.services?.[serviceId])
      .filter(Boolean)
    const coverage = dates.map((date) => services.some((service) => isTripActiveOnDate(service, date.ymd)))
    const availableDays = coverage.filter(Boolean).length
    return {
      id: `${operator.id}:${group.serviceId}`,
      operatorId: operator.id,
      operatorName: operator.name,
      operatorOrder: operator.order,
      serviceId: group.serviceId,
      serviceName: group.serviceName,
      group: group.group,
      serviceOrder: group.order,
      routes: group.routes,
      coverage: coverage.map((available) => available ? '1' : '0').join(''),
      availableDays,
      missingDays: dates.length - availableDays,
      coverageRate: roundRate(availableDays, dates.length)
    }
  })
}

function busGroup(feed, definition) {
  const matchingRouteIds = new Set(Object.entries(feed.routes || {})
    .filter(([, route]) => !definition.routeAgencyId || route.agencyId === definition.routeAgencyId)
    .map(([routeId]) => routeId))
  const trips = (feed.trips || []).filter((trip) => matchingRouteIds.has(trip.routeId))
  return {
    ...definition,
    feed,
    serviceIds: new Set(trips.map((trip) => trip.serviceId).filter(Boolean)),
    routes: [...matchingRouteIds].map((routeId) => {
      const route = feed.routes[routeId] || {}
      return { routeId, routeLabel: route.longName || route.shortName || routeId }
    })
  }
}

async function loadProductionTimetable(fetchImpl) {
  const [manifestResponse, timetableResponse] = await Promise.all([
    fetchImpl(firebaseObjectUrl(PRODUCTION_BUCKET, TIMETABLE_MANIFEST_PATH), fetchOptions()),
    fetchImpl(firebaseObjectUrl(PRODUCTION_BUCKET, TIMETABLE_STORAGE_PATH), fetchOptions())
  ])
  if (!manifestResponse.ok) throw new Error(`公開manifestの取得に失敗しました（HTTP ${manifestResponse.status}）`)
  if (!timetableResponse.ok) throw new Error(`公開時刻表の取得に失敗しました（HTTP ${timetableResponse.status}）`)

  const manifest = await manifestResponse.json()
  const buffer = Buffer.from(await timetableResponse.arrayBuffer())
  const trips = JSON.parse(buffer.toString('utf8'))
  if (!Array.isArray(trips)) throw new Error('公開時刻表の形式が不正です')

  const expected = manifest?.objects?.find((object) => object.path === TIMETABLE_STORAGE_PATH)
  const actualHash = sha256(buffer)
  if (!expected?.sha256 || expected.sha256 !== actualHash || expected.bytes !== buffer.byteLength) {
    throw new Error('公開時刻表がmanifestと一致しません')
  }

  return {
    trips,
    source: {
      kind: 'firebase-production',
      label: '本番アプリ配信中',
      bucket: PRODUCTION_BUCKET,
      path: TIMETABLE_STORAGE_PATH,
      gitSha: header(timetableResponse, 'x-goog-meta-gitsha') || manifest.gitSha || null,
      manifestGitSha: manifest.gitSha || null,
      publishedAt: header(timetableResponse, 'x-goog-meta-publishedat') || header(timetableResponse, 'last-modified') || null,
      sha256: actualHash,
      tripCount: trips.length,
      fallback: false
    }
  }
}

async function loadProductionBusFeeds(fetchImpl) {
  const manifestResponse = await fetchImpl(firebaseObjectUrl(PRODUCTION_BUCKET, GTFS_MANIFEST_PATH), fetchOptions())
  if (!manifestResponse.ok) throw new Error(`GTFS公開manifestの取得に失敗しました（HTTP ${manifestResponse.status}）`)
  const manifest = await manifestResponse.json()
  const expectedByPath = new Map((manifest?.objects || []).map((object) => [object.path, object]))
  const feeds = await Promise.all(BUS_FEED_IDS.map(async (feedId) => {
    const path = `data/bus-search/${feedId}.json`
    const expected = expectedByPath.get(path)
    if (!expected) throw new Error(`GTFS公開manifestに${path}がありません`)
    const response = await fetchImpl(firebaseObjectUrl(PRODUCTION_BUCKET, path), fetchOptions())
    if (!response.ok) throw new Error(`${feedId}の取得に失敗しました（HTTP ${response.status}）`)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (expected.sha256 !== sha256(buffer) || expected.bytes !== buffer.byteLength) {
      throw new Error(`${feedId}がGTFS公開manifestと一致しません`)
    }
    const feed = JSON.parse(buffer.toString('utf8'))
    if (feed?.version !== 1 || !Array.isArray(feed.trips) || !feed.services) {
      throw new Error(`${feedId}の配信形式が不正です`)
    }
    return feed
  }))
  return { feeds, gitSha: manifest.gitSha || null }
}

async function loadLocalTimetable(filePath) {
  const buffer = await readFile(filePath)
  const trips = JSON.parse(buffer.toString('utf8'))
  if (!Array.isArray(trips)) throw new Error('ローカル時刻表の形式が不正です')
  return {
    trips,
    source: {
      kind: 'local-fallback',
      label: 'ローカル生成物（代替）',
      path: filePath,
      gitSha: null,
      manifestGitSha: null,
      publishedAt: null,
      sha256: sha256(buffer),
      tripCount: trips.length,
      fallback: true
    }
  }
}

async function loadLocalBusFeeds(directory) {
  const feeds = await Promise.all(BUS_FEED_IDS.map(async (feedId) => {
    const buffer = await readFile(join(directory, `${feedId}.json`))
    return JSON.parse(buffer.toString('utf8'))
  }))
  return { feeds, gitSha: null }
}

function resolveOperator(trip) {
  const serviceId = String(trip?.name || '').trim()
  const knownId = SERVICE_OPERATOR_IDS[serviceId] || String(trip?.operator_id ?? trip?.operatorId ?? '').trim()
  if (KNOWN_OPERATORS[knownId]) return KNOWN_OPERATORS[knownId]
  return {
    id: knownId || `UNKNOWN_${serviceId || 'SERVICE'}`,
    name: knownId || serviceId || '事業者未設定',
    order: 999
  }
}

function buildYearDates(year, now) {
  const todayYmd = jstYmd(now)
  const dates = []
  for (let cursor = new Date(Date.UTC(year, 0, 1)); cursor.getUTCFullYear() === year; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const ymd = utcYmd(cursor)
    dates.push({
      ymd,
      month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate(),
      weekday: cursor.getUTCDay(),
      weekend: cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6,
      monthStart: cursor.getUTCDate() === 1,
      today: ymd === todayYmd
    })
  }
  return dates
}

function buildMonths(dates) {
  const months = []
  for (const date of dates) {
    const current = months.at(-1)
    if (!current || current.month !== date.month) {
      months.push({ month: date.month, label: `${date.month}月`, startIndex: months.reduce((sum, item) => sum + item.dayCount, 0), dayCount: 1 })
    } else {
      current.dayCount += 1
    }
  }
  return months
}

function collectAvailableYears(trips, selectedYear) {
  const found = new Set([selectedYear])
  for (const trip of trips) {
    const start = normalizeYmd(trip?.start_date ?? trip?.startDate)
    const end = normalizeYmd(trip?.end_date ?? trip?.endDate)
    if (!start || !end) continue
    const startYear = Number(start.slice(0, 4))
    const endYear = Number(end.slice(0, 4))
    if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear - startYear > 20) continue
    for (let year = startYear; year <= endYear; year++) found.add(year)
  }
  return [...found].sort((a, b) => a - b)
}

function normalizeYear(value, fallback) {
  const year = Number(value ?? fallback)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error(`対象年が不正です: ${value}`)
  return year
}

function normalizeYmd(value) {
  const text = String(value || '').trim().replaceAll('/', '-')
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text)
  if (!match) return null
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

function normalizeDateList(value) {
  return Array.isArray(value) ? value.map(normalizeYmd).filter(Boolean) : []
}

function locationLabel(id) {
  return LOCATION_LABELS[id] || String(id).replace(/^BUS_[^_]+_/, '').replaceAll('_', ' ')
}

function utcYmd(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function jstYmd(date) {
  return utcYmd(new Date(date.getTime() + 9 * 60 * 60 * 1000))
}

function roundRate(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function header(response, name) {
  return typeof response?.headers?.get === 'function' ? response.headers.get(name) : null
}

function fetchOptions() {
  return { signal: AbortSignal.timeout(10_000), cache: 'no-store' }
}
