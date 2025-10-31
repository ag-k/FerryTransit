<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">時刻表管理</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        フェリーと高速船の時刻表を管理します
      </p>
    </div>

    <!-- フィルター -->
    <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            出発港
          </label>
          <select
            v-model="filters.departure"
            data-test="timetable-filter-departure"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option v-for="port in ports" :key="port.id" :value="port.id">
              {{ port.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            到着港
          </label>
          <select
            v-model="filters.arrival"
            data-test="timetable-filter-arrival"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option v-for="port in ports" :key="port.id" :value="port.id">
              {{ port.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            船舶
          </label>
          <select
            v-model="filters.ship"
            data-test="timetable-filter-ship"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option v-for="ship in ships" :key="ship.id" :value="ship.id">
              {{ ship.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            運航状態
          </label>
          <select
            v-model="filters.status"
            data-test="timetable-filter-status"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option value="0">通常運航</option>
            <option value="1">遅延</option>
            <option value="2">欠航</option>
            <option value="3">変更</option>
            <option value="4">臨時便</option>
          </select>
        </div>
      </div>
    </div>

    <!-- アクションボタン -->
    <div class="mb-4 flex flex-col sm:flex-row gap-3 justify-between">
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          data-test="timetable-refresh"
          class="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          @click="refreshData"
        >
          <ArrowPathIcon class="h-5 w-5 inline mr-1" />
          更新
        </button>
        <button
          :disabled="isPublishing"
          data-test="timetable-publish"
          class="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          @click="publishTimetableData"
        >
          <CloudArrowUpIcon class="h-5 w-5 inline mr-1" />
          {{ isPublishing ? '公開中...' : 'データ公開' }}
        </button>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          data-test="timetable-import"
          class="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          @click="showImportModal = true"
        >
          <ArrowUpTrayIcon class="h-5 w-5 inline mr-1" />
          インポート
        </button>
        <button
          data-test="timetable-add"
          class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          @click="showAddModal = true"
        >
          <PlusIcon class="h-5 w-5 inline mr-1" />
          新規追加
        </button>
      </div>
    </div>

    <!-- データテーブル -->
    <DataTable
      :columns="columns"
      :data="filteredTimetables"
      :pagination="true"
      :page-size="20"
    >
      <template #cell-name="{ value }">
        {{ getShipName(value) }}
      </template>
      <template #cell-departure="{ value }">
        {{ getPortName(value) }}
      </template>
      <template #cell-arrival="{ value }">
        {{ getPortName(value) }}
      </template>
      <template #cell-departure_time="{ value }">
        {{ formatTime(value) }}
      </template>
      <template #cell-arrival_time="{ value }">
        {{ formatTime(value) }}
      </template>
      <template #cell-status="{ value }">
        <span
          :class="[
            'px-2 py-1 rounded-full text-xs font-medium',
            getStatusClass(value)
          ]"
        >
          {{ getStatusLabel(value) }}
        </span>
      </template>
      <template #row-actions="{ row }">
        <div class="flex items-center gap-1">
          <button
            data-test="timetable-edit"
            class="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="編集"
            aria-label="時刻表を編集"
            @click="editTimetable(row)"
          >
            <PencilIcon class="h-5 w-5" />
          </button>
          <button
            data-test="timetable-delete"
            class="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="削除"
            aria-label="時刻表を削除"
            @click="deleteTimetable(row)"
          >
            <TrashIcon class="h-5 w-5" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- 追加/編集モーダル -->
    <FormModal
      :open="showAddModal || showEditModal"
      :title="showAddModal ? '時刻表の追加' : '時刻表の編集'"
      :loading="isSaving"
      @close="closeModal"
      @submit="saveTimetable"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              便ID (trip_id)
            </label>
            <input
              v-model="formData.trip_id"
              type="text"
              data-test="timetable-trip-id"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              次便ID (next_id)
            </label>
            <input
              v-model="formData.next_id"
              type="text"
              data-test="timetable-next-id"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="次の便IDがある場合に入力"
            >
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            船舶名
          </label>
          <select
            v-model="formData.name"
            data-test="timetable-name"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required
          >
            <option value="">選択してください</option>
            <option v-for="ship in ships" :key="ship.id" :value="ship.id">
              {{ ship.name }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              出発港
            </label>
            <select
              v-model="formData.departure"
              data-test="timetable-departure"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
              <option value="">選択してください</option>
              <option v-for="port in ports" :key="port.id" :value="port.id">
                {{ port.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              到着港
            </label>
            <select
              v-model="formData.arrival"
              data-test="timetable-arrival"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
              <option value="">選択してください</option>
              <option v-for="port in ports" :key="port.id" :value="port.id">
                {{ port.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              出発時刻
            </label>
            <input
              v-model="formData.departure_time"
              type="time"
              data-test="timetable-departure-time"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              到着時刻
            </label>
            <input
              v-model="formData.arrival_time"
              type="time"
              data-test="timetable-arrival-time"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              開始日
            </label>
            <input
              v-model="formData.start_date"
              type="date"
              data-test="timetable-start-date"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              終了日
            </label>
            <input
              v-model="formData.end_date"
              type="date"
              data-test="timetable-end-date"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            運航状態
          </label>
          <select
            v-model="formData.status"
            data-test="timetable-status"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
          >
            <option value="0">通常運航</option>
            <option value="1">遅延</option>
            <option value="2">欠航</option>
            <option value="3">変更</option>
            <option value="4">臨時便</option>
          </select>
        </div>
      </div>
    </FormModal>

    <!-- インポートモーダル -->
    <FormModal
      :open="showImportModal"
      title="時刻表データのインポート"
      :loading="isImporting"
      @close="showImportModal = false"
      @submit="importData"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            CSVファイルを選択
          </label>
          <input
            type="file"
            accept=".csv"
            data-test="timetable-file-input"
            class="mt-1 w-full"
            @change="handleFileSelect"
          >
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          <p>CSVファイルの形式:</p>
          <ul class="list-disc list-inside mt-2">
            <li>trip_id, next_id, name, departure, arrival, departure_time, arrival_time, start_date, end_date, status</li>
            <li>港・船舶・便IDはシステムID（例: HONDO_SHICHIRUI, FERRY_OKI）で入力</li>
            <li>UTF-8エンコーディング</li>
            <li>ヘッダー行あり</li>
          </ul>
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
  ArrowUpTrayIcon,
  CloudArrowUpIcon
} from '@heroicons/vue/24/outline'
import { orderBy } from 'firebase/firestore'
import type { Port, Ship } from '~/types'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { useDataPublish } from '~/composables/useDataPublish'
import DataTable from '~/components/admin/DataTable.vue'
import FormModal from '~/components/admin/FormModal.vue'
import { createLogger } from '~/utils/logger'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { getCollection, createDocument, updateDocument, deleteDocument, batchWrite } = useAdminFirestore()
const { publishData } = useDataPublish()
const { $toast } = useNuxtApp()
const logger = createLogger('AdminTimetablePage')

interface AdminTimetableRecord {
  id?: string
  trip_id: string
  next_id: string
  start_date: string
  end_date: string
  name: string
  departure: string
  departure_time: string
  arrival: string
  arrival_time: string
  status: number
  price?: number
}

type AdminTimetableForm = Omit<AdminTimetableRecord, 'id'>

// 港データ
const ports = ref<Port[]>([
  { id: 'SAIGO', name: '西郷', nameEn: 'Saigo', location: { lat: 36.2, lng: 133.3 }, type: 'dogo' },
  { id: 'HISHIURA', name: '菱浦', nameEn: 'Hishiura', location: { lat: 36.1, lng: 133.2 }, type: 'dozen' },
  { id: 'BEPPU', name: '別府', nameEn: 'Beppu', location: { lat: 36.3, lng: 133.15 }, type: 'dozen' },
  { id: 'KURI', name: '来居', nameEn: 'Kuri', location: { lat: 36.05, lng: 133.1 }, type: 'dozen' },
  { id: 'HONDO_SHICHIRUI', name: '本土七類', nameEn: 'Hondo Shichirui', location: { lat: 35.5, lng: 133.2 }, type: 'mainland' },
  { id: 'HONDO_SAKAIMINATO', name: '本土境港', nameEn: 'Hondo Sakaiminato', location: { lat: 35.55, lng: 133.23 }, type: 'mainland' }
])

// 船舶データ
const ships = ref<Ship[]>([
  { id: 'FERRY_OKI', name: 'フェリーおき', nameEn: 'Ferry Oki', type: 'ferry' },
  { id: 'FERRY_SHIRASHIMA', name: 'フェリーしらしま', nameEn: 'Ferry Shirashima', type: 'ferry' },
  { id: 'FERRY_KUNIGA', name: 'フェリーくにが', nameEn: 'Ferry Kuniga', type: 'ferry' },
  { id: 'FERRY_DOZEN', name: 'フェリーどうぜん', nameEn: 'Ferry Dozen', type: 'ferry' },
  { id: 'RAINBOWJET', name: 'レインボージェット', nameEn: 'Rainbow Jet', type: 'highspeed' }
])

const timetables = ref<AdminTimetableRecord[]>([])
const filters = ref({
  departure: '',
  arrival: '',
  ship: '',
  status: ''
})

const showAddModal = ref(false)
const showEditModal = ref(false)
const showImportModal = ref(false)
const isSaving = ref(false)
const isImporting = ref(false)
const isPublishing = ref(false)
const editingId = ref<string | null>(null)

const defaultFormState = (): AdminTimetableForm => ({
  trip_id: '',
  next_id: '',
  start_date: '',
  end_date: '',
  name: '',
  departure: '',
  departure_time: '',
  arrival: '',
  arrival_time: '',
  status: 0,
  price: undefined
})

const formData = ref<AdminTimetableForm>(defaultFormState())

const columns = [
  { key: 'trip_id', label: '便ID', sortable: true },
  { key: 'name', label: '船舶', sortable: true },
  { key: 'departure', label: '出発港', sortable: true },
  { key: 'arrival', label: '到着港', sortable: true },
  { key: 'departure_time', label: '出発時刻', sortable: true },
  { key: 'arrival_time', label: '到着時刻', sortable: true },
  { key: 'status', label: '状態', sortable: true }
]

const filteredTimetables = computed(() => {
  return timetables.value.filter(item => {
    if (filters.value.departure && item.departure !== filters.value.departure) return false
    if (filters.value.arrival && item.arrival !== filters.value.arrival) return false
    if (filters.value.ship && item.name !== filters.value.ship) return false
    if (filters.value.status !== '' && item.status !== Number.parseInt(filters.value.status, 10)) return false
    return true
  })
})

const getStatusClass = (status: number) => {
  switch (status) {
    case 0: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 1: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 2: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 3: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 4: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getStatusLabel = (status: number) => {
  switch (status) {
    case 0: return '通常'
    case 1: return '遅延'
    case 2: return '欠航'
    case 3: return '変更'
    case 4: return '臨時'
    default: return '不明'
  }
}

const formatTime = (time: string | Date) => {
  if (typeof time === 'string') {
    return normalizeTimeValue(time)
  }
  return new Date(time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

const editTimetable = (item: AdminTimetableRecord) => {
  formData.value = {
    trip_id: item.trip_id,
    next_id: item.next_id || '',
    start_date: formatDateForInput(item.start_date),
    end_date: formatDateForInput(item.end_date),
    name: item.name,
    departure: item.departure,
    departure_time: normalizeTimeValue(item.departure_time),
    arrival: item.arrival,
    arrival_time: normalizeTimeValue(item.arrival_time),
    status: item.status ?? 0,
    price: item.price
  }
  editingId.value = item.id || null
  showEditModal.value = true
}

const deleteTimetable = async (item: AdminTimetableRecord) => {
  if (!item.id) return

  if (confirm(`${getShipName(item.name)} の ${getPortName(item.departure)} → ${getPortName(item.arrival)} 便を削除しますか？`)) {
    try {
      await deleteDocument('timetables', item.id)
      await refreshData()
      $toast.success('時刻表を削除しました')
  } catch (error) {
    logger.error('Failed to delete timetable', error)
      $toast.error('削除に失敗しました')
    }
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingId.value = null
  formData.value = defaultFormState()
}

const saveTimetable = async () => {
  isSaving.value = true
  try {
    const payload: AdminTimetableForm = {
      trip_id: formData.value.trip_id || toStringSafe(Date.now()),
      next_id: formData.value.next_id || '',
      start_date: formatDateForStorage(formData.value.start_date),
      end_date: formatDateForStorage(formData.value.end_date),
      name: formData.value.name,
      departure: formData.value.departure,
      departure_time: normalizeTimeValue(formData.value.departure_time),
      arrival: formData.value.arrival,
      arrival_time: normalizeTimeValue(formData.value.arrival_time),
      status: formData.value.status ?? 0,
      price: formData.value.price !== undefined && formData.value.price !== null && formData.value.price !== ''
        ? Number(formData.value.price)
        : undefined
    }

    if (editingId.value) {
      await updateDocument('timetables', editingId.value, payload)
      $toast.success('時刻表を更新しました')
    } else {
      await createDocument('timetables', payload)
      $toast.success('時刻表を追加しました')
    }

    closeModal()
    await refreshData()
  } catch (error) {
    logger.error('Failed to save timetable', error)
    $toast.error('保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

const refreshData = async () => {
  try {
    const primaryData = await getCollection<any>('timetables', [orderBy('departure_time', 'asc')])
    timetables.value = primaryData.map((item: any) => normalizeTimetableRecord(item))
  } catch (error) {
    logger.warn('Failed to fetch timetables with snake_case ordering, retrying with camelCase', error)
    try {
      const fallbackData = await getCollection<any>('timetables', [orderBy('departureTime', 'asc')])
      timetables.value = fallbackData.map((item: any) => normalizeTimetableRecord(item))
    } catch (fallbackError) {
      logger.error('Failed to fetch timetables', fallbackError)
      $toast.error('データの取得に失敗しました')
    }
  }
}

const getPortName = (portId: string) => {
  const port = ports.value.find(p => p.id === portId)
  return port?.name || portId
}

const getShipName = (shipId: string) => {
  const ship = ships.value.find(s => s.id === shipId)
  return ship?.name || shipId
}

const formatDateForStorage = (value: string) => {
  if (!value) return ''
  return value.replace(/-/g, '/').trim()
}

const formatDateForInput = (value: string) => {
  if (!value) return ''
  return value.replace(/\//g, '-').trim()
}

const normalizeTimeValue = (value: string) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.includes(':')) {
    const [hour = '', minute = ''] = trimmed.split(':')
    if (minute === '') {
      return trimmed
    }
    return `${hour.trim().padStart(2, '0')}:${minute.trim().padStart(2, '0')}`
  }
  if (trimmed.length === 4) {
    const hourPart = trimmed.slice(0, 2)
    const minutePart = trimmed.slice(2)
    return `${hourPart.padStart(2, '0')}:${minutePart.padStart(2, '0')}`
  }
  return trimmed
}

const toStringSafe = (value: unknown) => {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value)
}

const normalizeTimetableRecord = (item: any): AdminTimetableRecord => {
  const rawStatus = typeof item.status === 'number'
    ? item.status
    : Number.parseInt(item.status ?? '0', 10)
  const status = Number.isNaN(rawStatus) ? 0 : rawStatus

  const hasPrice = item.price !== undefined && item.price !== null && item.price !== ''
  const price = hasPrice ? Number(item.price) : undefined

  const tripId = toStringSafe(item.trip_id ?? item.tripId)

  return {
    id: item.id,
    trip_id: tripId || toStringSafe(item.id),
    next_id: toStringSafe(item.next_id ?? item.nextId),
    start_date: formatDateForStorage(toStringSafe(item.start_date ?? item.startDate)),
    end_date: formatDateForStorage(toStringSafe(item.end_date ?? item.endDate)),
    name: toStringSafe(item.name),
    departure: toStringSafe(item.departure),
    departure_time: normalizeTimeValue(toStringSafe(item.departure_time ?? item.departureTime)),
    arrival: toStringSafe(item.arrival),
    arrival_time: normalizeTimeValue(toStringSafe(item.arrival_time ?? item.arrivalTime)),
    status,
    price
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    importCSVFile(file)
  }
}

const importCSVFile = async (file: File) => {
  try {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())

    const operations = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: Partial<AdminTimetableForm> & { status?: number } = {}
      let status = 0

      headers.forEach((header, index) => {
        const value = values[index]?.trim() ?? ''
        switch (header.toLowerCase()) {
          case 'trip_id':
          case 'tripid':
          case '便id':
          case '便ｉｄ':
            row.trip_id = value
            break
          case 'next_id':
          case 'nextid':
          case '次便id':
          case '次便ｉｄ':
            row.next_id = value
            break
          case 'name':
          case 'ship':
          case '船舶':
          case '船舶名':
            row.name = value
            break
          case 'departure':
          case '出発港':
            row.departure = value
            break
          case 'arrival':
          case '到着港':
            row.arrival = value
            break
          case 'departure_time':
          case 'departuretime':
          case '出発時刻':
            row.departure_time = value
            break
          case 'arrival_time':
          case 'arrivaltime':
          case '到着時刻':
            row.arrival_time = value
            break
          case 'start_date':
          case 'startdate':
          case '開始日':
            row.start_date = value
            break
          case 'end_date':
          case 'enddate':
          case '終了日':
            row.end_date = value
            break
          case 'status':
          case '状態':
            {
              const parsed = Number.parseInt(value, 10)
              if (!Number.isNaN(parsed)) {
                status = parsed
              }
            }
            break
          case 'price':
          case '料金':
            {
              const parsed = Number.parseInt(value, 10)
              if (!Number.isNaN(parsed)) {
                row.price = parsed
              }
            }
            break
        }
      })

      const payload: AdminTimetableForm = {
        trip_id: row.trip_id && row.trip_id !== '' ? row.trip_id : toStringSafe(Date.now() + i),
        next_id: row.next_id || '',
        name: row.name || '',
        departure: row.departure || '',
        departure_time: normalizeTimeValue(row.departure_time || ''),
        arrival: row.arrival || '',
        arrival_time: normalizeTimeValue(row.arrival_time || ''),
        start_date: formatDateForStorage(row.start_date || ''),
        end_date: formatDateForStorage(row.end_date || ''),
        status,
        price: row.price
      }

      if (!payload.name || !payload.departure || !payload.arrival || !payload.departure_time || !payload.arrival_time) {
        logger.warn('Skipping CSV row due to missing required fields', { line: i + 1 })
        continue
      }

      operations.push({
        type: 'create' as const,
        collection: 'timetables',
        data: payload
      })
    }

    if (operations.length === 0) {
      $toast.info('インポート対象のデータがありません')
      return
    }

    await batchWrite(operations)
    $toast.success(`${operations.length}件のデータをインポートしました`)
  } catch (error) {
    logger.error('Failed to import CSV', error)
    $toast.error('CSVのインポートに失敗しました')
  }
}

const importData = async () => {
  isImporting.value = true
  try {
    showImportModal.value = false
    await refreshData()
  } catch (error) {
    logger.error('Failed to import data', error)
  } finally {
    isImporting.value = false
  }
}

const publishTimetableData = async () => {
  isPublishing.value = true
  try {
    await publishData('timetable')
    $toast.success('時刻表データを公開しました')
  } catch (error) {
    logger.error('Failed to publish data', error)
    $toast.error('データの公開に失敗しました')
  } finally {
    isPublishing.value = false
  }
}

onMounted(() => {
  refreshData()
})
</script>
