#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * Firebase Storage へのデータアップロードスクリプト
 * 
 * 使用方法:
 * node scripts/upload-to-storage.js
 */

import fs from 'node:fs'
import path from 'node:path'
import admin from 'firebase-admin'

// Firebase Admin SDK の初期化
// サービスアカウントキーが必要な場合は、環境変数で指定
const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || 'oki-ferryguide.firebasestorage.app'

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const serviceAccountPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: storageBucketName
  })
} else {
  // デフォルトの認証情報を使用（Firebase エミュレータや GCP 環境で動作）
  admin.initializeApp({
    storageBucket: storageBucketName
  })
}

const bucket = admin.storage().bucket()

// アップロードするファイルの設定
const filesToUpload = [
  {
    localPath: 'src/public/data/timetable.json',
    storagePath: 'data/timetable.json',
    contentType: 'application/json'
  },
  {
    localPath: 'src/public/data/fare-master.json',
    storagePath: 'data/fare-master.json',
    contentType: 'application/json'
  },
  {
    localPath: 'src/public/data/holidays.json',
    storagePath: 'data/holidays.json',
    contentType: 'application/json'
  }
]

async function uploadFile(localPath, storagePath, contentType) {
  try {
    const filePath = path.join(process.cwd(), localPath)

    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ファイルが見つかりません: ${filePath}`)
      return false
    }

    // ファイルをアップロード
    await bucket.upload(filePath, {
      destination: storagePath,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=900' // 15分のキャッシュ
      }
    })

    // ファイルを公開設定にする
    const file = bucket.file(storagePath)
    await file.makePublic()

    // 公開URLを取得
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

    console.log(`✅ アップロード成功: ${localPath} → ${storagePath}`)
    console.log(`   公開URL: ${publicUrl}`)

    return true
  } catch (error) {
    console.error(`❌ アップロードエラー (${localPath}):`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Firebase Storage へのデータアップロードを開始します...')
  console.log(`   バケット: ${bucket.name}`)
  console.log('')

  let successCount = 0

  for (const file of filesToUpload) {
    const success = await uploadFile(file.localPath, file.storagePath, file.contentType)
    if (success) successCount++
  }

  console.log('')
  console.log(`📊 結果: ${successCount}/${filesToUpload.length} ファイルのアップロードに成功しました`)

  if (successCount < filesToUpload.length) {
    process.exit(1)
  }
}

// 実行
main().catch(error => {
  console.error('エラーが発生しました:', error)
  process.exit(1)
})
