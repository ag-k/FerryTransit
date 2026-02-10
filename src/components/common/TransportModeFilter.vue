<template>
  <div v-if="options.length > 1" class="flex flex-wrap items-center gap-2">
    <span class="text-sm font-medium text-app-muted">{{ labelText }}</span>
    <div class="flex flex-wrap gap-2" role="tablist" :aria-label="labelText">
      <button
        v-for="option in options"
        :key="option"
        type="button"
        role="tab"
        :aria-selected="modelValue === option"
        class="px-3 py-2 text-sm font-medium rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60 flex items-center justify-center"
        :class="modelValue === option
          ? 'bg-app-primary text-white border-app-primary shadow-sm'
          : 'border-app-primary text-app-primary bg-app-surface dark:bg-slate-700 dark:text-white dark:border-slate-500 hover:bg-app-primary/10 dark:hover:bg-slate-600'"
        @click="emit('update:modelValue', option)"
      >
        {{ getOptionLabel(option) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  options: string[]
  label?: string
}>(), {
  label: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

const labelText = computed(() => props.label || t('UI.TRANSPORT_FILTER'))

const getOptionLabel = (option: string) => {
  const key = `TRANSPORT_MODES.${option}`
  const translated = t(key)
  return translated === key ? option : translated
}
</script>
