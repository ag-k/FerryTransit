#!/usr/bin/env node

import { createFirebaseStoragePublisher } from '../lib/firebase-storage-publisher.mjs'
import {
  downloadAndVerifyManifestObjects,
  downloadStorageObject,
  validateStorageManifest
} from '../lib/storage-manifest.mjs'

const args = { from: '', target: '', manifestPath: '', gitSha: '', approveProd: false, dryRun: false }
for (let index = 2; index < process.argv.length; index++) {
  const arg = process.argv[index]
  if (arg === '--from') args.from = process.argv[++index] || ''
  else if (arg === '--target') args.target = process.argv[++index] || ''
  else if (arg === '--manifest') args.manifestPath = process.argv[++index] || ''
  else if (arg === '--git-sha') args.gitSha = process.argv[++index] || ''
  else if (arg === '--approve-prod') args.approveProd = true
  else if (arg === '--dry-run' || arg === '--check') args.dryRun = true
  else throw new Error(`未知の引数です: ${arg}`)
}

if (args.from !== 'dev' || args.target !== 'prod') throw new Error('昇格元はdev、昇格先はprodのみ指定できます')
if (!args.approveProd) throw new Error('prod昇格には --approve-prod が必要です')
if (!/^data\/manifests\/[a-z0-9._-]+\.json$/.test(args.manifestPath)) throw new Error('--manifest にStorage上のmanifestパスを指定してください')
if (!/^[a-f0-9]{40}$/.test(args.gitSha)) throw new Error('--git-sha に40桁のリリースコミットSHAを指定してください')

const sourceManifest = JSON.parse((await downloadStorageObject('dev', args.manifestPath)).toString('utf8'))
validateStorageManifest(sourceManifest, { environment: 'dev', gitSha: args.gitSha })
const objects = await downloadAndVerifyManifestObjects('dev', sourceManifest)

console.log(`promotion verified: manifest=${args.manifestPath}, gitSha=${args.gitSha}, objects=${objects.length}`)
if (args.dryRun) {
  console.log('[dry-run] prod Storageへの書き込みは行いません')
  process.exit(0)
}

const publisher = createFirebaseStoragePublisher({ target: 'prod' })
for (const object of objects) {
  const result = await publisher.publishObject({
    contents: object.contents,
    storagePath: object.path,
    sourceId: sourceManifest.sourceId,
    backupRoot: `backups/promotions/${sourceManifest.sourceId}`,
    metadata: { gitSha: args.gitSha, promotedFrom: 'dev', manifestPath: args.manifestPath }
  })
  console.log(`${result.status}: ${object.path} sha256=${result.sha256}`)
}

const prodManifest = {
  ...sourceManifest,
  environment: 'prod',
  promotedFrom: { environment: 'dev', manifestPath: args.manifestPath, gitSha: args.gitSha }
}
const manifestResult = await publisher.publishObject({
  contents: Buffer.from(`${JSON.stringify(prodManifest, null, 2)}\n`),
  storagePath: args.manifestPath,
  sourceId: `${sourceManifest.sourceId}-manifest`,
  backupRoot: 'backups/manifests',
  metadata: { gitSha: args.gitSha, promotedFrom: 'dev' }
})
console.log(`${manifestResult.status}: ${args.manifestPath} sha256=${manifestResult.sha256}`)
