#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs'
import { isAbsolute, join, resolve } from 'path'
import { createFirebaseStoragePublisher } from '../lib/firebase-storage-publisher.mjs'
import { FIREBASE_STORAGE_BUCKETS } from '../lib/firebase-publish-target.mjs'
import { createPublishManifest, requireReleaseGitSha, sha256 } from '../lib/transport-data.mjs'
import { summarizeTimetable, validateTimetable } from './build-public-timetable.mjs'
import { validateJalFarePolicy } from './validate-jal-fares.mjs'

const ROOT = process.cwd()
const DEFAULT_SOURCE_FILE = join(ROOT, 'gtfs', 'generated', 'public', 'timetable.json')
const DEFAULT_STORAGE_PATH = 'data/timetable.json'
const DEFAULT_MANIFEST_PATH = 'data/manifests/public-timetable.json'

const args = {
  sourceFile: DEFAULT_SOURCE_FILE,
  storagePath: DEFAULT_STORAGE_PATH,
  manifestPath: DEFAULT_MANIFEST_PATH,
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
  } else if (arg === '--manifest-path') {
    const value = process.argv[++i]
    if (!value) throw new Error('--manifest-path にはStorageパスを指定してください')
    args.manifestPath = value
  } else if (arg.startsWith('--manifest-path=')) {
    args.manifestPath = arg.slice('--manifest-path='.length)
  } else {
    throw new Error(`未知の引数です: ${arg}`)
  }
}

const publisher = createFirebaseStoragePublisher(args)
const { target, bucketName } = publisher
if (target === 'prod' || bucketName === FIREBASE_STORAGE_BUCKETS.prod) {
  throw new Error('prodへは直接公開できません。transport:promoteでdevのmanifestを昇格してください')
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
  validateJalFarePolicy(data)

  return {
    buffer,
    data
  }
}

const main = async () => {
  if (!args.dryRun) requireReleaseGitSha(process.env.SOURCE_GIT_SHA)
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
    console.log(`[dry-run] manifest=${args.manifestPath}`)
    console.log('[dry-run] Storageへのバックアップ/アップロードは行いません')
    return
  }

  const result = await publisher.publishObject({
    contents: buffer,
    storagePath: args.storagePath,
    sourceFile: args.sourceFile,
    sourceId: 'public-timetable',
    backupRoot: 'backups/timetable',
    backupPathFactory: ({ timestamp }) => `backups/timetable/${timestamp}.json`,
    metadata: { publisher: 'code-managed-timetable' }
  })
  if (result.status === 'skipped') {
    console.log('uploaded=skipped（公開済みオブジェクトと内容が同一です）')
  } else {
    console.log(result.backupPath ? `backup=gs://${bucketName}/${result.backupPath}` : `backup=なし（既存の ${args.storagePath} がありません）`)
    console.log(`uploaded=gs://${bucketName}/${args.storagePath}`)
    console.log(`verifiedSha256=${result.sha256}`)
  }

  const manifest = createPublishManifest({
    sourceId: 'public-timetable',
    environment: target,
    gitSha: process.env.SOURCE_GIT_SHA,
    generatedAt: process.env.SOURCE_GIT_DATE || null,
    objects: [{ path: args.storagePath, sha256: sourceHash, bytes: buffer.byteLength }]
  })
  const manifestContents = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)
  const manifestResult = await publisher.publishObject({
    contents: manifestContents,
    storagePath: args.manifestPath,
    sourceId: 'public-timetable-manifest',
    backupRoot: 'backups/manifests'
  })
  console.log(`manifest=${manifestResult.status}: gs://${bucketName}/${args.manifestPath} sha256=${manifestResult.sha256}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
