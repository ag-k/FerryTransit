import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const REVIEW_PATH = join(ROOT_DIR, 'data', 'reviews.json')

export const REVIEW_STATUSES = new Set(['unreviewed', 'unnecessary', 'required'])

export async function loadReviewStore() {
  try {
    const parsed = JSON.parse(await readFile(REVIEW_PATH, 'utf8'))
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

export async function setReviewStatus(input) {
  const url = String(input.url || '').trim()
  const status = String(input.status || '').trim()
  if (!url) {
    throw new Error('資料 URL が指定されていません')
  }
  if (!REVIEW_STATUSES.has(status)) {
    throw new Error(`不正なレビュー状態です: ${status}`)
  }

  const store = await loadReviewStore()
  const updatedAt = new Date().toISOString()
  if (status === 'unreviewed') {
    delete store.records[url]
  } else {
    store.records[url] = {
      status,
      url,
      title: input.title || null,
      sourceId: input.sourceId || null,
      sourceName: input.sourceName || null,
      updatedAt
    }
  }
  store.updatedAt = updatedAt
  await saveReviewStore(store)
  return {
    status,
    record: store.records[url] || { status: 'unreviewed', url, updatedAt }
  }
}

export function attachReviewState(snapshot, store) {
  if (!snapshot) return snapshot
  const records = store?.records || {}
  const documents = (snapshot.documents || []).map((document) => {
    const record = records[document.url]
    return {
      ...document,
      reviewStatus: record?.status || 'unreviewed',
      reviewUpdatedAt: record?.updatedAt || null
    }
  })
  const reviewSummary = summarizeReviewStatuses(documents)
  const documentByUrl = new Map(documents.map((document) => [document.url, document]))
  const sourceReviewCounts = new Map()
  for (const document of documents) {
    const current = sourceReviewCounts.get(document.sourceId) || createReviewCount()
    current.total += 1
    current[document.reviewStatus] += 1
    sourceReviewCounts.set(document.sourceId, current)
  }

  return {
    ...snapshot,
    reviewSummary,
    reviewStoreUpdatedAt: store?.updatedAt || null,
    documents,
    sources: (snapshot.sources || []).map((source) => ({
      ...source,
      documents: (source.documents || []).map((document) => documentByUrl.get(document.url) || {
        ...document,
        reviewStatus: 'unreviewed',
        reviewUpdatedAt: null
      }),
      reviewCounts: sourceReviewCounts.get(source.id) || createReviewCount()
    }))
  }
}

export function summarizeReviewStatuses(documents) {
  const summary = createReviewCount()
  for (const document of documents || []) {
    const status = REVIEW_STATUSES.has(document.reviewStatus) ? document.reviewStatus : 'unreviewed'
    summary[status] += 1
  }
  summary.total = (documents || []).length
  return summary
}

async function saveReviewStore(store) {
  await mkdir(dirname(REVIEW_PATH), { recursive: true })
  await writeFile(REVIEW_PATH, `${JSON.stringify(store, null, 2)}\n`)
}

function createReviewCount() {
  return {
    total: 0,
    unreviewed: 0,
    unnecessary: 0,
    required: 0
  }
}
