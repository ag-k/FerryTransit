<template>
  <div class="date-picker">
    <label v-if="label" :for="inputId" class="form-label">{{ label }}</label>
    <div class="input-group">
      <input 
        :id="inputId"
        type="date" 
        class="form-control"
        :value="modelValueString"
        :min="minDateString"
        :max="maxDateString"
        :disabled="disabled"
        @change="handleChange"
      >
      <button 
        v-if="showTodayButton"
        type="button" 
        class="btn btn-outline-secondary"
        :disabled="disabled"
        @click="selectToday"
      >
        {{ $t('TODAY') }}
      </button>
    </div>
    <small v-if="hint" class="text-muted">{{ hint }}</small>
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

<style scoped>
.date-picker {
  margin-bottom: 1rem;
}

.input-group .btn {
  white-space: nowrap;
}
</style>