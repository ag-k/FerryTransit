import { useFerryData } from '@/composables/useFerryData'

export default defineNuxtPlugin(async () => {
  console.log('Ferry data plugin starting...')
  
  // クライアントサイドでのみ実行
  const { initializeData } = useFerryData()
  
  try {
    // アプリケーション起動時にデータを初期化
    console.log('Initializing ferry data...')
    await initializeData()
    console.log('Ferry data initialized successfully')
  } catch (error) {
    console.error('Failed to initialize ferry data:', error)
  }
  
  // 定期的に運航状況を更新（5分ごと）
  if (process.client) {
    setInterval(async () => {
      const { updateShipStatus } = useFerryData()
      await updateShipStatus()
    }, 5 * 60 * 1000)
  }
})