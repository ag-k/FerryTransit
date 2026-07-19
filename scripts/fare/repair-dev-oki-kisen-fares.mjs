#!/usr/bin/env node

import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'
import { GoogleAuth } from 'google-auth-library'

const PROJECT_ID = 'oki-ferryguide-dev'
const STORAGE_BUCKET = 'oki-ferryguide-dev.firebasestorage.app'
const PUBLIC_OBJECT = 'data/fare-master.json'
const execute = process.argv.includes('--execute')
const firestoreOnly = process.argv.includes('--firestore-only')
const useGcloudUserAuth = process.argv.includes('--gcloud-user-auth')
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const sourcePath = join(rootDir, 'src', 'data', 'okiKisenFares20260601.json')
const source = JSON.parse(await readFile(sourcePath, 'utf8'))

const categoryDefinitions = {
  'hondo-oki': {
    label: '本土〜隠岐',
    routes: {
      'hondo-saigo': ['HONDO_SHICHIRUI', 'SAIGO'],
      'saigo-hondo': ['SAIGO', 'HONDO_SHICHIRUI'],
      'hondo-beppu': ['HONDO_SHICHIRUI', 'BEPPU'],
      'beppu-hondo': ['BEPPU', 'HONDO_SHICHIRUI'],
      'hondo-hishiura': ['HONDO_SHICHIRUI', 'HISHIURA'],
      'hishiura-hondo': ['HISHIURA', 'HONDO_SHICHIRUI'],
      'hondo-kuri': ['HONDO_SHICHIRUI', 'KURI'],
      'kuri-hondo': ['KURI', 'HONDO_SHICHIRUI']
    }
  },
  'dozen-dogo': {
    label: '島前〜島後',
    routes: {
      'saigo-beppu': ['SAIGO', 'BEPPU'],
      'beppu-saigo': ['BEPPU', 'SAIGO'],
      'saigo-hishiura': ['SAIGO', 'HISHIURA'],
      'hishiura-saigo': ['HISHIURA', 'SAIGO'],
      'saigo-kuri': ['SAIGO', 'KURI'],
      'kuri-saigo': ['KURI', 'SAIGO']
    }
  },
  'beppu-hishiura': {
    label: '別府〜菱浦（島前）',
    routes: {
      'beppu-hishiura': ['BEPPU', 'HISHIURA'],
      'hishiura-beppu': ['HISHIURA', 'BEPPU']
    }
  },
  'hishiura-kuri': {
    label: '菱浦〜来居（島前）',
    routes: {
      'hishiura-kuri': ['HISHIURA', 'KURI'],
      'kuri-hishiura': ['KURI', 'HISHIURA']
    }
  },
  'kuri-beppu': {
    label: '来居〜別府（島前）',
    routes: {
      'kuri-beppu': ['KURI', 'BEPPU'],
      'beppu-kuri': ['BEPPU', 'KURI']
    }
  }
}

const roundUpToTen = value => Math.ceil(value / 10) * 10

const buildRecords = (versionId) => Object.entries(categoryDefinitions).flatMap(([categoryId, definition]) => {
  const values = source.categories[categoryId]
  if (!values) throw new Error(`料金ソースに ${categoryId} がありません`)

  return Object.entries(definition.routes).map(([route, [departure, arrival]]) => {
    const adult = values.seatClass.class2
    const child = roundUpToTen(adult / 2)
    const disabled = { adult: null, child: null }
    return {
      id: `fare-${versionId}-${route}`,
      data: {
        route,
        routeName: route,
        type: 'ferry',
        versionId,
        categoryId,
        displayName: definition.label,
        departure,
        arrival,
        adult,
        child,
        disabledAdult: null,
        disabledChild: null,
        car3m: values.vehicle.under3m,
        car4m: values.vehicle.under4m,
        car5m: values.vehicle.under5m,
        car6m: values.vehicle.under6m,
        car7m: values.vehicle.under7m,
        car8m: values.vehicle.under8m,
        car9m: values.vehicle.under9m,
        car10m: values.vehicle.under10m,
        car11m: values.vehicle.under11m,
        car12m: values.vehicle.under12m,
        over12mPer1m: values.vehicle.over12mPer1m,
        seatClass: values.seatClass,
        vehicle: values.vehicle,
        disabled,
        fares: { adult, child, seatClass: values.seatClass, vehicle: values.vehicle, disabled }
      }
    }
  })
})

const normalizeForPublic = ({ data }) => ({
  route: data.route,
  adult: data.adult,
  child: data.child,
  disabledAdult: null,
  disabledChild: null,
  car3m: data.car3m,
  car4m: data.car4m,
  car5m: data.car5m,
  seatClass: data.seatClass,
  vehicle: data.vehicle,
  disabled: null,
  type: 'ferry',
  departure: data.departure,
  arrival: data.arrival,
  routeName: data.routeName,
  displayName: data.displayName
})

const toFirestoreValue = (value) => {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } }
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)]))
      }
    }
  }
  throw new Error(`Firestoreへ変換できない値です: ${typeof value}`)
}

const toFirestoreFields = data =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]))

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET
})

const db = admin.firestore()
db.settings({ ignoreUndefinedProperties: true })
const bucket = admin.storage().bucket()
const publicFile = bucket.file(PUBLIC_OBJECT)

const [fareSnapshot, versionSnapshot, publicDownload] = await Promise.all([
  db.collection('fares').get(),
  db.collection('fareVersions').get(),
  publicFile.download()
])

