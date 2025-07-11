import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

/**
 * 管理者権限の設定（スーパー管理者のみ実行可能）
 */
export const setAdminClaim = onCall(
  { region: 'asia-northeast1' },
  async (request) => {
  // 呼び出し元の認証確認
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // スーパー管理者権限の確認
  const callerToken = await admin.auth().getUser(request.auth.uid)
  if (!callerToken.customClaims?.superAdmin) {
    throw new HttpsError('permission-denied', 'Super admin access required')
  }

  const { uid, admin: isAdmin, superAdmin: isSuperAdmin } = request.data

  if (!uid) {
    throw new HttpsError('invalid-argument', 'User ID is required')
  }

  try {
    // カスタムクレームの設定
    await admin.auth().setCustomUserClaims(uid, {
      admin: isAdmin || false,
      superAdmin: isSuperAdmin || false
    })

    // Firestoreにも記録
    await admin.firestore().collection('users').doc(uid).set({
      admin: isAdmin || false,
      superAdmin: isSuperAdmin || false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid
    }, { merge: true })

    // 管理操作ログの記録
    await admin.firestore().collection('adminLogs').add({
      action: 'setAdminClaim',
      target: 'users',
      targetId: uid,
      adminId: request.auth.uid,
      adminEmail: callerToken.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { admin: isAdmin, superAdmin: isSuperAdmin }
    })

    return { success: true, uid }
  } catch (error) {
    console.error('Failed to set admin claim:', error)
    throw new HttpsError('internal', 'Failed to set admin claim')
  }
})

/**
 * ユーザーの無効化/有効化（管理者のみ実行可能）
 */
export const setUserDisabled = onCall(
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

  const { uid, disabled } = request.data

  if (!uid || typeof disabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'User ID and disabled status are required')
  }

  try {
    // ユーザーの無効化/有効化
    await admin.auth().updateUser(uid, { disabled })

    // Firestoreにも記録
    await admin.firestore().collection('users').doc(uid).set({
      disabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid
    }, { merge: true })

    // 管理操作ログの記録
    await admin.firestore().collection('adminLogs').add({
      action: disabled ? 'disableUser' : 'enableUser',
      target: 'users',
      targetId: uid,
      adminId: request.auth.uid,
      adminEmail: callerToken.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { disabled }
    })

    return { success: true, uid, disabled }
  } catch (error) {
    console.error('Failed to update user status:', error)
    throw new HttpsError('internal', 'Failed to update user status')
  }
})

/**
 * ユーザーの完全削除（スーパー管理者のみ実行可能）
 */
export const deleteUser = onCall(
  { region: 'asia-northeast1' },
  async (request) => {
  // 呼び出し元の認証確認
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // スーパー管理者権限の確認
  const callerToken = await admin.auth().getUser(request.auth.uid)
  if (!callerToken.customClaims?.superAdmin) {
    throw new HttpsError('permission-denied', 'Super admin access required')
  }

  const { uid } = request.data

  if (!uid) {
    throw new HttpsError('invalid-argument', 'User ID is required')
  }

  try {
    // ユーザー情報を取得（ログ用）
    const userRecord = await admin.auth().getUser(uid)

    // Firebase Authenticationからユーザーを削除
    await admin.auth().deleteUser(uid)

    // Firestoreからユーザードキュメントを削除
    await admin.firestore().collection('users').doc(uid).delete()

    // 管理操作ログの記録
    await admin.firestore().collection('adminLogs').add({
      action: 'deleteUser',
      target: 'users',
      targetId: uid,
      adminId: request.auth.uid,
      adminEmail: callerToken.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        deletedEmail: userRecord.email,
        deletedDisplayName: userRecord.displayName
      }
    })

    return { success: true, uid }
  } catch (error) {
    console.error('Failed to delete user:', error)
    throw new HttpsError('internal', 'Failed to delete user')
  }
})