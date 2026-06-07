import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { loadGtfsDraft } from './gtfs.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const REPO_ROOT = join(ROOT_DIR, '..', '..')
const LOCAL_CODEX_DIR = join(ROOT_DIR, 'data', 'codex-app-server')
const LOCAL_CODEX_JOBS_PATH = join(LOCAL_CODEX_DIR, 'jobs.json')
const DASHBOARD_VERSION = '0.1.0'
const JOB_STATUSES = new Set(['queued', 'sent', 'running', 'completed', 'failed', 'cancelled'])
const SUPPORTED_HTTP_PROTOCOLS = new Set(['http:', 'https:'])
const SUPPORTED_WS_PROTOCOLS = new Set(['ws:', 'wss:'])
const CODEX_APP_CLI = '/Applications/Codex.app/Contents/Resources/codex'
const execFileAsync = promisify(execFile)

export async function loadCodexIntegrationStatus() {
  const [jobs, cli] = await Promise.all([
    listCodexJobs(),
    checkCodexCli()
  ])
  const config = readCodexConfig()
  const counts = countJobs(jobs)
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    config: {
      serverUrl: config.serverUrl ? sanitizeServerUrl(config.serverUrl) : null,
      transport: describeTransport(config.serverUrl),
      hasToken: Boolean(config.token)
    },
    cli,
    queue: {
      total: jobs.length,
      queued: counts.queued || 0,
      sent: counts.sent || 0,
      running: counts.running || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      cancelled: counts.cancelled || 0,
      latest: jobs[0]?.createdAt || null
    },
    jobs: jobs.slice(0, 8)
  }
}

