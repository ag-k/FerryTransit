<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">データ管理</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        システムデータのエクスポート・インポートとバックアップ管理
      </p>
    </div>

    <!-- データ種別選択 -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="dataType in dataTypes"
        :key="dataType.id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
        @click="selectedDataType = dataType"
      >
        <div class="flex items-center justify-between mb-4">
          <component
            :is="dataType.icon"
            class="h-8 w-8 text-blue-600 dark:text-blue-400"
          />
          <span
            v-if="selectedDataType?.id === dataType.id"
            class="text-blue-600 dark:text-blue-400"
          >
            <CheckCircleIcon class="h-6 w-6" />
          </span>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">
          {{ dataType.name }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ dataType.description }}
        </p>
        <div class="mt-4 text-xs text-gray-400">
          最終更新: {{ formatDateTime(dataType.lastUpdate) }}
        </div>
      </div>
    </div>

    <!-- 選択されたデータ種別の操作 -->
    <div v-if="selectedDataType" class="space-y-6">
      <!-- インポート -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          データインポート
        </h2>
        <div class="space-y-4">
          <div
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
          >
            <CloudArrowUpIcon class="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p class="text-gray-600 dark:text-gray-400 mb-2">
              ファイルをドラッグ＆ドロップまたは
            </p>
            <label class="cursor-pointer">
              <span class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block">
                ファイルを選択
              </span>
              <input
                type="file"
                :accept="acceptedFormats"
                @change="handleFileSelect"
                class="hidden"
              >
            </label>
          </div>

          <div v-if="selectedFile" class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <DocumentIcon class="h-8 w-8 text-gray-400 mr-3" />
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ selectedFile.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatFileSize(selectedFile.size) }}
                  </p>
                </div>
              </div>
              <button
                @click="selectedFile = null"
                class="text-red-600 hover:text-red-800"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
            <p class="text-sm text-red-800 dark:text-red-200">
              <ExclamationTriangleIcon class="h-5 w-5 inline mr-1" />
              インポートすると既存のデータが上書きされます。必ずバックアップを取ってから実行してください。
            </p>
          </div>

          <div class="flex justify-end space-x-4">
            <button
              @click="validateImport"
              :disabled="!selectedFile || isValidating"
              class="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
            >
              {{ isValidating ? '検証中...' : 'データ検証' }}
            </button>
            <button
              @click="importData"
              :disabled="!selectedFile || !isValidated || isImporting"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <CloudArrowUpIcon class="h-5 w-5 inline mr-1" />
              {{ isImporting ? 'インポート中...' : 'インポート実行' }}
            </button>
          </div>
        </div>
      </div>

      <!-- エクスポート -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          データエクスポート
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              エクスポート形式
            </label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                v-for="format in exportFormats"
                :key="format.id"
                @click="selectedFormat = format.id"
                :class="[
                  'px-4 py-2 rounded-md border',
                  selectedFormat === format.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                ]"
              >
                {{ format.name }}
              </button>
            </div>
          </div>
          
          <div v-if="selectedFormat === 'csv'" class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
            <p class="text-sm text-yellow-800 dark:text-yellow-200">
              <ExclamationTriangleIcon class="h-5 w-5 inline mr-1" />
              CSV形式では一部のデータ（画像URL等）が省略される場合があります
            </p>
          </div>

          <div class="flex justify-end">
            <button
              @click="exportData"
              :disabled="isExporting"
              class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              <ArrowDownTrayIcon class="h-5 w-5 inline mr-1" />
              {{ isExporting ? 'エクスポート中...' : 'エクスポート実行' }}
            </button>
          </div>
        </div>
      </div>

      <!-- バックアップ履歴 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            バックアップ履歴
          </h2>
        </div>
        <div class="p-6">
          <DataTable
            :columns="backupColumns"
            :data="backupHistory"
            :pagination="true"
            :page-size="5"
          >
            <template #cell-createdAt="{ value }">
              {{ formatDateTime(value) }}
            </template>
            <template #cell-size="{ value }">
              {{ formatFileSize(value) }}
            </template>
            <template #row-actions="{ row }">
              <button
                @click="downloadBackup(row)"
                class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
              >
                <ArrowDownTrayIcon class="h-5 w-5" />
              </button>
              <button
                @click="restoreBackup(row)"
                class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
              >
                <ArrowPathIcon class="h-5 w-5" />
              </button>
              <button
                @click="deleteBackup(row)"
                class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
              >
                <TrashIcon class="h-5 w-5" />
              </button>
            </template>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCircleIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyYenIcon,
  MegaphoneIcon,
  UserGroupIcon,
  ChartBarIcon,
  NewspaperIcon
} from '@heroicons/vue/24/outline'
import { useFirebaseStorage } from '~/composables/useFirebaseStorage'
import DataTable from '~/components/admin/DataTable.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { uploadFile, downloadFile, deleteFile } = useFirebaseStorage()

interface DataType {
  id: string
  name: string
  description: string
  icon: any
  lastUpdate: Date
}

interface Backup {
  id: string
  dataType: string
  format: string
  size: number
  createdAt: Date
  createdBy: string
  fileName: string
}

