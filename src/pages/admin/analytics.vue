<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">統計情報</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        アクセス統計の可視化
      </p>
    </div>

    <!-- 期間選択 -->
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <div class="flex space-x-2">
        <button
          v-for="preset in presets"
          :key="preset.value"
          @click="selectPreset(preset.value)"
          :class="[
            'px-3 py-2 text-sm rounded-md transition-colors',
            selectedPreset === preset.value
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          ]"
        >
          {{ preset.label }}
        </button>
      </div>
      <div v-if="selectedPreset === 'custom'" class="flex space-x-2 items-center">
        <input
          v-model="customStartDate"
          type="date"
          class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2"
        >
        <span class="text-gray-500 dark:text-gray-400">〜</span>
        <input
          v-model="customEndDate"
          type="date"
          class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2"
        >
        <button
          @click="applyCustomPeriod"
          class="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          適用
        </button>
      </div>
    </div>

    <!-- ローディング状態 -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600 dark:text-gray-400">読み込み中...</span>
    </div>

    <!-- データなし -->
    <div v-else-if="!hasData" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
      <p class="text-gray-500 dark:text-gray-400">
        対象期間にデータがありません
      </p>
    </div>

    <!-- 統計情報 -->
    <div v-else class="space-y-6">
      <!-- 1. PV推移（折れ線） -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">PV推移</h3>
        <AnalyticsLineChart :data="pvTrendData" />
      </div>

      <!-- 2. 検索回数（折れ線） -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">検索回数推移</h3>
        <AnalyticsLineChart :data="searchTrendData" :color="'#10b981'" />
      </div>

      <!-- 3. 時間帯別PV/検索（折れ線） -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          時間帯別 PV / 検索
          <span v-if="selectedPreset !== 'today' && selectedPreset !== 'yesterday'" class="text-sm font-normal text-gray-500 dark:text-gray-400">
            （期間平均）
          </span>
        </h3>
        <AnalyticsMultiLineChart :data="hourlyDistributionData" />
      </div>

      <!-- 4. 人気航路 Top 3 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">人気航路 Top 3</h3>
        <div v-if="popularRoutes.length === 0" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          データがありません
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(route, index) in popularRoutes"
            :key="route.routeKey"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">
                {{ index + 1 }}
              </span>
              <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ getPortName(route.depId) }} → {{ getPortName(route.arrId) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ route.routeKey }}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-gray-900 dark:text-white">
                {{ route.count.toLocaleString() }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">検索回数</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. 検索条件の分布（円グラフ） -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- 出発地別 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">出発地別</h3>
          <AnalyticsPieChart
            v-if="portDistribution.departure.length > 0"
            :data="portDistribution.departure"
            :label-field="'name'"
            :value-field="'count'"
          />
          <div v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            データがありません
          </div>
        </div>

        <!-- 到着地別 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">到着地別</h3>
          <AnalyticsPieChart
            v-if="portDistribution.arrival.length > 0"
            :data="portDistribution.arrival"
            :label-field="'name'"
            :value-field="'count'"
          />
          <div v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            データがありません
          </div>
        </div>

        <!-- 時間帯別 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">時間帯別</h3>
          <AnalyticsPieChart
            v-if="hourlyChartData.length > 0"
            :data="hourlyChartData"
            :label-field="'label'"
            :value-field="'value'"
          />
          <div v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            データがありません
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from 'date-fns'
import type { PeriodPreset, CustomPeriod, ChartData, MultiSeriesChartData } from '~/types/analytics'
import type { PopularRoute } from '~/types/analytics'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { $toast } = useNuxtApp()
const { 
  getAnalyticsInRange, 
  getPopularRoutes, 
  getHourlyDistribution, 
  getPortDistribution,
  getPvTrend 
} = useAnalytics()

// プリセット定義
const presets = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '直近7日', value: 'last7days' },
  { label: '直近30日', value: 'last30days' },
  { label: '今月', value: 'thisMonth' },
  { label: '先月', value: 'lastMonth' },
  { label: '3ヶ月', value: 'last3Months' },
  { label: '1年', value: 'lastYear' },
  { label: 'カスタム', value: 'custom' }
]

const selectedPreset = ref<PeriodPreset>('last7days')
const customStartDate = ref('')
const customEndDate = ref('')

const isLoading = ref(false)
const hasData = ref(false)

