import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

let app: App

// Firebase Admin SDKの初期化
if (getApps().length === 0) {
  // 環境変数から認証情報を取得
  const serviceAccount = process.env.ADMIN_SERVICE_ACCOUNT
  if (!serviceAccount) {
    throw new Error('ADMIN_SERVICE_ACCOUNT environment variable is not set')
  }

  try {
    const serviceAccountKey = JSON.parse(serviceAccount)
    app = initializeApp({
      credential: cert(serviceAccountKey),
      storageBucket: process.env.STORAGE_BUCKET || ''
    })
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
    throw new Error('Invalid ADMIN_SERVICE_ACCOUNT configuration')
  }
} else {
  app = getApps()[0]
}

// サービスのエクスポート
export const auth = getAuth(app)
export const firestore = getFirestore(app)
export const storage = getStorage(app).bucket()

// カスタムクレームの設定
export const setCustomUserClaims = async (uid: string, claims: { admin?: boolean; superAdmin?: boolean }) => {
  try {
    await auth.setCustomUserClaims(uid, claims)
    return { success: true }
  } catch (error) {
    console.error('Failed to set custom claims:', error)
    throw error
  }
}

// ユーザーの作成
export const createAdminUser = async (email: string, password: string, claims?: { admin?: boolean; superAdmin?: boolean }) => {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true
    })

    if (claims) {
      await setCustomUserClaims(userRecord.uid, claims)
    }

    return userRecord
  } catch (error) {
    console.error('Failed to create admin user:', error)
    throw error
  }
}

// トークンの検証
export const verifyIdToken = async (idToken: string) => {
  try {
    return await auth.verifyIdToken(idToken)
  } catch (error) {
    console.error('Failed to verify ID token:', error)
    throw error
  }
}