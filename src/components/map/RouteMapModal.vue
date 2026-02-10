<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0 relative">
          <!-- Background overlay -->
          <div
            class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 z-0"
            @click="closeModal"
          ></div>

          <!-- Modal panel -->
          <div
            class="relative z-10 inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ $t('ROUTE_MAP') }}
              </h3>
              <button
                @click="closeModal"
                class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Map Container -->
            <div class="p-6">
              <TimetableMap
                :selected-route-segments="mapRouteSegments"
                :show-port-details="false"
                :show-hide-button="false"
                :force-visible="true"
                height="500px"
              />
              
              <!-- Route Summary -->
              <div v-if="route" class="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-300">{{ $t('TOTAL_DURATION') }}</p>
                    <p class="text-lg font-medium text-gray-900 dark:text-white">
                      {{ calculateDuration(route.departureTime, route.arrivalTime) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-gray-600 dark:text-gray-300">{{ $t('TOTAL_FARE') }}</p>
                    <p class="text-lg font-medium text-gray-900 dark:text-white">
                      ¥{{ route.totalFare.toLocaleString() }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { TransitRoute } from '@/types'
import { useRouteSearch } from '@/composables/useRouteSearch'
import TimetableMap from '@/components/map/TimetableMap.vue'

interface Props {
  visible: boolean
  route: TransitRoute | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { calculateDuration } = useRouteSearch()

const mapRouteSegments = computed(() => {
  if (!props.route) return []
  return props.route.segments.map(segment => ({
    from: segment.departure,
    to: segment.arrival,
    ship: segment.ship
  }))
})

function closeModal() {
  emit('update:visible', false)
}

// Handle escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.visible) {
      closeModal()
    }
  }
  window.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleEscape)
  })
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .inline-block,
.modal-leave-to .inline-block {
  transform: scale(0.9);
}
</style>
