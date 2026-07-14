#!/usr/bin/env node

import {
  downloadAndVerifyManifestObjects,
  downloadStorageObject,
  STORAGE_MANIFEST_PATHS,
  validateStorageManifest
} from '../lib/storage-manifest.mjs'

const args = { scope: '', target: '', gitSha: '' }
for (let index = 2; index < process.argv.length; index++) {
  const arg = process.argv[index]
  if (arg === '--scope') args.scope = process.argv[++index] || ''
  else if (arg === '--target') args.target = process.argv[++index] || ''
  else if (arg === '--git-sha') args.gitSha = process.argv[++index] || ''
  else throw new Error(`未知の引数です: ${arg}`)
}

const manifestPath = STORAGE_MANIFEST_PATHS[args.scope]
if (!manifestPath) throw new Error('--scope timetable|gtfs を指定してください')
if (!['dev', 'prod'].includes(args.target)) throw new Error('--target dev|prod を指定してください')

const manifest = JSON.parse((await downloadStorageObject(args.target, manifestPath)).toString('utf8'))
validateStorageManifest(manifest, { environment: args.target, gitSha: args.gitSha || undefined })
const objects = await downloadAndVerifyManifestObjects(args.target, manifest)
console.log(`Storage smoke OK: scope=${args.scope}, target=${args.target}, gitSha=${manifest.gitSha || '-'}`)
for (const object of objects) console.log(`- ${object.path}: ${object.bytes} bytes sha256=${object.sha256}`)
