export interface PopularRoute {
  fromPort: string
  toPort: string
  count: number
  percentage: number
}

export interface FavoriteStats {
  totalFavorites: number
  routeFavorites: number
  portFavorites: number
}

export interface DashboardStats {
  dailyAccess: number
  monthlyAccess: number
  activeUsers: number
  popularRoutes: PopularRoute[]
  favoriteStats: FavoriteStats
  errorCount: number
}

export interface AccessLog {
  id: string
  userId?: string
  action: string
  resource: string
  timestamp: Date
  ip?: string
  userAgent?: string
}

export interface AdminLog {
  id: string
  adminId: string
  adminEmail: string
  action: 'create' | 'update' | 'delete' | 'publish'
  resource: string
  resourceId?: string
  changes?: Record<string, any>
  timestamp: Date
}

export interface SystemSettings {
  maintenanceMode: boolean
  maintenanceMessage?: string
  dataUpdateSchedule?: string
  autoBackupEnabled: boolean
  backupSchedule?: string
}
