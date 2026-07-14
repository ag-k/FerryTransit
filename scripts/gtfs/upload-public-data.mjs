#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { relative, join } from 'path'
import { createFirebaseStoragePublisher } from '../lib/firebase-storage-publisher.mjs'
import { FIREBASE_STORAGE_BUCKETS } from '../lib/firebase-publish-target.mjs'
import { createPublishManifest, sha256 } from '../lib/transport-data.mjs'

const ROOT = process.cwd()
const SOURCE_ROOT = join(ROOT, 'gtfs', 'public-data', 'data')

const parseArgs = (argv) => {
  const args = { dryRun: false, target: '', bucket: '' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--target') {
      const value = argv[++i]
      if (!value) throw new Error('--target には dev または prod を指定してください')
      args.target = value
    } else if (arg.startsWith('--target=')) {
      args.target = arg.slice('--target='.length)
    } else if (arg === '--bucket') {
      const value = argv[++i]
      if (!value) throw new Error('--bucket にはFirebase Storageバケット名を指定してください')
      args.bucket = value
    } else if (arg.startsWith('--bucket=')) {
      args.bucket = arg.slice('--bucket='.length)
    } else {
      throw new Error(`未知の引数です: ${arg}`)
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const publisher = createFirebaseStoragePublisher(args)
const { target, bucketName } = publisher
if (target === 'prod' || bucketName === FIREBASE_STORAGE_BUCKETS.prod) {
  throw new Error('prodへは直接公開できません。transport:promoteでdevのmanifestを昇格してください')
}

const collectFiles = (dir) => {
  const files = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...collectFiles(fullPath))
    } else if (stat.isFile()) {
      files.push(fullPath)
    }
  }
  return files
}

const toStoragePath = (filePath) => {
  return `data/${relative(SOURCE_ROOT, filePath).split(/[\\/]/).join('/')}`
}

const main = async () => {
  if (!existsSync(SOURCE_ROOT)) {
    throw new Error(`外部公開データディレクトリが見つかりません: ${SOURCE_ROOT}`)
  }

  const files = collectFiles(SOURCE_ROOT)
  if (files.length === 0) {
    throw new Error(`アップロード対象ファイルがありません: ${SOURCE_ROOT}`)
  }

  console.log(`GTFS公開データ: ${SOURCE_ROOT}`)
  console.log(`公開環境: ${target}`)
  console.log(`Firebase Storage bucket: ${bucketName}`)
  console.log(`対象ファイル数: ${files.length}`)

  const objects = files.map(file => {
    const contents = readFileSync(file)
    return { file, contents, path: toStoragePath(file), sha256: sha256(contents), bytes: contents.byteLength }
  })
  const manifest = createPublishManifest({
    sourceId: 'gtfs-public-data',
    environment: target,
    gitSha: process.env.SOURCE_GIT_SHA,
    generatedAt: process.env.SOURCE_GIT_DATE || null,
    objects
  })

  if (args.dryRun) {
    for (const object of objects) console.log(`[dry-run] ${object.file} -> ${object.path} sha256=${object.sha256}`)
    console.log(`[dry-run] manifest -> data/manifests/gtfs-public-data.json objects=${manifest.objects.length}`)
    return
  }

  for (const object of objects) {
    const result = await publisher.publishObject({
      contents: object.contents,
      storagePath: object.path,
      sourceFile: object.file,
      sourceId: 'gtfs-public-data',
      backupRoot: 'backups/gtfs-public-data'
    })
    console.log(`${result.status}: gs://${bucketName}/${object.path} sha256=${result.sha256}${result.backupPath ? ` backup=gs://${bucketName}/${result.backupPath}` : ''}`)
  }

  const manifestContents = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)
  const manifestResult = await publisher.publishObject({
    contents: manifestContents,
    storagePath: 'data/manifests/gtfs-public-data.json',
    sourceId: 'gtfs-public-data-manifest',
    backupRoot: 'backups/manifests'
  })
  console.log(`${manifestResult.status}: gs://${bucketName}/${manifestResult.storagePath} sha256=${manifestResult.sha256}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
