import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { getTransportCliCommand } from '../../../scripts/lib/transport-orchestrator.mjs'
import { loadTransportSourceRegistry } from '../../../scripts/lib/transport-source-registry.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const REPO_ROOT = join(ROOT_DIR, '..', '..')
const GTFS_ROOT = join(REPO_ROOT, 'gtfs')
const GTFS_SOURCES_DIR = join(GTFS_ROOT, 'sources')
const GTFS_CURRENT_DIR = join(GTFS_ROOT, 'current')
const GTFS_REPORTS_DIR = join(GTFS_ROOT, 'reports')
const LOCAL_GTFS_DIR = join(ROOT_DIR, 'data', 'gtfs')
const LOCAL_GTFS_EXPORT_DIR = join(LOCAL_GTFS_DIR, 'exports')
const LOCAL_GTFS_DRAFT_PATH = join(LOCAL_GTFS_DIR, 'draft.json')
const LOCAL_GTFS_TASK_HISTORY_PATH = join(LOCAL_GTFS_DIR, 'task-history.json')
const execFileAsync = promisify(execFile)

const ROUTE_STATUSES = new Set(['draft', 'needs-review', 'ready', 'excluded'])
const DRAFT_SCOPES = new Set(['active', 'required', 'all'])
const GTFS_ROUTE_TYPES = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '11', '12'])
const DEFAULT_AGENCY_TIMEZONE = 'Asia/Tokyo'
const GTFS_VIEW_ROW_LIMIT = 5000
const GTFS_VIEW_TRIP_LIMIT = 1000
const GTFS_FILE_HEADERS = {
  'agency.txt': ['agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang'],
  'stops.txt': ['stop_id', 'stop_name', 'stop_lat', 'stop_lon', 'location_type'],
  'routes.txt': ['route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type', 'route_url', 'route_desc'],
  'trips.txt': ['route_id', 'service_id', 'trip_id', 'trip_headsign', 'direction_id'],
  'stop_times.txt': ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence', 'pickup_type', 'drop_off_type'],
  'calendar.txt': ['service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'],
  'calendar_dates.txt': ['service_id', 'date', 'exception_type'],
  'feed_info.txt': ['feed_publisher_name', 'feed_publisher_url', 'feed_lang', 'feed_start_date', 'feed_end_date', 'feed_version']
}

const GTFS_TABLES = Object.keys(GTFS_FILE_HEADERS).map((fileName) => ({
  key: fileName.replace('.txt', ''),
  fileName,
  headers: GTFS_FILE_HEADERS[fileName]
}))

const TRANSPORT_REGISTRY = loadTransportSourceRegistry(REPO_ROOT)

export async function loadGtfsDashboard() {
  const [currentFeeds, draft, taskHistory] = await Promise.all([
    loadCurrentFeeds(),
    loadGtfsDraft(),
    loadTaskHistory()
  ])
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    currentFeeds,
    draft,
    taskHistory,
    summary: {
      currentFeedCount: currentFeeds.length,
      currentRouteCount: sum(currentFeeds, (feed) => feed.summary.routeCount),
      currentStopCount: sum(currentFeeds, (feed) => feed.summary.stopCount),
      currentTripCount: sum(currentFeeds, (feed) => feed.summary.tripCount),
      draftRouteCount: draft?.summary?.routeCount || 0,
      draftReadyRouteCount: draft?.summary?.readyRouteCount || 0
    }
  }
}

export async function loadCurrentFeeds() {
  const sourceFiles = await readDirectorySafe(GTFS_SOURCES_DIR)
  const feeds = []
  for (const fileName of sourceFiles.filter((name) => name.endsWith('.json')).sort()) {
    const meta = JSON.parse(await readFile(join(GTFS_SOURCES_DIR, fileName), 'utf8'))
    const gtfsDir = meta.currentPath
      ? join(REPO_ROOT, meta.currentPath)
      : join(GTFS_CURRENT_DIR, meta.mode || 'bus', meta.id)
    const summary = await summarizeGtfsDirectory(gtfsDir)
    const registryFeed = TRANSPORT_REGISTRY.feedById[meta.id]
    feeds.push({
      ...meta,
      sourceId: registryFeed?.sourceId || null,
      gtfsDir,
      hasConverter: Boolean(registryFeed?.conversionTask),
      summary,
      lastValidation: await loadLatestValidationReport(meta.mode || 'bus', meta.id)
    })
  }
  return feeds
}

