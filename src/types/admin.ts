export interface PopularRoute {
  fromPort: string
  toPort: string
  count: number
  percentage: number
}

export interface DashboardStats {
  dailyAccess: number
  monthlyAccess: number
  dailySearches: number
  monthlySearches: number
  popularRoutes: PopularRoute[]
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
