#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildWeeklyOutlook } from '../../src/utils/weeklyOutlook.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_POINTS = resolve(ROOT, 'scripts/forecast/forecast-points.json')
const TIMETABLE = resolve(ROOT, 'gtfs/raw/ferry/oki-kisen-2026.json')
const OFFICIAL_STATUS_URL = 'https://ship.nkk-oki.com/api/status'
const PUBLIC_ENDPOINTS = {
  marine: 'https://marine-api.open-meteo.com/v1/marine',
  wind: 'https://api.open-meteo.com/v1/forecast'
}
const MODELS = {
  marine: ['ecmwf_wam', 'ncep_gfswave025'],
  wind: ['ecmwf_ifs025', 'gfs_seamless']
}
const VARIABLES = {
  marine: ['wave_height', 'wave_direction', 'wave_period'],
  wind: ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m']
}
const TIMEOUT_MS = 15_000
const RETRIES = 2
const CONCURRENCY = 2
const SENSITIVE_KEY = /^(?:api[_-]?key|key|token|access[_-]?token|authorization|password|secret)$/i
const isoNow = () => new Date().toISOString()
const pause = milliseconds => new Promise(resolvePause => setTimeout(resolvePause, milliseconds))

const HELP = `隠岐汽船の週間見通し用データを取得・保存します（Node.js 22.23+）。

使い方:
  node scripts/forecast/collect-weekly-outlook.mjs --evaluation
  node scripts/forecast/collect-weekly-outlook.mjs --input <snapshot-input.json>

オプション:
  --evaluation       Open-Meteoの無料公開APIで評価用に1回だけ取得
  --input <file>     保存済み入力から再計算。通信も認証情報の使用もしません
  --points <file>    試験用代表点JSON（既定: scripts/forecast/forecast-points.json）
  --output <dir>     保存先の親ディレクトリ（既定: output/weekly-outlook）
  --help, -h         この説明を表示

契約済みAPIへの切替:
  OPEN_METEO_API_KEY       契約のAPIキー
  OPEN_METEO_MARINE_URL    契約の海象エンドポイントの完全なHTTPS URL
  OPEN_METEO_WEATHER_URL   契約の気象エンドポイントの完全なHTTPS URL
  3つを環境変数で設定し、--evaluationを付けずに実行してください。
  URLにはクエリ・認証情報を含めません。キーはリクエスト時に付与します。
  --evaluationは公開無料エンドポイント専用で、有料hostには接続しません。

無料APIは非商用・評価用です。商用利用はOpen-Meteoの契約条件を確認してください。
モデルごとに地点を一括取得します（波2モデル・風2モデル、最大2並列）。
期間は日本時間の今日から7日先まで（forecast_days=8）。風はm/sです。
各取得は15秒でタイムアウトし、対象の一時障害のみ最大2回再試行します。
公式status APIは1回だけ取得します。欠測・失敗はnullと理由を保存します。
modelRunAtは取得時刻から推定せずnullとします。自動定期実行は行いません。
原応答・要求条件・取得時刻・snapshot-input.json・outlook.jsonを保存します。
原応答に認証情報が含まれた場合も伏せます。公開時は提供元を表示してください。
API仕様・料金: https://open-meteo.com/en/docs/marine-weather-api
               https://open-meteo.com/en/pricing
`

export function parseArgs (argv) {
  const options = { evaluation: false, help: false, input: null, points: DEFAULT_POINTS, output: resolve(ROOT, 'output/weekly-outlook') }
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') options.help = true
    else if (argument === '--evaluation') options.evaluation = true
    else if (['--input', '--points', '--output', '--output-dir'].includes(argument)) {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new Error(`${argument}にはパスが必要です。`)
      options[argument === '--output-dir' ? 'output' : argument.slice(2)] = resolve(value)
    } else throw new Error(`不明なオプションです: ${argument}`)
  }
  if (options.input && options.evaluation) throw new Error('--inputと--evaluationは同時に指定できません。')
  return options
}

export function validatePoints (config) {
  const points = Array.isArray(config) ? config : config?.points
  if (!Array.isArray(points) || points.length < 3 || points.length > 32) throw new Error('試験用の代表点は3〜32点を指定してください。')
  const identifiers = new Set()
  return points.map((point) => {
    if (!point || typeof point.id !== 'string' || !/^[a-z0-9_-]+$/.test(point.id) || identifiers.has(point.id)) throw new Error('代表点のidは一意な英小文字・数字・ハイフン・アンダースコアにしてください。')
    if (typeof point.name !== 'string' || !point.name.trim()) throw new Error(`代表点${point.id}の名称がありません。`)
    if (!Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90 || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180) throw new Error(`代表点${point.id}の緯度・経度が不正です。`)
    identifiers.add(point.id)
    return { id: point.id, name: point.name, latitude: point.latitude, longitude: point.longitude }
  })
}

