import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { loadTransportSourceRegistry } from './transport-source-registry.mjs'

const DEFAULT_SNAPSHOT_PATH = 'tools/oki-transport-dashboard/data/snapshots/latest.json'
const MAX_SNAPSHOT_AGE_MS = 48 * 60 * 60 * 1000

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex')
}

function parseUpdatedText(value) {
  const match = String(value || '').match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/)
  if (!match) return null
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

export function collectSourceProvenanceIssues({ root, source, gtfsDir, feedVersion }) {
  const issues = []
  const documents = [...(source.legacySourceDocuments || []), ...(source.sourceDocuments || [])]
  if (documents.length === 0) return issues

  const sourceInfoPath = join(gtfsDir, 'source_info.json')
  if (!existsSync(sourceInfoPath)) {
    return [{ code: 'missing_source_info', file: sourceInfoPath }]
  }

  const sourceInfo = JSON.parse(readFileSync(sourceInfoPath, 'utf8'))
  if (sourceInfo.sourceUpdatedAt !== source.currentRawDate) {
    issues.push({ code: 'source_date_mismatch', expected: source.currentRawDate, actual: sourceInfo.sourceUpdatedAt || null })
  }
  if (sourceInfo.officialPageUpdatedAt !== source.officialPageUpdatedAt) {
    issues.push({ code: 'official_page_date_mismatch', expected: source.officialPageUpdatedAt, actual: sourceInfo.officialPageUpdatedAt || null })
  }
  if (sourceInfo.feedVersion !== feedVersion) {
    issues.push({ code: 'source_feed_version_mismatch', expected: feedVersion, actual: sourceInfo.feedVersion || null })
  }

  const infoDocuments = new Map((sourceInfo.documents || []).map(document => [document.id, document]))
  for (const document of documents) {
    const filePath = resolve(root, document.file)
    if (!existsSync(filePath)) {
      issues.push({ code: 'missing_source_document', file: document.file })
      continue
    }
    const actualHash = sha256(readFileSync(filePath))
    if (actualHash !== document.sha256) {
      issues.push({ code: 'source_document_hash_mismatch', file: document.file, expected: document.sha256, actual: actualHash })
    }
    const recorded = infoDocuments.get(document.id)
    if (!recorded || recorded.sha256 !== document.sha256 || recorded.url !== document.url) {
      issues.push({ code: 'source_document_record_mismatch', documentId: document.id })
    }
  }
  return issues
}

export function collectSourceMonitorIssues({ source, snapshot, now = new Date() }) {
  const issues = []
  if (!snapshot?.collectedAt) return [{ code: 'missing_source_monitor_snapshot', sourceId: source.sourceId }]
  const collectedAt = Date.parse(snapshot.collectedAt)
  if (!Number.isFinite(collectedAt) || now.getTime() - collectedAt > MAX_SNAPSHOT_AGE_MS) {
    issues.push({ code: 'stale_source_monitor_snapshot', sourceId: source.sourceId, collectedAt: snapshot.collectedAt })
  }
  const monitoredSource = (snapshot.sources || []).find(item => item.id === source.sourceId)
  if (!monitoredSource) return [...issues, { code: 'missing_monitored_source', sourceId: source.sourceId }]

  const timetablePage = (monitoredSource.pages || []).find(page => page.url === source.sourceUrl)
  const officialUpdatedAt = parseUpdatedText(timetablePage?.updatedText)
  if (!officialUpdatedAt) {
    issues.push({ code: 'missing_official_page_updated_at', sourceId: source.sourceId })
  } else if (officialUpdatedAt > source.officialPageUpdatedAt) {
    issues.push({
      code: 'unadopted_official_page_update',
      sourceId: source.sourceId,
      adopted: source.officialPageUpdatedAt,
      official: officialUpdatedAt
    })
  }

  const adoptedUrls = new Set((source.sourceDocuments || []).map(document => document.url))
  for (const document of monitoredSource.documents || []) {
    if (document.type !== 'timetable' || adoptedUrls.has(document.url)) continue
    if (document.dateText && document.dateText > source.currentRawDate) {
      issues.push({ code: 'unadopted_timetable_document', sourceId: source.sourceId, url: document.url, dateText: document.dateText })
    }
  }
  return issues
}

export function assertGtfsPublishReady(root = process.cwd(), options = {}) {
  const registry = loadTransportSourceRegistry(root)
  const managedFeeds = registry.feeds.filter(source => (source.sourceDocuments || []).length > 0)
  const snapshotPath = resolve(root, options.snapshotPath || DEFAULT_SNAPSHOT_PATH)
  const snapshot = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, 'utf8')) : null
  const issues = []

  for (const source of managedFeeds) {
    const gtfsDir = resolve(root, source.currentPath)
    const feedInfoPath = join(gtfsDir, 'feed_info.txt')
    const feedVersion = existsSync(feedInfoPath)
      ? readFileSync(feedInfoPath, 'utf8').trim().split(/\r?\n/)[1]?.split(',').at(-1)
      : null
    issues.push(...collectSourceProvenanceIssues({ root, source, gtfsDir, feedVersion }))
    issues.push(...collectSourceMonitorIssues({ source, snapshot, now: options.now || new Date() }))
  }

  if (issues.length > 0) {
    throw new Error(`GTFS公開前の公式資料ゲートに失敗しました: ${JSON.stringify(issues)}`)
  }
  return { ok: true, checkedSources: managedFeeds.map(source => source.sourceId) }
}
