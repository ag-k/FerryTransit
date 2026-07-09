#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs'
import { isAbsolute, join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { summarizeTimetable, validateTimetable } from './build-public-timetable.mjs'

const ROOT = process.cwd()
const DEFAULT_SOURCE_FILE = join(ROOT, 'gtfs', 'generated', 'public', 'timetable.json')
const DEFAULT_STORAGE_PATH = 'data/timetable.json'
const DEFAULT_BUCKET = 'oki-ferryguide.firebasestorage.app'

const args = {
  sourceFile: DEFAULT_SOURCE_FILE,
  storagePath: DEFAULT_STORAGE_PATH,
  dryRun: false
}

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === '--dry-run') {
    args.dryRun = true
  } else if (arg === '--source') {
    const value = process.argv[++i]
    if (!value) throw new Error('--source には公開JSONファイルを指定してください')
    args.sourceFile = isAbsolute(value) ? value : resolve(ROOT, value)
  } else if (arg.startsWith('--source=')) {
    const value = arg.slice('--source='.length)
    args.sourceFile = isAbsolute(value) ? value : resolve(ROOT, value)
  } else if (arg === '--storage-path') {
    const value = process.argv[++i]
    if (!value) throw new Error('--storage-path にはStorageパスを指定してください')
    args.storagePath = value
  } else if (arg.startsWith('--storage-path=')) {
    args.storagePath = arg.slice('--storage-path='.length)
  } else {
    throw new Error(`未知の引数です: ${arg}`)
  }
}

const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  DEFAULT_BUCKET

const buildAdminOptions = () => {
  const options = { storageBucket: bucketName }
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (credentialPath && existsSync(credentialPath)) {
    options.credential = cert(JSON.parse(readFileSync(credentialPath, 'utf8')))
  }

  return options
}

const initializeAdmin = () => {
  if (getApps().length === 0) {
    initializeApp(buildAdminOptions())
  }
  return getStorage().bucket()
}

const formatBackupTimestampJst = (date) => {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`
}

const backupExistingObject = async (bucket, storagePath) => {
  const sourceFile = bucket.file(storagePath)
  const [exists] = await sourceFile.exists()
  if (!exists) {
    return null
  }

  const [contents] = await sourceFile.download()
  const backupPath = `backups/timetable/${formatBackupTimestampJst(new Date())}.json`
  await bucket.file(backupPath).save(contents, {
    metadata: {
      contentType: 'application/json',
      cacheControl: 'private, max-age=0',
      metadata: {
        sourcePath: storagePath,
        backupReason: 'code-managed-timetable-publish'
      }
    }
  })

  return backupPath
}

const readSourceTimetable = (sourceFile) => {
  if (!existsSync(sourceFile)) {
    throw new Error(`公開JSONが見つかりません: ${sourceFile}\n先に npm run timetable:build を実行してください。`)
  }

  const buffer = readFileSync(sourceFile)
  const data = JSON.parse(buffer.toString('utf-8'))
  if (!Array.isArray(data)) {
    throw new Error(`公開JSONは配列である必要があります: ${sourceFile}`)
  }
  validateTimetable(data)

  return {
    buffer,
    data
  }
}

const main = async () => {
  const { buffer, data } = readSourceTimetable(args.sourceFile)
  const summary = summarizeTimetable(data)

  console.log('公開時刻表JSON')
  console.log(`source=${args.sourceFile}`)
  console.log(`target=gs://${bucketName}/${args.storagePath}`)
  console.log(`total=${summary.total}`)
  console.log(`byName=${JSON.stringify(summary.byName)}`)
  console.log(`byMode=${JSON.stringify(summary.byMode)}`)

  if (args.dryRun) {
    console.log('[dry-run] Storageへのバックアップ/アップロードは行いません')
    return
  }

  const bucket = initializeAdmin()
  const backupPath = await backupExistingObject(bucket, args.storagePath)
  if (backupPath) {
    console.log(`backup=gs://${bucketName}/${backupPath}`)
  } else {
    console.log(`backup=なし（既存の ${args.storagePath} がありません）`)
  }

  await bucket.file(args.storagePath).save(buffer, {
    metadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=900',
      metadata: {
        source: pathToFileURL(args.sourceFile).href,
        publisher: 'code-managed-timetable',
        publishedAt: new Date().toISOString()
      }
    }
  })

  console.log(`uploaded=gs://${bucketName}/${args.storagePath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
