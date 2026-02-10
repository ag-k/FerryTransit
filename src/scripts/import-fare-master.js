#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * fare-master.json から Firestore へ初期データを投入するユーティリティ
 *
 * 使い方:
 *   node src/scripts/import-fare-master.js                # ドライラン（実際の書き込みは行わない）
 *   node src/scripts/import-fare-master.js --execute      # Firestore に書き込み
 *
 * オプション:
 *   --ferry-version <id>             フェリー版のドキュメントID（デフォルト: seed-ferry）
 *   --ferry-version-name <name>      フェリー版の名称（デフォルト: 初期フェリーデータ）
 *   --ferry-effective-from <date>    フェリー版の適用開始日（YYYY-MM-DD, デフォルト: 今日）
 *   --highspeed-version <id>         高速船版のドキュメントID（デフォルト: seed-highspeed）
 *   --highspeed-version-name <name>  高速船版の名称（デフォルト: 初期高速船データ）
 *   --highspeed-effective-from <date>高速船版の適用開始日（デフォルト: フェリーと同じ）
 *   --skip-highspeed                 高速船データのインポートをスキップ
 *   --skip-discounts                 割引データのインポートをスキップ
 *
 * 環境変数:
 *   GOOGLE_APPLICATION_CREDENTIALS   サービスアカウントJSONへのパス（任意）
 *   FIREBASE_STORAGE_BUCKET          利用するStorageバケット（任意）
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import admin from 'firebase-admin'

const rawArgs = process.argv.slice(2)
const hasFlag = (flag) => rawArgs.includes(flag)
const getFlagValue = (flag, fallback) => {
  const index = rawArgs.indexOf(flag)
  if (index !== -1 && index + 1 < rawArgs.length) {
    return rawArgs[index + 1]
  }
  return fallback
}

const shouldExecute = hasFlag('--execute') || hasFlag('--apply')
const skipHighspeed = hasFlag('--skip-highspeed')
const skipDiscounts = hasFlag('--skip-discounts')

const today = new Date().toISOString().slice(0, 10)

const ferryVersionId = getFlagValue('--ferry-version', 'seed-ferry')
const ferryVersionName = getFlagValue('--ferry-version-name', '初期フェリーデータ')
const ferryEffectiveFrom = getFlagValue('--ferry-effective-from', today)

const highspeedVersionId = getFlagValue('--highspeed-version', 'seed-highspeed')
const highspeedVersionName = getFlagValue('--highspeed-version-name', '初期高速船データ')
const highspeedEffectiveFrom = getFlagValue('--highspeed-effective-from', ferryEffectiveFrom)

const SEED_USER = 'script:import-fare-master'
const SOURCE_TAG = 'src/data/fare-master.json'

const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || 'oki-ferryguide.firebasestorage.app'

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credentialPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  const serviceAccount = JSON.parse(await fs.readFile(credentialPath, 'utf8'))
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: storageBucketName
  })
} else {
  admin.initializeApp({
    storageBucket: storageBucketName
  })
}

admin.firestore().settings({ ignoreUndefinedProperties: true })

const db = admin.firestore()
const timestamp = admin.firestore.FieldValue.serverTimestamp()

const FERRY_CATEGORY_DEFINITIONS = [
  {
    id: 'hondo-oki',
    routeIds: [
      'hondo-saigo',
      'saigo-hondo',
      'hondo-beppu',
      'beppu-hondo',
      'hondo-hishiura',
      'hishiura-hondo',
      'hondo-kuri',
      'kuri-hondo'
    ]
  },
  {
    id: 'dozen-dogo',
    routeIds: [
      'saigo-beppu',
      'beppu-saigo',
      'saigo-hishiura',
      'hishiura-saigo',
      'saigo-kuri',
      'kuri-saigo'
    ]
  },
  {
    id: 'beppu-hishiura',
    routeIds: ['beppu-hishiura', 'hishiura-beppu']
  },
  {
    id: 'hishiura-kuri',
    routeIds: ['hishiura-kuri', 'kuri-hishiura']
  },
  {
    id: 'kuri-beppu',
    routeIds: ['kuri-beppu', 'beppu-kuri']
  }
]

