#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { relative, join } from 'path'
import { pathToFileURL } from 'url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

const ROOT = process.cwd()
const SOURCE_ROOT = join(ROOT, 'gtfs', 'public-data', 'data')
const DEFAULT_BUCKET = 'oki-ferryguide.firebasestorage.app'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  DEFAULT_BUCKET

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
  console.log(`Firebase Storage bucket: ${bucketName}`)
  console.log(`対象ファイル数: ${files.length}`)

  if (dryRun) {
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
