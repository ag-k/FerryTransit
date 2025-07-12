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
        @click="refreshData"
        :disabled="isLoading"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
        icon="eye"
        :trend="`${kpiData.pageViewsTrend > 0 ? '+' : ''}${kpiData.pageViewsTrend}%`"
        :color="kpiData.pageViewsTrend > 0 ? 'green' : 'red'"
      />
      <DashboardCard
        title="ユニークユーザー"
        :value="kpiData.uniqueUsers.toLocaleString()"
        icon="users"
        :trend="`${kpiData.uniqueUsersTrend > 0 ? '+' : ''}${kpiData.uniqueUsersTrend}%`"
        :color="kpiData.uniqueUsersTrend > 0 ? 'green' : 'red'"
      />
      <DashboardCard
        title="平均セッション時間"
        :value="kpiData.avgSessionDuration"
        icon="clock"
        :trend="`${kpiData.avgSessionTrend > 0 ? '+' : ''}${kpiData.avgSessionTrend}%`"
        :color="kpiData.avgSessionTrend > 0 ? 'green' : 'red'"
      />
      <DashboardCard
        title="直帰率"
        :value="`${kpiData.bounceRate}%`"
        icon="arrow-right-on-rectangle"
        :trend="`${kpiData.bounceRateTrend > 0 ? '+' : ''}${kpiData.bounceRateTrend}%`"
        :color="kpiData.bounceRateTrend < 0 ? 'green' : 'red'"
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
          :data="referrerData"
          type="pie"
          :height="250"
        />
      </div>
    </div>

    <!-- 時間別アクセス分析 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        時間別アクセス傾向
      </h3>
      <StatisticsChart
        :data="hourlyAccessData"
        type="bar"
        :height="300"
      />
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
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { useAnalytics } from '~/composables/useAnalytics'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { getPageViewStats, getAccessTrends, getPopularPages, getReferrerStats, getRouteSearchStats, getErrorStats } = useAnalytics()
const { $toast } = useNuxtApp()

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

// リファラーデータ
const referrerData = ref({
  labels: [] as string[],
  datasets: [{
    data: [] as number[],
    backgroundColor: [
      'rgb(59, 130, 246)',
      'rgb(16, 185, 129)',
      'rgb(251, 146, 60)',
      'rgb(168, 85, 247)',
      'rgb(156, 163, 175)'
    ]
  }]
})

// 時間別アクセスデータ
const hourlyAccessData = ref({
  labels: Array.from({ length: 24 }, (_, i) => `${i}時`),
  datasets: [{
    label: 'アクセス数',
    data: new Array(24).fill(0),
    backgroundColor: 'rgba(59, 130, 246, 0.8)'
  }]
})

// よく検索される経路
const popularRoutes = ref<Array<{ from: string; to: string; count: number }>>([])

// エラー統計
const errorStats = ref<Array<{ type: string; label: string; count: number; percentage: number; color: string }>>([])

const loadAnalyticsData = async () => {
  isLoading.value = true
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
        startDate = new Date(customStartDate.value)
        endDate = new Date(customEndDate.value)
        break
      default:
        startDate = subDays(endDate, 30)
    }

    // 各種統計データの取得
    const [trends, pages, referrers, routes, errors] = await Promise.all([
      getAccessTrends(startDate, endDate),
      getPopularPages(startDate, endDate, 5),
      getReferrerStats(startDate, endDate),
      getRouteSearchStats(10),
      getErrorStats(startDate, endDate)
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

    // リファラーデータの更新
    const referrerLabels = Object.keys(referrers)
    const referrerValues = Object.values(referrers)
    referrerData.value = {
      labels: referrerLabels.map(translateReferrer),
      datasets: [{
        data: referrerValues,
        backgroundColor: referrerData.value.datasets[0].backgroundColor
      }]
    }

    // 時間別アクセスデータの更新
    if (trends.hourlyData) {
      hourlyAccessData.value.datasets[0].data = trends.hourlyData
    }

    // 人気経路の更新
    popularRoutes.value = routes

    // エラー統計の更新
    const errorTotal = Object.values(errors).reduce((sum: number, count: any) => sum + count, 0)
    errorStats.value = [
      { type: '404', label: 'ページが見つからない', count: errors['404'] || 0, percentage: Math.round(((errors['404'] || 0) / errorTotal) * 100), color: 'bg-yellow-500' },
      { type: '500', label: 'サーバーエラー', count: errors['500'] || 0, percentage: Math.round(((errors['500'] || 0) / errorTotal) * 100), color: 'bg-red-500' },
      { type: 'network', label: 'ネットワークエラー', count: errors['network'] || 0, percentage: Math.round(((errors['network'] || 0) / errorTotal) * 100), color: 'bg-orange-500' },
      { type: 'other', label: 'その他', count: errors['other'] || 0, percentage: Math.round(((errors['other'] || 0) / errorTotal) * 100), color: 'bg-gray-500' }
    ]
  } catch (error) {
    console.error('Failed to load analytics data:', error)
    $toast.error('アナリティクスデータの取得に失敗しました')
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