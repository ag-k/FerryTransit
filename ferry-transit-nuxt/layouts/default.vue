<template>
  <div class="app-layout">
    <AppNavigation />
    
    <!-- Alerts -->
    <div v-if="alerts.length > 0" class="container mt-3">
      <AlertComponent
        v-for="alert in alerts"
        :key="alert.id"
        :visible="true"
        :type="alert.type"
        :message="alert.message"
        :auto-close="true"
        @close="uiStore.removeAlert(alert.id)"
      />
    </div>
    
    <main class="app-main">
      <slot />
    </main>
    
    <footer class="app-footer mt-auto py-3 bg-light">
      <div class="container">
        <p class="text-muted text-center mb-0">
          Powered by <a href="https://oki-digilab.com/" target="_blank">隠岐デジタルラボ</a>
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

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
}

.app-footer {
  margin-top: auto;
}
</style>