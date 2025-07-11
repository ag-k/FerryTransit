import { auth } from './firebase-admin'
import type { H3Event } from 'h3'
import type { DecodedIdToken } from 'firebase-admin/auth'

/**
 * 管理者認証を要求するミドルウェア
 */
export async function requireAdminAuth(event: H3Event): Promise<DecodedIdToken> {
  // リクエストヘッダーからトークンを取得
  const authorization = getHeader(event, 'authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Missing or invalid authorization header'
    })
  }

  const idToken = authorization.split('Bearer ')[1]
  if (!idToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: No token provided'
    })
  }

  // トークンの検証
  let decodedToken: DecodedIdToken
  try {
    decodedToken = await auth.verifyIdToken(idToken)
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid token'
    })
  }

  // 管理者権限の確認
  const isAdmin = decodedToken.admin === true || decodedToken.superAdmin === true
  if (!isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Insufficient permissions'
    })
  }

  return decodedToken
}

/**
 * スーパー管理者認証を要求するミドルウェア
 */
export async function requireSuperAdminAuth(event: H3Event): Promise<DecodedIdToken> {
  const decodedToken = await requireAdminAuth(event)
  
  if (decodedToken.superAdmin !== true) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Super admin access required'
    })
  }
  
  return decodedToken
}