<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">運航アラート管理</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        運航状況のアラートと運休・遅延情報を管理します
      </p>
    </div>

    <!-- 現在の運航状況サマリー -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
        <div class="flex items-center">
          <CheckCircleIcon class="h-8 w-8 text-green-600 dark:text-green-400" />
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">通常運航</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ statusSummary.normal }}</p>
          </div>
        </div>
      </div>
      <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <div class="flex items-center">
          <ExclamationTriangleIcon class="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">遅延</p>
            <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{ statusSummary.delay }}</p>
          </div>
        </div>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <div class="flex items-center">
          <XCircleIcon class="h-8 w-8 text-red-600 dark:text-red-400" />
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">欠航</p>
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ statusSummary.cancel }}</p>
          </div>
        </div>
      </div>
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div class="flex items-center">
          <InformationCircleIcon class="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">臨時・変更</p>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ statusSummary.other }}</p>
          </div>
        </div>
      </div>
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
          @click="publishAlertData"
          :disabled="isPublishing"
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
        >
          <CloudArrowUpIcon class="h-5 w-5 inline mr-1" />
          {{ isPublishing ? '公開中...' : 'データ公開' }}
        </button>
      </div>
      <button
        @click="showAddModal = true"
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        <PlusIcon class="h-5 w-5 inline mr-1" />
        新規アラート
      </button>
    </div>

    <!-- アクティブなアラート一覧 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white">
          アクティブなアラート
        </h2>
      </div>
      <div class="p-6">
        <div v-if="activeAlerts.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          現在アクティブなアラートはありません
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="alert in activeAlerts"
            :key="alert.id"
            class="border dark:border-gray-700 rounded-lg p-4"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center">
                  <span
                    :class="[
                      'px-2 py-1 text-xs rounded-full mr-3',
                      getAlertStatusClass(alert.status)
                    ]"
                  >
                    {{ getAlertStatusLabel(alert.status) }}
                  </span>
                  <h3 class="font-medium text-gray-900 dark:text-white">
                    {{ alert.ship }} - {{ alert.route }}
                  </h3>
                </div>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {{ alert.summary }}
                </p>
                <div class="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <CalendarIcon class="h-4 w-4 mr-1" />
                  {{ formatDate(alert.startDate) }}
                  <span v-if="alert.endDate" class="mx-1">〜</span>
                  <span v-if="alert.endDate">{{ formatDate(alert.endDate) }}</span>
                  <ClockIcon class="h-4 w-4 ml-4 mr-1" />
                  {{ formatTime(alert.updatedAt) }}
                </div>
              </div>
              <div class="flex space-x-2 ml-4">
                <button
                  @click="editAlert(alert)"
                  class="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                >
                  <PencilIcon class="h-5 w-5" />
                </button>
                <button
                  @click="deleteAlert(alert)"
                  class="text-red-600 hover:text-red-900 dark:text-red-400"
                >
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 過去のアラート履歴 -->
    <DataTable
      title="アラート履歴"
      :columns="historyColumns"
      :data="alertHistory"
      :pagination="true"
      :page-size="10"
    >
      <template #cell-status="{ value }">
        <span
          :class="[
            'px-2 py-1 text-xs rounded-full',
            getAlertStatusClass(value)
          ]"
        >
          {{ getAlertStatusLabel(value) }}
        </span>
      </template>
      <template #cell-period="{ row }">
        {{ formatDate(row.startDate) }}
        <span v-if="row.endDate"> 〜 {{ formatDate(row.endDate) }}</span>
      </template>
    </DataTable>

    <!-- アラート追加/編集モーダル -->
    <FormModal
      :open="showAddModal || showEditModal"
      :title="showAddModal ? 'アラートの追加' : 'アラートの編集'"
      @close="closeModal"
      @submit="saveAlert"
      :loading="isSaving"
      size="lg"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            対象船舶
          </label>
          <select
            v-model="formData.ship"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required
          >
            <option value="">選択してください</option>
            <option value="フェリーおき">フェリーおき</option>
            <option value="フェリーしらしま">フェリーしらしま</option>
            <option value="フェリーくにが">フェリーくにが</option>
            <option value="フェリーどうぜん">フェリーどうぜん</option>
            <option value="レインボージェット">レインボージェット</option>
            <option value="いそかぜ">いそかぜ</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            対象航路
          </label>
          <input
            v-model="formData.route"
            type="text"
            placeholder="例: 西郷 → 本土七類"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            運航状態
          </label>
          <select
            v-model="formData.status"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required
          >
            <option value="1">遅延</option>
            <option value="2">欠航</option>
            <option value="3">変更</option>
            <option value="4">臨時</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            概要（日本語）
          </label>
          <input
            v-model="formData.summary"
            type="text"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            詳細（日本語）
          </label>
          <textarea
            v-model="formData.comment"
            rows="3"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
          ></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            概要（英語）
          </label>
          <input
            v-model="formData.summaryEn"
            type="text"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            詳細（英語）
          </label>
          <textarea
            v-model="formData.commentEn"
            rows="3"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
          ></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              開始日時
            </label>
            <input
              v-model="formData.startDate"
              type="datetime-local"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              終了日時（任意）
            </label>
            <input
              v-model="formData.endDate"
              type="datetime-local"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            >
          </div>
        </div>
      </div>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CalendarIcon,
  ClockIcon,
  CloudArrowUpIcon
} from '@heroicons/vue/24/outline'
import { where, orderBy } from 'firebase/firestore'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { useDataPublish } from '~/composables/useDataPublish'
import DataTable from '~/components/admin/DataTable.vue'
import FormModal from '~/components/admin/FormModal.vue'

