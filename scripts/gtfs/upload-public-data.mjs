#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { relative, join } from 'path'
import { pathToFileURL } from 'url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { resolveFirebasePublishTarget } from '../lib/firebase-publish-target.mjs'

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
const { target, bucketName } = resolveFirebasePublishTarget(args)

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

const buildAdminOptions = () => {
  const options = { storageBucket: bucketName }
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (credentialPath && existsSync(credentialPath)) {
    options.credential = cert(JSON.parse(readFileSync(credentialPath, 'utf8')))
  }

  return options
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

  if (args.dryRun) {
    for (const file of files) {
      console.log(`[dry-run] ${file} -> ${toStoragePath(file)}`)
    }
    return
  }

  initializeApp(buildAdminOptions())
  const bucket = getStorage().bucket()

  for (const file of files) {
    const destination = toStoragePath(file)
    await bucket.upload(file, {
      destination,
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=900'
      }
    })
    console.log(`uploaded: ${pathToFileURL(file).href} -> gs://${bucketName}/${destination}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
