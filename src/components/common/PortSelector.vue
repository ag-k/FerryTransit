<template>
  <div class="mb-4">
    <label v-if="label" :for="selectId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ label }}</label>
    <select 
      :id="selectId"
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
      :value="modelValue"
      :disabled="disabled"
      @change="handleChange"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <optgroup :label="$t('MAINLAND')" class="font-medium">
        <option 
          v-for="port in hondoPorts" 
          :key="port" 
          :value="port"
          :disabled="disabledPorts?.includes(port)"
          class="pl-2"
        >
          {{ $t(port) }}
        </option>
      </optgroup>
      <optgroup :label="$t('DOZEN')" class="font-medium">
        <option 
          v-for="port in dozenPorts" 
          :key="port" 
          :value="port"
          :disabled="disabledPorts?.includes(port)"
          class="pl-2"
        >
          {{ $t(port) }}
        </option>
      </optgroup>
      <optgroup :label="$t('DOGO')" class="font-medium">
        <option 
          v-for="port in dogoPorts" 
          :key="port" 
          :value="port"
          :disabled="disabledPorts?.includes(port)"
          class="pl-2"
        >
          {{ $t(port) }}
        </option>
      </optgroup>
    </select>
    <small v-if="hint" class="text-gray-500 dark:text-gray-400 text-sm mt-1 block">{{ hint }}</small>
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

const ferryStore = process.client ? useFerryStore() : null
const hondoPorts = computed(() => ferryStore?.hondoPorts || [])
const dozenPorts = computed(() => ferryStore?.dozenPorts || [])
const dogoPorts = computed(() => ferryStore?.dogoPorts || [])

// Unique ID for accessibility
const selectId = `port-selector-${Math.random().toString(36).substr(2, 9)}`

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
  emit('change', target.value)
}
</script>