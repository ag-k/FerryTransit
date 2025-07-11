import { auth, firestore } from '~/server/utils/firebase-admin'
import { requireSuperAdminAuth } from '~/server/utils/admin-auth'

interface UpdateUserBody {
  disabled?: boolean
  admin?: boolean
  superAdmin?: boolean
  displayName?: string
  email?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  // スーパー管理者認証の確認
  const adminToken = await requireSuperAdminAuth(event)
  
  const uid = getRouterParam(event, 'uid')
  if (!uid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required'
    })
  }

  const body = await readBody<UpdateUserBody>(event)
  
  try {
    // Firebase Authの更新
    const authUpdate: any = {}
    
    if (body.disabled !== undefined) authUpdate.disabled = body.disabled
    if (body.displayName !== undefined) authUpdate.displayName = body.displayName
    if (body.email !== undefined) authUpdate.email = body.email
    if (body.password !== undefined) authUpdate.password = body.password
    
    if (Object.keys(authUpdate).length > 0) {
      await auth.updateUser(uid, authUpdate)
    }
    
    // カスタムクレームの更新
    if (body.admin !== undefined || body.superAdmin !== undefined) {
      const currentUser = await auth.getUser(uid)
      const claims = {
        admin: body.admin ?? currentUser.customClaims?.admin ?? false,
        superAdmin: body.superAdmin ?? currentUser.customClaims?.superAdmin ?? false
      }
      await auth.setCustomUserClaims(uid, claims)
    }
    
    // Firestoreの更新
    const firestoreUpdate: any = {
      updatedAt: new Date(),
      updatedBy: adminToken.uid
    }
    
    if (body.displayName !== undefined) firestoreUpdate.displayName = body.displayName
    
    await firestore.collection('users').doc(uid).set(firestoreUpdate, { merge: true })
    
    // 管理操作ログの記録
    await firestore.collection('adminLogs').add({
      action: 'updateUser',
      target: 'users',
      targetId: uid,
      adminId: adminToken.uid,
      adminEmail: adminToken.email,
      timestamp: new Date(),
      details: body,
      ip: getClientIP(event),
      userAgent: getHeader(event, 'user-agent')
    })
    
    // 更新後のユーザー情報を返す
    const updatedUser = await auth.getUser(uid)
    const userDoc = await firestore.collection('users').doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : {}
    
    return {
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      photoURL: updatedUser.photoURL,
      disabled: updatedUser.disabled,
      emailVerified: updatedUser.emailVerified,
      admin: updatedUser.customClaims?.admin || false,
      superAdmin: updatedUser.customClaims?.superAdmin || false,
      ...userData
    }
  } catch (error) {
    console.error('Failed to update user:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update user'
    })
  }
})

function getClientIP(event: H3Event): string {
  return getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
         getHeader(event, 'x-real-ip') || 
         event.node.req.socket.remoteAddress || 
         'unknown'
}