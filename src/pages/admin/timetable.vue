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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            出発港
          </label>
          <select
            v-model="filters.departure"
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
    <div class="mb-4 flex justify-between items-center">
      <div class="flex space-x-2">
        <button
          @click="refreshData"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          <ArrowPathIcon class="h-5 w-5 inline mr-1" />
          更新
        </button>
      </div>
      <div class="flex space-x-2">
        <button
          @click="showImportModal = true"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <ArrowUpTrayIcon class="h-5 w-5 inline mr-1" />
          インポート
        </button>
        <button
          @click="showAddModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
      <template #cell-departureTime="{ value }">
        {{ formatTime(value) }}
      </template>
      <template #cell-arrivalTime="{ value }">
        {{ formatTime(value) }}
      </template>
      <template #row-actions="{ row }">
        <button
          @click="editTimetable(row)"
          class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
        >
          <PencilIcon class="h-5 w-5" />
        </button>
        <button
          @click="deleteTimetable(row)"
          class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
        >
          <TrashIcon class="h-5 w-5" />
        </button>
      </template>
    </DataTable>

    <!-- 追加/編集モーダル -->
    <FormModal
      :open="showAddModal || showEditModal"
      :title="showAddModal ? '時刻表の追加' : '時刻表の編集'"
      @close="closeModal"
      @submit="saveTimetable"
      :loading="isSaving"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            船舶名
          </label>
          <select
            v-model="formData.name"
            class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            required
          >
            <option value="">選択してください</option>
            <option v-for="ship in ships" :key="ship.id" :value="ship.name">
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
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
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
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
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
              v-model="formData.departureTime"
              type="time"
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              到着時刻
            </label>
            <input
              v-model="formData.arrivalTime"
              type="time"
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
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
              v-model="formData.startDate"
              type="date"
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              終了日
            </label>
            <input
              v-model="formData.endDate"
              type="date"
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
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
            class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
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
      @close="showImportModal = false"
      @submit="importData"
      :loading="isImporting"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            CSVファイルを選択
          </label>
          <input
            type="file"
            accept=".csv"
            @change="handleFileSelect"
            class="mt-1 w-full"
          >
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          <p>CSVファイルの形式:</p>
          <ul class="list-disc list-inside mt-2">
            <li>船舶名, 出発港, 到着港, 出発時刻, 到着時刻, 開始日, 終了日, 状態</li>
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
  ArrowUpTrayIcon
} from '@heroicons/vue/24/outline'
import type { Trip, Port, Ship } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// ダミーデータ（実際はFirestoreから取得）
const ports = ref<Port[]>([
  { id: 'SAIGO', name: '西郷', nameEn: 'Saigo', location: { lat: 36.2, lng: 133.3 }, type: 'dogo' },
  { id: 'HISHIURA', name: '菱浦', nameEn: 'Hishiura', location: { lat: 36.1, lng: 133.2 }, type: 'dozen' },
  { id: 'BEPPU', name: '別府', nameEn: 'Beppu', location: { lat: 36.3, lng: 133.15 }, type: 'dozen' },
  { id: 'KURI', name: '来居', nameEn: 'Kuri', location: { lat: 36.05, lng: 133.1 }, type: 'dozen' },
  { id: 'HONDO_SHICHIRUI', name: '本土七類', nameEn: 'Hondo Shichirui', location: { lat: 35.5, lng: 133.2 }, type: 'mainland' },
  { id: 'HONDO_SAKAIMINATO', name: '本土境港', nameEn: 'Hondo Sakaiminato', location: { lat: 35.55, lng: 133.23 }, type: 'mainland' }
])

const ships = ref<Ship[]>([
  { id: 'FERRY_OKI', name: 'フェリーおき', nameEn: 'Ferry Oki', type: 'ferry' },
  { id: 'FERRY_SHIRASHIMA', name: 'フェリーしらしま', nameEn: 'Ferry Shirashima', type: 'ferry' },
  { id: 'FERRY_KUNIGA', name: 'フェリーくにが', nameEn: 'Ferry Kuniga', type: 'ferry' },
  { id: 'FERRY_DOZEN', name: 'フェリーどうぜん', nameEn: 'Ferry Dozen', type: 'ferry' },
  { id: 'RAINBOWJET', name: 'レインボージェット', nameEn: 'Rainbow Jet', type: 'highspeed' }
])

const timetables = ref<Trip[]>([])
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

const formData = ref<Partial<Trip>>({
  name: '',
  departure: '',
  arrival: '',
  departureTime: '',
  arrivalTime: '',
  startDate: '',
  endDate: '',
  status: 0
})

const columns = [
  { key: 'tripId', label: 'ID', sortable: true },
  { key: 'name', label: '船舶', sortable: true },
  { key: 'departure', label: '出発港', sortable: true },
  { key: 'arrival', label: '到着港', sortable: true },
  { key: 'departureTime', label: '出発時刻', sortable: true },
  { key: 'arrivalTime', label: '到着時刻', sortable: true },
  { key: 'status', label: '状態', sortable: true }
]

const filteredTimetables = computed(() => {
  return timetables.value.filter(item => {
    if (filters.value.departure && item.departure !== filters.value.departure) return false
    if (filters.value.arrival && item.arrival !== filters.value.arrival) return false
    if (filters.value.ship && !item.name.includes(filters.value.ship)) return false
    if (filters.value.status !== '' && item.status !== parseInt(filters.value.status)) return false
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
    return time.substring(0, 5)
  }
  return new Date(time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

const editTimetable = (item: Trip) => {
  formData.value = { ...item }
  showEditModal.value = true
}

const deleteTimetable = async (item: Trip) => {
  if (confirm(`${item.name} の ${item.departure} → ${item.arrival} 便を削除しますか？`)) {
    // TODO: Firestoreから削除
    timetables.value = timetables.value.filter(t => t.tripId !== item.tripId)
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  formData.value = {
    name: '',
    departure: '',
    arrival: '',
    departureTime: '',
    arrivalTime: '',
    startDate: '',
    endDate: '',
    status: 0
  }
}

const saveTimetable = async () => {
  isSaving.value = true
  try {
    // TODO: Firestoreに保存
    console.log('Saving timetable:', formData.value)
    await new Promise(resolve => setTimeout(resolve, 1000))
    closeModal()
    await refreshData()
  } catch (error) {
    console.error('Failed to save timetable:', error)
  } finally {
    isSaving.value = false
  }
}

const refreshData = async () => {
  // TODO: Firestoreから時刻表データを取得
  // 現在はダミーデータ
  timetables.value = [
    {
      tripId: 1,
      name: 'フェリーおき',
      departure: 'SAIGO',
      arrival: 'HONDO_SHICHIRUI',
      departureTime: '08:30',
      arrivalTime: '11:05',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 0,
      price: 3000
    },
    {
      tripId: 2,
      name: 'フェリーしらしま',
      departure: 'HONDO_SHICHIRUI',
      arrival: 'SAIGO',
      departureTime: '14:25',
      arrivalTime: '17:00',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 0,
      price: 3000
    }
  ]
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    // TODO: CSVファイルの処理
    console.log('Selected file:', file.name)
  }
}

const importData = async () => {
  isImporting.value = true
  try {
    // TODO: CSVデータをFirestoreにインポート
    await new Promise(resolve => setTimeout(resolve, 2000))
    showImportModal.value = false
    await refreshData()
  } catch (error) {
    console.error('Failed to import data:', error)
  } finally {
    isImporting.value = false
  }
}

onMounted(() => {
  refreshData()
})
</script>