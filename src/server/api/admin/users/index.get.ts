import { auth, firestore } from '~/server/utils/firebase-admin'
import { requireAdminAuth } from '~/server/utils/admin-auth'

export default defineEventHandler(async (event) => {
  // 管理者認証の確認
  const admin = await requireAdminAuth(event)
  
  try {
    // クエリパラメータの取得
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const role = query.role as string | undefined

    // Firebase Authからユーザー一覧を取得
    const listUsersResult = await auth.listUsers(limit, query.pageToken as string)
    
    // ユーザー情報を整形
    const users = await Promise.all(
      listUsersResult.users.map(async (user) => {
        // Firestoreから追加情報を取得
        const userDoc = await firestore.collection('users').doc(user.uid).get()
        const userData = userDoc.exists ? userDoc.data() : {}
        
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          disabled: user.disabled,
          emailVerified: user.emailVerified,
          createdAt: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime,
          admin: user.customClaims?.admin || false,
          superAdmin: user.customClaims?.superAdmin || false,
          ...userData
        }
      })
    )

    // ロールでフィルタリング
    const filteredUsers = role
      ? users.filter(user => {
          if (role === 'admin') return user.admin || user.superAdmin
          if (role === 'superAdmin') return user.superAdmin
          if (role === 'user') return !user.admin && !user.superAdmin
          return true
        })
      : users

    return {
      users: filteredUsers,
      pageToken: listUsersResult.pageToken,
      totalCount: filteredUsers.length,
      hasMore: !!listUsersResult.pageToken
    }
  } catch (error) {
    console.error('Failed to fetch users:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users'
    })
  }
})