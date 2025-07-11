import type { AdminUser } from '~/types/auth'

export const useAdminPermissions = () => {
  const authStore = useAuthStore()
  
  const permissions = {
    // スーパー管理者のみ
    MANAGE_ADMINS: ['super'],
    SYSTEM_SETTINGS: ['super'],
    DELETE_ALL_DATA: ['super'],
    
    // スーパー管理者と一般管理者
    MANAGE_TIMETABLE: ['super', 'general'],
    MANAGE_FARE: ['super', 'general'],
    MANAGE_ALERTS: ['super', 'general'],
    MANAGE_ANNOUNCEMENTS: ['super', 'general'],
    VIEW_ANALYTICS: ['super', 'general'],
    EXPORT_DATA: ['super', 'general'],
    IMPORT_DATA: ['super', 'general'],
    PUBLISH_DATA: ['super', 'general']
  }
  
  const hasPermission = (permission: keyof typeof permissions): boolean => {
    const user = authStore.user
    if (!user || !user.customClaims?.admin) return false
    
    const role = user.customClaims.role || 'general'
    const allowedRoles = permissions[permission]
    
    return allowedRoles.includes(role)
  }
  
  const canAccess = (resource: string): boolean => {
    const resourcePermissions: Record<string, keyof typeof permissions> = {
      '/admin/users': 'MANAGE_ADMINS',
      '/admin/settings': 'SYSTEM_SETTINGS',
      '/admin/timetable': 'MANAGE_TIMETABLE',
      '/admin/fare': 'MANAGE_FARE',
      '/admin/alerts': 'MANAGE_ALERTS',
      '/admin/announcements': 'MANAGE_ANNOUNCEMENTS',
      '/admin/analytics': 'VIEW_ANALYTICS',
      '/admin/data-management': 'EXPORT_DATA'
    }
    
    const permission = resourcePermissions[resource]
    if (!permission) return true // デフォルトは許可
    
    return hasPermission(permission)
  }
  
  const getUserRole = (): string => {
    const user = authStore.user
    if (!user || !user.customClaims?.admin) return 'none'
    return user.customClaims.role || 'general'
  }
  
  const isSuperAdmin = (): boolean => {
    return getUserRole() === 'super'
  }
  
  const isGeneralAdmin = (): boolean => {
    return getUserRole() === 'general'
  }
  
  return {
    hasPermission,
    canAccess,
    getUserRole,
    isSuperAdmin,
    isGeneralAdmin,
    permissions
  }
}