function safeUrl (value) {
  const url = new URL(value)
  url.username = ''
  url.password = ''
  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_KEY.test(key)) url.searchParams.delete(key)
  }
  return url.toString()
}

/** Keep credentials out of errors, provider echoes, replay input and saved metadata. */
export function redactSecrets (value, secrets = []) {
  if (Array.isArray(value)) return value.map(item => redactSecrets(item, secrets))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [redactSecrets(key, secrets), SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactSecrets(item, secrets)]))
  }
  if (typeof value !== 'string') return value
  let text = value
  if (/^https?:\/\/\S+$/.test(text)) {
    try { text = safeUrl(text) } catch { /* Keep non-URL text for the redaction below. */ }
  }
  for (const secret of secrets.filter(item => typeof item === 'string' && item.length > 0)) {
    const formEncoded = new URLSearchParams({ value: secret }).toString().slice('value='.length)
    for (const encoded of new Set([secret, encodeURIComponent(secret), formEncoded])) text = text.replaceAll(encoded, '[REDACTED]')
  }
  return text
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@')
    .replace(/([?&](?:api[_-]?key|key|token|access[_-]?token|password|secret)=)[^&\s"'<>]*/gi, '$1[REDACTED]')
    .replace(/("(?:api[_-]?key|token|access[_-]?token|authorization|password|secret)"\s*:\s*")[^"]*(")/gi, '$1[REDACTED]$2')
}

function endpointUrl (endpoint) {
  let url
  try { url = new URL(endpoint) } catch { throw new Error('APIエンドポイントには有効なHTTPS URLを指定してください。') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('APIエンドポイントはクエリ・認証情報・フラグメントを含まないHTTPS URLにしてください。')
  return url
}

export function buildForecastUrl ({ kind, model, points, endpoint = PUBLIC_ENDPOINTS[kind], apiKey = '' }) {
  if (!MODELS[kind]?.includes(model)) throw new Error('未対応の予測モデルです。')
  const url = endpointUrl(endpoint)
  const validated = validatePoints(points)
  const parameters = {
    latitude: validated.map(point => point.latitude).join(','),
    longitude: validated.map(point => point.longitude).join(','),
    models: model,
    hourly: VARIABLES[kind].join(','),
    forecast_days: '8',
    timezone: 'Asia/Tokyo',
    timeformat: 'unixtime',
    cell_selection: 'sea'
  }
  if (kind === 'wind') parameters.wind_speed_unit = 'ms'
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value)
  if (apiKey) url.searchParams.set('apikey', apiKey)
  return url
}

function liveConfiguration (evaluation, env) {
  const apiKey = env.OPEN_METEO_API_KEY?.trim() || ''
  const endpoints = {
    marine: env.OPEN_METEO_MARINE_URL || PUBLIC_ENDPOINTS.marine,
    wind: env.OPEN_METEO_WEATHER_URL || PUBLIC_ENDPOINTS.wind
  }
  for (const endpoint of Object.values(endpoints)) endpointUrl(endpoint)
  const publicHosts = new Set(Object.values(PUBLIC_ENDPOINTS).map(endpoint => new URL(endpoint).hostname))
  const usesPublicHost = Object.values(endpoints).some(endpoint => publicHosts.has(new URL(endpoint).hostname))
  if (evaluation) {
    if (apiKey || Object.entries(endpoints).some(([kind, endpoint]) => endpointUrl(endpoint).toString() !== PUBLIC_ENDPOINTS[kind])) throw new Error('--evaluationでは既定の無料APIを使用します。APIキー・契約用URLの環境変数を外してください。')
  } else if (usesPublicHost || !apiKey || !env.OPEN_METEO_MARINE_URL || !env.OPEN_METEO_WEATHER_URL) {
    throw new Error('無料の試作には--evaluationを指定してください。契約APIにはAPIキーと両エンドポイントの環境変数が必要です。')
  }
  return { apiKey, endpoints }
}

/** Injectable fetch/clock/sleep keep retries and failure handling testable offline. */
export async function fetchJsonSnapshot (requestUrl, {
  fetchImpl = globalThis.fetch,
  timeoutMs = TIMEOUT_MS,
  retries = RETRIES,
  sleep = pause,
  now = isoNow,
  secrets = []
} = {}) {
  if (!Number.isInteger(retries) || retries < 0 || retries > RETRIES) throw new Error('再試行回数は0〜2回です。')
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('timeoutMsは正数にしてください。')
  const sourceUrl = safeUrl(requestUrl)
  const parameters = Object.fromEntries(new URL(sourceUrl).searchParams)
  const attemptHistory = []
  let result
  for (let attempt = 0; attempt <= retries; attempt++) {
    const startedAt = now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let status = null
    let body = null
    let data = null
    let error
    let retry = false
    let retryDelay = 500 * (2 ** attempt)
    try {
      const response = await fetchImpl(requestUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        redirect: 'error'
      })
      status = response.status
      const text = await response.text()
      try { body = JSON.parse(text) } catch { body = text }
      if (!response.ok) {
        error = `HTTP ${response.status}`
        retry = [408, 425, 429].includes(status) || status >= 500
      } else {
        try { data = JSON.parse(text) } catch {
          error = 'レスポンスが有効なJSONではありません。'
          retry = true
        }
        if (data?.error === true) {
          error = typeof data.reason === 'string' ? `API error: ${data.reason}` : 'APIがエラーを返しました。'
          data = null
        }
      }
      const retryAfter = response.headers?.get('retry-after')
      if (retry && retryAfter) {
        const milliseconds = /^\d+(?:\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.parse(now())
        // Do not retry earlier than requested, or block this one-shot job for long periods.
        if (Number.isFinite(milliseconds) && milliseconds > 5000) retry = false
        else if (Number.isFinite(milliseconds)) retryDelay = Math.max(retryDelay, milliseconds)
      }
    } catch (caught) {
      error = controller.signal.aborted ? `タイムアウト（${timeoutMs}ms）` : (caught instanceof Error ? caught.message : '通信エラー')
      retry = true
    } finally {
      clearTimeout(timer)
    }
    const fetchedAt = now()
    attemptHistory.push({ attempt: attempt + 1, startedAt, fetchedAt, httpStatus: status, ...(error ? { error } : {}) })
    result = {
      sourceUrl,
      fetchedAt,
      data: error ? null : data,
      ...(error ? { error } : {}),
      transport: { parameters, httpStatus: status, attempts: attempt + 1, attemptHistory, responseBody: body }
    }
    if (!error || !retry || attempt === retries) break
    await sleep(retryDelay)
  }
  return redactSecrets(result, secrets)
}

function normalizeDate (value) {
  if (typeof value !== 'string' || !/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(value)) throw new Error('時刻表の日付が不正です。')
  const normalized = value.replaceAll('/', '-')
  if (!Number.isFinite(Date.parse(normalized)) || new Date(normalized).toISOString().slice(0, 10) !== normalized) throw new Error('時刻表の日付が不正です。')
  return normalized
}

export function buildCalendar (timetable) {
  if (!Array.isArray(timetable?.schedules) || timetable.schedules.length === 0) throw new Error('時刻表にschedulesがありません。')
  const ranges = timetable.schedules.map((schedule) => {
    const start = normalizeDate(schedule.start_date)
    const end = normalizeDate(schedule.end_date)
    if (start > end) throw new Error('時刻表の開始日が終了日より後です。')
    return { start, end }
  })
  return {
    coverageStart: ranges.map(range => range.start).sort()[0],
    coverageEnd: ranges.map(range => range.end).sort().at(-1),
    schedules: timetable.schedules,
    suspensions: [{
      mode: 'rainbowjet',
      startDate: '2026-12-01',
      endDate: '2027-02-28',
      reason: 'ドック整備',
      sourceUrl: 'https://www.oki-kisen.co.jp/files/original/202611111303087864c7b17dc.pdf'
    }]
  }
}

async function mapConcurrent (items, worker) {
  const results = new Array(items.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await worker(items[index])
    }
  }))
  return results
}

