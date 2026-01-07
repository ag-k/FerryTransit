<template>
  <div class="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors">
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
    
    <!-- Toast Container -->
    <ToastContainer />
    
    <footer class="mt-auto py-3 bg-white/70 dark:bg-slate-900/60 border-t border-slate-200/60 dark:border-slate-800/80 backdrop-blur">
      <div class="container mx-auto px-4">
        <p class="text-slate-600 dark:text-slate-300 text-center mb-0">
          Powered by <a href="https://oki-digilab.com/" target="_blank" class="text-blue-800 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200">隠岐デジタルラボ</a>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import ToastContainer from '~/components/ToastContainer.vue'

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
