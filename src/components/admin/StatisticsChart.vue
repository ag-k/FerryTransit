<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div v-if="title" class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        {{ title }}
      </h3>
      <slot name="actions" />
    </div>
    
    <div class="relative">
      <!-- 簡易的なチャート表示（実際のプロジェクトではChart.jsやD3.js等を使用） -->
      <div v-if="type === 'line'" class="h-64">
        <div class="h-full flex items-end justify-between space-x-2">
          <div
            v-for="(point, index) in normalizedData"
            :key="index"
            class="flex-1 bg-blue-500 dark:bg-blue-600 rounded-t-sm hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors relative group"
            :style="{ height: `${point.percentage}%` }"
          >
            <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {{ point.value }}
            </div>
          </div>
        </div>
        <div class="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span v-for="(point, index) in data" :key="index">
            {{ point.label }}
          </span>
        </div>
      </div>
      
      <div v-else-if="type === 'pie'" class="h-64 flex items-center justify-center">
        <div class="relative w-48 h-48">
          <!-- 簡易的な円グラフ -->
          <svg viewBox="0 0 100 100" class="transform -rotate-90">
            <circle
              v-for="(segment, index) in pieSegments"
              :key="index"
              cx="50"
              cy="50"
              r="40"
              fill="none"
              :stroke="segment.color"
              stroke-width="20"
              :stroke-dasharray="`${segment.length} ${100 - segment.length}`"
              :stroke-dashoffset="-segment.offset"
              class="transition-all duration-300"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ totalValue }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                合計
              </div>
            </div>
          </div>
        </div>
        <div class="ml-8 space-y-2">
          <div
            v-for="(point, index) in data"
            :key="index"
            class="flex items-center"
          >
            <div
              class="w-3 h-3 rounded-full mr-2"
              :style="{ backgroundColor: pieColors[index] }"
            />
            <span class="text-sm text-gray-600 dark:text-gray-300">
              {{ point.label }}: {{ point.value }}
            </span>
          </div>
        </div>
      </div>
      
      <div v-else-if="type === 'bar'" class="h-64">
        <div class="h-full flex items-end justify-between space-x-2">
          <div
            v-for="(point, index) in normalizedData"
            :key="index"
            class="flex-1"
          >
            <div
              class="bg-blue-500 dark:bg-blue-600 rounded-t-sm hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors relative group"
              :style="{ height: `${point.percentage}%` }"
            >
              <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {{ point.value }}
              </div>
            </div>
            <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center truncate">
              {{ point.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ChartData {
  label: string
  value: number
}

const props = defineProps<{
  title: string
  type: 'line' | 'bar' | 'pie'
  data: ChartData[]
}>()

const pieColors = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // yellow-500
  '#EF4444', // red-500
  '#8B5CF6', // purple-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316'  // orange-500
]

const totalValue = computed(() => {
  return props.data.reduce((sum, point) => sum + point.value, 0)
})

const normalizedData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return []
  }
  const maxValue = Math.max(...props.data.map(d => d.value), 1)
  return props.data.map(point => ({
    ...point,
    percentage: maxValue > 0 ? (point.value / maxValue) * 100 : 0
  }))
})

const pieSegments = computed(() => {
  const total = totalValue.value
  let offset = 0
  
  return props.data.map((point, index) => {
    const percentage = (point.value / total) * 100
    const segment = {
      length: percentage,
      offset: offset,
      color: pieColors[index % pieColors.length]
    }
    offset += percentage
    return segment
  })
})
</script>