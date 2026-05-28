<template>
  <div v-if="options.length > 1" class="w-full">
    <div
      class="flex w-full gap-1 rounded-md border border-app-border bg-app-surface-2 p-1 shadow-sm dark:border-slate-600 dark:bg-slate-800"
      role="tablist"
      :aria-label="labelText"
    >
      <button
        v-for="option in options"
        :key="option"
        type="button"
        role="tab"
        :aria-selected="modelValue === option"
        class="flex min-h-11 flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60"
        :class="modelValue === option
          ? 'bg-app-primary text-white shadow-sm'
          : 'text-app-primary hover:bg-app-primary/10 dark:text-slate-100 dark:hover:bg-slate-700'"
        @click="emit('update:modelValue', option)"
      >
        <Icon
          :name="getOptionIcon(option)"
          class="h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <span class="truncate">{{ getOptionLabel(option) }}</span>
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

const optionIcons: Record<string, string> = {
  FERRY: 'mdi:ferry',
  BUS: 'mdi:bus',
  WALK: 'mdi:walk',
  AIR: 'mdi:airplane',
  ALL: 'mdi:apps'
}

const getOptionIcon = (option: string) => optionIcons[option] ?? 'mdi:transit-connection'
</script>