export async function listCodexJobs() {
  const store = await loadJobStore()
  return store.jobs
    .map(normalizeJob)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export async function createGtfsCodexJob(input = {}) {
  const routeId = String(input.routeId || '').trim()
  if (!routeId) throw new Error('GTFS化する route_id が指定されていません')

  const draft = await loadGtfsDraft()
  if (!draft) throw new Error('Codex App Server に渡せる GTFS 下書きがありません')

  const route = (draft.routes || []).find((item) => item.route_id === routeId)
  if (!route) throw new Error(`GTFS 下書きに route_id=${routeId} が見つかりません`)
  const agency = (draft.agencies || []).find((item) => item.agency_id === route.agency_id) || null

  const createdAt = new Date().toISOString()
  const jobId = buildJobId(routeId, createdAt)
  const prompt = buildGtfsCodexPrompt({ draft, route, agency, jobId })
  const appServerPayload = buildCodexJsonRpcPlan({ jobId, prompt, cwd: REPO_ROOT })
  const job = normalizeJob({
    id: jobId,
    type: 'gtfs-route-conversion',
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    routeId: route.route_id,
    routeStatus: route.status,
    routeName: route.route_long_name || route.route_short_name || route.route_id,
    agencyId: agency?.agency_id || route.agency_id || null,
    agencyName: agency?.agency_name || null,
    sourceDocumentUrl: route.source_document_url || route.route_url || null,
    sourceDocumentTitle: route.source_document_title || route.route_long_name || null,
    sourcePageUrl: route.source_page_url || null,
    sourcePageLabel: route.source_page_label || null,
    route,
    agency,
    draft: summarizeDraftForJob(draft),
    prompt,
    appServerPayload,
    delivery: {
      status: 'not_sent',
      transport: describeTransport(readCodexConfig().serverUrl),
      message: 'ローカルキューに保存しました'
    }
  })

  await saveJob(job)
  if (input.submit === false) return job
  return submitCodexJob(job.id)
}

export async function submitCodexJob(jobId) {
  const job = await getCodexJob(jobId)
  if (!job) throw new Error(`Codex App Server ジョブが見つかりません: ${jobId}`)
  const config = readCodexConfig()
  const submittedAt = new Date().toISOString()
  let next = {
    ...job,
    updatedAt: submittedAt,
    delivery: {
      ...(job.delivery || {}),
      status: 'queued',
      transport: describeTransport(config.serverUrl),
      serverUrl: config.serverUrl ? sanitizeServerUrl(config.serverUrl) : null,
      submittedAt
    }
  }

  if (!config.serverUrl) {
    next.delivery = {
      ...next.delivery,
      status: 'not_configured',
      message: 'CODEX_APP_SERVER_URL が未設定のため、ローカルキューに保存しました'
    }
    await saveJob(next)
    return next
  }

  const transport = describeTransport(config.serverUrl)
  if (!['http', 'websocket'].includes(transport)) {
    next.delivery = {
      ...next.delivery,
      status: 'unsupported_transport',
      message: `${transport} は自動送信対象外です。保存済みpayloadを手動で利用してください`
    }
    await saveJob(next)
    return next
  }

  try {
    const result = await sendJobToCodexAppServer(next, config)
    next = {
      ...next,
      status: 'sent',
      updatedAt: new Date().toISOString(),
      delivery: {
        ...next.delivery,
        ...result,
        status: 'sent',
        message: 'Codex App Server に送信しました'
      }
    }
  } catch (error) {
    next = {
      ...next,
      status: 'failed',
      updatedAt: new Date().toISOString(),
      delivery: {
        ...next.delivery,
        status: 'failed',
        message: error.message
      }
    }
  }

  await saveJob(next)
  return next
}

export async function updateCodexJobStatus(input = {}) {
  const jobId = String(input.jobId || input.id || '').trim()
  const status = String(input.status || '').trim()
  if (!jobId) throw new Error('更新対象の Codex App Server ジョブ ID が指定されていません')
  if (!JOB_STATUSES.has(status)) throw new Error(`不正なジョブ状態です: ${status}`)
  const job = await getCodexJob(jobId)
  if (!job) throw new Error(`Codex App Server ジョブが見つかりません: ${jobId}`)
  const next = normalizeJob({
    ...job,
    status,
    updatedAt: new Date().toISOString()
  })
  await saveJob(next)
  return next
}

export function buildGtfsCodexPrompt({ draft, route, agency, jobId }) {
  const feedId = suggestFeedId(route, agency)
  const sourceLines = [
    `資料URL: ${route.source_document_url || route.route_url || '-'}`,
    `資料タイトル: ${route.source_document_title || '-'}`,
    `掲載ページ: ${route.source_page_url || '-'}`,
    `掲載ページラベル: ${route.source_page_label || '-'}`
  ]
  return [
    'FerryTransit のGTFS化タスクです。回答・作業ログ・最終報告は日本語で書いてください。',
    '',
    `ジョブID: ${jobId}`,
    `対象route_id: ${route.route_id}`,
    `route_short_name: ${route.route_short_name || '-'}`,
    `route_long_name: ${route.route_long_name || '-'}`,
    `route_type: ${route.route_type || '-'}`,
    `route_url: ${route.route_url || '-'}`,
    `route_desc: ${route.route_desc || '-'}`,
    `route管理状態: ${route.status || 'draft'}`,
    `資料レビュー状態: ${route.source_review_status || 'unreviewed'}`,
    `資料種別: ${route.source_document_type || 'timetable'}`,
    `agency_id: ${agency?.agency_id || route.agency_id || '-'}`,
    `agency_name: ${agency?.agency_name || '-'}`,
    `agency_url: ${agency?.agency_url || '-'}`,
    `推奨feed id: ${feedId}`,
    ...sourceLines,
    '',
    '目的:',
    '- 公式資料の時刻表を確認し、このrouteをFerryTransitのGTFSとして扱える状態にしてください。',
    '- 既存の `scripts/gtfs/`、`gtfs/sources/*.json`、`gtfs/current/` の構成に合わせ、必要なら変換スクリプト・rawデータ・GTFS txt を追加または更新してください。',
    '- 最低限 `agency.txt`、`routes.txt`、`stops.txt`、`trips.txt`、`stop_times.txt`、`calendar.txt`、`feed_info.txt` が整合するようにしてください。',
    '',
    '作業手順:',
    '1. 対象資料URLを開き、時刻表の便、停留所/港、運行日、注記を確認する。',
    '2. 既存GTFS変換スクリプトに同種の実装があるか確認し、使える形式に寄せる。',
    '3. 必要なGTFS source metadataを `gtfs/sources/` に追加または更新する。',
    '4. `gtfs/current/{mode}/{id}` に完成GTFS txtを生成するか、再現可能な変換スクリプトを追加する。',
    '5. `npm run gtfs:validate -- bus <feedId>` または該当mode/idで検証する。',
    '6. `npm run gtfs:build -- bus <feedId>` または該当mode/idで配信用JSONを生成する。',
    '7. このローカルダッシュボードの下書きrouteは、完成確認後に `status: ready` として扱えるようにする。',
    '',
    '制約:',
    '- 公式資料の内容を根拠にし、不明な時刻・停留所・運行日は推測で埋めないでください。',
    '- 既存のユーザー変更や関係ないファイルは戻さないでください。',
    '- ネットワーク取得やPDF/HTML解析で失敗した場合は、失敗理由と次に確認すべき資料を明記してください。',
    '',
    '現在の下書き概要:',
    `- draft_id: ${draft.id}`,
    `- feed期間: ${draft.feedInfo?.feed_start_date || '-'} - ${draft.feedInfo?.feed_end_date || '-'}`,
    `- route候補数: ${draft.summary?.routeCount ?? (draft.routes || []).length}`,
    `- stops/trips/stop_times: ${draft.summary?.stopCount || 0}/${draft.summary?.tripCount || 0}/${draft.summary?.stopTimeCount || 0}`
  ].join('\n')
}

export function buildCodexJsonRpcPlan({ jobId, prompt, cwd = REPO_ROOT }) {
  return {
    protocol: 'codex-app-server-jsonrpc-v2',
    description: 'initialize後、thread/startの戻り値に含まれるthread.idをturn/start.params.threadIdへ入れて実行します。',
    requests: [
      {
        id: `${jobId}:initialize`,
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'oki-transport-dashboard',
            title: '隠岐交通ソース監視',
            version: DASHBOARD_VERSION
          },
          capabilities: {
            experimentalApi: true
          }
        }
      },
      {
        method: 'initialized'
      },
      {
        id: `${jobId}:thread-start`,
        method: 'thread/start',
        params: {
          cwd,
          runtimeWorkspaceRoots: [cwd],
          developerInstructions: 'Please provide all answers in Japanese. Work only inside the FerryTransit repository unless the user explicitly asks otherwise.'
        }
      },
      {
        id: `${jobId}:turn-start`,
        method: 'turn/start',
        params: {
          threadId: '<thread.id from thread/start>',
          cwd,
          runtimeWorkspaceRoots: [cwd],
          input: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      }
    ]
  }
}

