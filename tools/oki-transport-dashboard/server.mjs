import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import { collectAll, loadLatestSnapshot, ROOT_DIR, SOURCES } from './src/collector.mjs'
import {
  createGtfsCodexJob,
  listCodexJobs,
  loadCodexIntegrationStatus,
  submitCodexJob,
  updateCodexJobStatus
} from './src/codexAppServer.mjs'
import { attachDocumentTypeState, loadDocumentTypeStore, setDocumentType } from './src/documentTypes.mjs'
import {
  createGtfsDraftFromSnapshot,
  exportGtfsDraft,
  loadGtfsDashboard,
  loadGtfsView,
  resolveGtfsArtifact,
  runGtfsTask,
  updateGtfsDraft
} from './src/gtfs.mjs'
import { attachReviewState, loadReviewStore, setReviewStatus } from './src/reviews.mjs'

const PUBLIC_DIR = join(ROOT_DIR, 'public')
const PORT = Number(process.env.PORT || 4177)

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`)
    if (url.pathname === '/api/sources') {
      return sendJson(response, { sources: SOURCES })
    }
    if (url.pathname === '/api/latest') {
      const latest = await loadLatestSnapshot()
      return sendJson(response, await withReviewState(latest || { summary: null, sources: [], documents: [], notices: [], pages: [] }))
    }
    if (url.pathname === '/api/collect') {
      const save = url.searchParams.get('save') === '1'
      const download = url.searchParams.get('download') === '1'
      const snapshot = await collectAll({ save, download })
      return sendJson(response, await withReviewState(snapshot))
    }
    if (url.pathname === '/api/document-types' && request.method === 'GET') {
      return sendJson(response, await loadDocumentTypeStore())
    }
    if (url.pathname === '/api/document-types' && (request.method === 'POST' || request.method === 'PATCH')) {
      const body = await readJsonBody(request)
      const result = await setDocumentType(body)
      return sendJson(response, { ...result, store: await loadDocumentTypeStore() })
    }
    if (url.pathname === '/api/reviews' && request.method === 'GET') {
      return sendJson(response, await loadReviewStore())
    }
    if (url.pathname === '/api/reviews' && (request.method === 'POST' || request.method === 'PATCH')) {
      const body = await readJsonBody(request)
      const result = await setReviewStatus(body)
      return sendJson(response, { ...result, store: await loadReviewStore() })
    }
    if (url.pathname === '/api/gtfs' && request.method === 'GET') {
      return sendJson(response, await loadGtfsDashboard())
    }
    if (url.pathname === '/api/gtfs/view' && request.method === 'GET') {
      return sendJson(response, await loadGtfsView(Object.fromEntries(url.searchParams)))
    }
    if (url.pathname === '/api/gtfs/draft/from-latest' && request.method === 'POST') {
      const body = await readJsonBody(request)
      const latest = body.snapshot?.summary ? body.snapshot : await loadLatestSnapshot()
      const snapshot = await withReviewState(latest || { summary: null, sources: [], documents: [], notices: [], pages: [] })
      const draft = await createGtfsDraftFromSnapshot(snapshot, body)
      return sendJson(response, { draft, dashboard: await loadGtfsDashboard() })
    }
    if (url.pathname === '/api/gtfs/draft' && (request.method === 'POST' || request.method === 'PATCH')) {
      const body = await readJsonBody(request)
      const draft = await updateGtfsDraft(body)
      return sendJson(response, { draft, dashboard: await loadGtfsDashboard() })
    }
    if (url.pathname === '/api/gtfs/draft/export' && request.method === 'POST') {
      const result = await exportGtfsDraft()
      return sendJson(response, { export: result, dashboard: await loadGtfsDashboard() })
    }
    if (url.pathname === '/api/gtfs/run' && request.method === 'POST') {
      const body = await readJsonBody(request)
      const result = await runGtfsTask(body)
      return sendJson(response, { task: result, dashboard: await loadGtfsDashboard() })
    }
    if (url.pathname === '/api/codex-app-server/status' && request.method === 'GET') {
      return sendJson(response, await loadCodexIntegrationStatus())
    }
    if (url.pathname === '/api/codex-app-server/jobs' && request.method === 'GET') {
      return sendJson(response, { jobs: await listCodexJobs() })
    }
    if (url.pathname === '/api/codex-app-server/jobs' && request.method === 'PATCH') {
      const body = await readJsonBody(request)
      const job = await updateCodexJobStatus(body)
      return sendJson(response, { job, codex: await loadCodexIntegrationStatus() })
    }
    if (url.pathname === '/api/codex-app-server/jobs/send' && request.method === 'POST') {
      const body = await readJsonBody(request)
      const job = await submitCodexJob(body.jobId || body.id)
      return sendJson(response, { job, codex: await loadCodexIntegrationStatus() })
    }
    if (url.pathname === '/api/codex-app-server/gtfs-jobs' && request.method === 'POST') {
      const body = await readJsonBody(request)
      const job = await createGtfsCodexJob(body)
      return sendJson(response, { job, codex: await loadCodexIntegrationStatus(), dashboard: await loadGtfsDashboard() })
    }
    if (url.pathname.startsWith('/api/gtfs/artifacts/')) {
      const artifact = await resolveGtfsArtifact(url.pathname)
      return serveDownload(artifact, response)
    }
    if (url.pathname === '/health') {
      return sendJson(response, { ok: true })
    }
    return serveStatic(url.pathname, response)
  } catch (error) {
    response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ error: error.message }, null, 2))
  }
})

server.listen(PORT, () => {
  console.log(`隠岐交通ソース監視: http://localhost:${PORT}`)
})

async function withReviewState(snapshot) {
  const withDocumentTypes = attachDocumentTypeState(snapshot, await loadDocumentTypeStore())
  return attachReviewState(withDocumentTypes, await loadReviewStore())
}

async function readJsonBody(request) {
  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.byteLength
    if (total > 8 * 1024 * 1024) {
      throw new Error('リクエスト本文が大きすぎます')
    }
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

async function serveStatic(pathname, response) {
  const requested = pathname === '/' ? '/index.html' : pathname
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.(\/|\\|$))+/, '')
  const filePath = join(PUBLIC_DIR, safePath)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }
  try {
    const info = await stat(filePath)
    if (!info.isFile()) throw new Error('not a file')
    response.writeHead(200, {
      'content-type': mimeType(filePath),
      'cache-control': 'no-store'
    })
    createReadStream(filePath).pipe(response)
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
}

function serveDownload(artifact, response) {
  response.writeHead(200, {
    'content-type': artifact.contentType,
    'content-length': artifact.sizeBytes,
    'content-disposition': `attachment; filename="${encodeURIComponent(artifact.fileName)}"`,
    'cache-control': 'no-store'
  })
  createReadStream(artifact.filePath).pipe(response)
}

function sendJson(response, payload) {
  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  })
  response.end(JSON.stringify(payload, null, 2))
}

function mimeType(filePath) {
  switch (extname(filePath)) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.js':
      return 'text/javascript; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}
