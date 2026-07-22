import { existsSync, readFileSync } from 'node:fs'
import { posix } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { resolveFirebasePublishTarget } from './firebase-publish-target.mjs'
import { sha256 } from './transport-data.mjs'

export const formatTimestampJst = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}${value.month}${value.day}-${value.hour}${value.minute}${value.second}`
}

export const buildFirebaseAdminOptions = (bucketName) => {
  const options = { storageBucket: bucketName }
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (credentialPath && existsSync(credentialPath)) {
    options.credential = cert(JSON.parse(readFileSync(credentialPath, 'utf8')))
  }
  return options
}

export function createFirebaseStoragePublisher(options = {}, dependencies = {}) {
  const { target, bucketName } = resolveFirebasePublishTarget(options)
  let bucket = dependencies.bucket
  const getBucket = () => {
    if (!bucket) {
      if (getApps().length === 0) initializeApp(buildFirebaseAdminOptions(bucketName))
      bucket = getStorage().bucket(bucketName)
    }
    return bucket
  }

  const publishObject = async ({
    contents,
    storagePath,
    sourceFile,
    sourceId,
    backupRoot = `backups/${sourceId}`,
    backupPathFactory,
    cacheControl = 'public, max-age=900',
    metadata = {}
  }) => {
    const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents)
    const sourceHash = sha256(buffer)
    const remoteFile = getBucket().file(storagePath)
    const [exists] = await remoteFile.exists()
    let existingContents = null
    if (exists) {
      ;[existingContents] = await remoteFile.download()
      if (sha256(existingContents) === sourceHash) {
        return { status: 'skipped', storagePath, sha256: sourceHash, bytes: buffer.byteLength, backupPath: null }
      }
    }

    let backupPath = null
    if (existingContents) {
      const timestamp = formatTimestampJst()
      backupPath = backupPathFactory
        ? backupPathFactory({ timestamp, storagePath })
        : posix.join(backupRoot, timestamp, storagePath)
      await getBucket().file(backupPath).save(existingContents, {
        resumable: false,
        metadata: { contentType: 'application/json', cacheControl: 'private, max-age=0', metadata: { sourcePath: storagePath } }
      })
    }

    await remoteFile.save(buffer, {
      resumable: false,
      metadata: {
        contentType: 'application/json',
        cacheControl,
        metadata: {
          sourceId,
          environment: target,
          sha256: sourceHash,
          ...(sourceFile ? { source: pathToFileURL(sourceFile).href } : {}),
          ...(process.env.SOURCE_GIT_SHA ? { gitSha: process.env.SOURCE_GIT_SHA } : {}),
          publishedAt: new Date().toISOString(),
          ...metadata
        }
      }
    })

    const [uploaded] = await remoteFile.download()
    const uploadedHash = sha256(uploaded)
    if (uploadedHash !== sourceHash) {
      throw new Error(`公開後のSHA-256が一致しません: ${storagePath} local=${sourceHash}, remote=${uploadedHash}`)
    }
    return { status: 'uploaded', storagePath, sha256: sourceHash, bytes: buffer.byteLength, backupPath }
  }

  return { target, bucketName, publishObject }
}
