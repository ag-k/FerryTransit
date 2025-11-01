import { createApp } from 'vue'
import { useRouteSearch } from './src/composables/useRouteSearch.js'

// テスト用の非同期関数
async function testRouteSearch() {
  try {
    console.log('別府→菱浦の乗換案内を検索中...')
    
    // 料金ストアを初期化
    const { useFareStore } = await import('./src/stores/fare.js')
    const fareStore = useFareStore()
    await fareStore.loadFareMaster()
    
    // フェリーストアを初期化
    const { useFerryStore } = await import('./src/stores/ferry.js')
    const ferryStore = useFerryStore()
    
    // ルート検索を実行
    const { searchRoutes } = useRouteSearch()
    const results = await searchRoutes(
      'BEPPU',
      'HISHIURA',
      new Date('2025-11-02T00:00:00'),
      '00:00',
      false
    )
    
    console.log(`検索結果: ${results.length}件`)
    
    results.forEach((route, index) => {
      console.log(`\n=== 経路 ${index + 1} ===`)
      console.log(`出発時刻: ${route.departureTime}`)
      console.log(`到着時刻: ${route.arrivalTime}`)
      console.log(`合計料金: ${route.totalFare}円`)
      
      route.segments.forEach((segment, segIndex) => {
        console.log(`  セグメント ${segIndex + 1}:`)
        console.log(`    船名: ${segment.ship}`)
        console.log(`    区間: ${segment.departure} → ${segment.arrival}`)
        console.log(`    料金: ${segment.fare}円`)
        console.log(`    状態: ${segment.status}`)
      })
    })
    
    // 料金が0円でないことを確認
    const hasValidFares = results.some(route => route.totalFare > 0)
    console.log(`\n料金確認: ${hasValidFares ? '✅ 料金が表示されています' : '❌ 料金が表示されていません'}`)
    
  } catch (error) {
    console.error('エラーが発生しました:', error)
  }
}

// テスト実行
testRouteSearch()
