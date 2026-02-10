<template>
  <div>
    <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">ダッシュボード</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          システムの概要と統計情報
        </p>
        <p v-if="lastUpdatedAt" class="mt-2 text-xs text-gray-400 dark:text-gray-500">
          最終更新: {{ formatDateTime(lastUpdatedAt) }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <SecondaryButton size="sm" :disabled="isLoading" @click="reloadDashboard">
          <ArrowPathIcon class="h-4 w-4" />
          {{ isLoading ? '更新中...' : '更新' }}
        </SecondaryButton>
        <PrimaryButton size="sm" to="/admin/analytics">
          <ChartBarIcon class="h-4 w-4" />
          統計の詳細
        </PrimaryButton>
      </div>
    </div>

    <Alert
      v-if="errorMessage"
      :visible="true"
      type="danger"
      :dismissible="false"
      :message="errorMessage"
      class="mb-6"
    />

    <div v-if="isLoading" class="mb-6 flex items-center text-sm text-gray-500 dark:text-gray-400">
      <div class="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600 mr-2" />
      データを読み込み中...
    </div>

    <!-- 統計カード -->
    <div
      v-if="dashboardCards.length > 0"
      class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      data-test="dashboard-stats"
    >
      <DashboardCard
        v-for="stat in dashboardCards"
        :key="stat.name"
        :title="stat.name"
        :value="stat.value"
        :change="stat.change"
        :change-type="stat.changeType"
        :icon="stat.icon"
      />
    </div>
    <Card v-else-if="!isLoading" class="text-sm text-gray-500 dark:text-gray-400">
      まだ統計データがありません
    </Card>

    <!-- グラフセクション -->
    <div class="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div>
        <StatisticsChart
          v-if="hasPvTrend"
          title="アクセス数推移（過去7日）"
          type="line"
          :data="pvChartData"
          data-test="dashboard-pv-chart"
        >
          <template #actions>
            <span class="text-xs text-gray-500 dark:text-gray-400">過去7日</span>
          </template>
        </StatisticsChart>
        <div
          v-else
          class="h-64 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow text-sm text-gray-500 dark:text-gray-200"
        >
          アクセス数のデータがありません
        </div>
      </div>
      <div>
        <StatisticsChart
          v-if="hasSearchTrend"
          title="検索回数推移（過去7日）"
          type="line"
          :data="searchChartData"
          data-test="dashboard-search-chart"
        >
          <template #actions>
            <span class="text-xs text-gray-500 dark:text-gray-400">過去7日</span>
          </template>
        </StatisticsChart>
        <div
          v-else
          class="h-64 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow text-sm text-gray-500 dark:text-gray-200"
        >
          検索回数のデータがありません
        </div>
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card class="lg:col-span-2" data-test="dashboard-popular-routes">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            人気航路ランキング
          </h2>
          <Badge v-if="popularRoutes.length" variant="info" pill>
            上位{{ popularRoutes.length }}件
          </Badge>
        </div>
        <div v-if="popularRoutes.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
          対象期間にデータがありません
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(route, index) in popularRoutes"
            :key="`${route.fromPort}-${route.toPort}`"
            class="flex items-center justify-between"
          >
            <div class="flex items-center">
              <span class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300">
                {{ index + 1 }}
              </span>
              <span class="ml-3 text-sm text-gray-900 dark:text-white">
                {{ route.fromPort }} → {{ route.toPort }}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-sm text-gray-500 dark:text-gray-400 mr-2">
                {{ formatNumber(route.count) }}回
              </span>
              <div class="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  :style="{ width: `${route.percentage}%` }"
                  class="bg-blue-500 h-2 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <StatisticsChart
          v-if="hasFavoriteBreakdown"
          title="お気に入り内訳"
          type="pie"
          :data="favoriteBreakdown"
          data-test="dashboard-favorite-chart"
        />
        <div
          v-else
          class="h-64 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 shadow text-sm text-gray-500 dark:text-gray-200"
        >
          お気に入りのデータがありません
        </div>
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card data-test="dashboard-system-status">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            システム状態
          </h2>
          <Badge :variant="systemStatusBadge.variant" pill>
            {{ systemStatusBadge.label }}
          </Badge>
        </div>
        <div v-if="systemStatusItems.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
          システム設定が未取得です
        </div>
        <div v-else class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <div
            v-for="item in systemStatusItems"
            :key="item.label"
            class="flex items-center justify-between"
          >
            <span class="text-gray-500 dark:text-gray-400">{{ item.label }}</span>
            <span class="font-medium text-gray-900 dark:text-white">
              {{ item.value }}
            </span>
          </div>
        </div>
      </Card>

      <Card padding="none" class="overflow-hidden" data-test="dashboard-activities">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            最近のアクティビティ
          </h2>
        </div>
        <div class="px-6 py-4">
          <div v-if="recentLogs.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
            直近の操作ログがありません
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="log in recentLogs"
              :key="log.id"
              class="flex items-start"
            >
              <div class="flex-shrink-0">
                <div class="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <component
                    :is="getActivityIcon(log.action)"
                    class="h-4 w-4 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>
              <div class="ml-3 flex-1">
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ getActivityDescription(log) }}
                </p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {{ log.adminEmail }} ・ {{ formatTime(log.timestamp) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  ArrowPathIcon,
  UserGroupIcon,
  ChartBarIcon,
  StarIcon,
  CalendarDaysIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  CloudArrowUpIcon
} from '@heroicons/vue/24/outline'
import { parseISO, format as formatDate, subDays } from 'date-fns'
import type { PopularRoute, AdminLog } from '~/types/admin'
import type { ChartData } from '~/types/analytics'
import { useAdminStore } from '@/stores/admin'
import { useAnalytics } from '~/composables/useAnalytics'
import DashboardCard from '@/components/admin/DashboardCard.vue'
import StatisticsChart from '@/components/admin/StatisticsChart.vue'
import Card from '@/components/common/Card.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import SecondaryButton from '@/components/common/SecondaryButton.vue'
import Alert from '@/components/common/Alert.vue'
import Badge from '@/components/common/Badge.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const adminStore = useAdminStore()
const { getPvTrend } = useAnalytics()

const pvTrendRaw = ref<Array<{ date: string; pv: number; search: number }>>([])

const isLoading = ref(false)
const errorMessage = ref('')
const lastUpdatedAt = ref<Date | null>(null)

const formatNumber = (value?: number) => {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('ja-JP')
}

const formatDateLabel = (dateKey: string) => {
  try {
    return formatDate(parseISO(dateKey), 'M/d')
  } catch {
    return dateKey
  }
}

const buildTrend = (values: number[]) => {
  if (values.length < 2) return null
  const current = values[values.length - 1]
  const previous = values[values.length - 2]
  if (previous === 0) return null
  const diff = current - previous
  const percent = Math.round((diff / previous) * 1000) / 10
  return {
    change: `${diff >= 0 ? '+' : ''}${percent}%`,
    changeType: (diff >= 0 ? 'increase' : 'decrease') as const
  }
}

const pvChange = computed(() => buildTrend(pvTrendRaw.value.map(item => item.pv)))
const dashboardCards = computed(() => {
  const stats = adminStore.dashboardStats
  if (!stats) return []
  return [
    {
      name: '今日のアクセス数',
      value: formatNumber(stats.dailyAccess),
      change: pvChange.value?.change,
      changeType: pvChange.value?.changeType,
      icon: ChartBarIcon
    },
    {
      name: '今月のアクセス数',
      value: formatNumber(stats.monthlyAccess),
      icon: CalendarDaysIcon
    },
    {
      name: 'アクティブユーザー',
      value: formatNumber(stats.activeUsers),
      icon: UserGroupIcon
    },
    {
      name: 'お気に入り総数',
      value: formatNumber(stats.favoriteStats.totalFavorites),
      icon: StarIcon
    }
  ]
})

const popularRoutes = computed<PopularRoute[]>(() => {
  const routes = adminStore.dashboardStats?.popularRoutes ?? []
  if (routes.length === 0) return []
  const maxCount = Math.max(...routes.map(route => route.count), 1)
  return routes.map(route => ({
    ...route,
    percentage: route.percentage ?? Math.round((route.count / maxCount) * 100)
  }))
})

const pvChartData = computed<ChartData[]>(() => {
  return pvTrendRaw.value.map(item => ({
    label: formatDateLabel(item.date),
    value: item.pv
  }))
})

const searchChartData = computed<ChartData[]>(() => {
  return pvTrendRaw.value.map(item => ({
    label: formatDateLabel(item.date),
    value: item.search
  }))
})

const hasPvTrend = computed(() => pvTrendRaw.value.some(item => item.pv > 0))
const hasSearchTrend = computed(() => pvTrendRaw.value.some(item => item.search > 0))

const favoriteBreakdown = computed<ChartData[]>(() => {
  const favorites = adminStore.dashboardStats?.favoriteStats
  if (!favorites) return []
  const routeFavorites = favorites.routeFavorites ?? 0
  const portFavorites = favorites.portFavorites ?? 0
  const total = favorites.totalFavorites ?? routeFavorites + portFavorites
  const other = Math.max(total - routeFavorites - portFavorites, 0)
  const data = [
    { label: '航路', value: routeFavorites },
    { label: '港', value: portFavorites }
  ]
  if (other > 0) {
    data.push({ label: 'その他', value: other })
  }
  return data
})

const hasFavoriteBreakdown = computed(() => favoriteBreakdown.value.some(item => item.value > 0))

const systemStatusItems = computed(() => {
  const settings = adminStore.systemSettings
  const errorCount = adminStore.dashboardStats?.errorCount
  if (!settings) return []
  return [
    {
      label: 'メンテナンスモード',
      value: settings.maintenanceMode ? '有効' : '無効'
    },
    {
      label: 'データ更新',
      value: settings.dataUpdateSchedule || '未設定'
    },
    {
      label: '自動バックアップ',
      value: settings.autoBackupEnabled ? '有効' : '無効'
    },
    {
      label: 'バックアップ頻度',
      value: settings.backupSchedule || '未設定'
    },
    {
      label: 'エラー検知',
      value: errorCount !== undefined ? `${formatNumber(errorCount)}件` : '未集計'
    }
  ]
})

const systemStatusBadge = computed(() => {
  const settings = adminStore.systemSettings
  if (!settings) {
    return { label: '未取得', variant: 'neutral' as const }
  }
  return settings.maintenanceMode
    ? { label: 'メンテナンス中', variant: 'warning' as const }
    : { label: '稼働中', variant: 'success' as const }
})

const recentLogs = computed<AdminLog[]>(() => adminStore.recentLogs)

const getActivityIcon = (action: AdminLog['action']) => {
  const icons: Record<string, any> = {
    update: PencilIcon,
    create: DocumentArrowUpIcon,
    delete: TrashIcon,
    publish: CloudArrowUpIcon
  }
  return icons[action] || PencilIcon
}

const getResourceLabel = (resource: string) => {
  const labels: Record<string, string> = {
    timetable: '時刻表',
    announcement: 'お知らせ',
    fare: '料金',
    routes: '航路データ',
    users: 'ユーザー',
    settings: 'システム設定'
  }
  return labels[resource] || resource
}

const getActivityDescription = (log: AdminLog) => {
  const actionLabel: Record<AdminLog['action'], string> = {
    create: '作成',
    update: '更新',
    delete: '削除',
    publish: '公開'
  }
  return `${getResourceLabel(log.resource)}を${actionLabel[log.action]}しました`
}

const normalizeDate = (value: unknown) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.()
    if (maybeDate instanceof Date && !Number.isNaN(maybeDate.getTime())) {
      return maybeDate
    }
  }
  const parsed = new Date(value as any)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatTime = (value: unknown) => {
  const date = normalizeDate(value)
  if (!date) return '不明'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 1000 / 60)
  
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}時間前`
  return `${Math.floor(minutes / 1440)}日前`
}

const formatDateTime = (value: Date) => {
  return formatDate(value, 'yyyy/MM/dd HH:mm')
}

const loadAnalyticsData = async () => {
  const endDate = new Date()
  const startDate = subDays(endDate, 6)
  const trend = await getPvTrend(startDate, endDate)
  pvTrendRaw.value = trend ?? []
}

const loadDashboardData = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([
      adminStore.fetchDashboardStats(),
      adminStore.fetchRecentLogs(6),
      adminStore.fetchSystemSettings(),
      loadAnalyticsData()
    ])
    lastUpdatedAt.value = new Date()
  } catch (error: any) {
    errorMessage.value = error?.message || 'ダッシュボードの読み込みに失敗しました'
  } finally {
    isLoading.value = false
  }
}

const reloadDashboard = () => {
  loadDashboardData()
}

onMounted(() => {
  loadDashboardData()
})
</script>