const ROUTE_TO_CATEGORY = FERRY_CATEGORY_DEFINITIONS.reduce((acc, def) => {
  def.routeIds.forEach(routeId => {
    acc[routeId] = def.id
  })
  return acc
}, {})

const ROUTE_METADATA = {
  'hondo-saigo': { departure: 'HONDO', arrival: 'SAIGO' },
  'saigo-hondo': { departure: 'SAIGO', arrival: 'HONDO' },
  'hondo-beppu': { departure: 'HONDO', arrival: 'BEPPU' },
  'beppu-hondo': { departure: 'BEPPU', arrival: 'HONDO' },
  'hondo-hishiura': { departure: 'HONDO', arrival: 'HISHIURA' },
  'hishiura-hondo': { departure: 'HISHIURA', arrival: 'HONDO' },
  'hondo-kuri': { departure: 'HONDO', arrival: 'KURI' },
  'kuri-hondo': { departure: 'KURI', arrival: 'HONDO' },
  'saigo-beppu': { departure: 'SAIGO', arrival: 'BEPPU' },
  'beppu-saigo': { departure: 'BEPPU', arrival: 'SAIGO' },
  'saigo-hishiura': { departure: 'SAIGO', arrival: 'HISHIURA' },
  'hishiura-saigo': { departure: 'HISHIURA', arrival: 'SAIGO' },
  'saigo-kuri': { departure: 'SAIGO', arrival: 'KURI' },
  'kuri-saigo': { departure: 'KURI', arrival: 'SAIGO' },
  'beppu-hishiura': { departure: 'BEPPU', arrival: 'HISHIURA' },
  'hishiura-beppu': { departure: 'HISHIURA', arrival: 'BEPPU' },
  'hishiura-kuri': { departure: 'HISHIURA', arrival: 'KURI' },
  'kuri-hishiura': { departure: 'KURI', arrival: 'HISHIURA' },
  'kuri-beppu': { departure: 'KURI', arrival: 'BEPPU' },
  'beppu-kuri': { departure: 'BEPPU', arrival: 'KURI' }
}

const HIGHSPEED_ROUTE_LABELS = {
  'hondo-oki': '本土七類 ⇔ 隠岐（高速船）',
  'dozen-dogo': '島前三港 ⇔ 島後（高速船）',
  'beppu-hishiura': '別府 ⇔ 菱浦（高速船）',
  'hishiura-kuri': '菱浦 ⇔ 来居（高速船）',
  'kuri-beppu': '来居 ⇔ 別府（高速船）'
}

const numberOrNull = (value) => (typeof value === 'number' && !Number.isNaN(value) ? value : null)

const buildSeatClassRecord = (seatClass = {}) => {
  const keys = ['class2', 'class2Special', 'class1', 'classSpecial', 'specialRoom']
  return keys.reduce((acc, key) => {
    acc[key] = numberOrNull(seatClass[key])
    return acc
  }, {})
}

const buildVehicleRecord = (vehicle = {}) => {
  const keys = [
    'under3m',
    'under4m',
    'under5m',
    'under6m',
    'under7m',
    'under8m',
    'under9m',
    'under10m',
    'under11m',
    'under12m',
    'over12mPer1m'
  ]
  return keys.reduce((acc, key) => {
    acc[key] = numberOrNull(vehicle[key])
    return acc
  }, {})
}

const buildFareDocId = (versionId, routeId) => `fare-${versionId}-${routeId}`

