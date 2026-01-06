<template>
  <div>
    <h3 class="text-lg font-medium mb-4 dark:text-white">{{ $t('map.settings.title') }}</h3>
    
    <div class="space-y-4">
      <!-- Map Display Toggle -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ $t('map.settings.enableMap') }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('map.settings.enableMapDesc') }}
          </p>
        </div>
        <button
          @click="toggleMapEnabled"
          :class="[
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            mapEnabled ? 'bg-blue-700' : 'bg-gray-200 dark:bg-gray-600'
          ]"
          role="switch"
          :aria-checked="mapEnabled"
        >
          <span class="sr-only">{{ $t('map.settings.enableMap') }}</span>
          <span
            :class="[
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
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