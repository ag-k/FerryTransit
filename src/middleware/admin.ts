import { Capacitor } from '@capacitor/core'

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Capacitor（ネイティブアプリ）からの管理画面アクセスを禁止
  if (Capacitor.isNativePlatform()) {
    throw createError({
      statusCode: 403,
      statusMessage: '管理画面にはWebブラウザからのみアクセスできます'
    })
  }

  const authStore = useAuthStore()
  const { canAccess } = useAdminPermissions()
  
  // ログインページは除外
  if (to.path === '/admin/login') {
    if (authStore.isAuthenticated && authStore.isAdmin) {
      return navigateTo('/admin')
    }
    return
  }
  
  // 認証状態を確認
  if (!authStore.user) {
    await authStore.checkAuth()
  }
  
  // 未認証または管理者でない場合はログインページへ
  if (!authStore.isAuthenticated || !authStore.isAdmin) {
    return navigateTo('/admin/login')
  }
  
  // リソースへのアクセス権限を確認
  if (!canAccess(to.path)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'このページへのアクセス権限がありません'
    })
  }
})
