import { readFile } from 'node:fs/promises'
import admin from 'firebase-admin'
import { categoryForFare, validatePublishedFerryFares } from './lib/published-fare-validation.mjs'

const execute = process.argv.includes('--execute')
if (process.argv.slice(2).some(arg => arg !== '--execute')) throw new Error('Unknown argument')
const source = JSON.parse(await readFile(new URL('../../src/data/okiKisenFares20261101.json', import.meta.url), 'utf8'))
const bucketName = 'oki-ferryguide.firebasestorage.app'
const versionId = 'oki-kisen-ferry-20261101'
const sourceVersionId = '7WWM8cmN6oIaRdANefxf'
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'oki-ferryguide', storageBucket: bucketName })
const db = admin.firestore()
const bucket = admin.storage().bucket()
const file = bucket.file('data/fare-master.json')
const [[body], [metadata], existing, oldVersion, existingFares] = await Promise.all([
  file.download(), file.getMetadata(), db.collection('fareVersions').doc(versionId).get(),
  db.collection('fareVersions').doc(sourceVersionId).get(), db.collection('fares').where('versionId', '==', versionId).get()
])
if (existing.exists || !existingFares.empty) throw new Error('11月版が既に存在します。既存データを確認してください')
const data = JSON.parse(body.toString('utf8'))
const old = data.versions.find(v => v.id === sourceVersionId && v.vesselType === 'ferry')
if (!old || !oldVersion.exists || old.effectiveFrom !== '2026-06-01' || data.versions.some(v => v.vesselType === 'ferry' && v.effectiveFrom === source.effectiveFrom)) throw new Error('現行版または公開データが想定と異なります')
const fares = old.fares.map(fare => {
  const category = source.categories[categoryForFare(fare)]
  if (!category) throw new Error(`区間不明: ${fare.route}`)
  const vehicle = category.vehicle
  return { ...fare, vehicle, car3m: vehicle.under3m, car4m: vehicle.under4m, car5m: vehicle.under5m }
})
const validation = validatePublishedFerryFares(fares, source, '11月版')
if (validation.errors.length) throw new Error(validation.errors.join('\n'))
const version = { id: versionId, vesselType: 'ferry', name: source.name, description: '自動車航送運賃改定', effectiveFrom: source.effectiveFrom, fares }
const candidate = { ...data, versions: [...data.versions, version] }
console.log(`mode=${execute ? 'execute' : 'dry-run'} routes=${validation.routes} generation=${metadata.generation} fingerprint=${validation.fingerprint}`)
if (!execute) process.exit(0)

const backupName = `data/backups/fare-master-before-20261101-${Date.now()}.json`
await bucket.file(backupName).save(body, { metadata: { contentType: 'application/json', cacheControl: 'private, no-store' }, preconditionOpts: { ifGenerationMatch: 0 } })
const refs = fares.map(fare => db.collection('fares').doc(`fare-${versionId}-${fare.route}`))
const batch = db.batch()
batch.create(db.collection('fareVersions').doc(versionId), { vesselType: 'ferry', name: source.name, description: version.description, effectiveFrom: source.effectiveFrom, sourceUrl: source.sourceUrl, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() })
fares.forEach((fare, index) => batch.create(refs[index], { ...fare, categoryId: categoryForFare(fare), versionId, publishedBy: 'code-managed-fare-20261101', publishedAt: admin.firestore.FieldValue.serverTimestamp() }))
await batch.commit()
try {
  await file.save(`${JSON.stringify(candidate, null, 2)}\n`, { metadata: { contentType: 'application/json', cacheControl: 'public, max-age=3600', metadata: { publishedBy: 'code-managed-fare-20261101', sourceUrl: source.sourceUrl, sourceFingerprint: validation.fingerprint } }, preconditionOpts: { ifGenerationMatch: Number(metadata.generation) } })
} catch (error) {
  const rollback = db.batch()
  rollback.delete(db.collection('fareVersions').doc(versionId))
  refs.forEach(ref => rollback.delete(ref))
  await rollback.commit()
  throw new Error(`公開失敗のため今回のFirestore登録を取り消しました: ${error.message}`)
}
const [[verifiedBody], verifiedVersion, verifiedFares] = await Promise.all([file.download(), db.collection('fareVersions').doc(versionId).get(), db.collection('fares').where('versionId', '==', versionId).get()])
const verified = JSON.parse(verifiedBody.toString('utf8'))
const published = verified.versions.find(v => v.id === versionId)
const result = validatePublishedFerryFares(published?.fares, source, '公開済み11月版')
if (!verifiedVersion.exists || verifiedFares.size !== 20 || result.errors.length || result.fingerprint !== validation.fingerprint) throw new Error(`事後検証失敗: Firestore=${verifiedFares.size}; ${result.errors.join('; ')}`)
console.log(`verified=ok firestore=${verifiedFares.size} backup=gs://${bucketName}/${backupName}`)