export async function loadGtfsView(options = {}) {
  const source = String(options.source || 'current')
  if (source === 'draft') {
    const draft = await loadGtfsDraft()
    if (!draft) throw new Error('表示できる GTFS 下書きがありません')
    return buildGtfsViewFromFiles({
      source,
      title: draft.name,
      subtitle: `下書き / ${draft.scope}`,
      files: buildGtfsFiles(draft),
      meta: {
        id: draft.id,
        mode: 'draft',
        updatedAt: draft.updatedAt,
        exports: draft.exports || [],
        validation: draft.validation
      }
    })
  }
  if (source === 'export') {
    const exportId = String(options.exportId || '').trim()
    if (!exportId) throw new Error('GTFS 出力 ID が指定されていません')
    const exportDir = safeExportDir(exportId)
    const manifest = await readJsonOptional(join(exportDir, 'manifest.json'))
    const files = await readGtfsFilesFromDirectory(exportDir)
    return buildGtfsViewFromFiles({
      source,
      title: `GTFS 出力 ${exportId}`,
      subtitle: manifest?.exportedAt ? `出力日時 ${manifest.exportedAt}` : 'ローカル出力',
      files,
      meta: {
        exportId,
        manifest,
        updatedAt: manifest?.exportedAt || null
      }
    })
  }

  const mode = String(options.mode || 'bus').trim()
  const id = String(options.id || '').trim()
  if (!id) throw new Error('GTFS フィード ID が指定されていません')
  const meta = await loadGtfsSourceMeta(mode, id)
  const gtfsDir = meta?.currentPath
    ? join(REPO_ROOT, meta.currentPath)
    : join(GTFS_CURRENT_DIR, mode, id)
  const files = await readGtfsFilesFromDirectory(gtfsDir)
  return buildGtfsViewFromFiles({
    source: 'current',
    title: meta?.name || id,
    subtitle: `${mode} / ${id}`,
    files,
    meta: {
      ...(meta || {}),
      mode,
      id,
      gtfsDir,
      lastValidation: await loadLatestValidationReport(mode, id)
    }
  })
}

export function buildGtfsViewFromFiles(input = {}) {
  const tables = {}
  for (const table of GTFS_TABLES) {
    const text = input.files?.[table.fileName]
    const parsed = text == null
      ? { headers: table.headers, rows: [], missing: true }
      : readGtfsCsvText(text, table.headers)
    const rows = parsed.rows || []
    tables[table.key] = {
      key: table.key,
      fileName: table.fileName,
      headers: parsed.headers?.length ? parsed.headers : table.headers,
      rows: rows.slice(0, GTFS_VIEW_ROW_LIMIT),
      rowCount: rows.length,
      truncated: rows.length > GTFS_VIEW_ROW_LIMIT,
      missing: Boolean(parsed.missing)
    }
  }

  const routeStats = buildRouteStats(tables)
  const stopStats = buildStopStats(tables, routeStats)
  const tripStats = buildTripStats(tables, routeStats)
  const feedInfo = tables.feed_info.rows[0] || {}
  return {
    version: 1,
    source: input.source || 'current',
    title: input.title || 'GTFS',
    subtitle: input.subtitle || '',
    generatedAt: new Date().toISOString(),
    meta: input.meta || {},
    summary: {
      agencyCount: tables.agency.rowCount,
      routeCount: tables.routes.rowCount,
      stopCount: tables.stops.rowCount,
      tripCount: tables.trips.rowCount,
      stopTimeCount: tables.stop_times.rowCount,
      serviceCount: new Set([
        ...tables.calendar.rows.map((row) => row.service_id).filter(Boolean),
        ...tables.calendar_dates.rows.map((row) => row.service_id).filter(Boolean)
      ]).size,
      feedStartDate: feedInfo.feed_start_date || null,
      feedEndDate: feedInfo.feed_end_date || null,
      feedVersion: feedInfo.feed_version || null
    },
    routeStats,
    stopStats,
    tripStats,
    tables
  }
}

export async function summarizeGtfsDirectory(gtfsDir) {
  const files = await readDirectorySafe(gtfsDir)
  const tables = {}
  for (const fileName of Object.keys(GTFS_FILE_HEADERS)) {
    tables[fileName] = files.includes(fileName)
      ? await readGtfsCsv(join(gtfsDir, fileName))
      : { headers: GTFS_FILE_HEADERS[fileName], rows: [], missing: true }
  }
  const feedInfo = tables['feed_info.txt'].rows[0] || {}
  return {
    exists: files.length > 0,
    files,
    routeCount: tables['routes.txt'].rows.length,
    stopCount: tables['stops.txt'].rows.length,
    tripCount: tables['trips.txt'].rows.length,
    stopTimeCount: tables['stop_times.txt'].rows.length,
    agencyCount: tables['agency.txt'].rows.length,
    serviceCount: new Set([
      ...tables['calendar.txt'].rows.map((row) => row.service_id).filter(Boolean),
      ...tables['calendar_dates.txt'].rows.map((row) => row.service_id).filter(Boolean)
    ]).size,
    feedStartDate: feedInfo.feed_start_date || null,
    feedEndDate: feedInfo.feed_end_date || null,
    feedVersion: feedInfo.feed_version || null
  }
}

