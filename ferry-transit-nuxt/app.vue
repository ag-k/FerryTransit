<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

// Initialize theme as early as possible
const uiStore = useUIStore()

// Run on client side only
if (process.client) {
  // Initialize theme immediately
  uiStore.initializeTheme()
}

// Also ensure theme is initialized after mount
onMounted(() => {
  uiStore.initializeTheme()
})
</script>