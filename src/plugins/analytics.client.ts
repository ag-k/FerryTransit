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
      if (!to.path || to.path.startsWith('/admin')) {
        return
      }
      trackPageView({ pagePath: to.path })
    })
  }
})
