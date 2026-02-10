<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

// Initialize theme on client side only
onMounted(() => {
  const uiStore = useUIStore()
  uiStore.initializeTheme()
})
</script>