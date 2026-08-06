import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { loadTransportSourceRegistry } from './transport-source-registry.mjs'

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

export function buildGtfsSourceInfo({
  root = process.cwd(),
  feedId,
  feedVersion,
  convertedAt = new Date().toISOString(),
  legacyEndDate
}) {
  const source = loadTransportSourceRegistry(root).feedById[feedId]
  if (!source) throw new Error(`バスフィードのソース設定が見つかりません: ${feedId}`)

  const documents = [
    ...(source.legacySourceDocuments || []),
    ...(source.sourceDocuments || [])
  ]
  if (documents.length === 0) {
    throw new Error(`公式資料が登録されていません: ${feedId}`)
  }

  const verifiedDocuments = documents.map(document => {
    const filePath = resolve(root, document.file)
    if (!existsSync(filePath)) {
      throw new Error(`公式資料の保存ファイルが見つかりません: ${document.file}`)
    }
    const actualHash = sha256(filePath)
    if (actualHash !== document.sha256) {
      throw new Error(
        `公式資料のSHA-256が一致しません: ${document.file} ` +
        `(expected=${document.sha256}, actual=${actualHash})`
      )
    }
    return { ...document }
  })

  return {
    version: 1,
    sourceId: source.sourceId,
    sourceUpdatedAt: source.currentRawDate,
    ...(source.officialPageUpdatedAt
      ? { officialPageUpdatedAt: source.officialPageUpdatedAt }
      : {}),
    convertedAt,
    feedVersion,
    ...(legacyEndDate ? { legacyEndDate } : {}),
    documents: verifiedDocuments
  }
}

export function writeGtfsSourceInfo(options) {
  const sourceInfo = buildGtfsSourceInfo(options)
  mkdirSync(options.outputDir, { recursive: true })
  writeFileSync(
    join(options.outputDir, 'source_info.json'),
    `${JSON.stringify(sourceInfo, null, 2)}\n`,
    'utf8'
  )
  return sourceInfo
}
