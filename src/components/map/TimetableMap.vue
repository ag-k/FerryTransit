<template>
  <div v-if="isVisible" class="mb-6">
    <div class="relative">
      <div v-if="showHideButton && settingsStore.mapEnabled" class="absolute left-2 top-2 z-20">
        <SecondaryButton
          size="sm"
          class="bg-white/90 dark:bg-gray-900/90 border border-gray-300/80 dark:border-gray-700 shadow-sm backdrop-blur"
          @click="hideMap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="mr-1.5"
            viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 8.75a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
            <path
              d="M8 0a5.5 5.5 0 0 0-5.5 5.5c0 4.13 5.5 10.5 5.5 10.5s5.5-6.37 5.5-10.5A5.5 5.5 0 0 0 8 0zm0 14.09C6.28 11.74 3.5 7.98 3.5 5.5a4.5 4.5 0 0 1 9 0c0 2.48-2.78 6.24-4.5 8.59z" />
          </svg>
          {{ $t('MAP_HIDE') }}
        </SecondaryButton>
      </div>
      <FerryMap
        :selected-port="selectedPort"
        :selected-route="selectedRoute"
        :selected-route-segments="selectedRouteSegments"
        :show-port-details="showPortDetails"
        :height="height"
        @port-click="emit('portClick', $event)"
        @route-select="emit('routeSelect', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Port } from '~/types'
import FerryMap from '~/components/map/FerryMap.vue'
import SecondaryButton from '~/components/common/SecondaryButton.vue'
import { useSettingsStore } from '@/stores/settings'

type RouteSegment = { from: string; to: string; ship?: string }

interface Props {
  selectedPort?: string
  selectedRoute?: { from: string; to: string }
  selectedRouteSegments?: RouteSegment[]
  showPortDetails?: boolean
  height?: string
  showHideButton?: boolean
  forceVisible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '300px',
  showPortDetails: true,
  showHideButton: true,
  forceVisible: false
})

const emit = defineEmits<{
  portClick: [port: Port]
  routeSelect: [route: { from: string; to: string }]
}>()

const settingsStore = useSettingsStore()

const isVisible = computed(() => props.forceVisible || settingsStore.mapEnabled)

const hideMap = () => {
  ;(settingsStore as any).setMapEnabled(false)
}
</script>