async function sendJobToCodexAppServer(job, config) {
  const parsed = new URL(config.serverUrl)
  if (SUPPORTED_WS_PROTOCOLS.has(parsed.protocol)) {
    return sendJobByWebSocket(job, config)
  }
  if (SUPPORTED_HTTP_PROTOCOLS.has(parsed.protocol)) {
    return sendJobByHttp(job, config)
  }
  throw new Error(`未対応の Codex App Server URL です: ${parsed.protocol}`)
}

async function sendJobByHttp(job, config) {
  const plan = buildCodexJsonRpcPlan({ jobId: job.id, prompt: job.prompt, cwd: REPO_ROOT })
  const initialize = await postJsonRpc(config, plan.requests[0])
  await postJsonRpc(config, plan.requests[1], { notification: true })
  const threadStart = await postJsonRpc(config, plan.requests[2])
  const threadId = extractThreadId(threadStart)
  if (!threadId) throw new Error('thread/start の応答から thread.id を取得できませんでした')
  const turnStart = {
    ...plan.requests[3],
    params: {
      ...plan.requests[3].params,
      threadId
    }
  }
  const turn = await postJsonRpc(config, turnStart)
  return {
    transport: 'http',
    serverUrl: sanitizeServerUrl(config.serverUrl),
    sentAt: new Date().toISOString(),
    initialize: summarizeJsonRpcResult(initialize),
    threadId,
    turnId: extractTurnId(turn),
    raw: summarizeJsonRpcResult(turn)
  }
}

