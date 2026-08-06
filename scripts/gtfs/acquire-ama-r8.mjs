#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { loadTransportSourceRegistry } from '../lib/transport-source-registry.mjs'

const ROOT = process.cwd()
const USER_AGENT = 'FerryTransit source acquisition/1.0'

export function extractDocumentLinks(html, baseUrl) {
  const links = new Set()
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)) {
    const href = (match[1] || match[2] || match[3] || '').replaceAll('&amp;', '&')
    try {
      links.add(new URL(href, baseUrl).href)
    } catch {}
  }
  return links
}

export function extractUpdatedDate(html) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const match = text.match(/更新日[:：]\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/)
  if (!match) return null
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

export function validateOfficialPage(html, source) {
  const links = extractDocumentLinks(html, source.sourceUrl)
  const updatedAt = extractUpdatedDate(html)
  if (!updatedAt) throw new Error('海士町公式ページの更新日を取得できませんでした')
  if (updatedAt > source.officialPageUpdatedAt) {
    throw new Error(`海士町公式ページに未反映の更新があります: adopted=${source.officialPageUpdatedAt}, official=${updatedAt}`)
  }
  for (const document of source.sourceDocuments || []) {
    if (!links.has(document.url)) {
      throw new Error(`採用中の公式PDFがアクセス・交通ページから外れています: ${document.url}`)
    }
  }
  return { updatedAt, links: [...links] }
}

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex')
}

async function fetchBuffer(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { 'user-agent': USER_AGENT } })
  if (!response.ok) throw new Error(`公式資料の取得に失敗しました: ${url} HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

function writeAtomic(filePath, contents) {
  mkdirSync(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp-${process.pid}`
  writeFileSync(temporaryPath, contents)
  renameSync(temporaryPath, filePath)
}

export async function acquireAmaSources({ root = ROOT, fetchImpl = fetch, writeFiles = true } = {}) {
  const source = loadTransportSourceRegistry(root).feedById.ama
  const pageResponse = await fetchImpl(source.sourceUrl, { headers: { 'user-agent': USER_AGENT } })
  if (!pageResponse.ok) throw new Error(`海士町公式ページの取得に失敗しました: HTTP ${pageResponse.status}`)
  const page = validateOfficialPage(await pageResponse.text(), source)
  const documents = []

  for (const document of source.sourceDocuments || []) {
    const contents = await fetchBuffer(document.url, fetchImpl)
    if (!contents.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new Error(`公式資料がPDFではありません: ${document.url}`)
    }
    const actualHash = sha256(contents)
    if (actualHash !== document.sha256) {
      throw new Error(`公式PDFが採用時のSHA-256から変更されています: ${document.url} expected=${document.sha256} actual=${actualHash}`)
    }
    const filePath = resolve(root, document.file)
    const localHash = existsSync(filePath) ? sha256(readFileSync(filePath)) : null
    if (writeFiles && localHash !== actualHash) writeAtomic(filePath, contents)
    documents.push({ ...document, bytes: contents.byteLength, localHash, actualHash, updated: localHash !== actualHash })
  }

  return { sourceId: source.sourceId, page, documents }
}

function parseArgs(argv) {
  const allowed = new Set(['--current', '--check'])
  for (const arg of argv) {
    if (!allowed.has(arg)) throw new Error(`未知の引数です: ${arg}`)
  }
  return { updateCurrent: argv.includes('--current'), checkOnly: argv.includes('--check') }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = await acquireAmaSources({ writeFiles: !args.checkOnly })
  console.log(`海士町公式ページ更新日: ${result.page.updatedAt}`)
  for (const document of result.documents) {
    console.log(`${document.id}: sha256=${document.actualHash} bytes=${document.bytes}${document.updated ? ' updated' : ' unchanged'}`)
  }
  if (args.checkOnly) return

  const converterArgs = ['scripts/gtfs/convert-ama-r8-pdf.mjs']
  if (args.updateCurrent) converterArgs.push('--current')
  const converted = spawnSync(process.execPath, converterArgs, { cwd: ROOT, stdio: 'inherit', env: process.env })
  if (converted.error) throw converted.error
  if (converted.status !== 0) throw new Error(`海士町GTFS変換に失敗しました: exit=${converted.status}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
