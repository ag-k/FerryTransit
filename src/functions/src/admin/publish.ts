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
  const [faresSnapshot, discountsSnapshot, peakPeriodsSnapshot] = await Promise.all([
    admin.firestore().collection('fares').get(),
    admin.firestore().collection('discounts').where('active', '==', true).get(),
    admin.firestore().collection('peakPeriods').get()
  ])

  return {
    fares: faresSnapshot.docs.map(doc => doc.data()),
    discounts: discountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })),
    peakPeriods: peakPeriodsSnapshot.docs.map(doc => doc.data())
  }
}

async function prepareHolidayData() {
  const snapshot = await admin.firestore().collection('holidays').get()
  return snapshot.docs.map(doc => doc.data())
}
