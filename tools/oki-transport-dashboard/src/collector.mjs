import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { SOURCES } from './sources.mjs'
import { recordChangeHistory } from './changeHistory.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const execFileAsync = promisify(execFile)
const ROOT_DIR = join(__dirname, '..')
const SNAPSHOT_DIR = join(ROOT_DIR, 'data', 'snapshots')
const DOWNLOAD_DIR = join(ROOT_DIR, 'data', 'downloads')
const LATEST_SNAPSHOT_PATH = join(SNAPSHOT_DIR, 'latest.json')
const USER_AGENT = 'FerryTransit Oki source dashboard/0.1 (+local maintainer tool)'
const REQUEST_TIMEOUT_MS = Number(process.env.OKI_DASHBOARD_TIMEOUT_MS || 18000)
const MAX_DOWNLOAD_BYTES = Number(process.env.OKI_DASHBOARD_MAX_DOWNLOAD_BYTES || 40 * 1024 * 1024)

const DOCUMENT_EXTENSIONS = new Set(['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'])
const TEXT_CONTENT_TYPES = ['text/html', 'text/plain', 'application/xhtml+xml', 'application/xml', 'text/xml']
const HTML_DOCUMENT_ROLES = new Set(['timetable', 'fare', 'status'])

export { SOURCES, ROOT_DIR, SNAPSHOT_DIR, DOWNLOAD_DIR, LATEST_SNAPSHOT_PATH }

export async function collectAll(options = {}) {
  const startedAt = new Date()
  const previous = await loadLatestSnapshot()
  const previousIndex = buildPreviousIndex(previous)

  const sourceResults = await Promise.all(
    SOURCES.map((source) => collectSource(source, previousIndex, options))
  )

  const documents = sourceResults.flatMap((source) => source.documents)
  const notices = sourceResults.flatMap((source) => source.notices)
  const pages = sourceResults.flatMap((source) => source.pages)
  const downloaded = options.download ? await downloadDocuments(documents, startedAt) : []

  const summary = buildSummary(sourceResults, documents, notices, pages, startedAt)
  const snapshot = {
    version: 1,
    collectedAt: startedAt.toISOString(),
    elapsedMs: Date.now() - startedAt.getTime(),
    persisted: Boolean(options.save),
    downloaded: downloaded.length,
    summary,
    sources: sourceResults,
    documents,
    notices,
    pages,
    downloads: downloaded
  }

  if (options.save) {
    await saveSnapshot(snapshot, startedAt)
    const history = await recordChangeHistory(snapshot, previousIndex)
    snapshot.history = history
  }

  return snapshot
}

