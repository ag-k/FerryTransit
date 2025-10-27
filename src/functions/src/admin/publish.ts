/* eslint-disable no-console */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

/**
 * データの本番公開（管理者のみ実行可能）
 * FirestoreからStorageへデータを公開
 */
export const publishData = onCall(
  { region: 'asia-northeast1' },
  async (request) => {
  // 呼び出し元の認証確認
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // 管理者権限の確認
  const callerToken = await admin.auth().getUser(request.auth.uid)
  if (!callerToken.customClaims?.admin && !callerToken.customClaims?.superAdmin) {
    throw new HttpsError('permission-denied', 'Admin access required')
  }

  const { dataType } = request.data

  if (!dataType || !['timetable', 'fare', 'holidays'].includes(dataType)) {
    throw new HttpsError('invalid-argument', 'Valid data type is required')
  }

  try {
    let publishData: any
    let fileName: string = ''

    // データの準備
    switch (dataType) {
      case 'timetable':
        publishData = await prepareTimetableData()
        fileName = 'timetable.json'
        break
      case 'fare':
        publishData = await prepareFareData()
        fileName = 'fare-master.json'
        break
      case 'holidays':
        publishData = await prepareHolidayData()
        fileName = 'holidays.json'
        break
      default:
        throw new HttpsError('invalid-argument', 'Invalid data type')
    }

    // Storageへアップロード
    const bucket = admin.storage().bucket()
    const file = bucket.file(`data/${fileName}`)
    
    await file.save(JSON.stringify(publishData, null, 2), {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=3600',
        metadata: {
          publishedBy: request.auth.uid,
          publishedAt: new Date().toISOString(),
          dataType
        }
      }
    })

    // ファイルを公開
    await file.makePublic()
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/data/${fileName}`

    // 公開履歴を保存
    await admin.firestore().collection('publishHistory').add({
      type: dataType,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedBy: request.auth.uid,
      publishedByEmail: callerToken.email,
      url: publicUrl,
      recordCount: Array.isArray(publishData) ? publishData.length : 
                   (publishData.fares ? publishData.fares.length : 0)
    })

    // 管理操作ログの記録
    await admin.firestore().collection('adminLogs').add({
      action: 'publish',
      target: dataType,
      targetId: fileName,
      adminId: request.auth.uid,
      adminEmail: callerToken.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { url: publicUrl }
    })

    return {
      success: true,
      url: publicUrl,
      dataType,
      publishedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to publish data:', error)
    throw new HttpsError('internal', 'Failed to publish data')
  }
})

/**
 * データのロールバック（管理者のみ実行可能）
 */
export const rollbackData = onCall(
  { region: 'asia-northeast1' },
  async (request) => {
  // 呼び出し元の認証確認
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // 管理者権限の確認
  const callerToken = await admin.auth().getUser(request.auth.uid)
  if (!callerToken.customClaims?.admin && !callerToken.customClaims?.superAdmin) {
    throw new HttpsError('permission-denied', 'Admin access required')
  }

  const { historyId } = request.data

  if (!historyId) {
    throw new HttpsError('invalid-argument', 'History ID is required')
  }

  try {
    // 履歴データを取得
    const historyDoc = await admin.firestore()
      .collection('publishHistory')
      .doc(historyId)
      .get()

    if (!historyDoc.exists) {
      throw new HttpsError('not-found', 'History not found')
    }

    const history = historyDoc.data()!
    
    // バックアップからデータを復元
    const bucket = admin.storage().bucket()
    const backupFile = bucket.file(`backups/${history.type}_${historyId}.json`)
    
    const [exists] = await backupFile.exists()
    if (!exists) {
      throw new HttpsError('not-found', 'Backup file not found')
    }

    // バックアップデータを取得
    const [backupData] = await backupFile.download()
    const data = JSON.parse(backupData.toString())

    // 本番環境に復元
    const fileName = history.type === 'timetable' ? 'timetable.json' :
                    history.type === 'fare' ? 'fare-master.json' : 'holidays.json'
    
    const file = bucket.file(`data/${fileName}`)
    await file.save(JSON.stringify(data, null, 2), {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=3600',
        metadata: {
          rolledBackBy: request.auth.uid,
          rolledBackAt: new Date().toISOString(),
          fromHistoryId: historyId
        }
      }
    })

    // ファイルを公開
    await file.makePublic()

    // 管理操作ログの記録
    await admin.firestore().collection('adminLogs').add({
      action: 'rollback',
      target: history.type,
      targetId: historyId,
      adminId: request.auth.uid,
      adminEmail: callerToken.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        originalPublishedAt: history.publishedAt
      }
    })

    return {
      success: true,
      dataType: history.type,
      rolledBackAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to rollback data:', error)
    throw new HttpsError('internal', 'Failed to rollback data')
  }
})

// ヘルパー関数
async function prepareTimetableData() {
  const snapshot = await admin.firestore().collection('timetables').get()
  return snapshot.docs.map(doc => ({
    tripId: doc.id,
    ...doc.data()
  }))
}

async function prepareFareData() {
  const [faresSnapshot, versionsSnapshot, discountsSnapshot] = await Promise.all([
    admin.firestore().collection('fares').get(),
    admin.firestore().collection('fareVersions').get(),
    admin.firestore().collection('discounts').where('active', '==', true).get()
  ])

  const parseTimestamp = (value) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 0 : date.getTime()
  }

  const fares = faresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const versions = versionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  const versionMetaMap = new Map()
  versions.forEach((version) => {
    versionMetaMap.set(version.id, version)
  })

  const fallbackVersions = {}
  const ensureFallbackVersion = (vesselType) => {
    if (!fallbackVersions[vesselType]) {
      const fallbackId = `legacy-${vesselType}`
      const metadata = {
        id: fallbackId,
        vesselType,
        name: '既存データ',
        effectiveFrom: '1970-01-01'
      }
      fallbackVersions[vesselType] = metadata
      versionMetaMap.set(fallbackId, metadata)
    }
    return fallbackVersions[vesselType]
  }

  const versionFaresMap = new Map()

  fares.forEach((fare) => {
    const vesselType = fare.type || 'ferry'
    let versionId = fare.versionId

    if (!versionId || !versionMetaMap.has(versionId)) {
      const fallback = ensureFallbackVersion(vesselType)
      versionId = fallback.id
    }

    if (!versionFaresMap.has(versionId)) {
      versionFaresMap.set(versionId, [])
    }

    versionFaresMap.get(versionId).push(fare)
  })

  const versionPayloads = []
  versionFaresMap.forEach((fareList, versionId) => {
    const meta = versionMetaMap.get(versionId) || {}
    const vesselType = meta.vesselType || fareList[0]?.type || 'ferry'

    versionPayloads.push({
      id: versionId,
      vesselType,
      name: meta.name || null,
      description: meta.description || null,
      effectiveFrom: meta.effectiveFrom || '1970-01-01',
      createdAt: meta.createdAt || null,
      updatedAt: meta.updatedAt || null,
      fares: fareList.map((fare) => ({
        route: fare.route,
        adult: fare.adult,
        child: fare.child,
        car3m: typeof fare.car3m === 'undefined' ? null : fare.car3m,
        car4m: typeof fare.car4m === 'undefined' ? null : fare.car4m,
        car5m: typeof fare.car5m === 'undefined' ? null : fare.car5m,
        type: fare.type
      }))
    })
  })

  const versionsByType = {}
  versionPayloads.forEach((version) => {
    if (!versionsByType[version.vesselType]) {
      versionsByType[version.vesselType] = []
    }
    versionsByType[version.vesselType].push(version)
  })

  const activeVersionIds = {}
  const activeFares = []
  const now = Date.now()

  Object.entries(versionsByType).forEach(([vesselType, list]) => {
    const sorted = list.sort((a, b) => parseTimestamp(b.effectiveFrom) - parseTimestamp(a.effectiveFrom))
    const active = sorted.find((version) => parseTimestamp(version.effectiveFrom) <= now) || sorted[sorted.length - 1]
    if (active) {
      activeVersionIds[vesselType] = active.id
      activeFares.push(...active.fares)
    }
  })

  if (!activeFares.length) {
    activeFares.push(
      ...fares.map(fare => ({
        route: fare.route,
        adult: fare.adult,
        child: fare.child,
        car3m: typeof fare.car3m === 'undefined' ? null : fare.car3m,
        car4m: typeof fare.car4m === 'undefined' ? null : fare.car4m,
        car5m: typeof fare.car5m === 'undefined' ? null : fare.car5m,
        type: fare.type
      }))
    )
  }

  return {
    fares: activeFares,
    versions: versionPayloads,
    activeVersionIds,
    discounts: discountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }
}

async function prepareHolidayData() {
  const snapshot = await admin.firestore().collection('holidays').get()
  return snapshot.docs.map(doc => doc.data())
}