interface Alert {
  ship: string
  route: string
  status: number
  summary: string
  comment?: string
  summaryEn?: string
  commentEn?: string
  startDate: string
  endDate?: string
  active: boolean
  severity: 'low' | 'medium' | 'high'
  affectedRoutes: string[]
}

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { getCollection, createDocument, updateDocument, deleteDocument } = useAdminFirestore()
const { publishData } = useDataPublish()
const { $toast } = useNuxtApp()

const showAddModal = ref(false)
const showEditModal = ref(false)
const isSaving = ref(false)
const isPublishing = ref(false)
const isLoading = ref(false)
const editingId = ref<string | null>(null)

const formData = ref<Partial<Alert>>({
  ship: '',
  route: '',
  status: 1,
  summary: '',
  comment: '',
  summaryEn: '',
  commentEn: '',
  startDate: '',
  endDate: ''
})

const activeAlerts = ref<Array<Alert & { id: string }>>([])
const alertHistory = ref<Array<Alert & { id: string }>>([])

const statusSummary = computed(() => {
  return {
    normal: 10,
    delay: activeAlerts.value.filter((a: Alert) => a.status === 1).length,
    cancel: activeAlerts.value.filter((a: Alert) => a.status === 2).length,
    other: activeAlerts.value.filter((a: Alert) => a.status === 3 || a.status === 4).length
  }
})

const historyColumns = [
  { key: 'ship', label: '船舶', sortable: true },
  { key: 'route', label: '航路', sortable: true },
  { key: 'status', label: '状態', sortable: true },
  { key: 'summary', label: '概要' },
  { key: 'period', label: '期間', sortable: true }
]

const getAlertStatusClass = (status: number) => {
  switch (status) {
    case 1: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 2: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 3: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 4: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getAlertStatusLabel = (status: number) => {
  switch (status) {
    case 1: return '遅延'
    case 2: return '欠航'
    case 3: return '変更'
    case 4: return '臨時'
    default: return '不明'
  }
}

const formatDate = (date: string | Date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const editAlert = (alert: Alert & { id: string }) => {
  formData.value = { ...alert }
  editingId.value = alert.id
  showEditModal.value = true
}

const deleteAlert = async (alert: Alert & { id: string }) => {
  if (!alert.id) return
  
  if (confirm(`${alert.ship}の${alert.summary}を削除しますか？`)) {
    try {
      await deleteDocument('alerts', alert.id)
      await refreshData()
      $toast.success('アラートを削除しました')
    } catch (error) {
      console.error('Failed to delete alert:', error)
      $toast.error('削除に失敗しました')
    }
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingId.value = null
  formData.value = {
    ship: '',
    route: '',
    status: 1,
    summary: '',
    comment: '',
    summaryEn: '',
    commentEn: '',
    startDate: '',
    endDate: ''
  }
}

const saveAlert = async () => {
  isSaving.value = true
  try {
    const alertData: Alert = {
      ship: formData.value.ship || '',
      route: formData.value.route || '',
      status: formData.value.status || 1,
      summary: formData.value.summary || '',
      comment: formData.value.comment || '',
      summaryEn: formData.value.summaryEn || '',
      commentEn: formData.value.commentEn || '',
      startDate: formData.value.startDate || '',
      endDate: formData.value.endDate,
      active: true,
      severity: formData.value.status === 2 ? 'high' : formData.value.status === 1 ? 'medium' : 'low',
      affectedRoutes: [formData.value.route || '']
    }

    if (editingId.value) {
      await updateDocument('alerts', editingId.value, alertData)
      $toast.success('アラートを更新しました')
    } else {
      await createDocument('alerts', alertData)
      $toast.success('アラートを追加しました')
    }
    
    closeModal()
    await refreshData()
  } catch (error) {
    console.error('Failed to save alert:', error)
    $toast.error('保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

const refreshData = async () => {
  isLoading.value = true
  try {
    // アクティブなアラート
    const activeConstraints = [
      where('active', '==', true),
      orderBy('startDate', 'desc')
    ]
    const activeData = await getCollection<Alert & { id: string }>('alerts', activeConstraints)
    activeAlerts.value = activeData

    // 過去のアラート（非アクティブまたは終了日が過去）
    const historyConstraints = [
      where('active', '==', false),
      orderBy('startDate', 'desc')
    ]
    const historyData = await getCollection<Alert & { id: string }>('alerts', historyConstraints)
    
    // 終了日が設定されていて過去のものも履歴に含める
    const expiredAlerts = activeData.filter(alert => 
      alert.endDate && new Date(alert.endDate) < new Date()
    )
    
    alertHistory.value = [...historyData, ...expiredAlerts]
  } catch (error) {
    console.error('Failed to fetch alerts:', error)
    $toast.error('データの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const publishAlertData = async () => {
  isPublishing.value = true
  try {
    await publishData('alerts')
    $toast.success('アラートデータを公開しました')
  } catch (error) {
    console.error('Failed to publish alert data:', error)
    $toast.error('データの公開に失敗しました')
  } finally {
    isPublishing.value = false
  }
}

onMounted(() => {
  refreshData()
})
</script>