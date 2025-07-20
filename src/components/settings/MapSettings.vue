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
            mapEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
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

      <!-- Map Options (only shown when map is enabled) -->
      <div v-if="mapEnabled" class="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <!-- Show Routes Toggle -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ $t('map.settings.showRoutes') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('map.settings.showRoutesDesc') }}
            </p>
          </div>
          <button
            @click="toggleShowRoutes"
            :class="[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              showRoutes ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
            ]"
            role="switch"
            :aria-checked="showRoutes"
          >
            <span class="sr-only">{{ $t('map.settings.showRoutes') }}</span>
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                showRoutes ? 'translate-x-5' : 'translate-x-0'
              ]"
            />
          </button>
        </div>

        <!-- Auto Center Toggle -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ $t('map.settings.autoCenter') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('map.settings.autoCenterDesc') }}
            </p>
          </div>
          <button
            @click="toggleAutoCenter"
            :class="[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              autoCenter ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
            ]"
            role="switch"
            :aria-checked="autoCenter"
          >
            <span class="sr-only">{{ $t('map.settings.autoCenter') }}</span>
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                autoCenter ? 'translate-x-5' : 'translate-x-0'
              ]"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const settingsStore = useSettingsStore()

// Computed
const mapEnabled = computed(() => settingsStore.mapEnabled)
const showRoutes = computed(() => settingsStore.mapShowRoutes ?? true)
const autoCenter = computed(() => settingsStore.mapAutoCenter ?? true)

// Methods
const toggleMapEnabled = () => {
  settingsStore.setMapEnabled(!mapEnabled.value)
}

const toggleShowRoutes = () => {
  settingsStore.setMapShowRoutes(!showRoutes.value)
}

const toggleAutoCenter = () => {
  settingsStore.setMapAutoCenter(!autoCenter.value)
}
</script>