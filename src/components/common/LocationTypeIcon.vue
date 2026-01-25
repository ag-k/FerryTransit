<template>
  <span
    v-if="resolvedType"
    class="inline-flex items-center justify-center rounded-full w-5 h-5 text-xs ring-1 ring-inset flex-shrink-0"
    :class="badgeClass"
    :title="label"
    role="img"
    :aria-label="label"
  >
    <svg
      class="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <template v-if="resolvedType === 'PORT'">
        <circle cx="12" cy="7" r="2" />
        <path d="M12 9v9" />
        <path d="M5 14h14" />
        <path d="M6 14a6 6 0 0 0 12 0" />
      </template>
      <template v-else-if="resolvedType === 'STOP'">
        <rect x="5" y="5" width="14" height="9" rx="2" />
        <path d="M5 9h14" />
        <circle cx="9" cy="16" r="1.5" />
        <circle cx="15" cy="16" r="1.5" />
      </template>
      <template v-else>
        <path d="M2 12L11 9V3H13V9L22 12L13 15V21H11V15L2 12Z" />
      </template>
    </svg>
  </span>
</template>

<script setup lang="ts">
import type { LocationType } from '@/types'

const props = defineProps<{
  type?: LocationType
}>()

const { t } = useI18n()

const resolvedType = computed(() => props.type ?? 'PORT')

const label = computed(() => {
  const key = `LOCATION_TYPES.${resolvedType.value}`
  const translated = t(key)
  return translated === key ? resolvedType.value : translated
})

const badgeClass = computed(() => {
  switch (resolvedType.value) {
    case 'PORT':
      return 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800'
    case 'STOP':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:ring-indigo-800'
    case 'AIRPORT':
      return 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:ring-purple-800'
    default:
      return 'bg-app-surface-2 text-app-muted ring-app-border/70'
  }
})
</script>
