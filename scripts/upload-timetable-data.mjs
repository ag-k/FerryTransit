#!/usr/bin/env node

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readEmulatorConfig } from './emulator-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { hosts } = readEmulatorConfig(path.join(__dirname, '..'));

// エミュレータに接続
const storage = new Storage({
  apiEndpoint: `http://${hosts.storage}`,
  projectId: 'oki-ferryguide'
});

async function uploadTimetableData() {
  try {
    console.log('📤 時刻表データをCloud Storageエミュレータにアップロードします...');

    const bucketName = 'oki-ferryguide.appspot.com';
    const fileName = 'data/timetable.json';
    const filePath = path.join(__dirname, '..', 'gtfs', 'generated', 'public', 'timetable.json');

    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      console.error('❌ 時刻表データファイルが見つかりません:', filePath);
      console.error('   先に npm run timetable:build を実行してください。');
      process.exit(1);
    }

    // バケットを取得または作成
    console.log('📦 バケットを確認します:', bucketName);
    let bucket;
    try {
      bucket = storage.bucket(bucketName);
      await bucket.exists();
      console.log('✅ バケットは既に存在します');
    } catch (error) {
      console.log('📦 バケットを作成します...');
      await storage.createBucket(bucketName);
      bucket = storage.bucket(bucketName);
      console.log('✅ バケットを作成しました');
    }

    // ファイルをアップロード
    await bucket.upload(filePath, {
      destination: fileName,
      metadata: {
        contentType: 'application/json',
        cacheControl: 'no-cache'
      }
    });

    console.log('✅ 時刻表データのアップロードが完了しました');
    console.log(`📁 バケット: ${bucketName}`);
    console.log(`📄 ファイル: ${fileName}`);

    // 検証
    const [files] = await bucket.getFiles();
    const timetableFile = files.find(f => f.name === fileName);

    if (timetableFile) {
      console.log('✅ アップロードを確認しました');
      const [metadata] = await timetableFile.getMetadata();
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

uploadTimetableData();