const dataTypes: DataType[] = [
  {
    id: 'timetable',
    name: '時刻表データ',
    description: 'フェリー・高速船の運航スケジュール',
    icon: CalendarIcon,
    lastUpdate: new Date('2024-01-15T10:30:00')
  },
  {
    id: 'fare',
    name: '料金データ',
    description: '運賃・割引・繁忙期設定',
    icon: CurrencyYenIcon,
    lastUpdate: new Date('2024-01-14T15:20:00')
  },
  {
    id: 'alerts',
    name: 'アラートデータ',
    description: '運航状況・遅延・欠航情報',
    icon: MegaphoneIcon,
    lastUpdate: new Date('2024-01-15T09:00:00')
  },
  {
    id: 'users',
    name: 'ユーザーデータ',
    description: 'アプリユーザー情報・設定',
    icon: UserGroupIcon,
    lastUpdate: new Date('2024-01-15T11:00:00')
  },
  {
    id: 'analytics',
    name: 'アナリティクスデータ',
    description: 'アクセス統計・利用状況',
    icon: ChartBarIcon,
    lastUpdate: new Date('2024-01-15T12:00:00')
  },
  {
    id: 'news',
    name: 'お知らせデータ',
    description: 'ニュース・お知らせ・キャンペーン',
    icon: NewspaperIcon,
    lastUpdate: new Date('2024-01-13T14:00:00')
  }
]

const exportFormats = [
  { id: 'json', name: 'JSON' },
  { id: 'csv', name: 'CSV' },
  { id: 'xlsx', name: 'Excel' },
  { id: 'xml', name: 'XML' }
]

const selectedDataType = ref<DataType | null>(null)
const selectedFormat = ref('json')
const selectedFile = ref<File | null>(null)
const isExporting = ref(false)
const isImporting = ref(false)
const isValidating = ref(false)
const isValidated = ref(false)

const backupHistory = ref<Backup[]>([
  {
    id: '1',
    dataType: 'timetable',
    format: 'json',
    size: 1024 * 512, // 512KB
    createdAt: new Date('2024-01-14T10:00:00'),
    createdBy: 'admin@example.com',
    fileName: 'timetable_backup_20240114_100000.json'
  },
  {
    id: '2',
    dataType: 'fare',
    format: 'json',
    size: 1024 * 256, // 256KB
    createdAt: new Date('2024-01-13T15:30:00'),
    createdBy: 'admin@example.com',
    fileName: 'fare_backup_20240113_153000.json'
  }
])

const backupColumns = [
  { key: 'fileName', label: 'ファイル名', sortable: true },
  { key: 'format', label: '形式', sortable: true },
  { key: 'size', label: 'サイズ', sortable: true },
  { key: 'createdAt', label: '作成日時', sortable: true },
  { key: 'createdBy', label: '作成者', sortable: true }
]

const acceptedFormats = computed(() => {
  return exportFormats.map(f => `.${f.id}`).join(',')
})

const formatDateTime = (date: Date) => {
  return date.toLocaleString('ja-JP')
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    selectedFile.value = files[0]
    isValidated.value = false
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    selectedFile.value = files[0]
    isValidated.value = false
  }
}

const exportData = async () => {
  if (!selectedDataType.value) return
  
  isExporting.value = true
  try {
    // TODO: Firestoreからデータを取得してエクスポート
    console.log('Exporting data:', selectedDataType.value.id, selectedFormat.value)
    
    // ダミーデータを作成
    const exportData = {
      type: selectedDataType.value.id,
      exportDate: new Date().toISOString(),
      data: [] // 実際のデータ
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedDataType.value.id}_export_${new Date().toISOString().replace(/[:.]/g, '-')}.${selectedFormat.value}`
    a.click()
    URL.revokeObjectURL(url)
    
    // バックアップ履歴に追加
    const backup: Backup = {
      id: Date.now().toString(),
      dataType: selectedDataType.value.id,
      format: selectedFormat.value,
      size: blob.size,
      createdAt: new Date(),
      createdBy: 'admin@example.com',
      fileName: a.download
    }
    
    // Firebase Storageにアップロード
    await uploadFile(`backups/${backup.fileName}`, blob)
    
    backupHistory.value.unshift(backup)
  } catch (error) {
    console.error('Export failed:', error)
  } finally {
    isExporting.value = false
  }
}

const validateImport = async () => {
  if (!selectedFile.value || !selectedDataType.value) return
  
  isValidating.value = true
  try {
    // TODO: ファイルの内容を検証
    console.log('Validating file:', selectedFile.value.name)
    await new Promise(resolve => setTimeout(resolve, 1500))
    isValidated.value = true
  } catch (error) {
    console.error('Validation failed:', error)
    isValidated.value = false
  } finally {
    isValidating.value = false
  }
}

const importData = async () => {
  if (!selectedFile.value || !selectedDataType.value || !isValidated.value) return
  
  isImporting.value = true
  try {
    // TODO: ファイルをFirestoreにインポート
    console.log('Importing data:', selectedFile.value.name)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    selectedFile.value = null
    isValidated.value = false
  } catch (error) {
    console.error('Import failed:', error)
  } finally {
    isImporting.value = false
  }
}

const downloadBackup = async (backup: Backup) => {
  try {
    const url = await downloadFile(`backups/${backup.fileName}`)
    const a = document.createElement('a')
    a.href = url
    a.download = backup.fileName
    a.click()
  } catch (error) {
    console.error('Download failed:', error)
  }
}

const restoreBackup = (backup: Backup) => {
  if (confirm(`${backup.fileName} からデータを復元しますか？\n現在のデータは上書きされます。`)) {
    // TODO: バックアップからデータを復元
    console.log('Restoring backup:', backup.fileName)
  }
}

const deleteBackup = async (backup: Backup) => {
  if (confirm(`バックアップ ${backup.fileName} を削除しますか？`)) {
    try {
      await deleteFile(`backups/${backup.fileName}`)
      backupHistory.value = backupHistory.value.filter(b => b.id !== backup.id)
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }
}
</script>
