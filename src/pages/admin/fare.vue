<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">料金管理</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        フェリーと高速船の料金表を管理します
      </p>
    </div>

    <!-- タブ -->
    <div class="mb-6">
      <nav class="flex space-x-4" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            activeTab === tab.id
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'px-3 py-2 font-medium text-sm rounded-md'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- アクションボタン -->
    <div class="mb-4 flex justify-between items-center">
      <div class="flex space-x-2">
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
        >
          <ArrowPathIcon class="h-5 w-5 inline mr-1" />
          {{ isLoading ? '読み込み中...' : '更新' }}
        </button>
        <button
          @click="publishFareData"
          :disabled="isPublishing"
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
        >
          <CloudArrowUpIcon class="h-5 w-5 inline mr-1" />
          {{ isPublishing ? '公開中...' : 'データ公開' }}
        </button>
      </div>
    </div>

    <!-- 料金表 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ activeTabData.title }}
          </h2>
          <button
            @click="showEditModal = true"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PencilIcon class="h-5 w-5 inline mr-1" />
            料金編集
          </button>
        </div>

        <!-- フェリー料金表 -->
        <div v-if="activeTab === 'ferry'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  区間
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  大人
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  小児
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  車両（〜3m）
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  車両（〜4m）
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  車両（〜5m）
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="fare in ferryFares" :key="fare.route">
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ fare.route }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  ¥{{ fare.adult.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  ¥{{ fare.child.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  ¥{{ fare.car3m.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  ¥{{ fare.car4m.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  ¥{{ fare.car5m.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 高速船料金表 -->
        <div v-else-if="activeTab === 'highspeed'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  区間
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  大人
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  小児
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="fare in highspeedFares" :key="fare.route">
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ fare.route }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  ¥{{ fare.adult.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  ¥{{ fare.child.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 繁忙期料金 -->
        <div v-else-if="activeTab === 'peak'" class="space-y-6">
          <div>
            <h3 class="text-md font-medium text-gray-900 dark:text-white mb-3">
              繁忙期期間設定
            </h3>
            <div class="space-y-2">
              <div v-for="(period, index) in peakPeriods" :key="index" class="flex items-center space-x-4">
                <input
                  :value="period.start"
                  type="date"
                  class="rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                  disabled
                >
                <span>〜</span>
                <input
                  :value="period.end"
                  type="date"
                  class="rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                  disabled
                >
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ period.description }}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 class="text-md font-medium text-gray-900 dark:text-white mb-3">
              料金加算率
            </h3>
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <p class="text-sm text-gray-700 dark:text-gray-300">
                繁忙期は通常料金の <span class="font-bold text-lg">{{ peakSurchargeRate }}%</span> 増
              </p>
            </div>
          </div>
        </div>

        <!-- 割引設定 -->
        <div v-else-if="activeTab === 'discount'" class="space-y-4">
          <div v-for="discount in discounts" :key="discount.id" class="border dark:border-gray-700 rounded-lg p-4">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-medium text-gray-900 dark:text-white">
                  {{ discount.name }}
                </h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ discount.description }}
                </p>
                <p class="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {{ discount.rate }}% 割引
                </p>
              </div>
              <span
                :class="[
                  'px-2 py-1 text-xs rounded-full',
                  discount.active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                ]"
              >
                {{ discount.active ? '有効' : '無効' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 編集モーダル -->
    <FormModal
      :open="showEditModal"
      :title="`${activeTabData.title}の編集`"
      @close="showEditModal = false"
      @submit="saveFareData"
      :loading="isSaving"
      size="xl"
    >
      <div class="space-y-4">
        <!-- フェリー料金編集 -->
        <div v-if="activeTab === 'ferry'">
          <div v-for="(fare, index) in editingFerryFares" :key="index" class="border-b pb-4 mb-4">
            <h4 class="font-medium mb-2">{{ fare.route }}</h4>
            <div class="grid grid-cols-5 gap-2">
              <div>
                <label class="text-xs text-gray-500">大人</label>
                <input
                  v-model.number="fare.adult"
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                >
              </div>
              <div>
                <label class="text-xs text-gray-500">小児</label>
                <input
                  v-model.number="fare.child"
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                >
              </div>
              <div>
                <label class="text-xs text-gray-500">車両(〜3m)</label>
                <input
                  v-model.number="fare.car3m"
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                >
              </div>
              <div>
                <label class="text-xs text-gray-500">車両(〜4m)</label>
                <input
                  v-model.number="fare.car4m"
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                >
              </div>
              <div>
                <label class="text-xs text-gray-500">車両(〜5m)</label>
                <input
                  v-model.number="fare.car5m"
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- 高速船料金編集 -->
        <div v-else-if="activeTab === 'highspeed'">
          <div v-for="(fare, index) in editingHighspeedFares" :key="index" class="border-b pb-4 mb-4">
            <h4 class="font-medium mb-2">{{ fare.route }}</h4>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-gray-500">大人</label>
                <input
                  v-model.number="fare.adult"
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                >
              </div>
              <div>
                <label class="text-xs text-gray-500">小児</label>
                <input
                  v-model.number="fare.child"
                  type="number"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- 繁忙期設定編集 -->
        <div v-else-if="activeTab === 'peak'">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              料金加算率 (%)
            </label>
            <input
              v-model.number="editingPeakSurchargeRate"
              type="number"
              min="0"
              max="100"
              class="w-32 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            >
          </div>
        </div>
      </div>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { PencilIcon, CloudArrowUpIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { orderBy, where } from 'firebase/firestore'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { useDataPublish } from '~/composables/useDataPublish'
import type { FareData, Discount, PeakPeriod } from '~/types'
import FormModal from '~/components/admin/FormModal.vue'
import { createLogger } from '~/utils/logger'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { getCollection, updateDocument, batchWrite, getDocument } = useAdminFirestore()
const { publishData } = useDataPublish()
const { $toast } = useNuxtApp()
const logger = createLogger('AdminFarePage')

const tabs = [
  { id: 'ferry', name: 'フェリー料金' },
  { id: 'highspeed', name: '高速船料金' },
  { id: 'peak', name: '繁忙期料金' },
  { id: 'discount', name: '割引設定' }
]

const activeTab = ref('ferry')
const showEditModal = ref(false)
const isSaving = ref(false)
const isPublishing = ref(false)
const isLoading = ref(false)

// データ
const ferryFares = ref<Array<FareData & { id?: string }>>([])
const highspeedFares = ref<Array<FareData & { id?: string }>>([])
const peakPeriods = ref<Array<PeakPeriod & { id?: string }>>([])
const peakSurchargeRate = ref(20)
const discounts = ref<Array<Discount & { id?: string }>>([])

// 編集用データ
const editingFerryFares = ref<Array<FareData & { id?: string }>>([])
const editingHighspeedFares = ref<Array<FareData & { id?: string }>>([])
const editingPeakSurchargeRate = ref(20)

const activeTabData = computed(() => {
  switch (activeTab.value) {
    case 'ferry':
      return { title: 'フェリー料金表' }
    case 'highspeed':
      return { title: '高速船料金表' }
    case 'peak':
      return { title: '繁忙期料金設定' }
    case 'discount':
      return { title: '割引設定' }
    default:
      return { title: '' }
  }
})

const loadFareData = async () => {
  isLoading.value = true
  try {
    // フェリー料金
    const ferryConstraints = [where('type', '==', 'ferry'), orderBy('route')]
    const ferryData = await getCollection<FareData & { id: string }>('fares', ferryConstraints)
    ferryFares.value = ferryData

    // 高速船料金
    const highspeedConstraints = [where('type', '==', 'highspeed'), orderBy('route')]
    const highspeedData = await getCollection<FareData & { id: string }>('fares', highspeedConstraints)
    highspeedFares.value = highspeedData

    // 繁忙期設定
    const peakData = await getCollection<PeakPeriod & { id: string }>('peakPeriods', [orderBy('start')])
    peakPeriods.value = peakData

    // 料金加算率設定を取得
    const settingsDoc = await getDocument('settings', 'fareSettings')
    if (settingsDoc) {
      peakSurchargeRate.value = settingsDoc.peakSurchargeRate || 20
    }

    // 割引設定
    const discountData = await getCollection<Discount & { id: string }>('discounts', [orderBy('name')])
    discounts.value = discountData

    // 編集用データの初期化
    editingFerryFares.value = [...ferryFares.value]
    editingHighspeedFares.value = [...highspeedFares.value]
    editingPeakSurchargeRate.value = peakSurchargeRate.value
  } catch (error) {
    logger.error('Failed to load fare data', error)
    // エラー時は初期データを設定
    setDefaultData()
  } finally {
    isLoading.value = false
  }
}

const setDefaultData = () => {
  // デフォルトのフェリー料金
  ferryFares.value = [
    { route: '本土七類 ⇔ 西郷', adult: 3350, child: 1680, car3m: 12340, car4m: 15430, car5m: 18520, type: 'ferry' },
    { route: '本土七類 ⇔ 菱浦', adult: 2540, child: 1270, car3m: 10390, car4m: 12990, car5m: 15590, type: 'ferry' },
    { route: '本土七類 ⇔ 別府', adult: 2540, child: 1270, car3m: 10390, car4m: 12990, car5m: 15590, type: 'ferry' },
    { route: '本土七類 ⇔ 来居', adult: 2540, child: 1270, car3m: 10390, car4m: 12990, car5m: 15590, type: 'ferry' },
    { route: '西郷 ⇔ 菱浦', adult: 1490, child: 750, car3m: 4630, car4m: 5790, car5m: 6950, type: 'ferry' },
    { route: '西郷 ⇔ 別府', adult: 1490, child: 750, car3m: 4630, car4m: 5790, car5m: 6950, type: 'ferry' }
  ]

  // デフォルトの高速船料金
  highspeedFares.value = [
    { route: '本土七類 ⇔ 西郷', adult: 6430, child: 3220, type: 'highspeed' },
    { route: '本土七類 ⇔ 菱浦', adult: 4890, child: 2450, type: 'highspeed' },
    { route: '本土七類 ⇔ 別府', adult: 4890, child: 2450, type: 'highspeed' },
    { route: '西郷 ⇔ 菱浦', adult: 2890, child: 1450, type: 'highspeed' },
    { route: '西郷 ⇔ 別府', adult: 2890, child: 1450, type: 'highspeed' }
  ]

  // デフォルトの繁忙期
  peakPeriods.value = [
    { start: '2024-04-27', end: '2024-05-06', description: 'ゴールデンウィーク' },
    { start: '2024-08-10', end: '2024-08-18', description: '夏季休暇' },
    { start: '2024-12-28', end: '2025-01-05', description: '年末年始' }
  ]

  // デフォルトの割引設定
  discounts.value = [
    { id: '1', name: '島民割引', description: '隠岐諸島に住所を有する方', rate: 30, active: true, conditions: ['residence'] },
    { id: '2', name: '団体割引', description: '15名以上の団体', rate: 10, active: true, conditions: ['group'] },
    { id: '3', name: '学生割引', description: '学生証の提示が必要', rate: 20, active: true, conditions: ['student'] },
    { id: '4', name: '障害者割引', description: '障害者手帳の提示が必要', rate: 50, active: true, conditions: ['disability'] }
  ]
}

const saveFareData = async () => {
  isSaving.value = true
  try {
    if (activeTab.value === 'ferry') {
      // フェリー料金の保存
      const operations = editingFerryFares.value.map(fare => ({
        type: fare.id ? 'update' as const : 'create' as const,
        collection: 'fares',
        id: fare.id,
        data: {
          route: fare.route,
          adult: fare.adult,
          child: fare.child,
          car3m: fare.car3m,
          car4m: fare.car4m,
          car5m: fare.car5m,
          type: 'ferry'
        }
      }))
      await batchWrite(operations)
      ferryFares.value = [...editingFerryFares.value]
      $toast.success('フェリー料金を更新しました')
    } else if (activeTab.value === 'highspeed') {
      // 高速船料金の保存
      const operations = editingHighspeedFares.value.map(fare => ({
        type: fare.id ? 'update' as const : 'create' as const,
        collection: 'fares',
        id: fare.id,
        data: {
          route: fare.route,
          adult: fare.adult,
          child: fare.child,
          type: 'highspeed'
        }
      }))
      await batchWrite(operations)
      highspeedFares.value = [...editingHighspeedFares.value]
      $toast.success('高速船料金を更新しました')
    } else if (activeTab.value === 'peak') {
      // 料金加算率の保存
      await updateDocument('settings', 'fareSettings', {
        peakSurchargeRate: editingPeakSurchargeRate.value
      })
      peakSurchargeRate.value = editingPeakSurchargeRate.value
      $toast.success('繁忙期料金設定を更新しました')
    }
    
    showEditModal.value = false
  } catch (error) {
    logger.error('Failed to save fare data', error)
    $toast.error('保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

const publishFareData = async () => {
  isPublishing.value = true
  try {
    await publishData('fare')
    $toast.success('料金データを公開しました')
  } catch (error) {
    logger.error('Failed to publish fare data', error)
    $toast.error('データの公開に失敗しました')
  } finally {
    isPublishing.value = false
  }
}

const refreshData = () => {
  loadFareData()
}

// 編集モーダルを開く際に編集用データを更新
watch(showEditModal, (isOpen) => {
  if (isOpen) {
    editingFerryFares.value = [...ferryFares.value]
    editingHighspeedFares.value = [...highspeedFares.value]
    editingPeakSurchargeRate.value = peakSurchargeRate.value
  }
})

onMounted(() => {
  loadFareData()
})
</script>
