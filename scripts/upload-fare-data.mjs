#!/usr/bin/env node

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// エミュレータに接続
const storage = new Storage({
  apiEndpoint: 'http://localhost:9199',
  projectId: 'oki-ferry-guide'
});

async function uploadFareData() {
  try {
    console.log('📤 料金データをCloud Storageエミュレータにアップロードします...');
    
    const bucketName = 'oki-ferry-guide.appspot.com';
    const fileName = 'fare-master.json';
    const filePath = path.join(__dirname, '..', 'src', 'public', 'data', 'fare-master.json');
    
    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      console.error('❌ 料金データファイルが見つかりません:', filePath);
      process.exit(1);
    }
    
    // バケットを作成
    console.log('📦 バケットを作成します:', bucketName);
    try {
      await storage.createBucket(bucketName);
      console.log('✅ バケットを作成しました');
    } catch (error) {
      if (error.code === 409) {
        console.log('✅ バケットは既に存在します');
      } else {
        throw error;
      }
    }
    
    const bucket = storage.bucket(bucketName);
    
    // ファイルをアップロード
    await bucket.upload(filePath, {
      destination: fileName,
      metadata: {
        contentType: 'application/json',
        cacheControl: 'no-cache'
      }
    });
    
    console.log('✅ 料金データのアップロードが完了しました');
    console.log(`📁 バケット: ${bucketName}`);
    console.log(`📄 ファイル: ${fileName}`);
    
    // 検証
    const [files] = await bucket.getFiles();
    const fareFile = files.find(f => f.name === fileName);
    
    if (fareFile) {
      console.log('✅ アップロードを確認しました');
      const [metadata] = await fareFile.getMetadata();
      console.log(`📊 サイズ: ${metadata.size} bytes`);
      console.log(`🕒 更新日時: ${metadata.updated}`);
    } else {
      console.error('❌ アップロードの確認に失敗しました');
    }
    
  } catch (error) {
    console.error('❌ アップロード中にエラーが発生しました:', error);
    process.exit(1);
  }
}

uploadFareData();
