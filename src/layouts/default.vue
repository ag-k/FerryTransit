<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-slate-950 transition-colors">
    <AppNavigation />
    
    <!-- Alerts -->
    <div v-if="alerts.length > 0" class="container mx-auto px-4 mt-3">
      <CommonAlertComponent
        v-for="(alert, index) in alerts"
        :key="index"
        :visible="true"
        :type="alert.type"
        :message="alert.msg"
        :auto-close="true"
        @close="removeAlert(index)"
      />
    </div>
    
    <main class="flex-1 pb-16 lg:pb-0">
      <slot />
    </main>
    
    <!-- Bottom Navigation (Mobile Only) -->
    <AppBottomNavigation />
    
    <footer class="mt-auto py-3 bg-gray-100 dark:bg-slate-900">
      <div class="container mx-auto px-4">
        <p class="text-gray-600 dark:text-gray-300 text-center mb-0">
          Powered by <a href="https://oki-digilab.com/" target="_blank" class="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">隠岐デジタルラボ</a>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

// Initialize store on client side only
const uiStore = process.client ? useUIStore() : null
const alerts = computed(() => uiStore?.alerts || [])

// Method to remove alert
const removeAlert = (index: number) => {
  if (uiStore && uiStore.alerts) {
    uiStore.alerts.splice(index, 1)
  }
}
</script>

