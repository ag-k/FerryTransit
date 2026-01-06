<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">詳細アナリティクス</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        アプリケーションの利用状況と詳細な分析データ
      </p>
    </div>

    <!-- 期間選択 -->
    <div class="mb-6 flex justify-between items-center">
      <div class="flex space-x-4">
        <select
          v-model="selectedPeriod"
          class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="7d">過去7日間</option>
          <option value="30d">過去30日間</option>
          <option value="90d">過去90日間</option>
          <option value="custom">カスタム期間</option>
        </select>
        <div v-if="selectedPeriod === 'custom'" class="flex space-x-2">
          <input
            v-model="customStartDate"
            type="date"
            class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
          <span class="self-center">〜</span>
          <input
            v-model="customEndDate"
            type="date"
            class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
        </div>
      </div>
      <button
        :disabled="isLoading"
        class="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:bg-gray-400"
        @click="refreshData"
      >
        <ArrowPathIcon class="h-5 w-5 inline mr-1" :class="{ 'animate-spin': isLoading }" />
        {{ isLoading ? '読み込み中...' : '更新' }}
      </button>
    </div>

    <!-- KPI サマリー -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <DashboardCard
        title="総ページビュー"
        :value="kpiData.pageViews.toLocaleString()"
        :icon="EyeIcon"
        :change="`${kpiData.pageViewsTrend > 0 ? '+' : ''}${kpiData.pageViewsTrend.toFixed(1)}%`"
        :change-type="kpiData.pageViewsTrend > 0 ? 'increase' : 'decrease'"
      />
      <DashboardCard
        title="ユニークユーザー"
        :value="kpiData.uniqueUsers.toLocaleString()"
        :icon="UsersIcon"
        :change="`${kpiData.uniqueUsersTrend > 0 ? '+' : ''}${kpiData.uniqueUsersTrend.toFixed(1)}%`"
        :change-type="kpiData.uniqueUsersTrend > 0 ? 'increase' : 'decrease'"
      />
      <DashboardCard
        title="平均セッション時間"
        :value="kpiData.avgSessionDuration"
        :icon="ClockIcon"
        :change="`${kpiData.avgSessionTrend > 0 ? '+' : ''}${kpiData.avgSessionTrend.toFixed(1)}%`"
        :change-type="kpiData.avgSessionTrend > 0 ? 'increase' : 'decrease'"
      />
      <DashboardCard
        title="直帰率"
        :value="`${kpiData.bounceRate.toFixed(1)}%`"
        :icon="ArrowRightOnRectangleIcon"
        :change="`${kpiData.bounceRateTrend > 0 ? '+' : ''}${kpiData.bounceRateTrend.toFixed(1)}%`"
        :change-type="kpiData.bounceRateTrend < 0 ? 'increase' : 'decrease'"
      />
    </div>

    <!-- 詳細分析 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- ページ別アクセス -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          人気ページランキング
        </h3>
        <div class="space-y-3">
          <div v-for="page in topPages" :key="page.path" class="flex items-center justify-between">
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ page.title }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ page.path }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ page.views.toLocaleString() }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ page.percentage }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- リファラー分析 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          流入元
        </h3>
        <StatisticsChart
          :title="''"
          :data="referrerChartData"
          type="pie"
        />
      </div>
    </div>

    <!-- 日別アクセストレンド -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          日別アクセストレンド
        </h3>
        <button
          @click="exportData('trend')"
          class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center"
        >
          <ArrowDownTrayIcon class="h-4 w-4 mr-1" />
          CSV出力
        </button>
      </div>
      <StatisticsChart
        :title="''"
        :data="dailyTrendData"
        type="line"
      />
    </div>

    <!-- 時間別アクセス分析 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        時間別アクセス傾向
      </h3>
      <StatisticsChart
        :title="''"
        :data="hourlyChartData"
        type="bar"
      />
    </div>

    <!-- デバイス・地域統計 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- デバイス統計 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          デバイス別アクセス
        </h3>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-700 dark:text-gray-300">デスクトップ</span>
              <span class="text-sm font-medium">{{ deviceStats.deviceTypes.desktop || 0 }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full bg-blue-500"
                :style="`width: ${devicePercentage.desktop}%`"
              ></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-700 dark:text-gray-300">モバイル</span>
              <span class="text-sm font-medium">{{ deviceStats.deviceTypes.mobile || 0 }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full bg-green-500"
                :style="`width: ${devicePercentage.mobile}%`"
              ></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-700 dark:text-gray-300">タブレット</span>
              <span class="text-sm font-medium">{{ deviceStats.deviceTypes.tablet || 0 }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class="h-2 rounded-full bg-purple-500"
                :style="`width: ${devicePercentage.tablet}%`"
              ></div>
            </div>
          </div>
        </div>
        <div class="mt-6 pt-6 border-t dark:border-gray-700">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">OS別</h4>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">iOS</span>
              <span class="font-medium">{{ deviceStats.os.ios || 0 }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Android</span>
              <span class="font-medium">{{ deviceStats.os.android || 0 }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">その他</span>
              <span class="font-medium">{{ deviceStats.os.other || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 地域統計 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          地域別アクセス
        </h3>
        <div class="space-y-3">
          <div
            v-for="location in locationStats"
            :key="location.location"
            class="flex items-center justify-between"
          >
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ location.location }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ location.percentage }}%
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ location.count.toLocaleString() }}
              </div>
            </div>
          </div>
          <div v-if="locationStats.length === 0" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            データがありません
          </div>
        </div>
      </div>
    </div>

    <!-- コンバージョン分析 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        コンバージョン分析
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ conversionStats.totalSearches.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">総検索数</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {{ conversionStats.successfulSearches.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">成功検索数</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {{ conversionStats.conversionRate.toFixed(1) }}%
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">コンバージョン率</div>
        </div>
      </div>
      <div v-if="conversionStats.routeConversions.length > 0">
        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">ルート別コンバージョン率</h4>
        <div class="space-y-2">
          <div
            v-for="route in conversionStats.routeConversions"
            :key="route.route"
            class="flex items-center justify-between py-2 border-b dark:border-gray-700"
          >
            <div class="flex-1">
              <div class="text-sm text-gray-900 dark:text-white">{{ route.route }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                検索: {{ route.searches }}回 / 成功: {{ route.successful }}回
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium" :class="route.rate >= 70 ? 'text-green-600' : route.rate >= 50 ? 'text-yellow-600' : 'text-red-600'">
                {{ route.rate.toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ユーザー行動フロー -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        ページ遷移パス（上位20）
      </h3>
      <div class="space-y-2">
        <div
          v-for="flow in pageFlowStats"
          :key="flow.transition"
          class="flex items-center justify-between py-2 border-b dark:border-gray-700"
        >
          <span class="text-sm text-gray-900 dark:text-white font-mono">{{ flow.transition }}</span>
          <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ flow.count }}回</span>
        </div>
        <div v-if="pageFlowStats.length === 0" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          データがありません
        </div>
      </div>
    </div>

    <!-- 機能別利用状況 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 検索キーワード -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          よく検索される経路
        </h3>
        <div class="space-y-2">
          <div v-for="(route, index) in popularRoutes" :key="index" class="flex justify-between items-center py-2 border-b dark:border-gray-700">
            <span class="text-sm text-gray-900 dark:text-white">
              {{ route.from }} → {{ route.to }}
            </span>
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">
              {{ route.count }}回
            </span>
          </div>
        </div>
      </div>

      <!-- エラー統計 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          エラー発生状況
        </h3>
        <div class="space-y-4">
          <div v-for="error in errorStats" :key="error.type">
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ error.label }}</span>
              <span class="text-sm font-medium">{{ error.count }}</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                :class="['h-2 rounded-full', error.color]"
                :style="`width: ${error.percentage}%`"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { subDays, format } from 'date-fns'
import { 
  ArrowPathIcon, 
  EyeIcon, 
  UsersIcon, 
  ClockIcon,
  ArrowRightOnRectangleIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'
import { useAnalytics } from '~/composables/useAnalytics'
import { createLogger } from '~/utils/logger'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { 
  getAccessTrends, 
  getPopularPages, 
  getReferrerStats, 
  getRouteSearchStats, 
  getErrorStats,
  getDeviceStats,
  getLocationStats,
  getConversionStats,
  getPageFlowStats,
  getAccessTrend
} = useAnalytics()
const { $toast } = useNuxtApp()
const logger = createLogger('AdminAnalyticsPage')

const isLoading = ref(false)

const selectedPeriod = ref('30d')
const customStartDate = ref('')
const customEndDate = ref('')

// KPIデータ
const kpiData = ref({
  pageViews: 0,
  pageViewsTrend: 0,
  uniqueUsers: 0,
  uniqueUsersTrend: 0,
  avgSessionDuration: '0分0秒',
  avgSessionTrend: 0,
  bounceRate: 0,
  bounceRateTrend: 0
})

// 人気ページ
const topPages = ref<Array<{ path: string; title: string; views: number; percentage: number }>>([])

// リファラーデータ（チャート用）
const referrerChartData = ref<Array<{ label: string; value: number }>>([])

// 時間別アクセスデータ（チャート用）
const hourlyChartData = ref<Array<{ label: string; value: number }>>([])

// デバイス統計のパーセンテージ
const devicePercentage = computed(() => {
  const total = deviceStats.value.deviceTypes.desktop + 
                deviceStats.value.deviceTypes.mobile + 
                deviceStats.value.deviceTypes.tablet
  if (total === 0) return { desktop: 0, mobile: 0, tablet: 0 }
  return {
    desktop: (deviceStats.value.deviceTypes.desktop / total) * 100,
    mobile: (deviceStats.value.deviceTypes.mobile / total) * 100,
    tablet: (deviceStats.value.deviceTypes.tablet / total) * 100
  }
})

// よく検索される経路
const popularRoutes = ref<Array<{ from: string; to: string; count: number }>>([])

// エラー統計
const errorStats = ref<Array<{ type: string; label: string; count: number; percentage: number; color: string }>>([])

// デバイス統計
const deviceStats = ref({
  deviceTypes: { desktop: 0, mobile: 0, tablet: 0 },
  browsers: {} as Record<string, number>,
  os: { ios: 0, android: 0, other: 0 }
})

// 地域統計
const locationStats = ref<Array<{ location: string; count: number; percentage: number }>>([])

// コンバージョン統計
const conversionStats = ref({
  totalSearches: 0,
  successfulSearches: 0,
  conversionRate: 0,
  routeConversions: [] as Array<{ route: string; searches: number; successful: number; rate: number }>
})

// ページ遷移パス
const pageFlowStats = ref<Array<{ transition: string; count: number }>>([])

// 日別トレンドデータ
const dailyTrendData = ref<Array<{ label: string; value: number }>>([])

// パフォーマンス監視
const performanceMonitor = {
  startTime: 0,
  start: () => {
    performanceMonitor.startTime = performance.now()
  },
  end: (label: string) => {
    const duration = performance.now() - performanceMonitor.startTime
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`)
    }
    return duration
  }
}

const loadAnalyticsData = async () => {
  isLoading.value = true
  performanceMonitor.start()
  try {
    // 期間の計算
    let startDate: Date
    let endDate = new Date()
    
    switch (selectedPeriod.value) {
      case '7d':
        startDate = subDays(endDate, 7)
        break
      case '30d':
        startDate = subDays(endDate, 30)
        break
      case '90d':
        startDate = subDays(endDate, 90)
        break
      case 'custom':
        if (!customStartDate.value || !customEndDate.value) {
          throw new Error('カスタム期間の開始日と終了日を指定してください')
        }
        startDate = new Date(customStartDate.value)
        endDate = new Date(customEndDate.value)
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('無効な日付が指定されています')
        }
        if (startDate > endDate) {
          throw new Error('開始日は終了日より前である必要があります')
        }
        break
      default:
        startDate = subDays(endDate, 30)
    }

    // 各種統計データの取得
    const [
      trends, 
      pages, 
      referrers, 
      routes, 
      errors,
      devices,
      locations,
      conversions,
      pageFlow,
      dailyTrend
    ] = await Promise.all([
      getAccessTrends(startDate, endDate),
      getPopularPages(startDate, endDate, 10),
      getReferrerStats(startDate, endDate),
      getRouteSearchStats(10),
      getErrorStats(startDate, endDate),
      getDeviceStats(),
      getLocationStats(startDate, endDate, 10),
      getConversionStats(startDate, endDate),
      getPageFlowStats(startDate, endDate),
      getAccessTrend(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    ])

    // KPIデータの更新
    kpiData.value = {
      pageViews: trends.total,
      pageViewsTrend: trends.growth,
      uniqueUsers: trends.uniqueUsers,
      uniqueUsersTrend: trends.userGrowth,
      avgSessionDuration: formatDuration(trends.avgSessionDuration),
      avgSessionTrend: trends.sessionGrowth,
      bounceRate: trends.bounceRate,
      bounceRateTrend: trends.bounceGrowth
    }

    // 人気ページの更新
    const totalViews = pages.reduce((sum, p) => sum + p.views, 0)
    topPages.value = pages.map(page => ({
      ...page,
      percentage: Math.round((page.views / totalViews) * 100)
    }))

    // リファラーデータの更新（チャート用）
    referrerChartData.value = Object.entries(referrers).map(([key, value]) => ({
      label: translateReferrer(key),
      value: value as number
    }))

    // 時間別アクセスデータの更新（チャート用）
    if (trends.hourlyData) {
      hourlyChartData.value = trends.hourlyData.map((value, index) => ({
        label: `${index}時`,
        value
      }))
    }

    // 日別トレンドデータの更新
    dailyTrendData.value = dailyTrend.map(item => ({
      label: format(new Date(item.date), 'M/d'),
      value: item.count
    }))

    // 人気経路の更新
    popularRoutes.value = routes

    // エラー統計の更新
    const errorTotal = Object.values(errors).reduce((sum: number, count: number) => sum + count, 0)
    errorStats.value = [
      { type: '404', label: 'ページが見つからない', count: errors['404'] || 0, percentage: errorTotal > 0 ? Math.round(((errors['404'] || 0) / errorTotal) * 100) : 0, color: 'bg-yellow-500' },
      { type: '500', label: 'サーバーエラー', count: errors['500'] || 0, percentage: errorTotal > 0 ? Math.round(((errors['500'] || 0) / errorTotal) * 100) : 0, color: 'bg-red-500' },
      { type: 'network', label: 'ネットワークエラー', count: errors.network || 0, percentage: errorTotal > 0 ? Math.round(((errors.network || 0) / errorTotal) * 100) : 0, color: 'bg-orange-500' },
      { type: 'other', label: 'その他', count: errors.other || 0, percentage: errorTotal > 0 ? Math.round(((errors.other || 0) / errorTotal) * 100) : 0, color: 'bg-gray-500' }
    ]

    // デバイス統計の更新
    deviceStats.value = {
      deviceTypes: {
        desktop: devices.deviceTypes.desktop || devices.deviceTypes.Desktop || 0,
        mobile: devices.deviceTypes.mobile || devices.deviceTypes.Mobile || 0,
        tablet: devices.deviceTypes.tablet || devices.deviceTypes.Tablet || 0
      },
      browsers: devices.browsers,
      os: {
        ios: devices.os.ios || devices.os.iOS || 0,
        android: devices.os.android || devices.os.Android || 0,
        other: Object.values(devices.os).reduce((sum: number, count: number | string) => {
          const val = typeof count === 'number' ? count : 0
          return sum + val
        }, 0) - (devices.os.ios || devices.os.iOS || 0) - (devices.os.android || devices.os.Android || 0)
      }
    }

    // 地域統計の更新
    locationStats.value = locations

    // コンバージョン統計の更新
    conversionStats.value = conversions

    // ページ遷移パスの更新
    pageFlowStats.value = pageFlow

    // パフォーマンス監視
    const duration = performanceMonitor.end('loadAnalyticsData')
    if (duration > 2000) {
      logger.warn(`Analytics data loading took ${duration.toFixed(2)}ms. Consider optimizing.`)
    } else {
      logger.debug(`Analytics data loaded in ${duration.toFixed(2)}ms`)
    }
  } catch (error) {
    logger.error('Failed to load analytics data', error)
    $toast.error('アナリティクスデータの取得に失敗しました')
    performanceMonitor.end('loadAnalyticsData (error)')
  } finally {
    isLoading.value = false
  }
}

const refreshData = () => {
  loadAnalyticsData()
}

// セッション時間のフォーマット
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

// リファラーの翻訳
const translateReferrer = (referrer: string): string => {
  const translations: Record<string, string> = {
    'direct': '直接アクセス',
    'google': 'Google検索',
    'yahoo': 'Yahoo検索',
    'bing': 'Bing検索',
    'facebook': 'Facebook',
    'twitter': 'Twitter',
    'instagram': 'Instagram',
    'other': 'その他'
  }
  return translations[referrer] || referrer
}

// CSV値のエスケープ（カンマや改行を含む場合に対応）
const escapeCsvValue = (value: string | number): string => {
  const str = String(value)
  // カンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// データのエクスポート
const exportData = (type: 'trend' | 'all') => {
  performanceMonitor.start()
  try {
    let csvContent = ''
    let filename = ''

    if (type === 'trend') {
      // 日別トレンドのCSV出力
      csvContent = '日付,アクセス数\n'
      dailyTrendData.value.forEach(item => {
        csvContent += `${escapeCsvValue(item.label)},${escapeCsvValue(item.value)}\n`
      })
      filename = `analytics-trend-${format(new Date(), 'yyyy-MM-dd')}.csv`
    } else {
      // 全データのCSV出力
      csvContent = '項目,値\n'
      csvContent += `${escapeCsvValue('総ページビュー')},${escapeCsvValue(kpiData.value.pageViews)}\n`
      csvContent += `${escapeCsvValue('ユニークユーザー')},${escapeCsvValue(kpiData.value.uniqueUsers)}\n`
      csvContent += `${escapeCsvValue('平均セッション時間')},${escapeCsvValue(kpiData.value.avgSessionDuration)}\n`
      csvContent += `${escapeCsvValue('直帰率')},${escapeCsvValue(kpiData.value.bounceRate)}%\n`
      csvContent += '\n人気ページ\n'
      topPages.value.forEach(page => {
        csvContent += `${escapeCsvValue(page.title)},${escapeCsvValue(page.views)}\n`
      })
      csvContent += '\n人気経路\n'
      popularRoutes.value.forEach(route => {
        csvContent += `${escapeCsvValue(`${route.from} → ${route.to}`)},${escapeCsvValue(route.count)}\n`
      })
      filename = `analytics-all-${format(new Date(), 'yyyy-MM-dd')}.csv`
    }

    // CSVファイルのダウンロード
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    const duration = performanceMonitor.end('exportData')
    logger.debug(`Data exported in ${duration.toFixed(2)}ms`)
    $toast.success('データをエクスポートしました')
  } catch (error) {
    logger.error('Failed to export data', error)
    $toast.error('データのエクスポートに失敗しました')
    performanceMonitor.end('exportData (error)')
  }
}

// 期間が変更されたときに自動的にデータを再取得
watch([selectedPeriod, customStartDate, customEndDate], () => {
  if (selectedPeriod.value === 'custom' && (!customStartDate.value || !customEndDate.value)) {
    return
  }
  loadAnalyticsData()
})

onMounted(() => {
  // カスタム期間のデフォルト値を設定
  const today = new Date()
  customEndDate.value = format(today, 'yyyy-MM-dd')
  customStartDate.value = format(subDays(today, 30), 'yyyy-MM-dd')
  
  // 初期データの読み込み
  loadAnalyticsData()
})
</script>
