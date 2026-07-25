#!/usr/bin/env node

/**
 * Firestoreの本番環境とエミュレータ環境のデータを比較するスクリプト
 * 
 * 使用方法:
 *   node scripts/compare-firestore-data.mjs [options]
 * 
 * オプション:
 *   --output <file>     比較結果をJSONファイルに出力（デフォルト: firestore-comparison.json）
 *   --collections <list> 比較するコレクションをカンマ区切りで指定（デフォルト: 全コレクション）
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import admin from 'firebase-admin'
import { configureAdminEmulatorEnv } from './emulator-config.mjs'

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

const outputFile = getArg('--output', 'firestore-comparison.json')
const collectionsArg = getArg('--collections', '')
const targetCollections = collectionsArg ? collectionsArg.split(',').map(c => c.trim()) : null

// 主要なコレクションリスト
const MAIN_COLLECTIONS = [
  'timetables',
  'fares',
  'fareVersions',
  'peakPeriods',
  'discounts',
  'alerts',
  'news',
  'holidays',
  'adminLogs',
  'publishHistory',
  'users',
  'admins',
  'shipStatus',
  'announcements'
]

/**
 * Firestoreから全コレクションのデータを取得
 */
async function fetchAllCollections(db, environment) {
  const collections = targetCollections || MAIN_COLLECTIONS
  const result = {}

  console.log(`\n📊 ${environment}環境からデータを取得中...`)

  for (const collectionName of collections) {
    try {
      const collectionRef = db.collection(collectionName)
      const snapshot = await collectionRef.get()

      const documents = {}
      snapshot.forEach(doc => {
        const data = doc.data()
        // Timestampを文字列に変換して比較しやすくする
        const normalizedData = normalizeData(data)
        documents[doc.id] = normalizedData
      })

      result[collectionName] = {
        count: snapshot.size,
        documents
      }

      console.log(`  ✓ ${collectionName}: ${snapshot.size}件`)
    } catch (error) {
      console.error(`  ✗ ${collectionName}: エラー - ${error.message}`)
      result[collectionName] = {
        count: 0,
        error: error.message,
        documents: {}
      }
    }
  }

  return result
}

/**
 * データを正規化（Timestampなどを文字列に変換）
 */
function normalizeData(data) {
  if (data === null || data === undefined) {
    return data
  }

  if (data instanceof admin.firestore.Timestamp) {
    return data.toDate().toISOString()
  }

  if (data instanceof Date) {
    return data.toISOString()
  }

  if (Array.isArray(data)) {
    return data.map(item => normalizeData(item))
  }

  if (typeof data === 'object') {
    const normalized = {}
    for (const [key, value] of Object.entries(data)) {
      normalized[key] = normalizeData(value)
    }
    return normalized
  }

  return data
}

/**
 * 2つのドキュメントのフィールドを詳細に比較
 */
function compareFields(prodDoc, emuDoc, path = '') {
  const differences = {
    differentValues: [],
    onlyInProduction: [],
    onlyInEmulator: []
  }

  const allKeys = new Set([
    ...Object.keys(prodDoc || {}),
    ...Object.keys(emuDoc || {})
  ])

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key
    const prodValue = prodDoc?.[key]
    const emuValue = emuDoc?.[key]

    // 片方にのみ存在するフィールド
    if (!(key in (prodDoc || {}))) {
      differences.onlyInEmulator.push({
        field: currentPath,
        value: emuValue
      })
    } else if (!(key in (emuDoc || {}))) {
      differences.onlyInProduction.push({
        field: currentPath,
        value: prodValue
      })
    } else {
      // 両方に存在する場合、値が異なるかチェック
      const prodStr = JSON.stringify(prodValue)
      const emuStr = JSON.stringify(emuValue)

      if (prodStr !== emuStr) {
        // ネストされたオブジェクトの場合は再帰的に比較
        if (typeof prodValue === 'object' && typeof emuValue === 'object' &&
          prodValue !== null && emuValue !== null &&
          !Array.isArray(prodValue) && !Array.isArray(emuValue)) {
          const nestedDiff = compareFields(prodValue, emuValue, currentPath)
          differences.differentValues.push(...nestedDiff.differentValues)
          differences.onlyInProduction.push(...nestedDiff.onlyInProduction)
          differences.onlyInEmulator.push(...nestedDiff.onlyInEmulator)
        } else {
          differences.differentValues.push({
            field: currentPath,
            production: prodValue,
            emulator: emuValue
          })
        }
      }
    }
  }

  return differences
}

/**
 * 2つの環境のデータを比較
 */
