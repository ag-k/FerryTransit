import { useFerryData } from '@/composables/useFerryData'
import { createLogger } from '~/utils/logger'

export default defineNuxtPlugin((nuxtApp) => {
  // onMountedで実行（コンポーネントのマウント後）
  nuxtApp.hook('app:mounted', async () => {
    // クライアントサイドでのみ実行
    const { initializeData } = useFerryData()
    const logger = createLogger('FerryDataPlugin')
    
    try {
      // アプリケーション起動時にデータを初期化
      await initializeData()
    } catch (error) {
      logger.error('Failed to initialize ferry data', error)
    }
    
    // 定期的に運航状況を更新（5分ごと）
    if (process.client) {
      setInterval(async () => {
        const { updateShipStatus } = useFerryData()
        await updateShipStatus()
      }, 5 * 60 * 1000)
    }
  })
})
