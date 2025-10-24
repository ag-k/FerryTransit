/* eslint-disable no-console */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'

/**
 * 全データのバックアップ作成（管理者のみ実行可能）
 */
export const createBackup = onCall(
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

  const { collections = ['timetables', 'fares', 'holidays', 'alerts', 'announcements'] } = request.data

  try {
    const backupData: Record<string, any[]> = {}
    
    // 各コレクションのデータを取得
    for (const collectionName of collections) {
      const snapshot = await admin.firestore().collection(collectionName).get()
      backupData[collectionName] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    }

    // バックアップファイルを作成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `backup_${timestamp}.json`
    
    const bucket = admin.storage().bucket()
    const file = bucket.file(`backups/${fileName}`)
    
    await file.save(JSON.stringify(backupData, null, 2), {
      metadata: {
        contentType: 'application/json',
        metadata: {
          createdBy: request.auth.uid,
          createdAt: new Date().toISOString(),
          collections: collections.join(',')
        }
      }
    })

    // バックアップメタデータを保存
    await admin.firestore().collection('backups').add({
      fileName,
      path: `backups/${fileName}`,
      size: Buffer.byteLength(JSON.stringify(backupData)),
      collections,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
      createdByEmail: callerToken.email
    })

    // 管理操作ログの記録
    await admin.firestore().collection('adminLogs').add({
      action: 'createBackup',
      target: 'backup',
      targetId: fileName,
      adminId: request.auth.uid,
      adminEmail: callerToken.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { collections }
    })

    return {
      success: true,
      fileName,
      collections,
      createdAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to create backup:', error)
    throw new HttpsError('internal', 'Failed to create backup')
  }
})

/**
 * 古いバックアップの自動削除（スケジュール実行）
 * 30日以上前のバックアップを削除
 */
export const cleanupOldBackups = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async (_event) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    try {
      // 古いバックアップを検索
      const snapshot = await admin.firestore()
        .collection('backups')
        .where('createdAt', '<', thirtyDaysAgo)
        .get()

      const bucket = admin.storage().bucket()
      const deletePromises: Promise<any>[] = []

      for (const doc of snapshot.docs) {
        const backup = doc.data()
        
        // Storageからファイルを削除
        const file = bucket.file(backup.path)
        deletePromises.push(file.delete().catch(err => {
          console.error(`Failed to delete file ${backup.path}:`, err)
        }))

        // Firestoreからドキュメントを削除
        deletePromises.push(doc.ref.delete())
      }

      await Promise.all(deletePromises)

      console.log(`Cleaned up ${snapshot.size} old backups`)
      
      // クリーンアップログを記録
      if (snapshot.size > 0) {
        await admin.firestore().collection('systemLogs').add({
          action: 'cleanupBackups',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          details: {
            deletedCount: snapshot.size,
            olderThan: thirtyDaysAgo.toISOString()
          }
        })
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error)
    }
  }
)
