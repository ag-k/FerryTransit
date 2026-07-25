import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
export const CHANGE_HISTORY_DB_PATH = join(ROOT_DIR, 'data', 'change-history.sqlite')

export async function recordChangeHistory(snapshot, previousIndex, options = {}) {
  if (!snapshot?.summary) return { snapshotId: null, eventCount: 0 }

  const events = buildChangeEvents(snapshot, previousIndex)
  const { DatabaseSync } = await loadSqlite()
  await mkdir(dirname(options.dbPath || CHANGE_HISTORY_DB_PATH), { recursive: true })

  const db = new DatabaseSync(options.dbPath || CHANGE_HISTORY_DB_PATH)
  try {
    initializeSchema(db)
    db.exec('BEGIN')
    const snapshotId = upsertSnapshot(db, snapshot, events.length)
    insertEvents(db, snapshotId, snapshot, events)
    db.exec('COMMIT')
    return { snapshotId, eventCount: events.length }
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {}
    throw error
  } finally {
    db.close()
  }
}

export async function loadChangeHistory(options = {}) {
  const { DatabaseSync } = await loadSqlite()
  await mkdir(dirname(options.dbPath || CHANGE_HISTORY_DB_PATH), { recursive: true })
  const db = new DatabaseSync(options.dbPath || CHANGE_HISTORY_DB_PATH)
  try {
    initializeSchema(db)
    const limit = Math.max(1, Math.min(Number(options.limit || 100), 1000))
    const rows = db.prepare(`
      SELECT
        e.id,
        s.collected_at AS collectedAt,
        e.event_type AS eventType,
        e.change_status AS changeStatus,
        e.source_id AS sourceId,
        e.source_name AS sourceName,
        e.label,
        e.title,
        e.url,
        e.previous_hash AS previousHash,
        e.current_hash AS currentHash,
        e.previous_size_bytes AS previousSizeBytes,
        e.current_size_bytes AS currentSizeBytes,
        e.previous_value AS previousValue,
        e.current_value AS currentValue,
        e.details_json AS detailsJson,
        e.created_at AS createdAt
      FROM change_events e
      JOIN snapshots s ON s.id = e.snapshot_id
      ORDER BY s.collected_at DESC, e.id DESC
      LIMIT ?
    `).all(limit)
    return {
      dbPath: options.dbPath || CHANGE_HISTORY_DB_PATH,
      events: rows.map((row) => ({
        ...row,
        details: parseJson(row.detailsJson)
      }))
    }
  } finally {
    db.close()
  }
}

export function buildChangeEvents(snapshot, previousIndex = {}) {
  const events = []
  for (const page of snapshot.pages || []) {
    if (!isTrackedChange(page.changeStatus)) continue
    const previous = previousIndex.pages?.get(`${page.sourceId}:${page.url}`) || null
    events.push({
      eventType: 'page',
      changeStatus: page.changeStatus,
      entityKey: `${page.sourceId}:page:${page.url}`,
      sourceId: page.sourceId,
      sourceName: page.sourceName,
      label: page.label,
      title: page.title,
      url: page.url,
      previousHash: previous?.hash || null,
      currentHash: page.hash || null,
      previousSizeBytes: previous?.sizeBytes ?? null,
      currentSizeBytes: page.sizeBytes ?? null,
      previousValue: previous?.updatedText || previous?.lastModified || previous?.etag || null,
      currentValue: page.updatedText || page.lastModified || page.etag || null,
      details: {
        role: page.role,
        status: page.status,
        statusCode: page.statusCode,
        previousStatus: previous?.status || null,
        previousStatusCode: previous?.statusCode || null,
        previousShortHash: previous?.shortHash || null,
        currentShortHash: page.shortHash || null,
        previousLastModified: previous?.lastModified || null,
        currentLastModified: page.lastModified || null,
        previousEtag: previous?.etag || null,
        currentEtag: page.etag || null,
        previousUpdatedText: previous?.updatedText || null,
        currentUpdatedText: page.updatedText || null,
        previousKeywordHits: previous?.keywordHits || null,
        currentKeywordHits: page.keywordHits || null
      }
    })
  }

  for (const document of snapshot.documents || []) {
    if (!isTrackedChange(document.changeStatus)) continue
    const previous = previousIndex.documents?.get(document.url) || null
    events.push({
      eventType: 'document',
      changeStatus: document.changeStatus,
      entityKey: `document:${document.url}`,
      sourceId: document.sourceId,
      sourceName: document.sourceName,
      label: document.pageLabel,
      title: document.title,
      url: document.url,
      previousHash: previous?.hash || null,
      currentHash: document.hash || null,
      previousSizeBytes: previous?.sizeBytes ?? null,
      currentSizeBytes: document.sizeBytes ?? null,
      previousValue: previous?.title || null,
      currentValue: document.title || null,
      details: {
        type: document.type,
        extension: document.extension,
        pageRole: document.pageRole,
        pageUrl: document.pageUrl,
        dateText: document.dateText || null,
        sourceHint: document.sourceHint || null,
        previousType: previous?.type || null,
        previousTitle: previous?.title || null,
        previousShortHash: previous?.shortHash || null,
        currentShortHash: document.shortHash || null
      }
    })
  }

  for (const notice of snapshot.notices || []) {
    if (!isTrackedChange(notice.changeStatus)) continue
    const previous = previousIndex.notices?.get(`${notice.url}:${notice.title}`) || null
    events.push({
      eventType: 'notice',
      changeStatus: notice.changeStatus,
      entityKey: `notice:${notice.url}:${notice.title}`,
      sourceId: notice.sourceId,
      sourceName: notice.sourceName,
      label: null,
      title: notice.title,
      url: notice.url,
      previousHash: null,
      currentHash: null,
      previousSizeBytes: null,
      currentSizeBytes: null,
      previousValue: previous?.dateText || null,
      currentValue: notice.dateText || null,
      details: {
        type: notice.type,
        dateText: notice.dateText || null
      }
    })
  }

  return events
}

