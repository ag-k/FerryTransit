#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs'
import { createHash } from 'crypto'
import { isAbsolute, join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { resolveFirebasePublishTarget } from '../lib/firebase-publish-target.mjs'
import { summarizeTimetable, validateTimetable } from './build-public-timetable.mjs'

const ROOT = process.cwd()
const DEFAULT_SOURCE_FILE = join(ROOT, 'gtfs', 'generated', 'public', 'timetable.json')
const DEFAULT_STORAGE_PATH = 'data/timetable.json'

const args = {
  sourceFile: DEFAULT_SOURCE_FILE,
  storagePath: DEFAULT_STORAGE_PATH,
  dryRun: false,
  target: '',
  bucket: ''
}

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === '--dry-run') {
    args.dryRun = true
  } else if (arg === '--target') {
    const value = process.argv[++i]
    if (!value) throw new Error('--target には dev または prod を指定してください')
    args.target = value
  } else if (arg.startsWith('--target=')) {
    args.target = arg.slice('--target='.length)
  } else if (arg === '--bucket') {
    const value = process.argv[++i]
    if (!value) throw new Error('--bucket にはFirebase Storageバケット名を指定してください')
    args.bucket = value
  } else if (arg.startsWith('--bucket=')) {
    args.bucket = arg.slice('--bucket='.length)
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

const { target, bucketName } = resolveFirebasePublishTarget(args)

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex')

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

const backupExistingObject = async (bucket, storagePath, contents) => {
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
  const sourceHash = sha256(buffer)

  console.log('公開時刻表JSON')
  console.log(`source=${args.sourceFile}`)
  console.log(`environment=${target}`)
  console.log(`target=gs://${bucketName}/${args.storagePath}`)
  console.log(`sha256=${sourceHash}`)
  console.log(`total=${summary.total}`)
  console.log(`byName=${JSON.stringify(summary.byName)}`)
  console.log(`byMode=${JSON.stringify(summary.byMode)}`)

  if (args.dryRun) {
    console.log('[dry-run] Storageへのバックアップ/アップロードは行いません')
    return
  }

  const bucket = initializeAdmin()
  const remoteFile = bucket.file(args.storagePath)
  const [exists] = await remoteFile.exists()
  let existingContents = null
  if (exists) {
    ;[existingContents] = await remoteFile.download()
    if (sha256(existingContents) === sourceHash) {
      console.log('uploaded=skipped（公開済みオブジェクトと内容が同一です）')
      return
    }
  }

  const backupPath = existingContents
    ? await backupExistingObject(bucket, args.storagePath, existingContents)
    : null
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
        environment: target,
        sha256: sourceHash,
        ...(process.env.SOURCE_GIT_SHA ? { gitSha: process.env.SOURCE_GIT_SHA } : {}),
        publishedAt: new Date().toISOString()
      }
    }
  })

  const [uploadedContents] = await remoteFile.download()
  const uploadedHash = sha256(uploadedContents)
  if (uploadedHash !== sourceHash) {
    throw new Error(`公開後のSHA-256が一致しません: local=${sourceHash}, remote=${uploadedHash}`)
  }

  console.log(`uploaded=gs://${bucketName}/${args.storagePath}`)
  console.log(`verifiedSha256=${uploadedHash}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