function compareData(production, emulator) {
  const comparison = {
    summary: {
      totalCollections: 0,
      matchingCollections: 0,
      differentCollections: 0,
      missingInProduction: 0,
      missingInEmulator: 0,
      totalFieldDifferences: 0
    },
    collections: {}
  }

  const allCollectionNames = new Set([
    ...Object.keys(production),
    ...Object.keys(emulator)
  ])

  comparison.summary.totalCollections = allCollectionNames.size

  for (const collectionName of allCollectionNames) {
    const prod = production[collectionName] || { count: 0, documents: {} }
    const emu = emulator[collectionName] || { count: 0, documents: {} }

    const prodDocIds = new Set(Object.keys(prod.documents || {}))
    const emuDocIds = new Set(Object.keys(emu.documents || {}))

    const onlyInProduction = [...prodDocIds].filter(id => !emuDocIds.has(id))
    const onlyInEmulator = [...emuDocIds].filter(id => !prodDocIds.has(id))
    const inBoth = [...prodDocIds].filter(id => emuDocIds.has(id))

    // 内容の差分をチェック（フィールドレベル）
    const fieldDifferences = {}
    let totalFieldDiffs = 0

    for (const docId of inBoth) {
      const prodDoc = prod.documents[docId]
      const emuDoc = emu.documents[docId]
      const docDiff = compareFields(prodDoc, emuDoc)

      const hasDifferences =
        docDiff.differentValues.length > 0 ||
        docDiff.onlyInProduction.length > 0 ||
        docDiff.onlyInEmulator.length > 0

      if (hasDifferences) {
        fieldDifferences[docId] = docDiff
        totalFieldDiffs +=
          docDiff.differentValues.length +
          docDiff.onlyInProduction.length +
          docDiff.onlyInEmulator.length
      }
    }

    const contentDifferences = Object.keys(fieldDifferences)
    comparison.summary.totalFieldDifferences += totalFieldDiffs

    const isMatching =
      prod.count === emu.count &&
      onlyInProduction.length === 0 &&
      onlyInEmulator.length === 0 &&
      contentDifferences.length === 0

    if (isMatching) {
      comparison.summary.matchingCollections++
    } else {
      comparison.summary.differentCollections++
    }

    if (prod.count === 0 && emu.count > 0) {
      comparison.summary.missingInProduction++
    }
    if (emu.count === 0 && prod.count > 0) {
      comparison.summary.missingInEmulator++
    }

    comparison.collections[collectionName] = {
      production: {
        count: prod.count,
        error: prod.error
      },
      emulator: {
        count: emu.count,
        error: emu.error
      },
      differences: {
        onlyInProduction: onlyInProduction,
        onlyInEmulator: onlyInEmulator,
        contentDifferences: contentDifferences,
        fieldDifferences: fieldDifferences,
        isMatching
      }
    }
  }

  return comparison
}

/**
 * 比較結果を表示
 */
