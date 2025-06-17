<template>
  <div class="port-selector">
    <label v-if="label" :for="selectId" class="form-label">{{ label }}</label>
    <select 
      :id="selectId"
      class="form-select"
      :value="modelValue"
      :disabled="disabled"
      @change="handleChange"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <optgroup :label="$t('MAINLAND')">
        <option 
          v-for="port in hondoPorts" 
          :key="port" 
          :value="port"
          :disabled="disabledPorts?.includes(port)"
        >
          {{ $t(port) }}
        </option>
      </optgroup>
      <optgroup :label="$t('DOZEN')">
        <option 
          v-for="port in dozenPorts" 
          :key="port" 
          :value="port"
          :disabled="disabledPorts?.includes(port)"
        >
          {{ $t(port) }}
        </option>
      </optgroup>
      <optgroup :label="$t('DOGO')">
        <option 
          v-for="port in dogoPorts" 
          :key="port" 
          :value="port"
          :disabled="disabledPorts?.includes(port)"
        >
          {{ $t(port) }}
        </option>
      </optgroup>
    </select>
    <small v-if="hint" class="text-muted">{{ hint }}</small>
  </div>
</template>

<script setup lang="ts">
import { useFerryStore } from '@/stores/ferry'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  hint?: string
  disabled?: boolean
  disabledPorts?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const ferryStore = useFerryStore()
const { hondoPorts, dozenPorts, dogoPorts } = ferryStore

// Unique ID for accessibility
const selectId = `port-selector-${Math.random().toString(36).substr(2, 9)}`

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
  emit('change', target.value)
}
</script>

<style scoped>
.port-selector {
  margin-bottom: 1rem;
}
</style>