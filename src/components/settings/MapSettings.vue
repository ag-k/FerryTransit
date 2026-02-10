<template>
  <div>
    <h3 class="text-lg font-medium mb-4 text-app-fg">{{ $t('map.settings.title') }}</h3>
    
    <div class="space-y-4">
      <!-- Map Display Toggle -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-app-fg">
            {{ $t('map.settings.enableMap') }}
          </p>
          <p class="text-sm text-app-muted">
            {{ $t('map.settings.enableMapDesc') }}
          </p>
        </div>
        <button
          @click="toggleMapEnabled"
          :class="[
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-app-primary-2 focus:ring-offset-2 focus:ring-offset-app-bg',
            mapEnabled ? 'bg-app-primary dark:bg-white' : 'bg-app-border dark:bg-gray-600'
          ]"
          role="switch"
          :aria-checked="mapEnabled"
        >
          <span class="sr-only">{{ $t('map.settings.enableMap') }}</span>
          <span
            :class="[
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-app-surface shadow ring-0 transition duration-200 ease-in-out',
              mapEnabled ? 'translate-x-5' : 'translate-x-0'
            ]"
          />
        </button>
      </div>

      </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const settingsStore = useSettingsStore()

// Computed
const mapEnabled = computed(() => settingsStore.mapEnabled)

// Methods
const toggleMapEnabled = () => {
  settingsStore.setMapEnabled(!mapEnabled.value)
}
</script>
