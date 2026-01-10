<template>
  <span v-if="badges.length" class="flex flex-wrap gap-1">
    <span
      v-for="badge in badges"
      :key="badge"
      class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset"
      :class="getPortBadgeClass(badge)"
    >
      {{ badge }}
    </span>
  </span>
</template>

<script setup lang="ts">
interface Props {
  badges: string[]
}

withDefaults(defineProps<Props>(), {
  badges: () => []
})

import { getPortBadgeClass } from '@/utils/portBadges'
</script>
