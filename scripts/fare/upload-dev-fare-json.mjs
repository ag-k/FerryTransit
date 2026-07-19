#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { GoogleAuth } from 'google-auth-library'

const PROJECT_ID = 'oki-ferryguide-dev'
const BUCKET = 'oki-ferryguide-dev.firebasestorage.app'
const OBJECT = 'data/fare-master.json'
const BACKUP_OBJECT = 'data/backups/fare-master-before-v2.4-20260719.json'
const backupOnly = process.argv.includes('--backup-only')
const repairedPath = join(process.cwd(), 'output', 'releases', 'v2.4', 'fare-master-dev-repaired.json')
const auth = new GoogleAuth({
  projectId: PROJECT_ID,
  scopes: ['https://www.googleapis.com/auth/devstorage.read_write']
})
const client = await auth.getClient()
const headers = await client.getRequestHeaders()

const encode = value => encodeURIComponent(value)
const copyUrl = `https://storage.googleapis.com/storage/v1/b/${encode(BUCKET)}/o/${encode(OBJECT)}/copyTo/b/${encode(BUCKET)}/o/${encode(BACKUP_OBJECT)}?ifGenerationMatch=0`

const copyResponse = await fetch(copyUrl, { method: 'POST', headers })
if (!copyResponse.ok && copyResponse.status !== 412) {
  throw new Error(`Storageバックアップ失敗: ${copyResponse.status} ${await copyResponse.text()}`)
}
console.log(copyResponse.status === 412
  ? `backup already exists: gs://${BUCKET}/${BACKUP_OBJECT}`
  : `backup created: gs://${BUCKET}/${BACKUP_OBJECT}`)

if (backupOnly) process.exit(0)

const body = await readFile(repairedPath)
const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encode(BUCKET)}/o?uploadType=media&name=${encode(OBJECT)}`
const uploadResponse = await fetch(uploadUrl, {
  method: 'POST',
  headers: { ...headers, 'content-type': 'application/json' },
  body
})
if (!uploadResponse.ok) {
  throw new Error(`Storageアップロード失敗: ${uploadResponse.status} ${await uploadResponse.text()}`)
}

const metadataUrl = `https://storage.googleapis.com/storage/v1/b/${encode(BUCKET)}/o/${encode(OBJECT)}`
const metadataResponse = await fetch(metadataUrl, {
  method: 'PATCH',
  headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({
    contentType: 'application/json',
    cacheControl: 'public, max-age=3600',
    metadata: {
      publishedBy: 'code-managed-dev-fare-repair',
      publishedAt: new Date().toISOString(),
      dataType: 'fare',
      sourceUrl: 'https://www.oki-kisen.co.jp/fare/'
    }
  })
})
if (!metadataResponse.ok) {
  throw new Error(`Storageメタデータ更新失敗: ${metadataResponse.status} ${await metadataResponse.text()}`)
}

const downloadUrl = `${metadataUrl}?alt=media`
const verifyResponse = await fetch(downloadUrl, { headers })
if (!verifyResponse.ok) throw new Error(`Storage再取得失敗: ${verifyResponse.status}`)
const verify = await verifyResponse.json()
const activeVersionId = verify.activeVersionIds?.ferry
const activeVersion = verify.versions?.find(version => version.id === activeVersionId)
const categoryIds = new Set(activeVersion?.fares?.map(fare => fare.route))

if (activeVersion?.fares?.length !== 20 || categoryIds.size !== 20) {
  throw new Error(`Storage内容検証失敗: fares=${activeVersion?.fares?.length ?? 0}, routes=${categoryIds.size}`)
}

console.log(`uploaded: gs://${BUCKET}/${OBJECT}`)
console.log(`verified: active ferry version ${activeVersionId}, 20 unique routes`)
