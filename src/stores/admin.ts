import { defineStore } from 'pinia'
import type { DashboardStats, AdminLog, SystemSettings } from '~/types/admin'

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
    fetchDashboardStats() {
      this.isLoading = true
      this.error = null
      
      try {
        // TODO: Firestoreから統計データを取得
        // 現在はダミーデータ
        this.dashboardStats = {
          dailyAccess: 1234,
          monthlyAccess: 45678,
          activeUsers: 56,
          popularRoutes: [
            { fromPort: '西郷', toPort: '本土七類', count: 234, percentage: 100 },
            { fromPort: '本土七類', toPort: '西郷', count: 198, percentage: 85 },
            { fromPort: '西郷', toPort: '菱浦', count: 156, percentage: 67 },
            { fromPort: '菱浦', toPort: '西郷', count: 143, percentage: 61 },
            { fromPort: '西郷', toPort: '別府', count: 98, percentage: 42 }
          ],
          favoriteStats: {
            totalFavorites: 789,
            routeFavorites: 456,
            portFavorites: 333
          },
          errorCount: 3
        }
      } catch (error: any) {
        this.error = error.message || '統計データの取得に失敗しました'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    fetchRecentLogs(limit: number = 10) {
      try {
        // TODO: Firestoreから管理者ログを取得
        // 現在はダミーデータ
        const logs: AdminLog[] = [
          {
            id: '1',
            adminId: 'admin1',
            adminEmail: 'admin@example.com',
            action: 'update',
            resource: 'timetable',
            resourceId: 'timetable_001',
            changes: { updated_fields: ['departure_time', 'arrival_time'] },
            timestamp: new Date(Date.now() - 1000 * 60 * 5)
          },
          {
            id: '2',
            adminId: 'admin1',
            adminEmail: 'admin@example.com',
            action: 'create',
            resource: 'announcement',
            resourceId: 'announcement_001',
            timestamp: new Date(Date.now() - 1000 * 60 * 30)
          },
          {
            id: '3',
            adminId: 'admin2',
            adminEmail: 'admin2@example.com',
            action: 'delete',
            resource: 'alert',
            resourceId: 'alert_001',
            timestamp: new Date(Date.now() - 1000 * 60 * 60)
          }
        ]
        this.recentLogs = logs.slice(0, limit)
      } catch (error: any) {
        this.error = error.message || 'ログの取得に失敗しました'
        throw error
      }
    },

    fetchSystemSettings() {
      try {
        // TODO: Firestoreからシステム設定を取得
        // 現在はダミーデータ
        this.systemSettings = {
          maintenanceMode: false,
          maintenanceMessage: '',
          dataUpdateSchedule: '毎日 午前3時',
          autoBackupEnabled: true,
          backupSchedule: '毎日 午前2時'
        }
      } catch (error: any) {
        this.error = error.message || 'システム設定の取得に失敗しました'
        throw error
      }
    },

    updateSystemSettings(settings: Partial<SystemSettings>) {
      try {
        // TODO: Firestoreにシステム設定を保存
        this.systemSettings = {
          ...this.systemSettings!,
          ...settings
        }
      } catch (error: any) {
        this.error = error.message || 'システム設定の更新に失敗しました'
        throw error
      }
    },

    logAdminAction(action: Omit<AdminLog, 'id' | 'timestamp'>) {
      try {
        // TODO: Firestoreに管理者アクションログを記録
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
