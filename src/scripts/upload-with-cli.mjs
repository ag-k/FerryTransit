#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * Firebase Storage へのデータアップロード（Firebase CLI認証使用）
 * 
 * 使用方法:
 * node scripts/upload-with-cli.mjs
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// アップロードするファイルの設定
const filesToUpload = [
  {
    localPath: 'public/data/timetable.json',
    storagePath: 'data/timetable.json'
  },
  {
    localPath: 'public/data/fare-master.json',
    storagePath: 'data/fare-master.json'
  },
  {
    localPath: 'public/data/holidays.json',
    storagePath: 'data/holidays.json'
  }
]

async function uploadFile(localPath, storagePath) {
  try {
    const filePath = join(dirname(__dirname), localPath)
    
    // ファイルの存在確認
    if (!existsSync(filePath)) {
      console.error(`❌ ファイルが見つかりません: ${filePath}`)
      return false
    }
    
    // gsutil を使用してアップロード
    const command = `gsutil -h "Cache-Control:public, max-age=900" cp "${filePath}" "gs://oki-ferryguide.firebasestorage.app/${storagePath}"`
    
    console.log(`📤 アップロード中: ${localPath} → ${storagePath}`)
    const { stdout, stderr } = await execAsync(command)
    
    if (stderr && !stderr.includes('Copying file://')) {
      throw new Error(stderr)
    }
    
    const publicUrl = `https://storage.googleapis.com/oki-ferryguide.firebasestorage.app/${storagePath}`
    console.log(`✅ アップロード成功: ${storagePath}`)
    console.log(`   公開URL: ${publicUrl}`)
    
    return true
  } catch (error) {
    console.error(`❌ アップロードエラー (${localPath}):`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Firebase Storage へのデータアップロードを開始します...')
  console.log(`   バケット: oki-ferryguide.firebasestorage.app`)
  console.log('')
  
  // gsutil が利用可能か確認
  try {
    await execAsync('gsutil version')
  } catch (error) {
    console.error('❌ エラー: gsutil がインストールされていません')
    console.error('Google Cloud SDK をインストールしてください: https://cloud.google.com/sdk/docs/install')
    process.exit(1)
  }
  
  let successCount = 0
  
  for (const file of filesToUpload) {
    const success = await uploadFile(file.localPath, file.storagePath)
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