const loadFareMaster = async () => {
  const filePath = path.join(process.cwd(), 'src', 'data', 'fare-master.json')
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

const createFerryDocuments = (routes, versionId) => {
  return routes.map((route) => {
    const routeId = route.id || route.route || ''
    const metadata = ROUTE_METADATA[routeId] ?? {}
    const seatClass = buildSeatClassRecord(route.fares?.seatClass)
    const vehicle = buildVehicleRecord(route.fares?.vehicle)
    const disabledAdult = numberOrNull(route.fares?.disabled?.adult)
    const disabledChild = numberOrNull(route.fares?.disabled?.child)

    const faresPayload = {
      adult: numberOrNull(route.fares?.adult),
      child: numberOrNull(route.fares?.child),
      seatClass,
      vehicle
    }

    if (disabledAdult !== null || disabledChild !== null) {
      faresPayload.disabled = {
        adult: disabledAdult,
        child: disabledChild
      }
    }

    return {
      id: buildFareDocId(versionId, routeId),
      data: {
        type: 'ferry',
        vesselType: 'ferry',
        versionId,
        route: routeId,
        routeName: routeId,
        displayName: `${route.departure || metadata.departure || ''} ⇔ ${route.arrival || metadata.arrival || ''}`.trim(),
        departure: route.departure || metadata.departure || null,
        arrival: route.arrival || metadata.arrival || null,
        categoryId: ROUTE_TO_CATEGORY[routeId] ?? null,
        adult: numberOrNull(route.fares?.adult),
        child: numberOrNull(route.fares?.child),
        disabledAdult,
        disabledChild,
        seatClass,
        vehicle,
        fares: faresPayload,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: SEED_USER,
        updatedBy: SEED_USER,
        source: SOURCE_TAG
      }
    }
  })
}

const createHighspeedDocuments = (fareMap, versionId) => {
  return Object.entries(fareMap).map(([routeId, fare]) => {
    const adult = numberOrNull(fare?.adult)
    const child = numberOrNull(fare?.child)
    return {
      id: buildFareDocId(versionId, routeId),
      data: {
        type: 'highspeed',
        vesselType: 'highspeed',
        versionId,
        route: routeId,
        displayName: HIGHSPEED_ROUTE_LABELS[routeId] ?? routeId,
        adult,
        child,
        fares: {
          adult,
          child
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: SEED_USER,
        updatedBy: SEED_USER,
        source: SOURCE_TAG
      }
    }
  })
}

const createDiscountDocuments = (discounts) => {
  return Object.entries(discounts).map(([key, discount]) => {
    const multiplier = typeof discount.rate === 'number' ? discount.rate : null
    const percent = multiplier !== null ? Math.round((1 - multiplier) * 100) : null
    const conditions = []
    if (typeof discount.minPeople === 'number') {
      conditions.push(`minPeople:${discount.minPeople}`)
    }
    return {
      id: key,
      data: {
        name: discount.nameKey || key,
        nameKey: discount.nameKey || null,
        description: discount.descriptionKey || null,
        descriptionKey: discount.descriptionKey || null,
        rate: percent,
        rateMultiplier: multiplier,
        minPeople: discount.minPeople ?? null,
        active: true,
        conditions,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: SEED_USER,
        updatedBy: SEED_USER,
        source: SOURCE_TAG
      }
    }
  })
}

const deleteExistingFaresByVersion = async (versionId) => {
  const snapshot = await db.collection('fares').where('versionId', '==', versionId).get()
  if (snapshot.empty) return 0

  const batch = db.batch()
  snapshot.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()
  return snapshot.size
}

const upsertVersion = async ({
  versionId,
  vesselType,
  name,
  effectiveFrom
}) => {
  const ref = db.collection('fareVersions').doc(versionId)
  const payload = {
    vesselType,
    name,
    effectiveFrom,
    description: 'Imported from fare-master.json',
    updatedAt: timestamp,
    updatedBy: SEED_USER,
    source: SOURCE_TAG
  }

  const docSnap = await ref.get()
  if (!docSnap.exists) {
    payload.createdAt = timestamp
    payload.createdBy = SEED_USER
  }

  await ref.set(payload, { merge: true })
}

const writeDocuments = async (collectionName, items) => {
  if (!items.length) return
  const batched = db.batch()
  items.forEach(({ id, data }) => {
    const ref = db.collection(collectionName).doc(id)
    batched.set(ref, data, { merge: true })
  })
  await batched.commit()
}

const logSection = (title) => {
  console.log('')
  console.log(`=== ${title} ===`)
}

const main = async () => {
  console.log('🚀 Firestore 初期データ投入ツール (fare-master.json)')
  console.log(`    実行モード: ${shouldExecute ? '書き込みモード' : 'ドライラン'}`)
  console.log(`    プロジェクトID: ${admin.app().options.projectId || '(default)'}`)

  const fareMaster = await loadFareMaster()

  logSection('フェリー料金の準備')
  const ferryDocs = createFerryDocuments(fareMaster.routes ?? [], ferryVersionId)
  console.log(`  フェリー路線数: ${ferryDocs.length}`)
  console.log(`  バージョンID: ${ferryVersionId} (適用開始日: ${ferryEffectiveFrom})`)

  let highspeedDocs = []
  if (!skipHighspeed && fareMaster.rainbowJetFares) {
    logSection('高速船料金の準備')
    highspeedDocs = createHighspeedDocuments(fareMaster.rainbowJetFares, highspeedVersionId)
    console.log(`  高速船路線数: ${highspeedDocs.length}`)
    console.log(`  バージョンID: ${highspeedVersionId} (適用開始日: ${highspeedEffectiveFrom})`)
  } else if (skipHighspeed) {
    console.log('')
    console.log('=== 高速船料金の準備 ===')
    console.log('  高速船データの投入はスキップされました (--skip-highspeed)。')
  }

  let discountDocs = []
  if (!skipDiscounts && fareMaster.discounts) {
    logSection('割引データの準備')
    discountDocs = createDiscountDocuments(fareMaster.discounts)
    console.log(`  割引件数: ${discountDocs.length}`)
  } else if (skipDiscounts) {
    console.log('')
    console.log('=== 割引データの準備 ===')
    console.log('  割引データの投入はスキップされました (--skip-discounts)。')
  }

  if (!shouldExecute) {
    console.log('')
    console.log('ℹ️  ドライランのため Firestore への書き込みは行っていません。')
    console.log('    実際に投入する場合は --execute オプションを付けて再実行してください。')
    return
  }

  console.log('')
  console.log('🧹  既存データの削除 (対象バージョンのみ)')
  const removedFerry = await deleteExistingFaresByVersion(ferryVersionId)
  console.log(`  フェリー料金: ${removedFerry} 件削除`)

  if (highspeedDocs.length) {
    const removedHighspeed = await deleteExistingFaresByVersion(highspeedVersionId)
    console.log(`  高速船料金: ${removedHighspeed} 件削除`)
  }

  console.log('')
  console.log('📝  fareVersions の更新')
  await upsertVersion({
    versionId: ferryVersionId,
    vesselType: 'ferry',
    name: ferryVersionName,
    effectiveFrom: ferryEffectiveFrom
  })

  if (highspeedDocs.length) {
    await upsertVersion({
      versionId: highspeedVersionId,
      vesselType: 'highspeed',
      name: highspeedVersionName,
      effectiveFrom: highspeedEffectiveFrom
    })
  }

  console.log('')
  console.log('📦  fares コレクションへの書き込み')
  await writeDocuments('fares', ferryDocs)
  console.log(`  フェリー料金を ${ferryDocs.length} 件作成/更新しました。`)

  if (highspeedDocs.length) {
    await writeDocuments('fares', highspeedDocs)
    console.log(`  高速船料金を ${highspeedDocs.length} 件作成/更新しました。`)
  }

  if (discountDocs.length) {
    console.log('')
    console.log('💳  discounts コレクションへの書き込み')
    await writeDocuments('discounts', discountDocs)
    console.log(`  割引データを ${discountDocs.length} 件作成/更新しました。`)
  }

  console.log('')
  console.log('✅  インポートが完了しました。')
}

main().catch((error) => {
  console.error('❌ インポート処理でエラーが発生しました:', error)
  process.exit(1)
})
