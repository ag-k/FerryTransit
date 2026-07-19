#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { setMaxListeners } from 'node:events'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'
import { activeFerryFares, categoryForFare, fareFingerprint, validatePublishedFerryFares } from './lib/published-fare-validation.mjs'

// Firestoreの複数ドキュメント取得で内部PassThroughへリスナーが追加されるため、
// 20方向を超える更新前データの読み取りに合わせてNodeの既定上限を引き上げる。
setMaxListeners(50)

const allowedArgs = new Set(['--execute', '--approve-prod', '--check-backend'])
const unknownArgs = process.argv.slice(2).filter(arg => !allowedArgs.has(arg))
if (unknownArgs.length) throw new Error(`未知の引数です: ${unknownArgs.join(', ')}`)
const execute = process.argv.includes('--execute')
const checkBackend = execute || process.argv.includes('--check-backend')
if (execute && !process.argv.includes('--approve-prod')) throw new Error('prod書き込みには --approve-prod が必要です')
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = JSON.parse(await readFile(join(rootDir, 'src/data/okiKisenFares20260601.json'), 'utf8'))
const DEV_BUCKET = 'oki-ferryguide-dev.firebasestorage.app'
const PROD_BUCKET = 'oki-ferryguide.firebasestorage.app'
const OBJECT = 'data/fare-master.json'
const publicUrl = bucket => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/data%2Ffare-master.json?alt=media&nonce=${Date.now()}`
const fetchJson = async bucket => {
  const response = await fetch(publicUrl(bucket), { cache: 'no-store' })
  if (!response.ok) throw new Error(`${bucket} fare-master取得失敗: ${response.status} ${await response.text()}`)
  return response.json()
}

const [devData, prodData] = await Promise.all([fetchJson(DEV_BUCKET), fetchJson(PROD_BUCKET)])
const dev = activeFerryFares(devData)
const prod = activeFerryFares(prodData)
if (!dev.version || !prod.version) throw new Error('dev/prodの有効フェリー版を特定できません')
if (dev.version.effectiveFrom !== source.effectiveFrom || prod.version.effectiveFrom !== source.effectiveFrom) {
  throw new Error(`適用開始日不一致: source=${source.effectiveFrom}, dev=${dev.version.effectiveFrom}, prod=${prod.version.effectiveFrom}`)
}
const devValidation = validatePublishedFerryFares(dev.fares, source, 'dev active version')
const devTop = validatePublishedFerryFares((devData.fares ?? []).filter(fare => fare.type === 'ferry'), source, 'dev top-level')
if (devValidation.errors.length || devTop.errors.length || devValidation.fingerprint !== devTop.fingerprint) {
  throw new Error(['dev昇格候補が不正です', ...devValidation.errors, ...devTop.errors].join('\n'))
}
const prodValidation = validatePublishedFerryFares(prod.fares, source, 'prod active version')
console.log(`mode: ${execute ? 'execute' : 'dry-run'}`)
console.log(`dev: version=${dev.activeVersionId}, fares=${dev.fares.length}, fingerprint=${devValidation.fingerprint}`)
console.log(`prod before: version=${prod.activeVersionId}, fares=${prod.fares?.length ?? 0}, valid=${prodValidation.errors.length === 0}`)
for (const error of prodValidation.errors.slice(0, 12)) console.log(`prod drift: ${error}`)

const candidateFares = structuredClone(dev.fares)
const candidate = structuredClone(prodData)
candidate.fares = [...(candidate.fares ?? []).filter(fare => fare.type !== 'ferry'), ...candidateFares]
candidate.versions = candidate.versions.map(version => version.id === prod.activeVersionId ? { ...version, fares: candidateFares } : version)
const candidateValidation = validatePublishedFerryFares(activeFerryFares(candidate).fares, source, 'prod candidate')
if (candidateValidation.errors.length) throw new Error(candidateValidation.errors.join('\n'))
console.log(`prod candidate: fares=20, routes=20, fingerprint=${candidateValidation.fingerprint}`)
if (!checkBackend) { console.log('dry-run complete; prodは変更していません'); process.exit(0) }

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'oki-ferryguide', storageBucket: PROD_BUCKET })
const db = admin.firestore()
db.settings({ ignoreUndefinedProperties: true })
const bucket = admin.storage().bucket()
const publicFile = bucket.file(OBJECT)
const activeFareQuery = db.collection('fares').where('versionId', '==', prod.activeVersionId)
const [fareSnapshot, versionSnapshot, [publicMetadata], [authenticatedPublicBody]] = await Promise.all([
  activeFareQuery.get(),
  db.collection('fareVersions').doc(prod.activeVersionId).get(),
  publicFile.getMetadata(),
  publicFile.download()
])
if (JSON.stringify(JSON.parse(authenticatedPublicBody.toString('utf8'))) !== JSON.stringify(prodData)) {
  throw new Error('公開取得後にprod Storageが変更されました。再度preflightしてください')
}
if (!versionSnapshot.exists || versionSnapshot.data()?.effectiveFrom !== source.effectiveFrom) throw new Error('prod Firestoreの有効版が公開JSONと一致しません')
const currentDocs = fareSnapshot.docs.filter(doc => (doc.data().type ?? 'ferry') === 'ferry')
if (currentDocs.length !== prod.fares.length) throw new Error(`prod Firestore/Storage件数不一致: Firestore=${currentDocs.length}, Storage=${prod.fares.length}`)
console.log(`backend preflight: Firestore=${currentDocs.length}, Storage generation=${publicMetadata.generation}`)
if (!execute) { console.log('authenticated dry-run complete; prodは変更していません'); process.exit(0) }

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = {
  projectId: 'oki-ferryguide', createdAt: new Date().toISOString(), sourceUrl: source.sourceUrl,
  storageGeneration: publicMetadata.generation, activeVersionId: prod.activeVersionId,
  fareVersion: { id: versionSnapshot.id, ...versionSnapshot.data() },
  firestoreFares: currentDocs.map(doc => ({ id: doc.id, data: doc.data() })), publicFareMaster: prodData
}
const localBackup = join(rootDir, 'output/releases/v2.4', `fare-prod-backup-${timestamp}.json`)
const cloudBackup = `data/backups/fare-master-before-v2.4-promotion-${timestamp}.json`
await mkdir(dirname(localBackup), { recursive: true })
await writeFile(localBackup, `${JSON.stringify(backup, null, 2)}\n`)
await bucket.file(cloudBackup).save(JSON.stringify(backup, null, 2), {
  metadata: { contentType: 'application/json', cacheControl: 'private, no-store' }, preconditionOpts: { ifGenerationMatch: 0 }
})
console.log(`backup: gs://${PROD_BUCKET}/${cloudBackup}`)

