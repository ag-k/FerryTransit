<template>
  <div class="mb-4">
    <label v-if="label" :for="inputId" class="block text-base sm:text-sm font-medium text-gray-700 mb-2">{{ label }}</label>
    <div class="flex">
      <input 
        :id="inputId"
        type="date" 
        class="flex-1 px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed touch-manipulation"
        :value="modelValueString"
        :min="minDateString"
        :max="maxDateString"
        :disabled="disabled"
        @change="handleChange"
      >
      <button 
        v-if="showTodayButton"
        type="button" 
        class="px-4 sm:px-4 py-3 sm:py-2 text-base sm:text-sm border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors touch-manipulation"
        :disabled="disabled"
        @click="selectToday"
      >
        {{ $t('TODAY') }}
      </button>
    </div>
    <small v-if="hint" class="text-gray-500 text-sm mt-1 block">{{ hint }}</small>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: Date
  label?: string
  hint?: string
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  showTodayButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showTodayButton: true
})

const emit = defineEmits<{
  'update:modelValue': [value: Date]
}>()

// Unique ID for accessibility
const inputId = `date-picker-${Math.random().toString(36).substr(2, 9)}`

// Computed properties for date strings
const modelValueString = computed(() => {
  const year = props.modelValue.getFullYear()
  const month = String(props.modelValue.getMonth() + 1).padStart(2, '0')
  const day = String(props.modelValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const minDateString = computed(() => {
  if (!props.minDate) return undefined
  const year = props.minDate.getFullYear()
  const month = String(props.minDate.getMonth() + 1).padStart(2, '0')
  const day = String(props.minDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const maxDateString = computed(() => {
  if (!props.maxDate) return undefined
  const year = props.maxDate.getFullYear()
  const month = String(props.maxDate.getMonth() + 1).padStart(2, '0')
  const day = String(props.maxDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

// Methods
const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newDate = new Date(target.value + 'T00:00:00')
  emit('update:modelValue', newDate)
}

const selectToday = () => {
  // 日本時間（JST）で本日の日付を取得
  const now = new Date()
  const jstOffset = 9 * 60 // JST は UTC+9
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const jstTime = new Date(utcTime + jstOffset * 60000)
  
  // 時刻を0:00:00に設定
  const today = new Date(jstTime.getFullYear(), jstTime.getMonth(), jstTime.getDate(), 0, 0, 0, 0)
  emit('update:modelValue', today)
}
</script>