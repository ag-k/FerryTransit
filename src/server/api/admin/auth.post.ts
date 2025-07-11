import { auth } from '~/server/utils/firebase-admin'
import type { DecodedIdToken } from 'firebase-admin/auth'

export default defineEventHandler(async (event) => {
  try {
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
    const customClaims = decodedToken.admin || decodedToken.superAdmin
    if (!customClaims) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Insufficient permissions'
      })
    }

    // ユーザー情報を返す
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      admin: decodedToken.admin || false,
      superAdmin: decodedToken.superAdmin || false
    }
  } catch (error) {
    // エラーが既にcreateErrorで作成されている場合はそのまま投げる
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    
    // その他のエラー
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})