<template>
  <div class="relative">
    <!-- 折れ線グラフ（SVGベース） -->
    <svg viewBox="0 0 800 200" class="w-full h-64 text-gray-500 dark:text-gray-400" preserveAspectRatio="none">
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

      <!-- Y軸ラベル -->
      <text
        v-for="(tick, index) in yAxisTicks"
        :key="'y-label-' + index"
        x="34"
        :y="index * 40 + 20"
        text-anchor="end"
        dominant-baseline="middle"
        font-size="10"
        fill="currentColor"
      >
        {{ tick.toLocaleString() }}
      </text>
      
      <!-- 折れ線 -->
      <path
        v-if="pathData"
        :d="pathData"
        fill="none"
        :stroke="color"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="transition-all duration-300"
      />
      
      <!-- データポイント -->
      <circle
        v-for="(point, index) in normalizedData"
        :key="'point-' + index"
        :cx="point.x"
        :cy="point.y"
        r="4"
        :fill="color"
        class="hover:r-6 transition-all duration-200 cursor-pointer"
        @mouseover="showTooltip(index)"
        @mouseout="hideTooltip"
      />
    </svg>
    
    <!-- X軸ラベル -->
    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
      <span
        v-for="(point, index) in normalizedData"
        :key="'label-' + index"
        class="text-center truncate"
        :style="{ width: point.width + 'px' }"
      >
        {{ data[index].label }}
      </span>
    </div>
    
    <!-- ツールチップ -->
    <div
      v-if="tooltipData.show"
      class="absolute pointer-events-none bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 z-10"
      :style="{ top: tooltipData.y + 'px', left: tooltipData.x + 'px' }"
    >
      {{ tooltipData.label }}: {{ tooltipData.value.toLocaleString() }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChartData } from '~/types/analytics'

const props = withDefaults(defineProps<{
  data: ChartData[]
  color?: string
}>(), {
  color: '#3B82F6'
})

const tooltipData = ref({
  show: false,
  x: 0,
  y: 0,
  label: '',
  value: 0
})

const maxValue = computed(() => {
  if (!props.data || props.data.length === 0) {
    return 1
  }

  return Math.max(...props.data.map(d => d.value), 1)
})

const yAxisTicks = computed(() => {
  const ticks = 5
  const max = maxValue.value

  return Array.from({ length: ticks }, (_, index) => {
    const ratio = 1 - index / (ticks - 1)
    return Math.round(max * ratio)
  })
})

// データを正規化
const normalizedData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return []
  }
  
  const width = 740 // 800 - 40 - 20 (余白)
  const height = 160 // 200 - 40 (余白)
  const step = width / (props.data.length - 1 || 1)
  
  return props.data.map((point, index) => ({
    x: 40 + index * step,
    y: 20 + height - (point.value / maxValue.value) * height,
    width: step
  }))
})

// パスデータを生成
const pathData = computed(() => {
  if (normalizedData.value.length === 0) {
    return ''
  }
  
  return normalizedData.value
    .map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    })
    .join(' ')
})

// ツールチップ表示
const showTooltip = (index: number) => {
  const point = normalizedData.value[index]
  const data = props.data[index]
  
  tooltipData.value = {
    show: true,
    x: point.x,
    y: point.y - 10,
    label: data.label,
    value: data.value
  }
}

const hideTooltip = () => {
  tooltipData.value.show = false
}
</script>