const recordId = fare => `fare-${prod.activeVersionId}-${fare.route}`
const batch = db.batch()
for (const doc of currentDocs) batch.delete(doc.ref)
for (const fare of candidateFares) batch.set(db.collection('fares').doc(recordId(fare)), {
  ...fare, versionId: prod.activeVersionId, categoryId: categoryForFare(fare),
  publishedBy: 'code-managed-prod-fare-promotion', publishedAt: admin.firestore.FieldValue.serverTimestamp()
})
await batch.commit()
try {
  await publicFile.save(`${JSON.stringify(candidate, null, 2)}\n`, {
    metadata: { contentType: 'application/json', cacheControl: 'public, max-age=3600', metadata: {
      publishedBy: 'code-managed-prod-fare-promotion', publishedAt: new Date().toISOString(),
      promotedFrom: 'dev', sourceUrl: source.sourceUrl, sourceFingerprint: fareFingerprint(candidateFares)
    } },
    preconditionOpts: { ifGenerationMatch: Number(publicMetadata.generation) }
  })
} catch (error) {
  const rollback = db.batch()
  for (const fare of candidateFares) rollback.delete(db.collection('fares').doc(recordId(fare)))
  for (const doc of currentDocs) rollback.set(doc.ref, doc.data())
  await rollback.commit()
  throw new Error(`Storage公開失敗のためFirestoreを復元しました: ${error.message}`)
}

const [verifiedData, verifiedFareSnapshot] = await Promise.all([fetchJson(PROD_BUCKET), activeFareQuery.get()])
const verified = activeFerryFares(verifiedData)
const verifiedValidation = validatePublishedFerryFares(verified.fares, source, 'prod verified')
const verifiedDocs = verifiedFareSnapshot.docs.filter(doc => (doc.data().type ?? 'ferry') === 'ferry')
if (verifiedValidation.errors.length || verifiedDocs.length !== 20 || verifiedValidation.fingerprint !== devValidation.fingerprint) {
  throw new Error(`prod事後検証失敗: Storage=${verified.fares?.length ?? 0}, Firestore=${verifiedDocs.length}, errors=${verifiedValidation.errors.join('; ')}`)
}
console.log(`verified: prod Storage=20, Firestore=20, fingerprint=${verifiedValidation.fingerprint}`)
console.log(`local backup: ${localBackup}`)
console.log('promotion complete')