async function saveJson (path, value, secrets = []) {
  await writeFile(path, `${JSON.stringify(redactSecrets(value, secrets), null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
}

function inputSnapshot (result, model) {
  return {
    ...(model ? { model, modelRunAt: null } : {}),
    fetchedAt: result.fetchedAt,
    sourceUrl: result.sourceUrl,
    data: result.data,
    ...(result.error ? { error: result.error } : {})
  }
}

export async function main (argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv)
  if (options.help) {
    console.log(HELP)
    return
  }
  const createdAt = isoNow()
  const snapshotId = `${createdAt.replaceAll(':', '-').replaceAll('.', '-')}-${randomUUID().slice(0, 8)}`
  const snapshotDirectory = resolve(options.output, snapshotId)
  const secrets = [env.OPEN_METEO_API_KEY?.trim() || '']
  let input
  let manifest
  if (options.input) {
    input = redactSecrets(JSON.parse(await readFile(options.input, 'utf8')), secrets)
    validatePoints(input.points)
    if (!Number.isFinite(Date.parse(input.collectedAt)) || !Array.isArray(input.marine) || !Array.isArray(input.wind) || !input.official || !input.calendar) throw new Error('保存済み入力の形式が不正です。')
    await mkdir(snapshotDirectory, { recursive: true })
    manifest = { schemaVersion: 1, snapshotId, mode: 'replay', createdAt, collectedAt: input.collectedAt, replaySource: options.input, requests: [] }
  } else {
    const configuration = liveConfiguration(options.evaluation, env)
    const [pointConfig, timetable] = await Promise.all([
      readFile(options.points, 'utf8').then(JSON.parse),
      readFile(TIMETABLE, 'utf8').then(JSON.parse)
    ])
    const points = validatePoints(pointConfig)
    const calendar = buildCalendar(timetable)
    await mkdir(resolve(snapshotDirectory, 'raw'), { recursive: true })
    const collectionStartedAt = isoNow()
    const requests = Object.entries(MODELS).flatMap(([kind, models]) => models.map(model => ({
      kind,
      model,
      id: `${kind}-${model}`,
      url: buildForecastUrl({ kind, model, points, endpoint: configuration.endpoints[kind], apiKey: configuration.apiKey })
    })))
    requests.push({ kind: 'official', id: 'official-status', url: new URL(OFFICIAL_STATUS_URL) })
    const results = await mapConcurrent(requests, async (request) => {
      const result = await fetchJsonSnapshot(request.url, { retries: request.kind === 'official' ? 0 : RETRIES, secrets })
      const rawFile = `raw/${request.id}.json`
      await saveJson(resolve(snapshotDirectory, rawFile), {
        kind: request.kind,
        ...inputSnapshot(result, request.model),
        request: { method: 'GET', parameters: result.transport.parameters },
        ...result.transport
      }, secrets)
      const { responseBody, ...transport } = result.transport
      return { request, result, record: { kind: request.kind, ...(request.model ? { model: request.model, modelRunAt: null } : {}), sourceUrl: result.sourceUrl, fetchedAt: result.fetchedAt, rawFile, ...transport, ...(result.error ? { error: result.error } : {}) } }
    })
    const collectedAt = isoNow()
    input = {
      collectedAt,
      points,
      marine: results.filter(item => item.request.kind === 'marine').map(item => inputSnapshot(item.result, item.request.model)),
      wind: results.filter(item => item.request.kind === 'wind').map(item => inputSnapshot(item.result, item.request.model)),
      official: inputSnapshot(results.find(item => item.request.kind === 'official').result),
      calendar
    }
    await saveJson(resolve(snapshotDirectory, 'points.json'), pointConfig)
    manifest = {
      schemaVersion: 1,
      snapshotId,
      mode: options.evaluation ? 'evaluation' : 'licensed',
      createdAt,
      collectionStartedAt,
      collectedAt,
      timezone: 'Asia/Tokyo',
      requestPolicy: { timeoutMs: TIMEOUT_MS, retries: RETRIES, officialRetries: 0, concurrency: CONCURRENCY },
      requests: results.map(item => item.record),
      timetable: { path: 'gtfs/raw/ferry/oki-kisen-2026.json', source: timetable.source, additionalSources: timetable.additional_sources, coverageStart: calendar.coverageStart, coverageEnd: calendar.coverageEnd },
      pointNote: pointConfig.note || '試験用代表点。実航路・港内を代表することは未検証です。',
      attribution: ['Open-Meteo', 'ECMWF', 'NOAA NCEP', '隠岐汽船株式会社', '隠岐広域連合 船舶運航状況API'],
      documentation: ['https://open-meteo.com/en/docs/marine-weather-api', 'https://open-meteo.com/en/docs', 'https://open-meteo.com/en/pricing', 'docs/status-api/api-status.md']
    }
  }
  // Persist the complete input before computing so failures remain reproducible.
  await saveJson(resolve(snapshotDirectory, 'snapshot-input.json'), input, secrets)
  try {
    const outlook = buildWeeklyOutlook(input)
    await saveJson(resolve(snapshotDirectory, 'outlook.json'), outlook, secrets)
  } catch (error) {
    await saveJson(resolve(snapshotDirectory, 'manifest.json'), { ...manifest, computationError: error instanceof Error ? error.message : '見通しの計算に失敗しました。' }, secrets)
    throw error
  }
  await saveJson(resolve(snapshotDirectory, 'manifest.json'), manifest, secrets)
  const failures = manifest.requests.filter(request => request.error).length
  console.log(`保存先: ${snapshotDirectory}`)
  if (options.input) console.log('保存済み入力から再計算しました（通信なし）。')
  else console.log(`取得結果: ${manifest.requests.length - failures}件成功、${failures}件失敗（失敗は欠測として保存）。`)
  return { snapshotDirectory, input, manifest }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(redactSecrets(error instanceof Error ? error.message : '処理に失敗しました。', [process.env.OPEN_METEO_API_KEY?.trim() || '']))
    process.exitCode = 1
  })
}
