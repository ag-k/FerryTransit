<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">ダッシュボード</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        システムの概要と統計情報
      </p>
    </div>
    
    <!-- 統計カード -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardCard
        v-for="stat in stats"
        :key="stat.name"
        :title="stat.name"
        :value="stat.value"
        :change="stat.change"
        :change-type="stat.changeType"
        :icon="stat.icon"
      />
    </div>
    
    <!-- グラフセクション -->
    <div class="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
      <!-- アクセス数推移 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          アクセス数推移（過去7日間）
        </h2>
        <div class="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>グラフコンポーネント実装予定</p>
        </div>
      </div>
      
      <!-- 人気航路ランキング -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          人気航路ランキング
        </h2>
        <div class="space-y-3">
          <div
            v-for="(route, index) in popularRoutes"
            :key="`${route.fromPort}-${route.toPort}`"
            class="flex items-center justify-between"
          >
            <div class="flex items-center">
              <span class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-300">
                {{ index + 1 }}
              </span>
              <span class="ml-3 text-sm text-gray-900 dark:text-white">
                {{ route.fromPort }} → {{ route.toPort }}
              </span>
            </div>
            <div class="flex items-center">
              <span class="text-sm text-gray-500 dark:text-gray-400 mr-2">
                {{ route.count }}回
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
      </div>
    </div>
    
    <!-- 最近のアクティビティ -->
    <div class="mt-8">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            最近のアクティビティ
          </h2>
        </div>
        <div class="px-6 py-4">
          <div class="space-y-4">
            <div
              v-for="activity in recentActivities"
              :key="activity.id"
              class="flex items-start"
            >
              <div class="flex-shrink-0">
                <div class="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <component
                    :is="getActivityIcon(activity.type)"
                    class="h-4 w-4 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>
              <div class="ml-3 flex-1">
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ activity.description }}
                </p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTime(activity.timestamp) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  UserGroupIcon,
  ChartBarIcon,
  StarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowUpIcon
} from '@heroicons/vue/24/outline'
import type { PopularRoute } from '~/types/admin'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// ダミーデータ（実際はAPIから取得）
const stats = ref([
  {
    name: '今日のアクセス数',
    value: '1,234',
    change: '+12.5%',
    changeType: 'increase' as const,
    icon: ChartBarIcon
  },
  {
    name: 'アクティブユーザー',
    value: '56',
    change: '+3.2%',
    changeType: 'increase' as const,
    icon: UserGroupIcon
  },
  {
    name: 'お気に入り登録数',
    value: '789',
    change: '+8.1%',
    changeType: 'increase' as const,
    icon: StarIcon
  },
  {
    name: '平均滞在時間',
    value: '3:45',
    change: '-2.3%',
    changeType: 'decrease' as const,
    icon: ClockIcon
  }
])

const popularRoutes = ref<PopularRoute[]>([
  { fromPort: '西郷', toPort: '本土七類', count: 234, percentage: 100 },
  { fromPort: '本土七類', toPort: '西郷', count: 198, percentage: 85 },
  { fromPort: '西郷', toPort: '菱浦', count: 156, percentage: 67 },
  { fromPort: '菱浦', toPort: '西郷', count: 143, percentage: 61 },
  { fromPort: '西郷', toPort: '別府', count: 98, percentage: 42 }
])

const recentActivities = ref([
  {
    id: '1',
    type: 'update',
    description: '時刻表データが更新されました',
    timestamp: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: '2',
    type: 'create',
    description: '新しいお知らせが作成されました',
    timestamp: new Date(Date.now() - 1000 * 60 * 30)
  },
  {
    id: '3',
    type: 'delete',
    description: '古いアラートが削除されました',
    timestamp: new Date(Date.now() - 1000 * 60 * 60)
  },
  {
    id: '4',
    type: 'publish',
    description: '料金データが公開されました',
    timestamp: new Date(Date.now() - 1000 * 60 * 120)
  }
])

const getActivityIcon = (type: string) => {
  const icons: Record<string, any> = {
    update: PencilIcon,
    create: DocumentArrowUpIcon,
    delete: TrashIcon,
    publish: DocumentArrowUpIcon
  }
  return icons[type] || PencilIcon
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 1000 / 60)
  
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}時間前`
  return `${Math.floor(minutes / 1440)}日前`
}

// 実際のデータ取得
onMounted(async () => {
  // TODO: APIからダッシュボードデータを取得
})
</script>