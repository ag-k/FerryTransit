#!/usr/bin/env node

/**
 * ブラウザから抽出した運賃データをFirestoreに登録するスクリプト
 * 
 * 使用方法:
 *   node scripts/import-fare-from-browser.mjs <extracted-fare-data.json> [options]
 * 
 * オプション:
 *   --version-name <name>        版の名称（デフォルト: ブラウザから抽出）
 *   --version-id <id>            版のID（デフォルト: extracted-YYYYMMDD-HHMMSS）
 *   --effective-from <date>      適用開始日（YYYY-MM-DD, デフォルト: 今日）
 *   --execute                     実際にFirestoreに書き込む（指定しない場合はドライラン）
 *   --emulator                    エミュレータに接続（デフォルト: 本番）
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import admin from 'firebase-admin'

const projectRoot = process.cwd()

// コマンドライン引数の解析
const args = process.argv.slice(2)
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag)
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1]
  }
  return defaultValue
}

const hasFlag = (flag) => args.includes(flag)

const jsonFilePath = args.find(arg => !arg.startsWith('--') && arg.endsWith('.json'))
if (!jsonFilePath) {
  console.error('❌ エラー: JSONファイルのパスを指定してください')
  console.error('   使用方法: node scripts/import-fare-from-browser.mjs <extracted-fare-data.json> [options]')
  process.exit(1)
}

const shouldExecute = hasFlag('--execute')
const useEmulator = hasFlag('--emulator')

const now = new Date()
const defaultVersionId = `extracted-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

const versionName = getArg('--version-name', 'ブラウザから抽出')
const versionId = getArg('--version-id', defaultVersionId)
const effectiveFrom = getArg('--effective-from', now.toISOString().slice(0, 10))

console.log('💰 ブラウザから抽出した運賃データをFirestoreに登録します...')
console.log(`   実行モード: ${shouldExecute ? '書き込みモード' : 'ドライラン'}`)
console.log(`   接続先: ${useEmulator ? 'エミュレータ' : '本番'}`)
console.log(`   版ID: ${versionId}`)
console.log(`   版名: ${versionName}`)
console.log(`   適用開始日: ${effectiveFrom}`)

try {
  // Firebase Admin SDKの初期化
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8082'
    admin.initializeApp({
      projectId: 'oki-ferryguide'
    })
    console.log('🔥 エミュレータに接続します')
  } else {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (serviceAccountPath) {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'oki-ferryguide'
      })
      console.log('🔥 本番環境に接続します')
    } else {
      admin.initializeApp({
        projectId: 'oki-ferryguide'
      })
      console.log('🔥 デフォルト認証情報で接続します')
    }
  }

  const db = admin.firestore()
  db.settings({ ignoreUndefinedProperties: true })

  // JSONファイルを読み込む
  const jsonPath = join(projectRoot, jsonFilePath)
  const extractedData = JSON.parse(readFileSync(jsonPath, 'utf8'))

  console.log(`📊 JSONファイルを読み込みました: ${jsonFilePath}`)
  console.log(`   抽出日時: ${extractedData.extractedAt || '不明'}`)

  if (!extractedData.passengerFare && !extractedData.vehicleFare) {
    console.error('❌ エラー: 旅客運賃または自動車運賃のデータが見つかりません')
    console.error('   JSONファイルに passengerFare または vehicleFare が含まれているか確認してください')
    process.exit(1)
  }

  // データをパースしてFirestore形式に変換
  const fareRecords = []

  // 路線名から路線IDのマッピング（複数の表記に対応）
  const routeNameToCategoryMap = {
    '本土～隠岐': 'hondo-oki',
    '島前～島後': 'dozen-dogo',
    '別府～菱浦（島前～島前）': 'beppu-hishiura',
    '別府～菱浦': 'beppu-hishiura',
    '菱浦～来居（島前～島前）': 'hishiura-kuri',
    '菱浦～来居': 'hishiura-kuri',
    '来居～別府（島前～島前）': 'kuri-beppu',
    '来居～別府': 'kuri-beppu'
  }

  // 路線名を正規化してマッピングを検索する関数
  function findCategoryByRouteName(routeName) {
    if (!routeName) return null

    // 直接マッチ
    if (routeNameToCategoryMap[routeName]) {
      return routeNameToCategoryMap[routeName]
    }

    // 括弧内の文字を除去して検索
    const normalized = routeName.replace(/（[^）]*）/g, '').trim()
    if (normalized !== routeName && routeNameToCategoryMap[normalized]) {
      return routeNameToCategoryMap[normalized]
    }

    // 部分一致で検索
    for (const [key, value] of Object.entries(routeNameToCategoryMap)) {
      const keyNormalized = key.replace(/（[^）]*）/g, '').trim()
      if (normalized === keyNormalized || routeName.includes(keyNormalized) || keyNormalized.includes(normalized)) {
        return value
      }
    }

    return null
  }

  // 料金表ではカテゴリ単位で管理されているため、個別路線IDへの展開は不要
  // カテゴリID（hondo-oki など）をそのまま route として使用

  // 座席クラスのマッピング
  const seatClassMap = {
    '2等': 'class2',
    '特2等': 'class2Special',
    '1等': 'class1',
    '特等': 'classSpecial',
    '特別室': 'specialRoom'
  }

  // 旅客運賃データの処理
  if (extractedData.passengerFare && Array.isArray(extractedData.passengerFare)) {
    console.log('📋 旅客運賃データを処理中...')

    const passengerRows = extractedData.passengerFare
    if (passengerRows.length === 0) {
      console.warn('⚠️ 旅客運賃データが空です')
    } else {
      // 1行目が路線名のヘッダー
      const routeHeaderRow = passengerRows[0]
      const routeNames = []

      // 路線名を抽出（1列目は空または座席クラス名なのでスキップ）
      for (let col = 1; col < routeHeaderRow.length; col++) {
        const routeName = routeHeaderRow[col]?.text?.trim()
        if (routeName && routeName.length > 0) {
          routeNames.push(routeName)
        }
      }

      console.log(`   路線数: ${routeNames.length} (${routeNames.join(', ')})`)

      // 2行目以降が座席クラスと運賃データ
      for (let rowIndex = 1; rowIndex < passengerRows.length; rowIndex++) {
        const row = passengerRows[rowIndex]
        if (row.length === 0) continue

        const seatClassText = row[0]?.text?.trim()
        const seatClassKey = seatClassMap[seatClassText]

        if (!seatClassKey) {
          // 座席クラスでない行はスキップ
          continue
        }

        console.log(`   座席クラス: ${seatClassText} (${seatClassKey})`)

        // 各路線の運賃を処理
        for (let colIndex = 1; colIndex < row.length && colIndex <= routeNames.length; colIndex++) {
          const routeName = routeNames[colIndex - 1]
          const fare = row[colIndex]?.number

          if (fare === null || fare === undefined) continue

          const categoryId = findCategoryByRouteName(routeName)
          if (!categoryId) {
            console.warn(`   ⚠️ 路線名「${routeName}」のマッピングが見つかりません`)
            continue
          }

          // カテゴリ単位で1つのレコードを作成（料金表ではカテゴリ単位で管理）
          let existingRecord = fareRecords.find(r => r.categoryId === categoryId)

          if (!existingRecord) {
            // カテゴリのメタデータから出発地・到着地を取得
            const categoryMetadata = {
              'hondo-oki': { departure: 'HONDO', arrival: 'SAIGO' },
              'dozen-dogo': { departure: 'SAIGO', arrival: 'BEPPU' },
              'beppu-hishiura': { departure: 'BEPPU', arrival: 'HISHIURA' },
              'hishiura-kuri': { departure: 'HISHIURA', arrival: 'KURI' },
              'kuri-beppu': { departure: 'KURI', arrival: 'BEPPU' }
            }
            const metadata = categoryMetadata[categoryId] || { departure: null, arrival: null }

            existingRecord = {
              type: 'ferry',
              versionId,
              route: null, // route を null にして categoryFallback に確実に登録されるようにする
              routeName: null, // routeName も null にして categoryFallback に確実に登録されるようにする
              categoryId, // カテゴリIDを追加（/admin/fare ページで categoryFallback として使用される）
              departure: metadata.departure,
              arrival: metadata.arrival,
              seatClass: {},
              fares: {
                seatClass: {}
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
            fareRecords.push(existingRecord)
          }

          // 座席クラス運賃を設定
          if (!existingRecord.seatClass) {
            existingRecord.seatClass = {}
            existingRecord.fares.seatClass = {}
          }
          existingRecord.seatClass[seatClassKey] = fare
          existingRecord.fares.seatClass[seatClassKey] = fare

          console.log(`   ✓ ${routeName} (${categoryId}): ${seatClassText}=${fare}円`)
        }
      }
    }
  }

  // 車両サイズのマッピング
  const vehicleSizeMap = {
    '3m未満': 'under3m',
    '4m未満': 'under4m',
    '5m未満': 'under5m',
    '6m未満': 'under6m',
    '7m未満': 'under7m',
    '8m未満': 'under8m',
    '9m未満': 'under9m',
    '10m未満': 'under10m',
    '11m未満': 'under11m',
    '12m未満': 'under12m',
    '12m以上1m増すごとに': 'over12mPer1m',
    '12m超(1m毎)': 'over12mPer1m',
    '12m超': 'over12mPer1m'
  }

  // 自動車運賃データの処理
  if (extractedData.vehicleFare && Array.isArray(extractedData.vehicleFare)) {
    console.log('🚗 自動車運賃データを処理中...')

    const vehicleRows = extractedData.vehicleFare
    if (vehicleRows.length === 0) {
      console.warn('⚠️ 自動車運賃データが空です')
    } else {
      // 1行目が路線名のヘッダー
      const routeHeaderRow = vehicleRows[0]
      const routeNames = []

      // 路線名を抽出（1列目は空または車両サイズ名なのでスキップ）
      for (let col = 1; col < routeHeaderRow.length; col++) {
        const routeName = routeHeaderRow[col]?.text?.trim()
        if (routeName && routeName.length > 0) {
          routeNames.push(routeName)
        }
      }

      console.log(`   路線数: ${routeNames.length} (${routeNames.join(', ')})`)

      // 2行目以降が車両サイズと運賃データ
      for (let rowIndex = 1; rowIndex < vehicleRows.length; rowIndex++) {
        const row = vehicleRows[rowIndex]
        if (row.length === 0) continue

        const vehicleSizeText = row[0]?.text?.trim()
        const vehicleSizeKey = vehicleSizeMap[vehicleSizeText]

        if (!vehicleSizeKey) {
          // 車両サイズでない行はスキップ
          continue
        }

        console.log(`   車両サイズ: ${vehicleSizeText} (${vehicleSizeKey})`)

        // 各路線の運賃を処理
        for (let colIndex = 1; colIndex < row.length && colIndex <= routeNames.length; colIndex++) {
          const routeName = routeNames[colIndex - 1]
          const fare = row[colIndex]?.number

          if (fare === null || fare === undefined) continue

          const categoryId = findCategoryByRouteName(routeName)
          if (!categoryId) {
            console.warn(`   ⚠️ 路線名「${routeName}」のマッピングが見つかりません`)
            continue
          }

          // カテゴリ単位で1つのレコードを作成（料金表ではカテゴリ単位で管理）
          let existingRecord = fareRecords.find(r => r.categoryId === categoryId)

          if (!existingRecord) {
            // カテゴリのメタデータから出発地・到着地を取得
            const categoryMetadata = {
              'hondo-oki': { departure: 'HONDO', arrival: 'SAIGO' },
              'dozen-dogo': { departure: 'SAIGO', arrival: 'BEPPU' },
              'beppu-hishiura': { departure: 'BEPPU', arrival: 'HISHIURA' },
              'hishiura-kuri': { departure: 'HISHIURA', arrival: 'KURI' },
              'kuri-beppu': { departure: 'KURI', arrival: 'BEPPU' }
            }
            const metadata = categoryMetadata[categoryId] || { departure: null, arrival: null }

            existingRecord = {
              type: 'ferry',
              versionId,
              route: null, // route を null にして categoryFallback に確実に登録されるようにする
              routeName: null, // routeName も null にして categoryFallback に確実に登録されるようにする
              categoryId, // カテゴリIDを追加（/admin/fare ページで categoryFallback として使用される）
              departure: metadata.departure,
              arrival: metadata.arrival,
              vehicle: {},
              fares: {
                vehicle: {}
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
            fareRecords.push(existingRecord)
          }

          // 車両運賃を設定
          if (!existingRecord.vehicle) {
            existingRecord.vehicle = {}
            existingRecord.fares.vehicle = {}
          }
          existingRecord.vehicle[vehicleSizeKey] = fare
          existingRecord.fares.vehicle[vehicleSizeKey] = fare

          console.log(`   ✓ ${routeName} (${categoryId}): ${vehicleSizeText}=${fare}円`)
        }
      }
    }
  }

  console.log(`\n📊 合計 ${fareRecords.length} 件の運賃レコードを準備しました`)

  // デバッグ: 各カテゴリのレコードを確認
  const hondoOkiRecord = fareRecords.find(r => r.categoryId === 'hondo-oki')
  const dozenDogoRecord = fareRecords.find(r => r.categoryId === 'dozen-dogo')
  if (hondoOkiRecord) {
    console.log('\n🔍 [デバッグ] 本土〜隠岐のレコード:')
    console.log('  categoryId:', hondoOkiRecord.categoryId)
    console.log('  route:', hondoOkiRecord.route)
    console.log('  routeName:', hondoOkiRecord.routeName)
    console.log('  seatClass keys:', Object.keys(hondoOkiRecord.seatClass || {}))
    console.log('  vehicle keys:', Object.keys(hondoOkiRecord.vehicle || {}))
    console.log('  fares.seatClass keys:', Object.keys(hondoOkiRecord.fares?.seatClass || {}))
    console.log('  fares.vehicle keys:', Object.keys(hondoOkiRecord.fares?.vehicle || {}))
  }
  if (dozenDogoRecord) {
    console.log('\n🔍 [デバッグ] 島前〜島後のレコード:')
    console.log('  categoryId:', dozenDogoRecord.categoryId)
    console.log('  route:', dozenDogoRecord.route)
    console.log('  routeName:', dozenDogoRecord.routeName)
    console.log('  seatClass keys:', Object.keys(dozenDogoRecord.seatClass || {}))
    console.log('  vehicle keys:', Object.keys(dozenDogoRecord.vehicle || {}))
    console.log('  fares.seatClass keys:', Object.keys(dozenDogoRecord.fares?.seatClass || {}))
    console.log('  fares.vehicle keys:', Object.keys(dozenDogoRecord.fares?.vehicle || {}))
  }

  if (!shouldExecute) {
    console.log('\nℹ️  ドライランのため Firestore への書き込みは行いません')
    console.log('   実際に投入する場合は --execute オプションを付けて再実行してください')
    console.log('\n📋 準備されたレコードのサンプル:')
    if (fareRecords.length > 0) {
      console.log(JSON.stringify(fareRecords[0], null, 2))
    }
    process.exit(0)
  }

  // 版情報を作成
  console.log('\n📝 版情報を作成中...')
  const versionDoc = {
    id: versionId,
    vesselType: 'ferry',
    name: versionName,
    effectiveFrom,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await db.collection('fareVersions').doc(versionId).set(versionDoc)
  console.log(`✅ 版情報を作成しました: ${versionId}`)

  // 運賃データをバッチで登録
  console.log('\n📦 運賃データを登録中...')
  const batchSize = 500
  let importedCount = 0

  for (let i = 0; i < fareRecords.length; i += batchSize) {
    const batch = db.batch()
    const batchEnd = Math.min(i + batchSize, fareRecords.length)

    for (let j = i; j < batchEnd; j++) {
      const record = fareRecords[j]
      const docRef = db.collection('fares').doc()
      batch.set(docRef, record)
    }

    await batch.commit()
    importedCount += batchEnd - i
    console.log(`✅ バッチ ${Math.floor(i / batchSize) + 1}: ${importedCount}/${fareRecords.length} 件を登録`)
  }

  console.log(`\n🎉 完了しました！`)
  console.log(`   - 版ID: ${versionId}`)
  console.log(`   - 登録件数: ${importedCount} 件`)

} catch (error) {
  console.error('❌ エラーが発生しました:', error)
  process.exit(1)
}



