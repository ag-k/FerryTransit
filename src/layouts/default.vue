<template>
  <div class="fixed inset-0 flex flex-col font-sans bg-app-bg text-app-fg transition-colors overflow-hidden">
    <AppNavigation />

    <!-- Scrollable Content Area -->
    <div class="flex-1 overflow-y-auto" style="-webkit-overflow-scrolling: touch;">
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

      <main class="pb-20 lg:pb-0">
        <slot />
      </main>

      <footer class="mt-auto py-3 bg-app-surface/70 border-t border-app-border/60">
        <div class="container mx-auto px-4">
          <p class="text-app-muted text-center mb-0">
            Powered by <a href="https://oki-digilab.com/" target="_blank" class="text-app-primary-2 hover:text-app-primary">隠岐デジタルラボ</a>
          </p>
        </div>
      </footer>
    </div>

    <!-- Bottom Navigation (Mobile Only) - Outside scroll area -->
    <AppBottomNavigation />

    <!-- Toast Container -->
    <ToastContainer />
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
