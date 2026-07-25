import {
  getPreferredLocaleRootRedirect,
  readPreferredLocale
} from '@/utils/userPreferences'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const preferredLocale = readPreferredLocale(localStorage)
  const redirectPath = getPreferredLocaleRootRedirect(to.path, preferredLocale)
  if (redirectPath) {
    return navigateTo(redirectPath, { replace: true })
  }
})
