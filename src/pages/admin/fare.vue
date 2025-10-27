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
          :class="[
            activeTab === tab.id
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'px-3 py-2 font-medium text-sm rounded-md'
          ]"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- アクションボタン -->
    <div class="mb-4 flex justify-between items-center">
      <div class="flex space-x-2">
        <button
          :disabled="isLoading"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
          @click="refreshData"
        >
          <ArrowPathIcon class="h-5 w-5 inline mr-1" />
          {{ isLoading ? '読み込み中...' : '更新' }}
        </button>
        <button
          :disabled="isPublishing"
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
          @click="publishFareData"
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
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ activeTabData.title }}
            </h2>
            <p
              v-if="activeVersionLabel"
              class="mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              {{ activeVersionLabel }}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <template v-if="activeTab === 'ferry' || activeTab === 'highspeed'">
              <label class="text-sm text-gray-500 dark:text-gray-400">
                版
              </label>
              <select
                v-model="activeVersionId"
                class="rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
              >
                <option
                  v-if="activeVersionOptions.length === 0"
                  disabled
                  value=""
                >
                  版が未作成
                </option>
                <option
                  v-for="version in activeVersionOptions"
                  :key="version.id"
                  :value="version.id"
                >
                  {{ version.name || version.effectiveFrom }}
                </option>
              </select>
              <button
                class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                @click="openCreateVersionModal(activeTab === 'ferry' ? 'ferry' : 'highspeed')"
              >
                <PlusIcon class="h-4 w-4 inline mr-1" />
                新しい版
              </button>
            </template>
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              @click="showEditModal = true"
            >
              <PencilIcon class="h-5 w-5 inline mr-1" />
              料金編集
            </button>
          </div>
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
      :loading="isSaving"
      size="xl"
      @close="showEditModal = false"
      @submit="saveFareData"
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

      </div>
    </FormModal>

    <FormModal
      :open="showVersionModal"
      title="新しい版を作成"
      :loading="isSavingVersion"
      @close="closeVersionModal"
      @submit="createVersion"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            船種
          </label>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ versionForm.vesselType === 'ferry' ? 'フェリー' : '高速船' }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            版名称（任意）
          </label>
          <input
            v-model="versionForm.name"
            type="text"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            placeholder="例: 2024年4月改定"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            適用開始日
          </label>
          <input
            v-model="versionForm.effectiveFrom"
            type="date"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            既存版からコピー（任意）
          </label>
          <select
            v-model="versionForm.copyFromVersionId"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
          >
            <option :value="null">
              コピーしない
            </option>
            <option
              v-for="version in copySourceVersions"
              :key="version.id"
              :value="version.id"
            >
              {{ formatVersionLabel(version) }}
            </option>
          </select>
        </div>
      </div>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { PencilIcon, CloudArrowUpIcon, ArrowPathIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { orderBy, where } from 'firebase/firestore'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { useDataPublish } from '~/composables/useDataPublish'
import type { FareData, Discount } from '~/types'
import type { FareVersion, VesselType } from '~/types/fare'
import FormModal from '~/components/admin/FormModal.vue'
import { createLogger } from '~/utils/logger'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { getCollection, batchWrite, createDocument } = useAdminFirestore()
const { publishData } = useDataPublish()
const { $toast } = useNuxtApp()
const logger = createLogger('AdminFarePage')

const tabs = [
  { id: 'ferry', name: 'フェリー料金' },
  { id: 'highspeed', name: '高速船料金' },
  { id: 'discount', name: '割引設定' }
]

const activeTab = ref('ferry')
const showEditModal = ref(false)
const isSaving = ref(false)
const isPublishing = ref(false)
const isLoading = ref(false)

type FareEntry = FareData & { id?: string; versionId?: string }

// データ
const ferryFares = ref<FareEntry[]>([])
const highspeedFares = ref<FareEntry[]>([])
const discounts = ref<Array<Discount & { id?: string }>>([])

const ferryVersions = ref<Array<FareVersion & { id: string }>>([])
const highspeedVersions = ref<Array<FareVersion & { id: string }>>([])
const selectedFerryVersionId = ref<string | null>(null)
const selectedHighspeedVersionId = ref<string | null>(null)
const versionsInitialized = ref(false)

// 編集用データ
const editingFerryFares = ref<FareEntry[]>([])
const editingHighspeedFares = ref<FareEntry[]>([])

// 版作成モーダル
const showVersionModal = ref(false)
const isSavingVersion = ref(false)
const versionForm = reactive<{
  vesselType: VesselType
  name: string
  effectiveFrom: string
  copyFromVersionId: string | null
}>({
  vesselType: 'ferry',
  name: '',
  effectiveFrom: '',
  copyFromVersionId: null
})

const activeTabData = computed(() => {
  switch (activeTab.value) {
    case 'ferry':
      return { title: 'フェリー料金表' }
    case 'highspeed':
      return { title: '高速船料金表' }
    case 'discount':
      return { title: '割引設定' }
    default:
      return { title: '' }
  }
})

const formatVersionLabel = (version: FareVersion | null | undefined): string => {
  if (!version) return ''
  const label = version.name || '現行版'
  if (version.effectiveFrom === '1970-01-01') {
    return label
  }
  return `${label}（適用開始日: ${version.effectiveFrom}）`
}

const getVersionById = (versions: Array<FareVersion & { id: string }>, id: string | null) => {
  if (!id) return null
  return versions.find(version => version.id === id) ?? null
}

const activeVersionOptions = computed(() => {
  if (activeTab.value === 'ferry') {
    return ferryVersions.value
  }
  if (activeTab.value === 'highspeed') {
    return highspeedVersions.value
  }
  return []
})

const activeVersionId = computed<string | null>({
  get() {
    if (activeTab.value === 'ferry') {
      return selectedFerryVersionId.value
    }
    if (activeTab.value === 'highspeed') {
      return selectedHighspeedVersionId.value
    }
    return null
  },
  set(value) {
    if (activeTab.value === 'ferry') {
      selectedFerryVersionId.value = value
    } else if (activeTab.value === 'highspeed') {
      selectedHighspeedVersionId.value = value
    }
  }
})

const activeVersionMetadata = computed(() => {
  if (activeTab.value === 'ferry') {
    return getVersionById(ferryVersions.value, selectedFerryVersionId.value)
  }
  if (activeTab.value === 'highspeed') {
    return getVersionById(highspeedVersions.value, selectedHighspeedVersionId.value)
  }
  return null
})

const activeVersionLabel = computed(() => {
  return formatVersionLabel(activeVersionMetadata.value)
})

const copySourceVersions = computed(() => {
  return versionForm.vesselType === 'ferry'
    ? ferryVersions.value
    : highspeedVersions.value
})

const parseEffectiveTimestamp = (value: string): number => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const determineDefaultVersionId = (versions: Array<FareVersion & { id: string }>): string | null => {
  if (!versions.length) return null
  const now = Date.now()
  const sorted = [...versions].sort((a, b) => parseEffectiveTimestamp(b.effectiveFrom) - parseEffectiveTimestamp(a.effectiveFrom))
  const active = sorted.find(version => parseEffectiveTimestamp(version.effectiveFrom) <= now)
  return (active ?? sorted[sorted.length - 1]).id
}

const loadFareVersions = async () => {
  const versionDocs = await getCollection<FareVersion & { id: string }>(
    'fareVersions',
    [orderBy('effectiveFrom', 'desc')]
  )

  ferryVersions.value = versionDocs
    .filter(version => version.vesselType === 'ferry')
    .sort((a, b) => parseEffectiveTimestamp(b.effectiveFrom) - parseEffectiveTimestamp(a.effectiveFrom))

  highspeedVersions.value = versionDocs
    .filter(version => version.vesselType === 'highspeed')
    .sort((a, b) => parseEffectiveTimestamp(b.effectiveFrom) - parseEffectiveTimestamp(a.effectiveFrom))

  if (!selectedFerryVersionId.value || !getVersionById(ferryVersions.value, selectedFerryVersionId.value)) {
    selectedFerryVersionId.value = determineDefaultVersionId(ferryVersions.value)
  }

  if (!selectedHighspeedVersionId.value || !getVersionById(highspeedVersions.value, selectedHighspeedVersionId.value)) {
    selectedHighspeedVersionId.value = determineDefaultVersionId(highspeedVersions.value)
  }
}

const loadFaresForType = async (vesselType: VesselType) => {
  const constraints = [where('type', '==', vesselType), orderBy('route')]
  const fareDocs = await getCollection<FareEntry & { id: string }>('fares', constraints)

  const targetVersionId = vesselType === 'ferry' ? selectedFerryVersionId.value : selectedHighspeedVersionId.value

  let filtered = fareDocs
  if (targetVersionId) {
    filtered = fareDocs.filter(fare => fare.versionId === targetVersionId)
    if (!filtered.length) {
      // 互換性のためversionIdが未設定のデータをフォールバック
      filtered = fareDocs.filter(fare => !fare.versionId)
    }
  }

  const sorted = filtered.sort((a, b) => a.route.localeCompare(b.route))

  if (vesselType === 'ferry') {
    ferryFares.value = sorted
    editingFerryFares.value = sorted.map(fare => ({ ...fare }))
  } else if (vesselType === 'highspeed') {
    highspeedFares.value = sorted
    editingHighspeedFares.value = sorted.map(fare => ({ ...fare }))
  }
}

const openCreateVersionModal = (vesselType: VesselType) => {
  versionForm.vesselType = vesselType
  versionForm.name = ''
  versionForm.effectiveFrom = ''
  versionForm.copyFromVersionId = vesselType === 'ferry'
    ? selectedFerryVersionId.value
    : selectedHighspeedVersionId.value
  showVersionModal.value = true
}

const closeVersionModal = () => {
  showVersionModal.value = false
  versionForm.name = ''
  versionForm.effectiveFrom = ''
  versionForm.copyFromVersionId = null
}

const mapFareEntryForCreate = (fare: FareEntry, versionId: string) => {
  const payload: Record<string, any> = {
    route: fare.route,
    adult: fare.adult,
    child: fare.child,
    type: fare.type,
    versionId
  }

  if (typeof fare.car3m !== 'undefined') payload.car3m = fare.car3m
  if (typeof fare.car4m !== 'undefined') payload.car4m = fare.car4m
  if (typeof fare.car5m !== 'undefined') payload.car5m = fare.car5m

  return payload
}

const createVersion = async () => {
  if (!versionForm.effectiveFrom) {
    $toast.error('適用開始日を入力してください')
    return
  }

  isSavingVersion.value = true
  try {
    const newVersionId = await createDocument('fareVersions', {
      vesselType: versionForm.vesselType,
      name: versionForm.name || null,
      effectiveFrom: versionForm.effectiveFrom,
      createdAt: new Date().toISOString()
    })

    const copyFromId = versionForm.copyFromVersionId && versionForm.copyFromVersionId !== 'null'
      ? versionForm.copyFromVersionId
      : null

    if (copyFromId) {
      const constraints = [where('type', '==', versionForm.vesselType), orderBy('route')]
      const sourceFares = await getCollection<FareEntry & { id: string }>('fares', constraints)
      const faresToCopy = sourceFares.filter(fare => fare.versionId === copyFromId)

      if (faresToCopy.length) {
        const operations = faresToCopy.map(fare => ({
          type: 'create' as const,
          collection: 'fares',
          data: mapFareEntryForCreate(fare, newVersionId)
        }))

        await batchWrite(operations)
      }
    }

    await loadFareVersions()

    if (versionForm.vesselType === 'ferry') {
      selectedFerryVersionId.value = newVersionId
    } else if (versionForm.vesselType === 'highspeed') {
      selectedHighspeedVersionId.value = newVersionId
    }

    await loadFaresForType(versionForm.vesselType)

    showVersionModal.value = false
    $toast.success('新しい版を作成しました')
  } catch (error) {
    logger.error('Failed to create fare version', error)
    $toast.error('版の作成に失敗しました')
  } finally {
    isSavingVersion.value = false
  }
}

watch(selectedFerryVersionId, async () => {
  if (!versionsInitialized.value) return
  try {
    await loadFaresForType('ferry')
  } catch (error) {
    logger.error('Failed to load ferry fares for selected version', error)
    $toast.error('フェリー料金の読み込みに失敗しました')
  }
})

watch(selectedHighspeedVersionId, async () => {
  if (!versionsInitialized.value) return
  try {
    await loadFaresForType('highspeed')
  } catch (error) {
    logger.error('Failed to load highspeed fares for selected version', error)
    $toast.error('高速船料金の読み込みに失敗しました')
  }
})

const loadFareData = async () => {
  isLoading.value = true
  try {
    versionsInitialized.value = false
    await loadFareVersions()
    await Promise.all([
      loadFaresForType('ferry'),
      loadFaresForType('highspeed')
    ])
    versionsInitialized.value = true

    // 割引設定
    const discountData = await getCollection<Discount & { id: string }>('discounts', [orderBy('name')])
    discounts.value = discountData
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
    { route: '本土七類 ⇔ 西郷', adult: 3350, child: 1680, car3m: 12340, car4m: 15430, car5m: 18520, type: 'ferry', versionId: selectedFerryVersionId.value ?? undefined },
    { route: '本土七類 ⇔ 菱浦', adult: 2540, child: 1270, car3m: 10390, car4m: 12990, car5m: 15590, type: 'ferry', versionId: selectedFerryVersionId.value ?? undefined },
    { route: '本土七類 ⇔ 別府', adult: 2540, child: 1270, car3m: 10390, car4m: 12990, car5m: 15590, type: 'ferry', versionId: selectedFerryVersionId.value ?? undefined },
    { route: '本土七類 ⇔ 来居', adult: 2540, child: 1270, car3m: 10390, car4m: 12990, car5m: 15590, type: 'ferry', versionId: selectedFerryVersionId.value ?? undefined },
    { route: '西郷 ⇔ 菱浦', adult: 1490, child: 750, car3m: 4630, car4m: 5790, car5m: 6950, type: 'ferry', versionId: selectedFerryVersionId.value ?? undefined },
    { route: '西郷 ⇔ 別府', adult: 1490, child: 750, car3m: 4630, car4m: 5790, car5m: 6950, type: 'ferry', versionId: selectedFerryVersionId.value ?? undefined }
  ]

  // デフォルトの高速船料金
  highspeedFares.value = [
    { route: '本土七類 ⇔ 西郷', adult: 6430, child: 3220, type: 'highspeed', versionId: selectedHighspeedVersionId.value ?? undefined },
    { route: '本土七類 ⇔ 菱浦', adult: 4890, child: 2450, type: 'highspeed', versionId: selectedHighspeedVersionId.value ?? undefined },
    { route: '本土七類 ⇔ 別府', adult: 4890, child: 2450, type: 'highspeed', versionId: selectedHighspeedVersionId.value ?? undefined },
    { route: '西郷 ⇔ 菱浦', adult: 2890, child: 1450, type: 'highspeed', versionId: selectedHighspeedVersionId.value ?? undefined },
    { route: '西郷 ⇔ 別府', adult: 2890, child: 1450, type: 'highspeed', versionId: selectedHighspeedVersionId.value ?? undefined }
  ]

  // デフォルトの割引設定
  discounts.value = [
    { id: '1', name: '島民割引', description: '隠岐諸島に住所を有する方', rate: 30, active: true, conditions: ['residence'] },
    { id: '2', name: '団体割引', description: '15名以上の団体', rate: 10, active: true, conditions: ['group'] },
    { id: '3', name: '学生割引', description: '学生証の提示が必要', rate: 20, active: true, conditions: ['student'] },
    { id: '4', name: '障害者割引', description: '障害者手帳の提示が必要', rate: 50, active: true, conditions: ['disability'] }
  ]

  editingFerryFares.value = ferryFares.value.map(fare => ({ ...fare }))
  editingHighspeedFares.value = highspeedFares.value.map(fare => ({ ...fare }))
}

const saveFareData = async () => {
  isSaving.value = true
  try {
    if (activeTab.value === 'ferry') {
      // フェリー料金の保存
      if (!selectedFerryVersionId.value) {
        $toast.error('フェリー料金を保存する版を選択してください')
        return
      }

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
          type: 'ferry',
          versionId: selectedFerryVersionId.value
        }
      }))
      await batchWrite(operations)
      ferryFares.value = editingFerryFares.value.map(fare => ({
        ...fare,
        versionId: selectedFerryVersionId.value || fare.versionId
      }))
      $toast.success('フェリー料金を更新しました')
    } else if (activeTab.value === 'highspeed') {
      // 高速船料金の保存
      if (!selectedHighspeedVersionId.value) {
        $toast.error('高速船料金を保存する版を選択してください')
        return
      }

      const operations = editingHighspeedFares.value.map(fare => ({
        type: fare.id ? 'update' as const : 'create' as const,
        collection: 'fares',
        id: fare.id,
        data: {
          route: fare.route,
          adult: fare.adult,
          child: fare.child,
          type: 'highspeed',
          versionId: selectedHighspeedVersionId.value
        }
      }))
      await batchWrite(operations)
      highspeedFares.value = editingHighspeedFares.value.map(fare => ({
        ...fare,
        versionId: selectedHighspeedVersionId.value || fare.versionId
      }))
      $toast.success('高速船料金を更新しました')
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
  }
})

onMounted(() => {
  loadFareData()
})
</script>
