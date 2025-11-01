#!/usr/bin/env node

// 開発環境での料金データ読み込みテスト
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useOfflineStore } from './src/stores/offline.ts'

// Vueアプリを初期化（クライアントサイドシミュレーション）
const app = createApp({})
const pinia = createPinia()
app.use(pinia)

// テスト実行
async function testFareDataLoading() {
  console.log('🧪 料金データ読み込みテストを開始します...')
  
  try {
    const offlineStore = useOfflineStore()
    
    // 料金データを読み込み
    console.log('📡 料金データを取得します...')
    const fareData = await offlineStore.fetchFareData()
    
    if (fareData) {
      console.log('✅ 料金データの読み込みに成功しました')
      console.log(`📊 路線数: ${fareData.routes?.length || 0}`)
      console.log(`🚢 RainbowJet路線数: ${Object.keys(fareData.rainbowJetFares || {}).length}`)
      
      // 特定の路線を確認
      const hondoRoute = fareData.routes?.find(r => 
        r.departure === 'HONDO_SHICHIRUI' && r.arrival === 'SAIGO'
      )
      
      if (hondoRoute) {
        console.log(`✅ HONDO_SHICHIRUI→SAIGO路線が見つかりました: ¥${hondoRoute.fares.adult}`)
      } else {
        console.log('❌ HONDO_SHICHIRUI→SAIGO路線が見つかりません')
      }
    } else {
      console.log('❌ 料金データの読み込みに失敗しました')
    }
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error)
  }
}

testFareDataLoading()
