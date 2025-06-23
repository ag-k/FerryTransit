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
  return props.modelValue.toISOString().split('T')[0]
})

const minDateString = computed(() => {
  return props.minDate ? props.minDate.toISOString().split('T')[0] : undefined
})

const maxDateString = computed(() => {
  return props.maxDate ? props.maxDate.toISOString().split('T')[0] : undefined
})

// Methods
const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newDate = new Date(target.value + 'T00:00:00')
  emit('update:modelValue', newDate)
}

const selectToday = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  emit('update:modelValue', today)
}
</script>