function initializeSchema(db) {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collected_at TEXT NOT NULL UNIQUE,
      source_count INTEGER NOT NULL DEFAULT 0,
      ok_sources INTEGER NOT NULL DEFAULT 0,
      warning_sources INTEGER NOT NULL DEFAULT 0,
      error_sources INTEGER NOT NULL DEFAULT 0,
      page_count INTEGER NOT NULL DEFAULT 0,
      changed_pages INTEGER NOT NULL DEFAULT 0,
      document_count INTEGER NOT NULL DEFAULT 0,
      changed_documents INTEGER NOT NULL DEFAULT 0,
      notice_count INTEGER NOT NULL DEFAULT 0,
      new_notices INTEGER NOT NULL DEFAULT 0,
      event_count INTEGER NOT NULL DEFAULT 0,
      summary_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS change_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
      collected_at TEXT NOT NULL,
      event_type TEXT NOT NULL,
      change_status TEXT NOT NULL,
      entity_key TEXT NOT NULL,
      source_id TEXT,
      source_name TEXT,
      label TEXT,
      title TEXT,
      url TEXT NOT NULL,
      previous_hash TEXT,
      current_hash TEXT,
      previous_size_bytes INTEGER,
      current_size_bytes INTEGER,
      previous_value TEXT,
      current_value TEXT,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(snapshot_id, event_type, entity_key)
    );

    CREATE INDEX IF NOT EXISTS idx_change_events_collected_at ON change_events(collected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_change_events_source ON change_events(source_id, collected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_change_events_url ON change_events(url);
  `)
}

function upsertSnapshot(db, snapshot, eventCount) {
  const summary = snapshot.summary || {}
  db.prepare(`
    INSERT INTO snapshots (
      collected_at,
      source_count,
      ok_sources,
      warning_sources,
      error_sources,
      page_count,
      changed_pages,
      document_count,
      changed_documents,
      notice_count,
      new_notices,
      event_count,
      summary_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(collected_at) DO UPDATE SET
      source_count = excluded.source_count,
      ok_sources = excluded.ok_sources,
      warning_sources = excluded.warning_sources,
      error_sources = excluded.error_sources,
      page_count = excluded.page_count,
      changed_pages = excluded.changed_pages,
      document_count = excluded.document_count,
      changed_documents = excluded.changed_documents,
      notice_count = excluded.notice_count,
      new_notices = excluded.new_notices,
      event_count = excluded.event_count,
      summary_json = excluded.summary_json
  `).run(
    snapshot.collectedAt || summary.collectedAt,
    summary.sourceCount || 0,
    summary.okSources || 0,
    summary.warningSources || 0,
    summary.errorSources || 0,
    summary.pageCount || 0,
    summary.changedPages || 0,
    summary.documentCount || 0,
    summary.changedDocuments || 0,
    summary.noticeCount || 0,
    summary.newNotices || 0,
    eventCount,
    JSON.stringify(summary)
  )
  return db.prepare('SELECT id FROM snapshots WHERE collected_at = ?').get(snapshot.collectedAt || summary.collectedAt).id
}

function insertEvents(db, snapshotId, snapshot, events) {
  const insert = db.prepare(`
    INSERT INTO change_events (
      snapshot_id,
      collected_at,
      event_type,
      change_status,
      entity_key,
      source_id,
      source_name,
      label,
      title,
      url,
      previous_hash,
      current_hash,
      previous_size_bytes,
      current_size_bytes,
      previous_value,
      current_value,
      details_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(snapshot_id, event_type, entity_key) DO UPDATE SET
      change_status = excluded.change_status,
      source_id = excluded.source_id,
      source_name = excluded.source_name,
      label = excluded.label,
      title = excluded.title,
      url = excluded.url,
      previous_hash = excluded.previous_hash,
      current_hash = excluded.current_hash,
      previous_size_bytes = excluded.previous_size_bytes,
      current_size_bytes = excluded.current_size_bytes,
      previous_value = excluded.previous_value,
      current_value = excluded.current_value,
      details_json = excluded.details_json
  `)
  for (const event of events) {
    insert.run(
      snapshotId,
      snapshot.collectedAt || snapshot.summary?.collectedAt,
      event.eventType,
      event.changeStatus,
      event.entityKey,
      event.sourceId || null,
      event.sourceName || null,
      event.label || null,
      event.title || null,
      event.url,
      event.previousHash || null,
      event.currentHash || null,
      event.previousSizeBytes,
      event.currentSizeBytes,
      event.previousValue || null,
      event.currentValue || null,
      JSON.stringify(event.details || {})
    )
  }
}

function isTrackedChange(status) {
  return status === 'new' || status === 'changed'
}

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

async function loadSqlite() {
  const emitWarning = process.emitWarning
  process.emitWarning = function (warning, ...args) {
    const name = typeof warning === 'object' ? warning.name : args[1]?.type || args[0]
    const text = typeof warning === 'string' ? warning : warning?.message
    if (name === 'ExperimentalWarning' && /SQLite/.test(text || '')) return
    return emitWarning.call(this, warning, ...args)
  }
  try {
    return await import('node:sqlite')
  } finally {
    process.emitWarning = emitWarning
  }
}
