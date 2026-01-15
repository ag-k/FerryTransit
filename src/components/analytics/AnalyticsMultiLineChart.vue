<template>
  <div class="relative">
    <!-- 凡例 -->
    <div class="flex justify-center space-x-6 mb-4">
      <div class="flex items-center">
        <div class="w-4 h-1 bg-blue-500 mr-2"></div>
        <span class="text-sm text-gray-600 dark:text-gray-300">PV</span>
      </div>
      <div class="flex items-center">
        <div class="w-4 h-1 bg-green-500 mr-2"></div>
        <span class="text-sm text-gray-600 dark:text-gray-300">検索</span>
      </div>
    </div>
    
    <!-- 複系列折れ線グラフ（SVGベース） -->
    <svg viewBox="0 0 800 200" class="w-full h-64" preserveAspectRatio="none">
      <!-- Y軸グリッド線 -->
      <line
        v-for="i in 5"
        :key="'grid-' + i"
        x1="40"
        :y1="(i - 1) * 40 + 20"
        x2="780"
        :y2="(i - 1) * 40 + 20"
        stroke="#e5e7eb"
        stroke-width="1"
        stroke-dasharray="4"
      />
      
      <!-- PV折れ線 -->
      <path
        v-if="pvPathData"
        :d="pvPathData"
        fill="none"
        stroke="#3B82F6"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="transition-all duration-300"
      />
      
      <!-- 検索折れ線 -->
      <path
        v-if="searchPathData"
        :d="searchPathData"
        fill="none"
        stroke="#10B981"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="transition-all duration-300"
      />
      
      <!-- PVデータポイント -->
      <circle
        v-for="(point, index) in pvNormalizedData"
        :key="'pv-point-' + index"
        :cx="point.x"
        :cy="point.y"
        r="4"
        fill="#3B82F6"
        class="hover:r-6 transition-all duration-200 cursor-pointer"
        @mouseover="showTooltip('pv', index)"
        @mouseout="hideTooltip"
      />
      
      <!-- 検索データポイント -->
      <circle
        v-for="(point, index) in searchNormalizedData"
        :key="'search-point-' + index"
        :cx="point.x"
        :cy="point.y"
        r="4"
        fill="#10B981"
        class="hover:r-6 transition-all duration-200 cursor-pointer"
        @mouseover="showTooltip('search', index)"
        @mouseout="hideTooltip"
      />
    </svg>
    
    <!-- X軸ラベル -->
    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
      <span
        v-for="(item, index) in data"
        :key="'label-' + index"
        class="text-center truncate"
        :style="{ width: ((740 / data.length) || 1) + 'px' }"
      >
        {{ item.label }}
      </span>
    </div>
    
    <!-- ツールチップ -->
    <div
      v-if="tooltipData.show"
      class="absolute pointer-events-none bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-3 py-2 z-10"
      :style="{ top: tooltipData.y + 'px', left: tooltipData.x + 'px' }"
    >
      <div class="font-medium mb-1">{{ tooltipData.label }}</div>
      <div v-if="tooltipData.pvValue !== null" class="flex items-center">
        <div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
        PV: {{ tooltipData.pvValue.toLocaleString() }}
      </div>
      <div v-if="tooltipData.searchValue !== null" class="flex items-center">
        <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        検索: {{ tooltipData.searchValue.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MultiSeriesChartData } from '~/types/analytics'

const props = defineProps<{
  data: MultiSeriesChartData[]
}>()

const tooltipData = ref({
  show: false,
  x: 0,
  y: 0,
  label: '',
  pvValue: null as number | null,
  searchValue: null as number | null
})

// PVと検索の最大値
const maxValue = computed(() => {
  if (!props.data || props.data.length === 0) {
    return 1
  }
  
  const maxPv = Math.max(...props.data.map(d => d.pv), 0)
  const maxSearch = Math.max(...props.data.map(d => d.search), 0)
  
  return Math.max(maxPv, maxSearch, 1)
})

// PVデータを正規化
const pvNormalizedData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return []
  }
  
  const width = 740 // 800 - 40 - 20 (余白)
  const height = 160 // 200 - 40 (余白)
  const step = width / (props.data.length - 1 || 1)
  
  return props.data.map((item, index) => ({
    x: 40 + index * step,
    y: 20 + height - (item.pv / maxValue.value) * height
  }))
})

// 検索データを正規化
const searchNormalizedData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return []
  }
  
  const width = 740
  const height = 160
  const step = width / (props.data.length - 1 || 1)
  
  return props.data.map((item, index) => ({
    x: 40 + index * step,
    y: 20 + height - (item.search / maxValue.value) * height
  }))
})

// PVパスデータを生成
const pvPathData = computed(() => {
  if (pvNormalizedData.value.length === 0) {
    return ''
  }
  
  return pvNormalizedData.value
    .map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    })
    .join(' ')
})

// 検索パスデータを生成
const searchPathData = computed(() => {
  if (searchNormalizedData.value.length === 0) {
    return ''
  }
  
  return searchNormalizedData.value
    .map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    })
    .join(' ')
})

// ツールチップ表示
const showTooltip = (type: 'pv' | 'search', index: number) => {
  const data = props.data[index]
  const point = type === 'pv' ? pvNormalizedData.value[index] : searchNormalizedData.value[index]
  
  tooltipData.value = {
    show: true,
    x: point.x,
    y: point.y - 10,
    label: data.label,
    pvValue: data.pv,
    searchValue: data.search
  }
}

const hideTooltip = () => {
  tooltipData.value.show = false
}
</script>
