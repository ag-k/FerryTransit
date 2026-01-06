<template>
  <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
    <div v-if="title || $slots.actions" class="px-4 py-3 sm:py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h3 v-if="title" class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
        {{ title }}
      </h3>
      <div class="flex items-center gap-3">
        <!-- ビュー切り替えボタン（モバイルのみ表示） -->
        <div class="lg:hidden flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            @click="viewMode = 'card'"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              viewMode === 'card'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            カード
          </button>
          <button
            @click="viewMode = 'table'"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              viewMode === 'table'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            テーブル
          </button>
        </div>
        <div v-if="$slots.actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
    
    <!-- テーブルビュー -->
    <div v-if="viewMode === 'table' || !isMobile" class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :class="[
                'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider',
                column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : '',
                column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left',
                'text-gray-500 dark:text-gray-300'
              ]"
              @click="column.sortable ? handleSort(column.key) : null"
            >
              <div class="flex items-center" :class="column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''">
                {{ column.label }}
                <span v-if="column.sortable" class="ml-2">
                  <svg
                    v-if="sortKey === column.key"
                    class="w-4 h-4"
                    :class="{ 'transform rotate-180': sortOrder === 'desc' }"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </span>
              </div>
            </th>
            <th v-if="$slots['row-actions']" scope="col" class="relative px-6 py-3">
              <span class="sr-only">アクション</span>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="(row, index) in sortedData"
            :key="row.id || index"
            :class="[
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              clickable ? 'cursor-pointer' : ''
            ]"
            @click="clickable ? $emit('row-click', row) : null"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              :class="[
                'px-6 py-4 whitespace-nowrap text-sm',
                column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left',
                'text-gray-900 dark:text-gray-100'
              ]"
            >
              <slot :name="`cell-${column.key}`" :value="row[column.key]" :row="row">
                {{ formatValue(row[column.key], column.format) }}
              </slot>
            </td>
            <td v-if="$slots['row-actions']" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <slot name="row-actions" :row="row" :index="index" />
            </td>
          </tr>
          <tr v-if="sortedData.length === 0">
            <td
              :colspan="columns.length + ($slots['row-actions'] ? 1 : 0)"
              class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
            >
              データがありません
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- カードビュー（モバイルのみ） -->
    <div v-if="viewMode === 'card' && isMobile" class="px-4 pb-4">
      <div class="space-y-4">
        <div
          v-for="(row, index) in sortedData"
          :key="row.id || index"
          :class="[
            'bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm',
            clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
          ]"
          @click="clickable ? $emit('row-click', row) : null"
        >
          <!-- プライマリ情報（最初の2列） -->
          <div class="mb-3">
            <div v-for="(column, colIndex) in columns.slice(0, 2)" :key="column.key" class="mb-2">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ column.label }}</div>
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                <slot :name="`cell-${column.key}`" :value="row[column.key]" :row="row">
                  {{ formatValue(row[column.key], column.format) }}
                </slot>
              </div>
            </div>
          </div>
          
          <!-- 詳細情報（残りの列） -->
          <div v-if="columns.length > 2" class="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div v-for="column in columns.slice(2)" :key="column.key">
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ column.label }}</div>
              <div class="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                <slot :name="`cell-${column.key}`" :value="row[column.key]" :row="row">
                  {{ formatValue(row[column.key], column.format) }}
                </slot>
              </div>
            </div>
          </div>
          
          <!-- アクション -->
          <div v-if="$slots['row-actions']" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <slot name="row-actions" :row="row" :index="index" />
          </div>
        </div>
        
        <!-- データなし -->
        <div v-if="sortedData.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          データがありません
        </div>
      </div>
    </div>
    
    <!-- ページネーション -->
    <div
      v-if="pagination && totalPages > 1"
      class="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6"
    >
      <div class="flex-1 flex justify-between sm:hidden">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          前へ
        </button>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
      <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700 dark:text-gray-300">
            全 <span class="font-medium">{{ totalItems }}</span> 件中
            <span class="font-medium">{{ startItem }}</span> -
            <span class="font-medium">{{ endItem }}</span> 件を表示
          </p>
        </div>
        <div>
          <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              @click="changePage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">前へ</span>
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <button
              v-for="page in visiblePages"
              :key="page"
              @click="changePage(page)"
              :class="[
                'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                currentPage === page
                  ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-200'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              ]"
            >
              {{ page }}
            </button>
            <button
              @click="changePage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">次へ</span>
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4-4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Column {
  key: string
  label: string
  sortable?: boolean
  format?: 'date' | 'datetime' | 'number' | 'currency'
  align?: 'left' | 'center' | 'right'
}

interface Props {
  title?: string
  columns: Column[]
  data: Record<string, any>[]
  pagination?: boolean
  pageSize?: number
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pagination: false,
  pageSize: 10,
  clickable: false
})

defineEmits<{
  'row-click': [row: Record<string, any>]
}>()

const sortKey = ref<string | null>('trip_id')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const viewMode = ref<'table' | 'card'>('card')

// レスポンシブ対応
const isMobile = ref(false)

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
}

const sortedData = computed(() => {
  let sorted = [...props.data]
  
  if (sortKey.value) {
    sorted.sort((a, b) => {
      const aVal = a[sortKey.value!]
      const bVal = b[sortKey.value!]
      
      // Special handling for trip_id - sort as numbers
      if (sortKey.value === 'trip_id') {
        const aNum = Number.parseInt(toStringSafe(aVal), 10)
        const bNum = Number.parseInt(toStringSafe(bVal), 10)
        
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          return sortOrder.value === 'asc' ? aNum - bNum : bNum - aNum
        }
      }
      
      // Default string comparison for other fields
      if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
  }
  
  if (props.pagination) {
    const start = (currentPage.value - 1) * props.pageSize
    const end = start + props.pageSize
    return sorted.slice(start, end)
  }
  
  return sorted
})

// Helper function to safely convert to string
const toStringSafe = (value: unknown) => {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value)
}

const totalItems = computed(() => props.data.length)
const totalPages = computed(() => Math.ceil(totalItems.value / props.pageSize))
const startItem = computed(() => (currentPage.value - 1) * props.pageSize + 1)
const endItem = computed(() => Math.min(currentPage.value * props.pageSize, totalItems.value))

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const formatValue = (value: any, format?: string) => {
  if (value === null || value === undefined) return '-'
  
  switch (format) {
    case 'date':
      return new Date(value).toLocaleDateString('ja-JP')
    case 'datetime':
      return new Date(value).toLocaleString('ja-JP')
    case 'number':
      return value.toLocaleString('ja-JP')
    case 'currency':
      return `¥${value.toLocaleString('ja-JP')}`
    default:
      return value
  }
}
</script>