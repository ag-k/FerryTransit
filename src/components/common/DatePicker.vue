<template>
  <div :class="containerClass">
    <label v-if="label" :for="inputId" class="block text-base sm:text-sm font-medium text-app-fg mb-2">{{ label }}</label>
    <div class="flex">
      <input 
        :id="inputId"
        type="date" 
        :class="inputClass"
        :value="modelValueString"
        :min="minDateString"
        :max="maxDateString"
        :disabled="disabled"
        @change="handleChange"
      >
      <button 
        v-if="showTodayButton"
        type="button" 
        :class="todayButtonClass"
        :disabled="disabled"
        @click="selectToday"
      >
        {{ $t('TODAY') }}
      </button>
    </div>
    <small v-if="hint" class="text-app-muted text-sm mt-1 block">{{ hint }}</small>
  </div>
</template>

<script setup lang="ts">
import { formatDateYmdJst, getTodayJstMidnight, parseYmdAsJstMidnight } from '@/utils/jstDate'

interface Props {
  modelValue: Date
  label?: string
  hint?: string
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  showTodayButton?: boolean
  margin?: 'normal' | 'tight' | 'none'
  size?: 'normal' | 'compact'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showTodayButton: true,
  margin: 'normal',
  size: 'normal'
})

const emit = defineEmits<{
  'update:modelValue': [value: Date]
}>()

// Unique ID for accessibility
const inputId = `date-picker-${Math.random().toString(36).substr(2, 9)}`

const containerClass = computed(() => {
  if (props.margin === 'none') return ''
  if (props.margin === 'tight') return 'mb-2'
  return 'mb-4'
})

const inputClass = computed(() => {
  const base = 'flex-1 px-3 border border-app-border rounded-l-md bg-app-surface text-app-fg focus:outline-none focus:ring-2 focus:ring-app-primary-2 focus:border-app-primary-2 disabled:bg-app-surface-2 disabled:text-app-muted disabled:cursor-not-allowed touch-manipulation dark:[color-scheme:dark]'
  if (props.size === 'compact') {
    return `${base} py-2 text-base`
  }
  return `${base} py-3 sm:py-2 text-base sm:text-sm`
})

const todayButtonClass = computed(() => {
  const base = 'px-4 sm:px-4 border border-l-0 border-app-border rounded-r-md bg-app-surface-2 text-app-fg hover:bg-app-surface-2/80 focus:outline-none focus:ring-2 focus:ring-app-primary-2 focus:border-app-primary-2 disabled:bg-app-surface-2 disabled:text-app-muted disabled:cursor-not-allowed transition-colors touch-manipulation'
  if (props.size === 'compact') {
    return `${base} py-2 text-base`
  }
  return `${base} py-3 sm:py-2 text-base sm:text-sm`
})

// Computed properties for date strings
const modelValueString = computed(() => {
  return formatDateYmdJst(props.modelValue)
})

const minDateString = computed(() => {
  if (!props.minDate) return undefined
  return formatDateYmdJst(props.minDate)
})

const maxDateString = computed(() => {
  if (!props.maxDate) return undefined
  return formatDateYmdJst(props.maxDate)
})

// Methods
const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newDate = parseYmdAsJstMidnight(target.value)
  emit('update:modelValue', newDate)
}

const selectToday = () => {
  emit('update:modelValue', getTodayJstMidnight())
}
</script>