// 統計データ
const pvTrendData = ref<ChartData[]>([])
const searchTrendData = ref<ChartData[]>([])
const hourlyDistributionData = ref<MultiSeriesChartData[]>([])
const popularRoutes = ref<PopularRoute[]>([])
const portDistribution = ref({ departure: [] as any[], arrival: [] as any[] })
const hourlyChartData = ref<ChartData[]>([])

/**
 * 現在の期間を取得
 */
const getCurrentPeriod = (): { startDate: Date; endDate: Date } => {
  const now = new Date()
  
  switch (selectedPreset.value) {
    case 'today':
      return { startDate: startOfDay(now), endDate: endOfDay(now) }
    case 'yesterday':
      const yesterday = subDays(now, 1)
      return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) }
    case 'last7days':
      return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) }
    case 'last30days':
      return { startDate: startOfDay(subDays(now, 29)), endDate: endOfDay(now) }
    case 'thisMonth':
      return { startDate: startOfMonth(now), endDate: endOfDay(now) }
    case 'lastMonth':
      const lastMonth = subDays(startOfMonth(now), 1)
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) }
    case 'last3Months':
      return { startDate: startOfDay(subDays(now, 89)), endDate: endOfDay(now) }
    case 'lastYear':
      return { startDate: startOfDay(subDays(now, 364)), endDate: endOfDay(now) }
    default:
      return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) }
  }
}

/**
 * プリセットを選択
 */
const selectPreset = (preset: PeriodPreset) => {
  selectedPreset.value = preset
  if (preset !== 'custom') {
    loadAnalyticsData()
  }
}

/**
 * カスタム期間を適用
 */
const applyCustomPeriod = () => {
  if (!customStartDate.value || !customEndDate.value) {
    $toast.error('開始日と終了日を指定してください')
    return
  }
  
  const startDate = startOfDay(new Date(customStartDate.value))
  const endDate = endOfDay(new Date(customEndDate.value))
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    $toast.error('無効な日付が指定されています')
    return
  }
  
  if (startDate > endDate) {
    $toast.error('開始日は終了日より前である必要があります')
    return
  }
  
  loadAnalyticsData(startDate, endDate)
}

/**
 * 統計データをロード
 */
const loadAnalyticsData = async (customStart?: Date, customEnd?: Date) => {
  isLoading.value = true
  hasData.value = false
  
  try {
    let startDate: Date
    let endDate: Date
    
    if (customStart && customEnd) {
      startDate = customStart
      endDate = customEnd
    } else {
      const period = getCurrentPeriod()
      startDate = period.startDate
      endDate = period.endDate
    }
    
    // データを並列取得
    const [pvTrend, hourlyDist, popular, portDist] = await Promise.all([
      getPvTrend(startDate, endDate),
      getHourlyDistribution(startDate, endDate),
      getPopularRoutes(startDate, endDate, 3),
      getPortDistribution(startDate, endDate)
    ])
    
    // PV推移データ
    pvTrendData.value = pvTrend.map(item => ({
      label: format(new Date(item.date), 'M/d'),
      value: item.pv
    }))
    
    // 検索推移データ
    searchTrendData.value = pvTrend.map(item => ({
      label: format(new Date(item.date), 'M/d'),
      value: item.search
    }))
    
    // 時間帯別分布データ
    hourlyDistributionData.value = hourlyDist.map(data => ({
      label: `${data.hour}時`,
      pv: data.pv,
      search: data.search
    }))
    
    // 人気航路
    popularRoutes.value = popular
    
    // 港別分布
    portDistribution.value = portDist
    
    // 時間帯別円グラフ用データ
    hourlyChartData.value = hourlyDist
      .filter(data => data.pv > 0 || data.search > 0)
      .map(data => ({
        label: `${data.hour}時`,
        value: data.pv + data.search
      }))
    
    // データ有無チェック
    const totalPv = pvTrendData.value.reduce((sum, item) => sum + item.value, 0)
    const totalSearch = searchTrendData.value.reduce((sum, item) => sum + item.value, 0)
    hasData.value = totalPv > 0 || totalSearch > 0
    
  } catch (error) {
    console.error('Failed to load analytics data:', error)
    $toast.error('統計情報の取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

/**
 * 港名を取得（簡易版）
 */
const getPortName = (portId: string): string => {
  // TODO: 実際は港マスタから名前を取得
  return portId
}

// 初期データの読み込み
onMounted(() => {
  // カスタム期間のデフォルト値を設定
  const today = new Date()
  customEndDate.value = format(today, 'yyyy-MM-dd')
  customStartDate.value = format(subDays(today, 30), 'yyyy-MM-dd')
  
  loadAnalyticsData()
})
</script>