export async function loadLatestSnapshot() {
  try {
    return JSON.parse(await readFile(LATEST_SNAPSHOT_PATH, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function collectSource(source, previousIndex, options) {
  const pageResults = await Promise.all(source.pages.map((page) => collectPage(source, page, previousIndex, options)))
  const okPages = pageResults.filter((page) => page.status === 'ok').length
  const failedPages = pageResults.length - okPages
  const documents = dedupeByUrl(pageResults.flatMap((page) => page.documents)).map((document) => ({
    ...document,
    sourceId: source.id,
    sourceName: source.name,
    group: source.group,
    changeStatus: getDocumentChangeStatus(document, previousIndex)
  }))
  const notices = dedupeNotices(pageResults.flatMap((page) => page.notices)).map((notice) => ({
    ...notice,
    sourceId: source.id,
    sourceName: source.name,
    group: source.group,
    changeStatus: getNoticeChangeStatus(notice, previousIndex)
  }))

  const keywordHits = collectKeywordHits(source, pageResults)
  const pageChanged = pageResults.some((page) => page.changeStatus === 'changed' || page.changeStatus === 'new')
  const documentChanged = documents.some((document) => document.changeStatus === 'changed' || document.changeStatus === 'new')
  const status = okPages === pageResults.length ? 'ok' : okPages > 0 ? 'warning' : 'error'

  return {
    id: source.id,
    name: source.name,
    group: source.group,
    operator: source.operator,
    officialUrl: source.officialUrl,
    area: source.area,
    status,
    okPages,
    failedPages,
    pageChanged,
    documentChanged,
    keywordHits,
    counts: {
      pages: pageResults.length,
      documents: documents.length,
      notices: notices.length,
      timetables: documents.filter((document) => document.type === 'timetable').length,
      fares: documents.filter((document) => document.type === 'fare').length
    },
    updatedText: pageResults.map((page) => page.updatedText).find(Boolean) || null,
    lastModified: mostRecent(pageResults.map((page) => page.lastModified)),
    pages: pageResults,
    documents,
    notices
  }
}

async function collectPage(source, page, previousIndex, options = {}) {
  const collectedAt = new Date().toISOString()
  try {
    const response = await fetchResource(page.url, page)
    const text = response.text || ''
    const links = response.isText ? extractLinksFromHtml(text, page.url) : []
    const discoveredFiles = response.isText ? extractStandaloneFileUrls(text, page.url) : []
    const allLinks = mergeLinks(links, discoveredFiles)
    const normalizedLinkDocuments = allLinks
      .map((link) => normalizeDocumentLink(link, source, page))
      .filter(Boolean)
    const linkDocuments = options.fingerprintDocuments === false
      ? normalizedLinkDocuments
      : await fingerprintDocuments(normalizedLinkDocuments)
    const fingerprintErrors = linkDocuments.filter(document => document.fingerprintError)
    const notices = extractNotices(text, page, page.url)
    const title = response.isText ? extractTitle(text) : filenameFromUrl(page.url)
    const updatedText = response.isText ? extractUpdatedText(text) : null
    const pageHash = response.hash
    const htmlDocument = response.isText ? normalizeHtmlPageDocument(text, page, response, title, updatedText) : null
    const documents = htmlDocument ? [htmlDocument, ...linkDocuments] : linkDocuments
    const changeStatus = getPageChangeStatus(source.id, page.url, pageHash, previousIndex)

    return {
      sourceId: source.id,
      sourceName: source.name,
      role: page.role,
      label: page.label,
      url: page.url,
      status: response.ok && fingerprintErrors.length === 0 ? 'ok' : 'warning',
      statusCode: response.status,
      contentType: response.contentType,
      title,
      collectedAt,
      lastModified: response.lastModified,
      etag: response.etag,
      sizeBytes: response.sizeBytes,
      hash: pageHash,
      shortHash: pageHash.slice(0, 12),
      changeStatus,
      updatedText,
      keywordHits: countKeywords(text, source.expectedKeywords),
      documents,
      notices,
      error: !response.ok
        ? `HTTP ${response.status}`
        : fingerprintErrors.length
          ? `資料ハッシュ取得失敗: ${fingerprintErrors.map(document => document.title).join(', ')}`
          : null
    }
  } catch (error) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      role: page.role,
      label: page.label,
      url: page.url,
      status: 'error',
      statusCode: null,
      contentType: null,
      title: null,
      collectedAt,
      lastModified: null,
      etag: null,
      sizeBytes: 0,
      hash: null,
      shortHash: null,
      changeStatus: 'unknown',
      updatedText: null,
      keywordHits: {},
      documents: [],
      notices: [],
      error: error.message
    }
  }
}

async function fingerprintDocuments(documents) {
  const results = []
  for (const document of documents) {
    try {
      const response = await fetchResource(document.url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      results.push({
        ...document,
        hash: response.hash,
        shortHash: response.hash.slice(0, 12),
        sizeBytes: response.sizeBytes,
        contentType: response.contentType,
        fingerprintedAt: new Date().toISOString(),
        fingerprintError: null
      })
    } catch (error) {
      results.push({
        ...document,
        hash: null,
        shortHash: null,
        sizeBytes: null,
        fingerprintedAt: new Date().toISOString(),
        fingerprintError: error.message
      })
    }
  }
  return results
}

async function fetchResource(url, options = {}) {
  if (options.fetchStrategy === 'curl') {
    return fetchResourceWithCurl(url)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/pdf,image/*,*/*;q=0.8'
      }
    })
    const arrayBuffer = await readBoundedResponse(response, MAX_DOWNLOAD_BYTES)
    const buffer = Buffer.from(arrayBuffer)
    const contentType = response.headers.get('content-type') || ''
    const isText = TEXT_CONTENT_TYPES.some((type) => contentType.toLowerCase().includes(type))
    return {
      ok: response.ok,
      url: response.url,
      status: response.status,
      contentType,
      lastModified: response.headers.get('last-modified'),
      etag: response.headers.get('etag'),
      sizeBytes: buffer.length,
      hash: sha256(buffer),
      text: isText ? decodeText(buffer) : null,
      buffer,
      isText
    }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchResourceWithCurl(url) {
  const timeoutSeconds = Math.max(1, Math.ceil(REQUEST_TIMEOUT_MS / 1000))
  const { stdout } = await execFileAsync('curl', [
    '-L',
    '-sS',
    '--max-time',
    String(timeoutSeconds),
    '--max-filesize',
    String(MAX_DOWNLOAD_BYTES),
    '-A',
    USER_AGENT,
    '-H',
    'accept: text/html,application/xhtml+xml,application/pdf,image/*,*/*;q=0.8',
    '-D',
    '-',
    '--url',
    url
  ], {
    encoding: 'buffer',
    maxBuffer: MAX_DOWNLOAD_BYTES + 1024 * 1024
  })

  return parseCurlResponse(stdout, url)
}

function parseCurlResponse(stdout, url) {
  const separator = Buffer.from('\r\n\r\n')
  const splitIndex = stdout.lastIndexOf(separator)
  if (splitIndex < 0) {
    throw new Error('curl のレスポンスヘッダーを解析できませんでした')
  }

  const headerText = stdout.subarray(0, splitIndex).toString('utf8')
  const headers = parseCurlHeaders(headerText)
  const buffer = stdout.subarray(splitIndex + separator.length)
  const contentType = headers.get('content-type') || ''
  const isText = TEXT_CONTENT_TYPES.some((type) => contentType.toLowerCase().includes(type))

  return {
    ok: headers.status >= 200 && headers.status < 300,
    url,
    status: headers.status,
    contentType,
    lastModified: headers.get('last-modified'),
    etag: headers.get('etag'),
    sizeBytes: buffer.length,
    hash: sha256(buffer),
    text: isText ? decodeText(buffer) : null,
    buffer,
    isText
  }
}

function parseCurlHeaders(headerText) {
  const blocks = headerText
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
  const finalBlock = [...blocks].reverse().find((block) => /^HTTP\//i.test(block))
  if (!finalBlock) {
    throw new Error('curl の最終レスポンスヘッダーを解析できませんでした')
  }

  const lines = finalBlock.split(/\r?\n/)
  const status = Number(lines[0].match(/^HTTP\/\S+\s+(\d+)/i)?.[1])
  if (!Number.isInteger(status)) {
    throw new Error(`curl のステータスコードを解析できませんでした: ${lines[0]}`)
  }

  const values = new Map()
  for (const line of lines.slice(1)) {
    const index = line.indexOf(':')
    if (index <= 0) continue
    values.set(line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim())
  }

  return {
    status,
    get(name) {
      return values.get(String(name).toLowerCase()) || null
    }
  }
}

async function readBoundedResponse(response, maxBytes) {
  if (!response.body) return response.arrayBuffer()
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      throw new Error(`レスポンスが上限を超えました (${formatBytes(total)} > ${formatBytes(maxBytes)})`)
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged.buffer
}

function decodeText(buffer) {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

export function extractLinksFromHtml(html, baseUrl) {
  const links = []
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  let match
  while ((match = anchorPattern.exec(html))) {
    const attrs = parseAttributes(match[1])
    if (!attrs.href) continue
    const href = normalizeUrl(attrs.href, baseUrl)
    if (!href) continue
    const context = cleanText(stripTags(html.slice(Math.max(0, match.index - 500), match.index + 500)))
    const text = cleanText([stripTags(match[2]), attrs.title, attrs['aria-label'], extractImageAlt(match[2])].filter(Boolean).join(' '))
    links.push({
      url: href,
      text: text || filenameFromUrl(href),
      title: attrs.title || null,
      context,
      source: 'anchor'
    })
  }
  return dedupeByUrl(links)
}

export function extractStandaloneFileUrls(html, baseUrl) {
  const matches = []
  const filePattern = /["']([^"']+\.(?:pdf|PDF|xls|xlsx|doc|docx|jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/g
  let match
  while ((match = filePattern.exec(html))) {
    const url = normalizeUrl(match[1], baseUrl)
    if (!url) continue
    const context = cleanText(stripTags(html.slice(Math.max(0, match.index - 600), match.index + 600)))
    matches.push({
      url,
      text: filenameFromUrl(url),
      title: null,
      context,
      source: 'file'
    })
  }
  return dedupeByUrl(matches)
}

function extractNotices(html, page, baseUrl) {
  if (!html || page.role !== 'notices') return []
  return extractLinksFromHtml(html, baseUrl)
    .filter((link) => isLikelyNotice(link.text, link.url))
    .slice(0, 30)
    .map((link) => ({
      title: link.text,
      url: link.url,
      dateText: extractJapaneseDate(link.text) || extractYearMonthDayFromUrl(link.url),
      type: 'notice'
    }))
}

function normalizeDocumentLink(link, source, page) {
  const extension = extname(new URL(link.url).pathname).toLowerCase()
  if (!DOCUMENT_EXTENSIONS.has(extension)) return null
  if (isIgnorableAsset(link.url)) return null
  const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
  const text = cleanText(link.text || filenameFromUrl(link.url))
  const context = link.context || ''
  const shouldUseContext = link.source === 'file' || isGenericLinkText(text)
  const usefulValue = shouldUseContext ? `${text} ${context}` : text
  const typeValue = shouldUseContext ? `${text} ${context}` : text
  const classifiedType = classifyResourceType(typeValue, link.url, page.role)
  const hasUsefulText = /時刻|時刻表|運賃|料金|ダイヤ|路線バス|町営バス|連絡バス|接続バス|空港連絡|デマンドタクシー|タクシー|停留所|マップ|令和|R\d|いそかぜ|どうぜん/i.test(usefulValue)
  const pathIsUseful = /timetable|jikoku|rosen|fare|fee|goka|seibu|sinnryoujo|sougou|demando|isokaze|douzen|unchin|route-time/i.test(new URL(link.url).pathname.toLowerCase())

  if (isImage && !source.includeImageDocuments) return null
  if (!hasUsefulText && !pathIsUseful) return null

  return {
    type: classifiedType,
    title: text || filenameFromUrl(link.url),
    url: link.url,
    extension: extension.replace('.', ''),
    pageRole: page.role,
    pageLabel: page.label,
    pageUrl: page.url,
    dateText: extractJapaneseDate(text) || extractYearMonthDayFromUrl(link.url),
    sourceHint: link.source
  }
}

export function normalizeHtmlPageDocument(html, page, response = {}, title = null, updatedText = null) {
  if (!isLikelyHtmlDocument(html, page)) return null
  const url = response.url || page.url
  const text = cleanText(stripTags(html))
  const classifiedType = classifyResourceType(`${title || ''} ${page.label || ''} ${text.slice(0, 1200)}`, url, page.role)
  return {
    type: classifiedType,
    title: title || page.label || filenameFromUrl(url),
    url,
    extension: 'html',
    pageRole: page.role,
    pageLabel: page.label,
    pageUrl: page.url,
    dateText: updatedText ? extractJapaneseDate(updatedText) : extractYearMonthDayFromUrl(url),
    sourceHint: 'html',
    contentType: response.contentType || null,
    sizeBytes: response.sizeBytes || 0,
    hash: response.hash || null,
    shortHash: response.hash ? response.hash.slice(0, 12) : null
  }
}

function isLikelyHtmlDocument(html, page) {
  if (!html || !HTML_DOCUMENT_ROLES.has(page.role)) return false
  const text = cleanText(stripTags(html))
  const tableCount = (html.match(/<table\b/gi) || []).length
  const hasDocumentKeyword = /時刻表|運賃表|料金表|運航状況|運航計画|ダイヤ|路線バス|空港連絡バス|接続バス|フライト情報|就航路線|出発便|到着便/.test(text)

  if (!hasDocumentKeyword) return false
  if (page.role === 'status') return /運航状況|欠航|運休|休航|運航/.test(text)
  return tableCount > 0 || /route-time|timetable|jikoku|fare|unchin/i.test(page.url)
}

function isGenericLinkText(text) {
  return /^(?:|pdf|pdfファイル|▶\s*)?(?:詳細PDFを開く|詳細pdfを開く|PDFを開く|pdfを開く|コチラ|こちら|ここ|ダウンロード|ダウンロード\(PDF\)|PDF|pdf)$/i.test(cleanText(text))
}

function isIgnorableAsset(url) {
  const value = url.toLowerCase()
  return /(?:logo|favicon|cropped-|ogp_noimage|theme-logo|footer-logo|header_logo|sp_header_logo|pc_header_logo|noscript|search|pagetop|pdf\.png|images\/pdf\.png|get_adobe_reader|icon_|ico_|headersize_|headercolor_|smartphone|menu_btn|btn_|tt-eng)/.test(value)
}

export function classifyResourceType(text = '', url = '', pageRole = 'other') {
  let path = ''
  try {
    path = new URL(url).pathname
  } catch {
    path = url
  }
  const value = `${text} ${path}`.toLowerCase()
  if (/時刻|ダイヤ|フライト|就航路線|出発便|到着便|運航計画|timetable|schedule|flight|jikoku|rosen|route-time|sougoujikoku|isokaze|douzen|goka|seibu|sinnryoujo|bus/.test(value)) return 'timetable'
  if (/運賃表|料金表|fare|fee|unchin|price/.test(value)) return 'fare'
  if (/運航状況|situation|status|欠航|運休|休航/.test(value)) return 'status'
  if (/停留所|マップ|map|乗り場|乗場/.test(value)) return 'map'
  if (/運賃|料金/.test(value)) return 'fare'
  if (/お知らせ|ニュース|news|公開|改定|キャンペーン/.test(value)) return 'notice'
  if (pageRole === 'timetable' || pageRole === 'fare' || pageRole === 'status') return pageRole
  return 'other'
}

export function extractJapaneseDate(text = '') {
  const normalized = toHalfWidth(text)
  const patterns = [
    /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/,
    /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/,
    /令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/,
    /R\s*(\d{1,2})[_.-]?(\d{1,2})[_.-]?(\d{1,2})/i
  ]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (!match) continue
    if (pattern.source.startsWith('(\\d{4})')) return toIsoDate(match[1], match[2], match[3])
    const year = 2018 + Number(match[1])
    return toIsoDate(year, match[2], match[3])
  }
  const eraYearMatch = normalized.match(/令和\s*(\d{1,2})年/)
  if (eraYearMatch) return `${2018 + Number(eraYearMatch[1])}年`
  return null
}

function extractYearMonthDayFromUrl(url) {
  const value = safeDecodeURIComponent(url)
  const compact = value.match(/(?:^|[^\d])((?:20)\d{2})(\d{2})(\d{2})(?:[^\d]|$)/)
  if (compact) return toIsoDate(compact[1], compact[2], compact[3])
  return extractJapaneseDate(value)
}

function extractUpdatedText(html) {
  const text = cleanText(stripTags(html))
  const match = text.match(/更新日[:：]\s*([0-9０-９]{4}年\s*[0-9０-９]{1,2}月\s*[0-9０-９]{1,2}日|[0-9０-９]{4}[./-][0-9０-９]{1,2}[./-][0-9０-９]{1,2})/)
  return match ? match[0] : null
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? cleanText(decodeHtmlEntities(match[1])) : null
}

function parseAttributes(input) {
  const attrs = {}
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  let match
  while ((match = attrPattern.exec(input))) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '')
  }
  return attrs
}

function extractImageAlt(html) {
  const values = []
  const imagePattern = /<img\b([^>]*)>/gi
  let match
  while ((match = imagePattern.exec(html))) {
    const attrs = parseAttributes(match[1])
    if (attrs.alt) values.push(attrs.alt)
    if (attrs.title) values.push(attrs.title)
  }
  return values.join(' ')
}

function normalizeUrl(href, baseUrl) {
  const trimmed = href.trim()
  if (!trimmed || /^(javascript:|mailto:|tel:|#)/i.test(trimmed)) return null
  if (/\[%.*?%]/.test(trimmed)) return null
  try {
    const url = new URL(trimmed, baseUrl)
    url.hash = url.hash && url.pathname === new URL(baseUrl).pathname ? url.hash : url.hash
    return url.href
  } catch {
    return null
  }
}

function mergeLinks(...groups) {
  return dedupeByUrl(groups.flat())
}

function isLikelyNotice(text, url) {
  const value = `${text} ${url}`
  if (/^(ホーム|お問い合わせ|サイトマップ|アクセス|本文へ|Skip to content)$/i.test(text)) return false
  return /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|令和|お知らせ|ニュース|news|欠航|運休|休航|公開|改定|キャンペーン|募集|ドック|変更)/i.test(value)
}

function buildPreviousIndex(previous) {
  const pages = new Map()
  const documents = new Map()
  const notices = new Map()
  if (!previous) return { pages, documents, notices }
  for (const page of previous.pages || []) {
    pages.set(`${page.sourceId}:${page.url}`, page)
  }
  for (const document of previous.documents || []) {
    documents.set(document.url, document)
  }
  for (const notice of previous.notices || []) {
    notices.set(`${notice.url}:${notice.title}`, notice)
  }
  return { pages, documents, notices }
}

function getPageChangeStatus(sourceId, pageUrl, hash, previousIndex) {
  if (!hash) return 'unknown'
  const previous = previousIndex.pages.get(`${sourceId}:${pageUrl}`)
  if (!previous) return 'new'
  return previous.hash === hash ? 'unchanged' : 'changed'
}

export function getDocumentChangeStatus(document, previousIndex) {
  const previous = previousIndex.documents.get(document.url)
  if (!previous) return 'new'
  if (document.hash && previous.hash && document.hash !== previous.hash) return 'changed'
  return previous.title === document.title && previous.type === document.type ? 'unchanged' : 'changed'
}

function getNoticeChangeStatus(notice, previousIndex) {
  return previousIndex.notices.has(`${notice.url}:${notice.title}`) ? 'unchanged' : 'new'
}

function buildSummary(sources, documents, notices, pages, startedAt) {
  const changedDocuments = documents.filter((document) => document.changeStatus === 'changed' || document.changeStatus === 'new').length
  const changedPages = pages.filter((page) => page.changeStatus === 'changed' || page.changeStatus === 'new').length
  const errors = pages.filter((page) => page.status === 'error')
  return {
    collectedAt: startedAt.toISOString(),
    sourceCount: sources.length,
    okSources: sources.filter((source) => source.status === 'ok').length,
    warningSources: sources.filter((source) => source.status === 'warning').length,
    errorSources: sources.filter((source) => source.status === 'error').length,
    pageCount: pages.length,
    changedPages,
    documentCount: documents.length,
    timetableCount: documents.filter((document) => document.type === 'timetable').length,
    fareCount: documents.filter((document) => document.type === 'fare').length,
    statusCount: documents.filter((document) => document.type === 'status').length,
    changedDocuments,
    noticeCount: notices.length,
    newNotices: notices.filter((notice) => notice.changeStatus === 'new').length,
    errorCount: errors.length,
    errors: errors.map((page) => ({ sourceName: page.sourceName, label: page.label, url: page.url, error: page.error }))
  }
}

async function downloadDocuments(documents, startedAt) {
  const day = startedAt.toISOString().slice(0, 10)
  const downloaded = []
  for (const document of documents) {
    try {
      const response = await fetchResource(document.url)
      if (!response.ok) {
        downloaded.push({ ...document, status: 'error', error: `HTTP ${response.status}` })
        continue
      }
      const extension = extname(new URL(document.url).pathname).toLowerCase() || `.${document.extension || 'bin'}`
      const safeSource = sanitizeFileName(document.sourceId || 'source')
      const safeTitle = sanitizeFileName(document.title || filenameFromUrl(document.url)).slice(0, 90)
      const fileName = `${safeTitle}-${response.hash.slice(0, 10)}${extension}`
      const relativePath = join('data', 'downloads', day, safeSource, document.type, fileName)
      const absolutePath = join(ROOT_DIR, relativePath)
      await mkdir(dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, response.buffer)
      downloaded.push({
        ...document,
        status: 'ok',
        hash: response.hash,
        shortHash: response.hash.slice(0, 12),
        sizeBytes: response.sizeBytes,
        localPath: relativePath
      })
    } catch (error) {
      downloaded.push({ ...document, status: 'error', error: error.message })
    }
  }
  return downloaded
}

async function saveSnapshot(snapshot, startedAt) {
  await mkdir(SNAPSHOT_DIR, { recursive: true })
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-')
  const body = JSON.stringify(snapshot, null, 2)
  await writeFile(join(SNAPSHOT_DIR, `${stamp}.json`), body)
  await writeFile(LATEST_SNAPSHOT_PATH, body)
}

function collectKeywordHits(source, pages) {
  const hits = {}
  for (const keyword of source.expectedKeywords || []) {
    hits[keyword] = pages.reduce((sum, page) => sum + (page.keywordHits?.[keyword] || 0), 0)
  }
  return hits
}

function countKeywords(text, keywords = []) {
  const result = {}
  for (const keyword of keywords) {
    const pattern = new RegExp(escapeRegExp(keyword), 'g')
    result[keyword] = (text.match(pattern) || []).length
  }
  return result
}

function dedupeByUrl(items) {
  const seen = new Set()
  const result = []
  for (const item of items) {
    if (!item?.url || seen.has(item.url)) continue
    seen.add(item.url)
    result.push(item)
  }
  return result
}

function dedupeNotices(items) {
  const seen = new Set()
  const result = []
  for (const item of items) {
    const key = `${item.url}:${item.title}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function mostRecent(values) {
  const dates = values.filter(Boolean).map((value) => {
    const time = Date.parse(value)
    return Number.isFinite(time) ? { value, time } : null
  }).filter(Boolean)
  dates.sort((a, b) => b.time - a.time)
  return dates[0]?.value || null
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function stripTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
}

function cleanText(text) {
  return decodeHtmlEntities(String(text || ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&yen;/g, '円')
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
}

function filenameFromUrl(url) {
  const pathname = new URL(url).pathname
  const name = pathname.split('/').filter(Boolean).pop() || new URL(url).hostname
  return safeDecodeURIComponent(name)
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function sanitizeFileName(value) {
  return String(value || 'file')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#%&{}$!`'@+=]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file'
}

function toHalfWidth(value) {
  return String(value || '').replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
}

function toIsoDate(year, month, day) {
  const y = String(year).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