function printComparison(comparison) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 Firestore データ比較結果')
  console.log('='.repeat(60))

  console.log('\n【サマリー】')
  console.log(`  総コレクション数: ${comparison.summary.totalCollections}`)
  console.log(`  一致: ${comparison.summary.matchingCollections}`)
  console.log(`  不一致: ${comparison.summary.differentCollections}`)
  console.log(`  本番のみ存在: ${comparison.summary.missingInProduction}`)
  console.log(`  エミュレータのみ存在: ${comparison.summary.missingInEmulator}`)
  console.log(`  フィールド差分総数: ${comparison.summary.totalFieldDifferences}`)

  console.log('\n【詳細】')
  for (const [collectionName, data] of Object.entries(comparison.collections)) {
    const { production, emulator, differences } = data

    if (differences.isMatching) {
      console.log(`\n✓ ${collectionName}`)
      console.log(`  本番: ${production.count}件 / エミュレータ: ${emulator.count}件 - 一致`)
    } else {
      console.log(`\n✗ ${collectionName}`)
      console.log(`  本番: ${production.count}件 / エミュレータ: ${emulator.count}件`)

      if (production.error) {
        console.log(`  ⚠ 本番環境エラー: ${production.error}`)
      }
      if (emulator.error) {
        console.log(`  ⚠ エミュレータ環境エラー: ${emulator.error}`)
      }

      if (differences.onlyInProduction.length > 0) {
        console.log(`  📤 本番のみ: ${differences.onlyInProduction.length}件`)
        if (differences.onlyInProduction.length <= 5) {
          differences.onlyInProduction.forEach(id => console.log(`    - ${id}`))
        } else {
          differences.onlyInProduction.slice(0, 5).forEach(id => console.log(`    - ${id}`))
          console.log(`    ... 他 ${differences.onlyInProduction.length - 5}件`)
        }
      }

      if (differences.onlyInEmulator.length > 0) {
        console.log(`  📥 エミュレータのみ: ${differences.onlyInEmulator.length}件`)
        if (differences.onlyInEmulator.length <= 5) {
          differences.onlyInEmulator.forEach(id => console.log(`    - ${id}`))
        } else {
          differences.onlyInEmulator.slice(0, 5).forEach(id => console.log(`    - ${id}`))
          console.log(`    ... 他 ${differences.onlyInEmulator.length - 5}件`)
        }
      }

      if (differences.contentDifferences.length > 0) {
        console.log(`  🔄 内容が異なる: ${differences.contentDifferences.length}件`)

        // フィールドレベルの差分を表示
        const fieldDiffs = differences.fieldDifferences || {}
        const displayCount = Math.min(differences.contentDifferences.length, 5)

        for (let i = 0; i < displayCount; i++) {
          const docId = differences.contentDifferences[i]
          const docDiff = fieldDiffs[docId]

          if (docDiff) {
            console.log(`\n    📄 ドキュメント: ${docId}`)

            // 値が異なるフィールド
            if (docDiff.differentValues.length > 0) {
              console.log(`      🔀 値が異なるフィールド (${docDiff.differentValues.length}件):`)
              docDiff.differentValues.slice(0, 3).forEach(diff => {
                const prodStr = typeof diff.production === 'object'
                  ? JSON.stringify(diff.production).substring(0, 50) + '...'
                  : String(diff.production).substring(0, 50)
                const emuStr = typeof diff.emulator === 'object'
                  ? JSON.stringify(diff.emulator).substring(0, 50) + '...'
                  : String(diff.emulator).substring(0, 50)
                console.log(`        - ${diff.field}`)
                console.log(`          本番: ${prodStr}`)
                console.log(`          エミュレータ: ${emuStr}`)
              })
              if (docDiff.differentValues.length > 3) {
                console.log(`        ... 他 ${docDiff.differentValues.length - 3}件`)
              }
            }

            // 本番のみのフィールド
            if (docDiff.onlyInProduction.length > 0) {
              console.log(`      📤 本番のみのフィールド (${docDiff.onlyInProduction.length}件):`)
              docDiff.onlyInProduction.slice(0, 3).forEach(diff => {
                const valueStr = typeof diff.value === 'object'
                  ? JSON.stringify(diff.value).substring(0, 50) + '...'
                  : String(diff.value).substring(0, 50)
                console.log(`        - ${diff.field}: ${valueStr}`)
              })
              if (docDiff.onlyInProduction.length > 3) {
                console.log(`        ... 他 ${docDiff.onlyInProduction.length - 3}件`)
              }
            }

            // エミュレータのみのフィールド
            if (docDiff.onlyInEmulator.length > 0) {
              console.log(`      📥 エミュレータのみのフィールド (${docDiff.onlyInEmulator.length}件):`)
              docDiff.onlyInEmulator.slice(0, 3).forEach(diff => {
                const valueStr = typeof diff.value === 'object'
                  ? JSON.stringify(diff.value).substring(0, 50) + '...'
                  : String(diff.value).substring(0, 50)
                console.log(`        - ${diff.field}: ${valueStr}`)
              })
              if (docDiff.onlyInEmulator.length > 3) {
                console.log(`        ... 他 ${docDiff.onlyInEmulator.length - 3}件`)
              }
            }
          }
        }

        if (differences.contentDifferences.length > 5) {
          console.log(`    ... 他 ${differences.contentDifferences.length - 5}件のドキュメントに差分があります`)
        }
      }
    }
  }
}

// メイン処理
async function main() {
  console.log('🔍 Firestore データ比較を開始します...\n')

  // 本番環境の接続
  console.log('📡 本番環境に接続中...')
  let prodDb
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (!serviceAccountPath) {
      console.error('❌ エラー: GOOGLE_APPLICATION_CREDENTIALS 環境変数が設定されていません')
      console.error('   本番環境に接続するには、サービスアカウントキーのパスを設定してください')
      process.exit(1)
    }

    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'oki-ferryguide'
    })
    prodDb = admin.firestore()
    console.log('✅ 本番環境に接続しました')
  } catch (error) {
    console.error('❌ 本番環境への接続に失敗しました:', error.message)
    process.exit(1)
  }

  // エミュレータ環境の接続
  console.log('📡 エミュレータ環境に接続中...')
  let emulatorDb
  try {
    // 本番の初期化をクリア
    admin.apps.forEach(app => app.delete())

    configureAdminEmulatorEnv({ projectRoot })
    admin.initializeApp({
      projectId: 'oki-ferryguide'
    })
    emulatorDb = admin.firestore()
    console.log('✅ エミュレータ環境に接続しました')
  } catch (error) {
    console.error('❌ エミュレータ環境への接続に失敗しました:', error.message)
    console.error('   エミュレータが起動しているか確認してください: npm run firebase:emulators')
    process.exit(1)
  }

  // データ取得
  const [productionData, emulatorData] = await Promise.all([
    fetchAllCollections(prodDb, '本番'),
    fetchAllCollections(emulatorDb, 'エミュレータ')
  ])

  // 比較
  const comparison = compareData(productionData, emulatorData)

  // 結果表示
  printComparison(comparison)

  // 結果をファイルに保存
  const outputPath = join(projectRoot, outputFile)
  writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    comparison,
    productionData,
    emulatorData
  }, null, 2))

  console.log(`\n💾 比較結果を保存しました: ${outputPath}`)
  console.log('\n✅ 比較完了')
}

main().catch(error => {
  console.error('❌ エラーが発生しました:', error)
  process.exit(1)
})
