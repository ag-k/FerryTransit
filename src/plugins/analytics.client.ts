import { isBrowserTestMode } from '~/utils/testMode'

/**
 * Analytics Tracking Plugin
 * ルート遷移ごとにPVを追跡
 */

export default defineNuxtPlugin({
  name: 'analytics',
  dependsOn: ['firebase'],
  setup: () => {
    const { trackPageView } = useAnalytics()
    const shouldSkipTracking = (path?: string) => {
      if (!path) {
        return true
      }
      if (isBrowserTestMode()) {
        return true
      }
      if (__CAPACITOR_BUILD__) {
        return false
      }
      return path.startsWith('/admin')
    }
  
    // ルート遷移の監視
    const router = useRouter()
  
    // ルート遷移ごとにPVを記録
    router.afterEach((to) => {
      if (shouldSkipTracking(to.path)) {
        return
      }
      trackPageView({ pagePath: to.path })
    })
  }
})
