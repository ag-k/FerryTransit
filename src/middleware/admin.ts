export default defineNuxtRouteMiddleware(async (to, from) => {
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