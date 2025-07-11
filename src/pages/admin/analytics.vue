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
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        <ArrowPathIcon class="h-5 w-5 inline mr-1" />
        更新
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

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const selectedPeriod = ref('30d')
const customStartDate = ref('')
const customEndDate = ref('')

// KPIデータ
const kpiData = ref({
  pageViews: 45678,
  pageViewsTrend: 12,
  uniqueUsers: 3456,
  uniqueUsersTrend: 8,
  avgSessionDuration: '4分23秒',
  avgSessionTrend: 5,
  bounceRate: 42,
  bounceRateTrend: -3
})

// 人気ページ
const topPages = ref([
  { path: '/', title: 'トップページ', views: 12345, percentage: 27 },
  { path: '/timetable', title: '時刻表', views: 8901, percentage: 19 },
  { path: '/transit', title: '乗換案内', views: 7654, percentage: 17 },
  { path: '/status', title: '運行状況', views: 6543, percentage: 14 },
  { path: '/fare', title: '料金表', views: 4321, percentage: 9 }
])

// リファラーデータ
const referrerData = ref({
  labels: ['直接アクセス', 'Google検索', 'Yahoo検索', 'SNS', 'その他'],
  datasets: [{
    data: [35, 30, 15, 12, 8],
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
    data: [
      120, 95, 80, 75, 85, 110, 180, 320,
      450, 380, 350, 420, 480, 410, 380, 450,
      520, 580, 490, 420, 380, 320, 250, 180
    ],
    backgroundColor: 'rgba(59, 130, 246, 0.8)'
  }]
})

// よく検索される経路
const popularRoutes = ref([
  { from: '本土七類', to: '西郷', count: 892 },
  { from: '西郷', to: '本土七類', count: 765 },
  { from: '本土七類', to: '菱浦', count: 543 },
  { from: '西郷', to: '菱浦', count: 432 },
  { from: '菱浦', to: '本土七類', count: 321 }
])

// エラー統計
const errorStats = ref([
  { type: '404', label: 'ページが見つからない', count: 45, percentage: 45, color: 'bg-yellow-500' },
  { type: '500', label: 'サーバーエラー', count: 12, percentage: 12, color: 'bg-red-500' },
  { type: 'network', label: 'ネットワークエラー', count: 28, percentage: 28, color: 'bg-orange-500' },
  { type: 'other', label: 'その他', count: 15, percentage: 15, color: 'bg-gray-500' }
])

const refreshData = async () => {
  // TODO: 選択された期間のデータを再取得
  console.log('Refreshing analytics data for period:', selectedPeriod.value)
}

onMounted(() => {
  // TODO: Firestoreからアナリティクスデータを取得
  console.log('Loading analytics data...')
})
</script>