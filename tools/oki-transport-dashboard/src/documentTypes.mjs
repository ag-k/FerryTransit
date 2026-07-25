import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const DOCUMENT_TYPE_PATH = join(ROOT_DIR, 'data', 'document-types.json')

export const DOCUMENT_TYPES = new Set(['timetable', 'fare', 'status', 'notice', 'map', 'other'])
export const AUTO_DOCUMENT_TYPE = 'auto'

export async function loadDocumentTypeStore() {
  try {
    const parsed = JSON.parse(await readFile(DOCUMENT_TYPE_PATH, 'utf8'))
    return {
      version: 1,
      updatedAt: parsed.updatedAt || null,
      records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {}
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { version: 1, updatedAt: null, records: {} }
    }
    throw error
  }
}

export async function setDocumentType(input) {
  const url = String(input.url || '').trim()
  const type = String(input.type || '').trim()
  if (!url) {
    throw new Error('資料 URL が指定されていません')
  }
  if (type !== AUTO_DOCUMENT_TYPE && !DOCUMENT_TYPES.has(type)) {
    throw new Error(`不正な資料種別です: ${type}`)
  }

  const store = await loadDocumentTypeStore()
  const updatedAt = new Date().toISOString()
  if (type === AUTO_DOCUMENT_TYPE) {
    delete store.records[url]
  } else {
    store.records[url] = {
      type,
      url,
      title: input.title || null,
      sourceId: input.sourceId || null,
      sourceName: input.sourceName || null,
      updatedAt
    }
  }
  store.updatedAt = updatedAt
  await saveDocumentTypeStore(store)
  return {
    type,
    record: store.records[url] || { type: AUTO_DOCUMENT_TYPE, url, updatedAt }
  }
}

export function attachDocumentTypeState(snapshot, store) {
  if (!snapshot) return snapshot
  const records = store?.records || {}
  const documents = (snapshot.documents || []).map((document) => {
    const detectedType = normalizeDocumentType(document.detectedType || document.type)
    const record = records[document.url]
    const manualType = DOCUMENT_TYPES.has(record?.type) ? record.type : null
    const type = manualType || detectedType
    return {
      ...document,
      detectedType,
      type,
      manualType,
      typeUpdatedAt: record?.updatedAt || null
    }
  })
  const documentByUrl = new Map(documents.map((document) => [document.url, document]))
  const sourceTypeCounts = new Map()
  for (const document of documents) {
    const current = sourceTypeCounts.get(document.sourceId) || createDocumentTypeCount()
    current.documents += 1
    current[document.type] = (current[document.type] || 0) + 1
    sourceTypeCounts.set(document.sourceId, current)
  }

  return {
    ...snapshot,
    documentTypeStoreUpdatedAt: store?.updatedAt || null,
    summary: updateSummaryTypeCounts(snapshot.summary, documents),
    documents,
    sources: (snapshot.sources || []).map((source) => {
      const typeCounts = sourceTypeCounts.get(source.id) || createDocumentTypeCount()
      const counts = {
        ...(source.counts || {}),
        ...typeCounts,
        timetables: typeCounts.timetable,
        fares: typeCounts.fare
      }
      return {
        ...source,
        counts,
        documents: (source.documents || []).map((document) => documentByUrl.get(document.url) || {
          ...document,
          detectedType: normalizeDocumentType(document.detectedType || document.type),
          manualType: null,
          typeUpdatedAt: null
        })
      }
    })
  }
}

function updateSummaryTypeCounts(summary, documents) {
  if (!summary) return summary
  return {
    ...summary,
    timetableCount: documents.filter((document) => document.type === 'timetable').length,
    fareCount: documents.filter((document) => document.type === 'fare').length,
    statusCount: documents.filter((document) => document.type === 'status').length,
    noticeDocumentCount: documents.filter((document) => document.type === 'notice').length,
    mapCount: documents.filter((document) => document.type === 'map').length,
    otherCount: documents.filter((document) => document.type === 'other').length
  }
}

function normalizeDocumentType(type) {
  return DOCUMENT_TYPES.has(type) ? type : 'other'
}

async function saveDocumentTypeStore(store) {
  await mkdir(dirname(DOCUMENT_TYPE_PATH), { recursive: true })
  await writeFile(DOCUMENT_TYPE_PATH, `${JSON.stringify(store, null, 2)}\n`)
}

function createDocumentTypeCount() {
  return {
    documents: 0,
    timetable: 0,
    fare: 0,
    status: 0,
    notice: 0,
    map: 0,
    other: 0
  }
}