async function sendJobByWebSocket(job, config) {
  const plan = buildCodexJsonRpcPlan({ jobId: job.id, prompt: job.prompt, cwd: REPO_ROOT })
  const socket = await openWebSocket(config.serverUrl)
  try {
    const initialize = await sendWsRequest(socket, plan.requests[0])
    sendWsNotification(socket, plan.requests[1])
    const threadStart = await sendWsRequest(socket, plan.requests[2])
    const threadId = extractThreadId(threadStart)
    if (!threadId) throw new Error('thread/start の応答から thread.id を取得できませんでした')
    const turnStart = {
      ...plan.requests[3],
      params: {
        ...plan.requests[3].params,
        threadId
      }
    }
    const turn = await sendWsRequest(socket, turnStart)
    return {
      transport: 'websocket',
      serverUrl: sanitizeServerUrl(config.serverUrl),
      sentAt: new Date().toISOString(),
      initialize: summarizeJsonRpcResult(initialize),
      threadId,
      turnId: extractTurnId(turn),
      raw: summarizeJsonRpcResult(turn)
    }
  } finally {
    socket.close()
  }
}

async function postJsonRpc(config, payload, options = {}) {
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json'
  }
  if (config.token) headers.authorization = `Bearer ${config.token}`
  const response = await fetch(config.serverUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Codex App Server HTTP ${response.status}: ${text.slice(0, 500)}`)
  }
  if (options.notification) return { ok: true }
  const text = await response.text()
  const json = text.trim() ? JSON.parse(text) : null
  if (json?.error) {
    throw new Error(json.error.message || JSON.stringify(json.error))
  }
  return json
}

function openWebSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const timeout = setTimeout(() => {
      socket.close()
      reject(new Error('Codex App Server WebSocket 接続がタイムアウトしました'))
    }, 15000)
    socket.addEventListener('open', () => {
      clearTimeout(timeout)
      resolve(socket)
    }, { once: true })
    socket.addEventListener('error', () => {
      clearTimeout(timeout)
      reject(new Error('Codex App Server WebSocket 接続に失敗しました'))
    }, { once: true })
  })
}

function sendWsRequest(socket, payload) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`${payload.method} の応答がタイムアウトしました`))
    }, 60000)
    function cleanup() {
      clearTimeout(timeout)
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('error', onError)
      socket.removeEventListener('close', onClose)
    }
    function onMessage(event) {
      const message = parseWsMessage(event.data)
      if (!message || message.id !== payload.id) return
      cleanup()
      if (message.error) {
        reject(new Error(message.error.message || JSON.stringify(message.error)))
      } else {
        resolve(message)
      }
    }
    function onError() {
      cleanup()
      reject(new Error(`${payload.method} の送信中にWebSocketエラーが発生しました`))
    }
    function onClose() {
      cleanup()
      reject(new Error(`${payload.method} の応答前にWebSocketが閉じました`))
    }
    socket.addEventListener('message', onMessage)
    socket.addEventListener('error', onError)
    socket.addEventListener('close', onClose)
    socket.send(JSON.stringify(payload))
  })
}

function sendWsNotification(socket, payload) {
  socket.send(JSON.stringify(payload))
}

function parseWsMessage(data) {
  try {
    const raw = typeof data === 'string' ? data : Buffer.from(data).toString('utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function checkCodexCli() {
  if (process.env.CODEX_APP_SERVER_SKIP_CLI_CHECK === '1') {
    return { available: null, skipped: true }
  }
  const candidates = uniqueText([process.env.CODEX_CLI_PATH, CODEX_APP_CLI, 'codex'])
  let lastError = null
  for (const command of candidates) {
    try {
      if (command.includes('/')) await access(command)
      const version = await runCli(command, ['--version'])
      let appServerAvailable = false
      try {
        await runCli(command, ['app-server', '--help'])
        appServerAvailable = true
      } catch {
        appServerAvailable = false
      }
      return {
        available: true,
        path: command,
        version: version.trim(),
        appServerAvailable
      }
    } catch (error) {
      lastError = error
    }
  }
  return {
    available: false,
    path: candidates[0] || null,
    appServerAvailable: false,
    error: lastError?.message || 'Codex CLI が見つかりません'
  }
}

async function runCli(command, args) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: REPO_ROOT,
    timeout: 2500,
    maxBuffer: 256 * 1024
  })
  return stdout || stderr || ''
}

async function loadJobStore() {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_CODEX_JOBS_PATH, 'utf8'))
    return {
      version: 1,
      updatedAt: parsed.updatedAt || null,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs.map(normalizeJob) : []
    }
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, updatedAt: null, jobs: [] }
    throw error
  }
}

async function saveJob(job) {
  const store = await loadJobStore()
  const jobs = [
    normalizeJob(job),
    ...store.jobs.filter((item) => item.id !== job.id)
  ].slice(0, 80)
  await mkdir(dirname(LOCAL_CODEX_JOBS_PATH), { recursive: true })
  await writeFile(LOCAL_CODEX_JOBS_PATH, `${JSON.stringify({ version: 1, updatedAt: job.updatedAt || new Date().toISOString(), jobs }, null, 2)}\n`)
}

async function getCodexJob(jobId) {
  const id = String(jobId || '').trim()
  if (!id) return null
  const jobs = await listCodexJobs()
  return jobs.find((job) => job.id === id) || null
}

function normalizeJob(job) {
  const status = JOB_STATUSES.has(job?.status) ? job.status : 'queued'
  return {
    id: String(job?.id || '').trim(),
    type: job?.type || 'gtfs-route-conversion',
    status,
    createdAt: job?.createdAt || null,
    updatedAt: job?.updatedAt || job?.createdAt || null,
    routeId: job?.routeId || null,
    routeStatus: job?.routeStatus || null,
    routeName: job?.routeName || null,
    agencyId: job?.agencyId || null,
    agencyName: job?.agencyName || null,
    sourceDocumentUrl: job?.sourceDocumentUrl || null,
    sourceDocumentTitle: job?.sourceDocumentTitle || null,
    sourcePageUrl: job?.sourcePageUrl || null,
    sourcePageLabel: job?.sourcePageLabel || null,
    route: job?.route || null,
    agency: job?.agency || null,
    draft: job?.draft || null,
    prompt: String(job?.prompt || ''),
    appServerPayload: job?.appServerPayload || null,
    delivery: job?.delivery || {}
  }
}

function readCodexConfig() {
  return {
    serverUrl: process.env.CODEX_APP_SERVER_URL || '',
    token: process.env.CODEX_APP_SERVER_TOKEN || ''
  }
}

function countJobs(jobs) {
  return jobs.reduce((counts, job) => {
    counts[job.status] = (counts[job.status] || 0) + 1
    return counts
  }, {})
}

function buildJobId(routeId, createdAt) {
  const hash = createHash('sha1').update(`${routeId}:${createdAt}`).digest('hex').slice(0, 8)
  const slug = String(routeId || 'route')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  return `gtfs-${createdAt.replace(/[:.]/g, '-')}-${slug || 'route'}-${hash}`
}

function summarizeDraftForJob(draft) {
  return {
    id: draft.id,
    name: draft.name,
    scope: draft.scope,
    updatedAt: draft.updatedAt,
    feedInfo: draft.feedInfo,
    summary: draft.summary
  }
}

function suggestFeedId(route, agency) {
  const sourceId = agency?.source_id || ''
  if (sourceId) return sourceId.replace(/-town$/, '').replace(/-/g, '_')
  const raw = route.route_short_name || route.route_long_name || route.route_id || 'oki_gtfs'
  return raw
    .normalize('NFKD')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'oki_gtfs'
}

function describeTransport(serverUrl) {
  if (!serverUrl) return 'local-queue'
  try {
    const { protocol } = new URL(serverUrl)
    if (SUPPORTED_WS_PROTOCOLS.has(protocol)) return 'websocket'
    if (SUPPORTED_HTTP_PROTOCOLS.has(protocol)) return 'http'
    if (protocol === 'stdio:') return 'stdio'
    if (protocol === 'unix:') return 'unix'
    return protocol.replace(/:$/, '') || 'unknown'
  } catch {
    return 'invalid'
  }
}

function sanitizeServerUrl(serverUrl) {
  try {
    const url = new URL(serverUrl)
    if (url.username) url.username = '***'
    if (url.password) url.password = '***'
    for (const key of ['token', 'access_token', 'key']) {
      if (url.searchParams.has(key)) url.searchParams.set(key, '***')
    }
    return url.toString()
  } catch {
    return String(serverUrl || '')
  }
}

function extractThreadId(response) {
  return response?.result?.thread?.id || response?.thread?.id || null
}

function extractTurnId(response) {
  return response?.result?.turn?.id || response?.turn?.id || null
}

function summarizeJsonRpcResult(response) {
  if (!response) return null
  return {
    id: response.id || null,
    ok: !response.error,
    method: response.method || null,
    hasResult: Boolean(response.result)
  }
}

function uniqueText(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))]
}