const publicData = JSON.parse(publicDownload[0].toString('utf8'))
const activeVersionId = publicData.activeVersionIds?.ferry
const targetVersion = versionSnapshot.docs.find(doc => {
  const data = doc.data()
  return doc.id === activeVersionId &&
    data.vesselType === 'ferry' &&
    data.effectiveFrom === source.effectiveFrom
})

if (!targetVersion) {
  throw new Error(`devの有効フェリー版を特定できません: ${activeVersionId ?? '未設定'}`)
}

const currentDocs = fareSnapshot.docs.filter(doc => {
  const data = doc.data()
  return data.versionId === activeVersionId && (data.type ?? 'ferry') === 'ferry'
})
const records = buildRecords(activeVersionId)
const publicRecords = records.map(normalizeForPublic)
const publicVersion = publicData.versions?.find(version => version.id === activeVersionId)

if (!publicVersion) throw new Error(`公開JSONに有効版 ${activeVersionId} がありません`)

const updatedPublicData = structuredClone(publicData)
updatedPublicData.fares = [
  ...(updatedPublicData.fares ?? []).filter(fare => fare.type !== 'ferry'),
  ...publicRecords
]
updatedPublicData.versions = updatedPublicData.versions.map(version => version.id === activeVersionId
  ? { ...version, fares: publicRecords }
  : version)

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupPayload = {
  projectId: PROJECT_ID,
  createdAt: new Date().toISOString(),
  source,
  targetVersion: { id: targetVersion.id, ...targetVersion.data() },
  firestoreFares: currentDocs.map(doc => ({ id: doc.id, ...doc.data() })),
  publicFareMaster: publicData
}
const localBackup = join(rootDir, 'output', 'releases', 'v2.4', `fare-backup-${timestamp}.json`)
const repairedPublicFile = join(rootDir, 'output', 'releases', 'v2.4', 'fare-master-dev-repaired.json')

console.log(`project: ${PROJECT_ID}`)
console.log(`mode: ${execute ? 'execute' : 'dry-run'}`)
console.log(`active ferry version: ${activeVersionId} (${source.effectiveFrom})`)
console.log(`Firestore replacement: ${currentDocs.length} -> ${records.length} records`)
console.log(`public version replacement: ${publicVersion.fares?.length ?? 0} -> ${publicRecords.length} records`)
console.log(`local backup: ${localBackup}`)
console.log(`repaired public JSON: ${repairedPublicFile}`)

if (!execute) {
  console.log('dry-run complete; no data was changed')
  process.exit(0)
}

await mkdir(dirname(localBackup), { recursive: true })
await writeFile(localBackup, `${JSON.stringify(backupPayload, null, 2)}\n`)
await writeFile(repairedPublicFile, `${JSON.stringify(updatedPublicData, null, 2)}\n`)

const cloudBackupObject = `data/backups/fare-master-${timestamp}.json`
if (!firestoreOnly) {
  await bucket.file(cloudBackupObject).save(JSON.stringify(backupPayload, null, 2), {
    metadata: { contentType: 'application/json', cacheControl: 'private, no-store' }
  })
}

const firestoreHeaders = useGcloudUserAuth
  ? { Authorization: `Bearer ${execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()}` }
  : await (await new GoogleAuth({
      projectId: PROJECT_ID,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    }).getClient()).getRequestHeaders()
const documentRoot = `projects/${PROJECT_ID}/databases/(default)/documents/fares`
const commitResponse = await fetch(
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
  {
    method: 'POST',
    headers: { ...firestoreHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      writes: [
        ...currentDocs.map(doc => ({ delete: `${documentRoot}/${doc.id}` })),
        ...records.map(record => ({
          update: {
            name: `${documentRoot}/${record.id}`,
            fields: toFirestoreFields(record.data)
          }
        }))
      ]
    })
  }
)
if (!commitResponse.ok) {
  throw new Error(`Firestore REST commit失敗: ${commitResponse.status} ${await commitResponse.text()}`)
}

if (!firestoreOnly) {
  await publicFile.save(JSON.stringify(updatedPublicData, null, 2), {
    metadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=3600',
      metadata: {
        publishedBy: 'code-managed-dev-fare-repair',
        publishedAt: new Date().toISOString(),
        dataType: 'fare',
        sourceUrl: source.sourceUrl
      }
    }
  })
}

const verifyFareSnapshot = await db.collection('fares').get()
const verifyDocs = verifyFareSnapshot.docs.filter(doc => (doc.data().type ?? 'ferry') === 'ferry')

if (verifyDocs.length !== records.length) {
  throw new Error(`Firestore検証失敗: ${verifyDocs.length}`)
}

if (!firestoreOnly) {
  const verifyDownload = await publicFile.download()
  const verifyPublic = JSON.parse(verifyDownload[0].toString('utf8'))
  const verifyVersion = verifyPublic.versions.find(version => version.id === activeVersionId)
  if (verifyVersion?.fares?.length !== publicRecords.length) {
    throw new Error(`Storage検証失敗: ${verifyVersion?.fares?.length ?? 0}`)
  }
  console.log(`cloud backup: gs://${STORAGE_BUCKET}/${cloudBackupObject}`)
  console.log(`verified: Firestore ${verifyDocs.length}, Storage ${verifyVersion.fares.length}`)
} else {
  console.log(`verified: Firestore ${verifyDocs.length}; Storage upload is pending`)
}
console.log('repair complete')
