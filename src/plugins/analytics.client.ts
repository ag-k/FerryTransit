import { isBrowserTestMode } from '~/utils/testMode'
import { shouldTrackAnalyticsPath } from '~/utils/analyticsTracking'

/**
 * Analytics Tracking Plugin
 * ルート遷移ごとにPVを追跡
 */

export default defineNuxtPlugin({
  name: 'analytics',
  dependsOn: ['firebase'],
  setup: () => {
    const { trackPageView } = useAnalytics()
    // ルート遷移の監視
    const router = useRouter()
  
    // ルート遷移ごとにPVを記録
    router.afterEach((to) => {
      if (!shouldTrackAnalyticsPath({
        path: to.path,
        isTestMode: isBrowserTestMode(),
        isCapacitorBuild: __CAPACITOR_BUILD__
      })) {
        return
      }
      trackPageView({ pagePath: to.path })
    })
  }
})
