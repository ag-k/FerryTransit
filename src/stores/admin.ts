import { defineStore } from 'pinia'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { limit, orderBy } from 'firebase/firestore'
import type { DashboardStats, AdminLog, SystemSettings } from '~/types/admin'
import type { PopularRoute as AnalyticsPopularRoute } from '~/types/analytics'
import { PORTS_DATA } from '~/data/ports'
import { useAnalytics } from '~/composables/useAnalytics'
import { useAdminFirestore } from '~/composables/useAdminFirestore'

const TIMEZONE = 'Asia/Tokyo'

const normalizeBackupInterval = (value?: string) => {
  const mapping: Record<string, string> = {
    daily: '毎日',
    weekly: '毎週',
    monthly: '毎月'
  }
  if (!value) return undefined
  return mapping[value] || value
}

interface AdminState {
  dashboardStats: DashboardStats | null
  recentLogs: AdminLog[]
  systemSettings: SystemSettings | null
  isLoading: boolean
  error: string | null
}

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    dashboardStats: null,
    recentLogs: [],
    systemSettings: null,
    isLoading: false,
    error: null
  }),

  actions: {
    async fetchDashboardStats() {
      this.isLoading = true
      this.error = null

      try {
        const { 
          getDailyAnalytics, 
          getMonthlyAnalytics, 
          getPopularRoutes,
          getUniqueUsersCount,
          getErrorStats
        } = useAnalytics()

        const now = new Date()
        const tokyoNow = toZonedTime(now, TIMEZONE)
        const dateKey = format(tokyoNow, 'yyyy-MM-dd')
        const monthKey = format(tokyoNow, 'yyyy-MM')
        const rangeStart = startOfDay(subDays(tokyoNow, 6))
        const rangeEnd = endOfDay(tokyoNow)

        const [
          dailyAnalytics,
          monthlyAnalytics,
          popularRoutesRaw,
          activeUsers,
          errorStats
        ] = await Promise.all([
          getDailyAnalytics(dateKey),
          getMonthlyAnalytics(monthKey),
          getPopularRoutes(rangeStart, rangeEnd, 5),
          getUniqueUsersCount(rangeStart, rangeEnd),
          getErrorStats(rangeStart, rangeEnd)
        ])

        const mappedRoutes = (popularRoutesRaw || []).map((route: AnalyticsPopularRoute) => {
          const fromPort = PORTS_DATA[route.depId]?.name || route.depId
          const toPort = PORTS_DATA[route.arrId]?.name || route.arrId
          return {
            fromPort,
            toPort,
            count: route.count,
            percentage: 0
          }
        })

        const maxCount = mappedRoutes.reduce((max, route) => Math.max(max, route.count), 0)
        const popularRoutes = mappedRoutes.map(route => ({
          ...route,
          percentage: maxCount > 0 ? Math.round((route.count / maxCount) * 100) : 0
        }))

        const errorCount = errorStats
          ? Object.values(errorStats).reduce((sum, value) => {
            if (typeof value !== 'number') return sum
            return sum + value
          }, 0)
          : 0

        this.dashboardStats = {
          dailyAccess: dailyAnalytics?.pvTotal ?? 0,
          monthlyAccess: monthlyAnalytics?.pvTotal ?? 0,
          activeUsers: activeUsers ?? 0,
          popularRoutes,
          favoriteStats: {
            totalFavorites: 0,
            routeFavorites: 0,
            portFavorites: 0
          },
          errorCount
        }
      } catch (error: any) {
        this.error = error.message || '統計データの取得に失敗しました'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchRecentLogs(limitValue: number = 10) {
      try {
        const { getCollection } = useAdminFirestore()
        const logs = await getCollection<any>('adminLogs', [
          orderBy('timestamp', 'desc'),
          limit(limitValue)
        ])

        const allowedActions: AdminLog['action'][] = ['create', 'update', 'delete', 'publish']

        this.recentLogs = logs.map((log) => {
          const rawAction = typeof log.action === 'string' ? log.action : ''
          const normalizedAction =
            allowedActions.find(action => action === rawAction) || 'update'

          return {
            id: log.id ?? '',
            adminId: log.adminId || '',
            adminEmail: log.adminEmail || '',
            action: normalizedAction,
            resource: log.target || log.resource || '',
            resourceId: log.targetId || log.resourceId,
            changes: log.details || log.changes,
            timestamp: log.timestamp || log.updatedAt || log.createdAt || new Date(0)
          }
        })
      } catch (error: any) {
        this.error = error.message || 'ログの取得に失敗しました'
        throw error
      }
    },

    async fetchSystemSettings() {
      try {
        const { getDocument } = useAdminFirestore()
        const settingsDoc = await getDocument<any>('adminSettings', 'global')

        if (!settingsDoc) {
          this.systemSettings = {
            maintenanceMode: false,
            maintenanceMessage: '',
            autoBackupEnabled: false
          }
          return
        }

        const site = settingsDoc.site || {}
        const data = settingsDoc.data || {}

        this.systemSettings = {
          maintenanceMode: Boolean(site.maintenanceMode),
          maintenanceMessage: site.maintenanceMessage || '',
          dataUpdateSchedule: site.dataUpdateSchedule,
          autoBackupEnabled: Boolean(data.autoBackup),
          backupSchedule: normalizeBackupInterval(data.backupInterval)
        }
      } catch (error: any) {
        this.error = error.message || 'システム設定の取得に失敗しました'
        throw error
      }
    },

    async updateSystemSettings(settings: Partial<SystemSettings>) {
      try {
        const { updateDocument } = useAdminFirestore()
        const updateData: Record<string, any> = {}

        if (settings.maintenanceMode !== undefined) {
          updateData['site.maintenanceMode'] = settings.maintenanceMode
        }
        if (settings.maintenanceMessage !== undefined) {
          updateData['site.maintenanceMessage'] = settings.maintenanceMessage
        }
        if (settings.dataUpdateSchedule !== undefined) {
          updateData['site.dataUpdateSchedule'] = settings.dataUpdateSchedule
        }
        if (settings.autoBackupEnabled !== undefined) {
          updateData['data.autoBackup'] = settings.autoBackupEnabled
        }
        if (settings.backupSchedule !== undefined) {
          updateData['data.backupInterval'] = settings.backupSchedule
        }

        if (Object.keys(updateData).length > 0) {
          await updateDocument('adminSettings', 'global', updateData)
        }

        const baseSettings =
          this.systemSettings || {
            maintenanceMode: false,
            maintenanceMessage: '',
            autoBackupEnabled: false
          }

        this.systemSettings = {
          ...baseSettings,
          ...settings
        }
      } catch (error: any) {
        this.error = error.message || 'システム設定の更新に失敗しました'
        throw error
      }
    },

    async logAdminAction(action: Omit<AdminLog, 'id' | 'timestamp'>) {
      try {
        const { logAdminAction } = useAdminFirestore()
        await logAdminAction(
          action.action,
          action.resource,
          action.resourceId || '',
          { changes: action.changes || {} }
        )

        const log: AdminLog = {
          ...action,
          id: Date.now().toString(),
          timestamp: new Date()
        }
        this.recentLogs.unshift(log)
        if (this.recentLogs.length > 100) {
          this.recentLogs.pop()
        }
      } catch (error: any) {
        this.error = error.message || '管理者アクションの記録に失敗しました'
        throw error
      }
    }
  }
})