export async function loadGtfsDraft() {
  try {
    return normalizeDraft(JSON.parse(await readFile(LOCAL_GTFS_DRAFT_PATH, 'utf8')))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function createGtfsDraftFromSnapshot(snapshot, options = {}) {
  const draft = buildGtfsDraftFromSnapshot(snapshot, options)
  await saveGtfsDraft(draft)
  return draft
}

export function buildGtfsDraftFromSnapshot(snapshot, options = {}) {
  if (!snapshot?.summary) {
    throw new Error('GTFS 下書きの作成に使える収集スナップショットがありません')
  }
  const scope = normalizeScope(options.scope)
  const now = new Date()
  const feedStartDate = toGtfsDate(options.feedStartDate || `${now.getFullYear()}-01-01`)
  const feedEndDate = toGtfsDate(options.feedEndDate || `${now.getFullYear()}-12-31`)
  const sourceById = new Map((snapshot.sources || []).map((source) => [source.id, source]))
  const documents = (snapshot.documents || [])
    .filter((document) => shouldIncludeDocument(document, scope))
    .sort((a, b) => a.sourceName.localeCompare(b.sourceName, 'ja') || a.title.localeCompare(b.title, 'ja'))
  const agencies = []
  const agenciesById = new Map()
  const routes = []
  const usedRouteIds = new Set()

  for (const document of documents) {
    const source = sourceById.get(document.sourceId) || {}
    const agencyId = stableGtfsId('agency', document.sourceId || document.sourceName || source.name)
    if (!agenciesById.has(agencyId)) {
      const agency = {
        agency_id: agencyId,
        agency_name: source.operator || source.name || document.sourceName,
        agency_url: source.officialUrl || document.pageUrl || document.url,
        agency_timezone: DEFAULT_AGENCY_TIMEZONE,
        agency_lang: 'ja',
        source_id: document.sourceId || null
      }
      agenciesById.set(agencyId, agency)
      agencies.push(agency)
    }

    const baseRouteId = stableGtfsId('route', document.sourceId || document.sourceName, document.pageLabel || document.title, document.shortHash || document.url)
    const routeId = uniqueId(baseRouteId, usedRouteIds)
    routes.push({
      route_id: routeId,
      agency_id: agencyId,
      route_short_name: document.pageLabel || source.name || document.sourceName,
      route_long_name: buildRouteLongName(source, document),
      route_type: deriveRouteType(source),
      route_url: document.url,
      route_desc: `${document.sourceName} / ${document.title}`,
      source_document_url: document.url,
      source_document_title: document.title,
      source_page_url: document.pageUrl || null,
      source_page_label: document.pageLabel || null,
      source_review_status: document.reviewStatus || 'unreviewed',
      source_document_type: document.type || 'other',
      status: document.reviewStatus === 'required' ? 'needs-review' : 'draft',
      notes: ''
    })
  }

  const draft = normalizeDraft({
    version: 1,
    id: 'oki-local-draft',
    name: '隠岐交通 GTFS 下書き',
    scope,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    createdFromSnapshotAt: snapshot.collectedAt || snapshot.summary.collectedAt || null,
    feedInfo: {
      feed_publisher_name: 'FerryTransit local dashboard',
      feed_publisher_url: 'https://example.local/ferrytransit',
      feed_lang: 'ja',
      feed_start_date: feedStartDate,
      feed_end_date: feedEndDate,
      feed_version: `${now.toISOString().slice(0, 10)}-draft`
    },
    agencies,
    routes,
    stops: [],
    trips: [],
    stopTimes: [],
    calendar: [
      {
        service_id: 'daily',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '1',
        sunday: '1',
        start_date: feedStartDate,
        end_date: feedEndDate
      }
    ],
    calendarDates: [],
    exports: []
  })
  return draft
}

export async function updateGtfsDraft(input = {}) {
  const draft = await loadGtfsDraft()
  if (!draft) throw new Error('更新対象の GTFS 下書きがありません')
  const next = {
    ...draft,
    updatedAt: new Date().toISOString(),
    feedInfo: {
      ...draft.feedInfo,
      ...pickFeedInfo(input.feedInfo || {})
    }
  }
  if (input.route) {
    next.routes = updateRoute(next.routes, input.route)
  }
  const normalized = normalizeDraft(next)
  await saveGtfsDraft(normalized)
  return normalized
}

export async function exportGtfsDraft() {
  const draft = await loadGtfsDraft()
  if (!draft) throw new Error('出力対象の GTFS 下書きがありません')
  const exportedAt = new Date()
  const exportId = exportedAt.toISOString().replace(/[:.]/g, '-')
  const outputDir = join(LOCAL_GTFS_EXPORT_DIR, exportId)
  const files = buildGtfsFiles(draft)
  await mkdir(outputDir, { recursive: true })
  for (const [fileName, contents] of Object.entries(files)) {
    await writeFile(join(outputDir, fileName), contents)
  }
  const zipBuffer = createZipBuffer(files)
  await writeFile(join(outputDir, 'gtfs.zip'), zipBuffer)
  const manifest = {
    exportId,
    exportedAt: exportedAt.toISOString(),
    draftUpdatedAt: draft.updatedAt,
    files: Object.keys(files),
    fileCount: Object.keys(files).length,
    zipBytes: zipBuffer.byteLength,
    validation: draft.validation
  }
  await writeFile(join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  const nextDraft = normalizeDraft({
    ...draft,
    updatedAt: exportedAt.toISOString(),
    exports: [
      toExportRecord(manifest),
      ...(draft.exports || []).filter((item) => item.exportId !== exportId)
    ].slice(0, 12)
  })
  await saveGtfsDraft(nextDraft)
  return {
    ...manifest,
    href: `/api/gtfs/artifacts/${encodeURIComponent(exportId)}/gtfs.zip`,
    draft: nextDraft
  }
}

export async function resolveGtfsArtifact(pathname) {
  const raw = decodeURIComponent(pathname.replace(/^\/api\/gtfs\/artifacts\/?/, ''))
  const safe = normalize(raw).replace(/^(\.\.(\/|\\|$))+/, '')
  const filePath = join(LOCAL_GTFS_EXPORT_DIR, safe)
  if (!filePath.startsWith(LOCAL_GTFS_EXPORT_DIR)) {
    throw new Error('不正な GTFS 出力パスです')
  }
  const info = await stat(filePath)
  if (!info.isFile()) throw new Error('GTFS 出力ファイルが見つかりません')
  return {
    filePath,
    fileName: basename(filePath),
    sizeBytes: info.size,
    contentType: filePath.endsWith('.zip')
      ? 'application/zip'
      : filePath.endsWith('.json')
        ? 'application/json; charset=utf-8'
        : 'text/plain; charset=utf-8'
  }
}

export async function runGtfsTask(input = {}) {
  const feedId = String(input.feedId || '').trim()
  const mode = String(input.mode || 'bus').trim()
  const action = String(input.action || '').trim()
  if (!feedId) throw new Error('GTFS フィード ID が指定されていません')
  const sourceId = String(input.sourceId || TRANSPORT_REGISTRY.feedById[feedId]?.sourceId || '').trim()
  if (!sourceId) throw new Error(`GTFSフィードにsource IDがありません: ${feedId}`)
  const command = buildTaskCommand(action, sourceId)
  const ranAt = new Date().toISOString()
  let result
  try {
    const { stdout, stderr } = await execFileAsync(command.executable, command.args, {
      cwd: REPO_ROOT,
      timeout: 180000,
      maxBuffer: 1024 * 1024
    })
    result = {
      ok: true,
      feedId,
      sourceId,
      mode,
      action,
      ranAt,
      command: command.label,
      stdout: trimTaskOutput(stdout),
      stderr: trimTaskOutput(stderr),
      exitCode: 0
    }
  } catch (error) {
    result = {
      ok: false,
      feedId,
      sourceId,
      mode,
      action,
      ranAt,
      command: command.label,
      stdout: trimTaskOutput(error.stdout || ''),
      stderr: trimTaskOutput(error.stderr || error.message),
      exitCode: error.code || 1
    }
  }
  await appendTaskHistory(result)
  return result
}

export function buildGtfsFiles(draftInput) {
  const draft = normalizeDraft(draftInput)
  const routes = draft.routes.filter((route) => route.status !== 'excluded')
  const files = {
    'agency.txt': writeCsv(GTFS_FILE_HEADERS['agency.txt'], draft.agencies),
    'stops.txt': writeCsv(GTFS_FILE_HEADERS['stops.txt'], draft.stops),
    'routes.txt': writeCsv(GTFS_FILE_HEADERS['routes.txt'], routes),
    'trips.txt': writeCsv(GTFS_FILE_HEADERS['trips.txt'], draft.trips),
    'stop_times.txt': writeCsv(GTFS_FILE_HEADERS['stop_times.txt'], draft.stopTimes),
    'calendar.txt': writeCsv(GTFS_FILE_HEADERS['calendar.txt'], draft.calendar),
    'calendar_dates.txt': writeCsv(GTFS_FILE_HEADERS['calendar_dates.txt'], draft.calendarDates),
    'feed_info.txt': writeCsv(GTFS_FILE_HEADERS['feed_info.txt'], [draft.feedInfo])
  }
  return files
}

export function validateGtfsDraft(draft) {
  const issues = []
  const warnings = []
  const agencyIds = new Set((draft.agencies || []).map((agency) => agency.agency_id).filter(Boolean))
  const routeIds = new Set()
  const stopIds = new Set((draft.stops || []).map((stop) => stop.stop_id).filter(Boolean))
  const tripIds = new Set((draft.trips || []).map((trip) => trip.trip_id).filter(Boolean))

  if (!agencyIds.size) issues.push({ code: 'missing_agency', message: 'agency.txt に出力する事業者がありません' })
  for (const agency of draft.agencies || []) {
    for (const field of ['agency_id', 'agency_name', 'agency_url', 'agency_timezone']) {
      if (!agency[field]) issues.push({ code: 'missing_agency_field', field, agency_id: agency.agency_id || null })
    }
  }
  for (const route of draft.routes || []) {
    if (route.status === 'excluded') continue
    for (const field of ['route_id', 'agency_id', 'route_type']) {
      if (!route[field]) issues.push({ code: 'missing_route_field', field, route_id: route.route_id || null })
    }
    if (route.agency_id && !agencyIds.has(route.agency_id)) {
      issues.push({ code: 'unknown_route_agency', route_id: route.route_id, agency_id: route.agency_id })
    }
    if (route.route_type && !GTFS_ROUTE_TYPES.has(String(route.route_type))) {
      issues.push({ code: 'invalid_route_type', route_id: route.route_id, route_type: route.route_type })
    }
    if (routeIds.has(route.route_id)) {
      issues.push({ code: 'duplicate_route_id', route_id: route.route_id })
    }
    routeIds.add(route.route_id)
  }
  for (const trip of draft.trips || []) {
    if (trip.route_id && !routeIds.has(trip.route_id)) {
      issues.push({ code: 'unknown_trip_route', trip_id: trip.trip_id, route_id: trip.route_id })
    }
  }
  for (const stopTime of draft.stopTimes || []) {
    if (stopTime.trip_id && !tripIds.has(stopTime.trip_id)) {
      issues.push({ code: 'unknown_stop_time_trip', trip_id: stopTime.trip_id })
    }
    if (stopTime.stop_id && !stopIds.has(stopTime.stop_id)) {
      issues.push({ code: 'unknown_stop_time_stop', trip_id: stopTime.trip_id, stop_id: stopTime.stop_id })
    }
  }
  if (!draft.routes?.some((route) => route.status !== 'excluded')) {
    warnings.push({ code: 'no_exportable_routes', message: '出力対象の routes.txt レコードがありません' })
  }
  if (!draft.stops?.length) {
    warnings.push({ code: 'no_stops', message: 'stops.txt はヘッダーのみです。時刻表の停留所転記または既存変換スクリプトの実行が必要です' })
  }
  if (!draft.trips?.length || !draft.stopTimes?.length) {
    warnings.push({ code: 'no_trips', message: 'trips.txt / stop_times.txt はヘッダーのみです。運行便と時刻の入力後に完成GTFSとして扱ってください' })
  }
  return {
    ok: issues.length === 0,
    checkedAt: new Date().toISOString(),
    issues,
    warnings
  }
}

export function normalizeDraft(input) {
  const draft = {
    version: 1,
    id: input?.id || 'oki-local-draft',
    name: input?.name || '隠岐交通 GTFS 下書き',
    scope: normalizeScope(input?.scope || 'active'),
    createdAt: input?.createdAt || null,
    updatedAt: input?.updatedAt || null,
    createdFromSnapshotAt: input?.createdFromSnapshotAt || null,
    feedInfo: {
      feed_publisher_name: input?.feedInfo?.feed_publisher_name || 'FerryTransit local dashboard',
      feed_publisher_url: input?.feedInfo?.feed_publisher_url || 'https://example.local/ferrytransit',
      feed_lang: input?.feedInfo?.feed_lang || 'ja',
      feed_start_date: toGtfsDate(input?.feedInfo?.feed_start_date || `${new Date().getFullYear()}0101`),
      feed_end_date: toGtfsDate(input?.feedInfo?.feed_end_date || `${new Date().getFullYear()}1231`),
      feed_version: input?.feedInfo?.feed_version || `${new Date().toISOString().slice(0, 10)}-draft`
    },
    agencies: normalizeRows(input?.agencies),
    routes: normalizeRows(input?.routes).map(normalizeRoute),
    stops: normalizeRows(input?.stops),
    trips: normalizeRows(input?.trips),
    stopTimes: normalizeRows(input?.stopTimes || input?.stop_times),
    calendar: normalizeRows(input?.calendar),
    calendarDates: normalizeRows(input?.calendarDates || input?.calendar_dates),
    exports: normalizeRows(input?.exports)
  }
  draft.validation = validateGtfsDraft(draft)
  draft.summary = summarizeDraft(draft)
  return draft
}

function shouldIncludeDocument(document, scope) {
  const type = document.type || document.detectedType
  const reviewStatus = document.reviewStatus || 'unreviewed'
  if (type !== 'timetable') return false
  if (scope === 'required') return reviewStatus === 'required'
  if (scope === 'all') return true
  return reviewStatus !== 'unnecessary'
}

function summarizeDraft(draft) {
  return {
    agencyCount: draft.agencies.length,
    routeCount: draft.routes.length,
    exportableRouteCount: draft.routes.filter((route) => route.status !== 'excluded').length,
    readyRouteCount: draft.routes.filter((route) => route.status === 'ready').length,
    stopCount: draft.stops.length,
    tripCount: draft.trips.length,
    stopTimeCount: draft.stopTimes.length,
    issueCount: draft.validation.issues.length,
    warningCount: draft.validation.warnings.length,
    lastExportedAt: draft.exports[0]?.exportedAt || null
  }
}

function buildRouteLongName(source, document) {
  const sourceName = source.name || document.sourceName || ''
  const label = document.pageLabel || ''
  const title = document.title || ''
  return uniqueText([sourceName, label, title]).join(' / ')
}

function deriveRouteType(source) {
  return source?.group === '船舶' ? '4' : '3'
}

function normalizeRoute(route) {
  return {
    route_id: String(route.route_id || '').trim(),
    agency_id: String(route.agency_id || '').trim(),
    route_short_name: String(route.route_short_name || '').trim(),
    route_long_name: String(route.route_long_name || '').trim(),
    route_type: String(route.route_type || '3').trim(),
    route_url: String(route.route_url || '').trim(),
    route_desc: String(route.route_desc || '').trim(),
    source_document_url: route.source_document_url || null,
    source_document_title: route.source_document_title || null,
    source_page_url: route.source_page_url || null,
    source_page_label: route.source_page_label || null,
    source_review_status: route.source_review_status || 'unreviewed',
    source_document_type: route.source_document_type || 'timetable',
    status: ROUTE_STATUSES.has(route.status) ? route.status : 'draft',
    notes: String(route.notes || '').trim()
  }
}

function updateRoute(routes, patch) {
  const routeId = String(patch.route_id || patch.routeId || '').trim()
  if (!routeId) throw new Error('更新対象の route_id が指定されていません')
  let found = false
  const next = routes.map((route) => {
    if (route.route_id !== routeId) return route
    found = true
    return normalizeRoute({
      ...route,
      ...pickRouteFields(patch),
      route_id: route.route_id,
      agency_id: route.agency_id
    })
  })
  if (!found) throw new Error(`GTFS 下書きに route_id=${routeId} が見つかりません`)
  return next
}

function pickRouteFields(input) {
  const result = {}
  for (const key of ['route_short_name', 'route_long_name', 'route_type', 'route_url', 'route_desc', 'status', 'notes']) {
    if (input[key] !== undefined) result[key] = input[key]
  }
  return result
}

function pickFeedInfo(input) {
  const result = {}
  for (const key of ['feed_publisher_name', 'feed_publisher_url', 'feed_lang', 'feed_start_date', 'feed_end_date', 'feed_version']) {
    if (input[key] === undefined) continue
    result[key] = key.includes('_date') ? toGtfsDate(input[key]) : String(input[key]).trim()
  }
  return result
}

function normalizeScope(scope) {
  return DRAFT_SCOPES.has(scope) ? scope : 'active'
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : []
}

function toGtfsDate(value) {
  const raw = String(value || '').trim()
  if (/^\d{8}$/.test(raw)) return raw
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[1]}${match[2]}${match[3]}`
  return raw.replace(/[^\d]/g, '').slice(0, 8)
}

function stableGtfsId(...parts) {
  const raw = parts.filter(Boolean).join('-')
  const slug = raw
    .normalize('NFKD')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 48)
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 8)
  return `${slug || 'item'}_${hash}`
}

function uniqueId(baseId, used) {
  let id = baseId
  let index = 2
  while (used.has(id)) {
    id = `${baseId}_${index}`
    index += 1
  }
  used.add(id)
  return id
}

function uniqueText(values) {
  const seen = new Set()
  const result = []
  for (const value of values.map((item) => String(item || '').trim()).filter(Boolean)) {
    if (seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }
  return result
}

async function saveGtfsDraft(draft) {
  await mkdir(dirname(LOCAL_GTFS_DRAFT_PATH), { recursive: true })
  await writeFile(LOCAL_GTFS_DRAFT_PATH, `${JSON.stringify(draft, null, 2)}\n`)
}

async function loadLatestValidationReport(mode, id) {
  const dir = join(GTFS_REPORTS_DIR, mode, id)
  const files = (await readDirectorySafe(dir)).filter((name) => name.endsWith('.validation.json')).sort()
  if (!files.length) return null
  try {
    const report = JSON.parse(await readFile(join(dir, files.at(-1)), 'utf8'))
    return {
      ok: Boolean(report.ok),
      checkedAt: report.checkedAt || null,
      issueCount: report.issues?.length || 0,
      warningCount: report.warnings?.length || 0,
      summary: report.summary || null
    }
  } catch {
    return null
  }
}

async function readDirectorySafe(dir) {
  try {
    return await readdir(dir)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function readGtfsCsv(filePath) {
  try {
    return readGtfsCsvText(await readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return { headers: [], rows: [], missing: true }
    throw error
  }
}

function readGtfsCsvText(text, fallbackHeaders = []) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '')
  if (!lines.length) return { headers: fallbackHeaders, rows: [] }
  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))
  })
  return { headers, rows }
}

async function readGtfsFilesFromDirectory(dir) {
  const files = {}
  for (const table of GTFS_TABLES) {
    try {
      files[table.fileName] = await readFile(join(dir, table.fileName), 'utf8')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  return files
}

async function loadGtfsSourceMeta(mode, id) {
  const sourceFiles = await readDirectorySafe(GTFS_SOURCES_DIR)
  for (const fileName of sourceFiles.filter((name) => name.endsWith('.json'))) {
    const meta = JSON.parse(await readFile(join(GTFS_SOURCES_DIR, fileName), 'utf8'))
    if ((meta.mode || 'bus') === mode && meta.id === id) return meta
  }
  return null
}

async function readJsonOptional(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function safeExportDir(exportId) {
  const safe = normalize(exportId).replace(/^(\.\.(\/|\\|$))+/, '')
  const dir = join(LOCAL_GTFS_EXPORT_DIR, safe)
  if (!dir.startsWith(LOCAL_GTFS_EXPORT_DIR)) {
    throw new Error('不正な GTFS 出力 ID です')
  }
  return dir
}

function buildRouteStats(tables) {
  const routes = tables.routes.rows
  const trips = tables.trips.rows
  const stopTimes = tables.stop_times.rows
  const stopsById = new Map(tables.stops.rows.map((stop) => [stop.stop_id, stop]))
  const tripsByRoute = groupBy(trips, 'route_id')
  const stopTimesByTrip = groupBy(stopTimes, 'trip_id')

  return routes.map((route) => {
    const routeTrips = tripsByRoute.get(route.route_id) || []
    const routeStopIds = new Set()
    const serviceIds = new Set()
    const headsigns = new Set()
    const times = []
    let sampleStopNames = []
    for (const trip of routeTrips) {
      if (trip.service_id) serviceIds.add(trip.service_id)
      if (trip.trip_headsign) headsigns.add(trip.trip_headsign)
      const tripStopTimes = sortStopTimes(stopTimesByTrip.get(trip.trip_id) || [])
      if (!sampleStopNames.length && tripStopTimes.length) {
        sampleStopNames = tripStopTimes.map((item) => stopsById.get(item.stop_id)?.stop_name || item.stop_id).filter(Boolean)
      }
      for (const stopTime of tripStopTimes) {
        if (stopTime.stop_id) routeStopIds.add(stopTime.stop_id)
        if (stopTime.departure_time) times.push(stopTime.departure_time)
        if (stopTime.arrival_time) times.push(stopTime.arrival_time)
      }
    }
    const sortedTimes = times.filter(Boolean).sort(compareGtfsTime)
    return {
      ...route,
      tripCount: routeTrips.length,
      stopCount: routeStopIds.size,
      serviceIds: [...serviceIds].sort(),
      headsigns: [...headsigns].sort(),
      firstTime: sortedTimes[0] || '',
      lastTime: sortedTimes.at(-1) || '',
      sampleStops: sampleStopNames.slice(0, 8),
      sampleStopOverflow: Math.max(0, sampleStopNames.length - 8)
    }
  })
}

function buildStopStats(tables, routeStats) {
  const stopTimesByStop = groupBy(tables.stop_times.rows, 'stop_id')
  const routeByTripId = new Map(tables.trips.rows.map((trip) => [trip.trip_id, trip.route_id]))
  return tables.stops.rows.map((stop) => {
    const stopTimes = stopTimesByStop.get(stop.stop_id) || []
    const routeIds = new Set(stopTimes.map((stopTime) => routeByTripId.get(stopTime.trip_id)).filter(Boolean))
    return {
      ...stop,
      routeCount: routeIds.size,
      tripCount: new Set(stopTimes.map((stopTime) => stopTime.trip_id).filter(Boolean)).size,
      routeNames: [...routeIds].map((routeId) => {
        const route = routeStats.find((item) => item.route_id === routeId)
        return route?.route_short_name || route?.route_long_name || routeId
      }).filter(Boolean).sort()
    }
  }).sort((a, b) => b.routeCount - a.routeCount || b.tripCount - a.tripCount || String(a.stop_name).localeCompare(String(b.stop_name), 'ja'))
}

function buildTripStats(tables, routeStats) {
  const routeById = new Map(routeStats.map((route) => [route.route_id, route]))
  const stopTimesByTrip = groupBy(tables.stop_times.rows, 'trip_id')
  const stopsById = new Map(tables.stops.rows.map((stop) => [stop.stop_id, stop]))
  return tables.trips.rows.slice(0, GTFS_VIEW_TRIP_LIMIT).map((trip) => {
    const stopTimes = sortStopTimes(stopTimesByTrip.get(trip.trip_id) || [])
    const route = routeById.get(trip.route_id)
    const firstStop = stopTimes[0]
    const lastStop = stopTimes.at(-1)
    return {
      ...trip,
      routeName: route?.route_short_name || route?.route_long_name || trip.route_id,
      stopCount: stopTimes.length,
      firstTime: firstStop?.departure_time || firstStop?.arrival_time || '',
      lastTime: lastStop?.arrival_time || lastStop?.departure_time || '',
      firstStopName: stopsById.get(firstStop?.stop_id)?.stop_name || firstStop?.stop_id || '',
      lastStopName: stopsById.get(lastStop?.stop_id)?.stop_name || lastStop?.stop_id || ''
    }
  })
}

function groupBy(rows, key) {
  const groups = new Map()
  for (const row of rows || []) {
    const value = row[key]
    if (!value) continue
    const group = groups.get(value) || []
    group.push(row)
    groups.set(value, group)
  }
  return groups
}

function sortStopTimes(rows) {
  return [...rows].sort((a, b) => Number(a.stop_sequence || 0) - Number(b.stop_sequence || 0))
}

function compareGtfsTime(a, b) {
  return toGtfsTimeSeconds(a) - toGtfsTimeSeconds(b)
}

function toGtfsTimeSeconds(value) {
  const match = String(value || '').match(/^(\d+):(\d{2}):(\d{2})$/)
  if (!match) return Number.MAX_SAFE_INTEGER
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (char === ',' && !quoted) {
      values.push(value)
      value = ''
      continue
    }
    value += char
  }
  values.push(value)
  return values
}

function writeCsv(headers, rows) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row?.[header])).join(','))
  ]
  return `${lines.join('\n')}\n`
}

function csvCell(value) {
  const text = String(value ?? '')
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function toExportRecord(manifest) {
  return {
    exportId: manifest.exportId,
    exportedAt: manifest.exportedAt,
    fileCount: manifest.fileCount,
    zipBytes: manifest.zipBytes,
    issueCount: manifest.validation?.issues?.length || 0,
    warningCount: manifest.validation?.warnings?.length || 0,
    href: `/api/gtfs/artifacts/${encodeURIComponent(manifest.exportId)}/gtfs.zip`
  }
}

export function buildTaskCommand(action, sourceId) {
  const stage = { convert: 'acquire', validate: 'validate', build: 'build' }[action]
  if (!stage) throw new Error(`不正な GTFS タスクです: ${action}`)
  return getTransportCliCommand(sourceId, stage)
}

async function loadTaskHistory() {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_GTFS_TASK_HISTORY_PATH, 'utf8'))
    return Array.isArray(parsed.records) ? parsed.records : []
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function appendTaskHistory(record) {
  const records = [record, ...(await loadTaskHistory())].slice(0, 20)
  await mkdir(dirname(LOCAL_GTFS_TASK_HISTORY_PATH), { recursive: true })
  await writeFile(LOCAL_GTFS_TASK_HISTORY_PATH, `${JSON.stringify({ version: 1, updatedAt: record.ranAt, records }, null, 2)}\n`)
}

function trimTaskOutput(value) {
  return String(value || '').trim().slice(-8000)
}

function sum(items, getter) {
  return items.reduce((total, item) => total + (Number(getter(item)) || 0), 0)
}

function createZipBuffer(files) {
  const localParts = []
  const centralParts = []
  let offset = 0
  const dos = toDosDateTime(new Date())
  for (const [fileName, text] of Object.entries(files)) {
    const nameBuffer = Buffer.from(fileName)
    const dataBuffer = Buffer.from(text)
    const crc = crc32(dataBuffer)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(dos.time, 10)
    localHeader.writeUInt16LE(dos.date, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(dataBuffer.length, 18)
    localHeader.writeUInt32LE(dataBuffer.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)
    localParts.push(localHeader, nameBuffer, dataBuffer)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(dos.time, 12)
    centralHeader.writeUInt16LE(dos.date, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(dataBuffer.length, 20)
    centralHeader.writeUInt32LE(dataBuffer.length, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(centralHeader, nameBuffer)
    offset += localHeader.length + nameBuffer.length + dataBuffer.length
  }
  const centralOffset = offset
  const centralBuffer = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(centralBuffer.length, 12)
  end.writeUInt32LE(centralOffset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...localParts, centralBuffer, end])
}

function toDosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980)
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
