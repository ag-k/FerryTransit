import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import Papa from 'papaparse'

export const trimRecord = (record) => Object.fromEntries(
  Object.entries(record).map(([key, value]) => [
    key,
    typeof value === 'string' ? value.trim() : value
  ])
)

export function readCsv(filePath, { optional = false } = {}) {
  if (optional && !existsSync(filePath)) return { rows: [], errors: [], missing: true }
  const text = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
  return {
    rows: parsed.data.map(trimRecord),
    errors: parsed.errors,
    missing: false
  }
}

export function readCsvRows(filePath, options) {
  const result = readCsv(filePath, options)
  if (result.errors.length > 0) {
    const first = result.errors[0]
    throw new Error(`${filePath}: ${first.message}`)
  }
  return result.rows
}

export const formatGtfsDate = (value) => {
  if (!/^\d{8}$/.test(String(value || ''))) return null
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

export const normalizeGtfsTime = (value, { includeSeconds = false } = {}) => {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || '').trim())
  if (!match) return null
  const [, hour, minute, second = '00'] = match
  if (Number(hour) > 47 || Number(minute) > 59 || Number(second) > 59) return null
  const normalized = `${hour.padStart(2, '0')}:${minute}`
  return includeSeconds ? `${normalized}:${second}` : normalized
}

export const sha256 = (contents) => createHash('sha256').update(contents).digest('hex')

export function requireReleaseGitSha(value, label = 'SOURCE_GIT_SHA') {
  if (!/^[a-f0-9]{40}$/.test(String(value || ''))) {
    throw new Error(`${label}には40桁のGitコミットSHAが必要です`)
  }
  return value
}

export function writeJson(filePath, data, { compact = false } = {}) {
  mkdirSync(dirname(filePath), { recursive: true })
  const json = compact ? JSON.stringify(data) : JSON.stringify(data, null, 2)
  writeFileSync(filePath, `${json}\n`, 'utf8')
}

export function createPublishManifest({ sourceId, environment, gitSha, objects, generatedAt = null }) {
  return {
    version: 1,
    sourceId,
    environment,
    gitSha: gitSha || null,
    generatedAt,
    objects: objects.map(object => ({
      path: object.path,
      sha256: object.sha256,
      bytes: object.bytes
    })).sort((a, b) => a.path.localeCompare(b.path))
  }
}

export function writeReport(reportDir, suffix, report, date = new Date()) {
  const filePath = `${reportDir}/${date.toISOString().slice(0, 10)}.${suffix}.json`
  writeJson(filePath, report)
  return filePath
}
