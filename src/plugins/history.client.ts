import { useHistoryStore } from '@/stores/history'
import { createLogger } from '~/utils/logger'

export default defineNuxtPlugin((nuxtApp) => {
  // Initialize history store when app is mounted
  nuxtApp.hook('app:mounted', async () => {
    // Only run on client side
    if (process.client) {
      const historyStore = useHistoryStore()
      const logger = createLogger('HistoryPlugin')
      
      try {
        // Load search history from storage
        await historyStore.initializeStore()
        logger.debug('History store initialized successfully')
      } catch (error) {
        logger.error('Failed to initialize history store', error)
      }
    }
  })
})
