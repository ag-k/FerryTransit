#!/usr/bin/env node

/**
 * Firebase Storage へのデータアップロードスクリプト
 * 
 * 使用方法:
 * node scripts/upload-to-storage.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Firebase Admin SDK の初期化
let app
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'oki-ferryguide.firebasestorage.app'
  })
} else {
  // デフォルトの認証情報を使用（Firebase エミュレータや GCP 環境で動作）
  app = initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'oki-ferryguide.firebasestorage.app'
  })
}

const bucket = getStorage().bucket()

// アップロードするファイルの設定
const filesToUpload = [
  {
    localPath: 'public/data/timetable.json',
    storagePath: 'data/timetable.json',
    contentType: 'application/json'
  },
  {
    localPath: 'public/data/fare-master.json',
    storagePath: 'data/fare-master.json',
    contentType: 'application/json'
  },
  {
    localPath: 'public/data/holidays.json',
    storagePath: 'data/holidays.json',
    contentType: 'application/json'
  }
]

async function uploadFile(localPath, storagePath, contentType) {
  try {
    const filePath = join(dirname(__dirname), localPath)
    
    // ファイルの存在確認
    if (!existsSync(filePath)) {
      console.error(`❌ ファイルが見つかりません: ${filePath}`)
      return false
    }
    
    // ファイルをアップロード
    await bucket.upload(filePath, {
      destination: storagePath,
      metadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=900' // 15分のキャッシュ
      }
    })
    
    // Uniform bucket-level accessが有効な場合、makePublicは不要
    // Storage ルールで公開設定を管理
    
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