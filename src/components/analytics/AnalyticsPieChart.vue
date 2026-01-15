<template>
  <div class="flex flex-col items-center">
    <!-- 円グラフ -->
    <div class="relative w-48 h-48">
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
          class="transition-all duration-300 hover:opacity-80 cursor-pointer"
          @mouseover="showTooltip(index)"
          @mouseout="hideTooltip"
        />
      </svg>
      
      <!-- 中心の合計値 -->
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
    
    <!-- 凡例 -->
    <div class="mt-4 w-full space-y-2">
      <div
        v-for="(item, index) in sortedData"
        :key="index"
        class="flex items-center justify-between text-sm"
      >
        <div class="flex items-center">
          <div
            class="w-3 h-3 rounded-full mr-2"
            :style="{ backgroundColor: pieColors[index % pieColors.length] }"
          />
          <span class="text-gray-600 dark:text-gray-300">
            {{ item[labelField] }}
          </span>
        </div>
        <span class="text-gray-900 dark:text-white font-medium">
          {{ item[valueField] }} ({{ ((item[valueField] / totalValue) * 100).toFixed(1) }}%)
        </span>
      </div>
    </div>
    
    <!-- ツールチップ -->
    <div
      v-if="tooltipData.show"
      class="absolute bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 z-10"
      :style="{ top: tooltipData.y + 'px', left: tooltipData.x + 'px' }"
    >
      {{ tooltipData.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: Record<string, any>[]
  labelField: string
  valueField: string
}>()

const tooltipData = ref({
  show: false,
  x: 0,
  y: 0,
  label: ''
})

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

// 値でソートしたデータ
const sortedData = computed(() => {
  return [...props.data].sort((a, b) => b[props.valueField] - a[props.valueField])
})

// 合計値
const totalValue = computed(() => {
  return sortedData.value.reduce((sum, item) => sum + item[props.valueField], 0)
})

// 円グラフセグメント
const pieSegments = computed(() => {
  const total = totalValue.value
  let offset = 0
  
  return sortedData.value.map((item, index) => {
    const percentage = (item[props.valueField] / total) * 100
    const segment = {
      length: percentage,
      offset: offset,
      color: pieColors[index % pieColors.length]
    }
    offset += percentage
    return segment
  })
})

// ツールチップ表示
const showTooltip = (index: number) => {
  const item = sortedData.value[index]
  tooltipData.value = {
    show: true,
    x: 100, // デフォルト位置
    y: 100,
    label: `${item[props.labelField]}: ${item[props.valueField]} (${((item[props.valueField] / totalValue.value) * 100).toFixed(1)}%)`
  }
}

const hideTooltip = () => {
  tooltipData.value.show = false
}
</script>
