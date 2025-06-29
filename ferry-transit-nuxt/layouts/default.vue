<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-slate-950 transition-colors">
    <AppNavigation />
    
    <!-- Alerts -->
    <div v-if="alerts.length > 0" class="container mx-auto px-4 mt-3">
      <CommonAlertComponent
        v-for="alert in alerts"
        :key="alert.id"
        :visible="true"
        :type="alert.type"
        :message="alert.message"
        :auto-close="true"
        @close="uiStore.removeAlert(alert.id)"
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
          Powered by <a href="https://oki-digilab.com/" target="_blank" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">隠岐デジタルラボ</a>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const alerts = computed(() => uiStore.alerts)
</script>

