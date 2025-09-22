<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <!-- Background overlay -->
          <div
            class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80"
            @click="closeModal"
          ></div>

          <!-- Modal panel -->
          <div class="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
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
              <div class="relative w-full h-[500px] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <!-- Loading indicator -->
                <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                  <div class="flex flex-col items-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p class="mt-2 text-gray-600 dark:text-gray-300">{{ $t('LOADING_MAP') }}</p>
                  </div>
                </div>
                
                <!-- Error message -->
                <div v-else-if="mapError" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                  <div class="text-center">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p class="mt-2 text-gray-600 dark:text-gray-300">{{ $t('MAP_LOAD_ERROR') }}</p>
                  </div>
                </div>
                
                <!-- Google Map -->
                <div ref="mapContainer" class="w-full h-full"></div>
              </div>
              
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
import { useGoogleMaps } from '@/composables/useGoogleMaps'
import { PORTS_DATA } from '@/data/ports'

interface Props {
  visible: boolean
  route: TransitRoute | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { calculateDuration, getPortDisplayName } = useRouteSearch()
const { createMap, createMarker, createPolyline, fitBounds, isLoaded, loadError } = useGoogleMaps()

// Refs
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<any | null>(null)
const markers = ref<any[]>([])
const polylines = ref<any[]>([])

// State
const isLoading = ref(true)
const mapError = computed(() => {
  const hasError = loadError.value !== null
  if (hasError) {
    console.error('Map load error:', loadError.value)
  }
  return hasError
})

// Ship colors
const shipColors: Record<string, string> = {
  'FERRY_OKI': '#DA6272',
  'FERRY_SHIRASHIMA': '#DA6272',
  'FERRY_KUNIGA': '#DA6272',
  'FERRY_DOZEN': '#F3C759',
  'ISOKAZE': '#45A1CF',
  'RAINBOWJET': '#40BFB0'
}

// Get port coordinates from PORTS_DATA
function getPortCoordinates(portId: string): { lat: number; lng: number } | null {
  const portKey = Object.keys(PORTS_DATA).find(key => 
    key.toLowerCase().includes(portId.toLowerCase()) ||
    PORTS_DATA[key].id.toLowerCase() === portId.toLowerCase()
  )
  
  if (portKey && PORTS_DATA[portKey].location) {
    return {
      lat: PORTS_DATA[portKey].location.lat,
      lng: PORTS_DATA[portKey].location.lng
    }
  }
  return null
}

function closeModal() {
  // Clean up map before closing
  if (map.value) {
    clearMapElements()
    map.value = null
  }
  emit('update:visible', false)
}

// Clear all markers and polylines
function clearMapElements() {
  markers.value.forEach(marker => marker.setMap(null))
  polylines.value.forEach(polyline => polyline.setMap(null))
  markers.value = []
  polylines.value = []
}

// Draw route on map
async function drawRoute() {
  if (!map.value || !props.route) {
    console.log('Cannot draw route:', { hasMap: !!map.value, hasRoute: !!props.route })
    return
  }
  
  console.log('Drawing route with segments:', props.route.segments.length)
  
  clearMapElements()
  
  const allPoints: { lat: number; lng: number }[] = []
  
  // Draw each segment
  props.route.segments.forEach((segment, index) => {
    const departureCoords = getPortCoordinates(segment.departure)
    const arrivalCoords = getPortCoordinates(segment.arrival)
    
    if (!departureCoords || !arrivalCoords) return
    
    // Add polyline for this segment
    const polyline = createPolyline(map.value!, [departureCoords, arrivalCoords], {
      strokeColor: shipColors[segment.ship] || '#888888',
      strokeOpacity: 0.8,
      strokeWeight: 4
    })
    polylines.value.push(polyline)
    
    // Add departure marker (only for first segment)
    if (index === 0) {
      const departureMarker = createMarker(map.value!, departureCoords, {
        title: getPortDisplayName(segment.departure),
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        }
      })
      markers.value.push(departureMarker)
      allPoints.push(departureCoords)
    }
    
    // Add arrival marker (always for last segment, otherwise only if it's a transfer port)
    if (index === props.route.segments.length - 1) {
      const arrivalMarker = createMarker(map.value!, arrivalCoords, {
        title: getPortDisplayName(segment.arrival),
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
      })
      markers.value.push(arrivalMarker)
    } else {
      const transferMarker = createMarker(map.value!, arrivalCoords, {
        title: getPortDisplayName(segment.arrival),
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
        }
      })
      markers.value.push(transferMarker)
    }
    allPoints.push(arrivalCoords)
  })
  
  // Fit map to show all points
  if (allPoints.length > 0) {
    fitBounds(map.value!, allPoints, 100)
  }
}

// Initialize map when modal opens
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // Wait for next tick to ensure DOM is ready
    await nextTick()
    
    // Always recreate map when modal opens
    if (mapContainer.value) {
      console.log('Initializing map...', { 
        visible: newVal, 
        hasContainer: !!mapContainer.value,
        hasMap: !!map.value 
      })
      isLoading.value = true
      try {
        // Clear existing map if any
        if (map.value) {
          console.log('Clearing existing map')
          clearMapElements()
          map.value = null
        }
        
        map.value = await createMap(mapContainer, {
          center: { lat: 36.1049, lng: 133.1769 },
          zoom: 9,
          mapTypeId: 'terrain'
        })
        
        console.log('Map created:', !!map.value)
        
        if (map.value) {
          await drawRoute()
        }
      } catch (error) {
        console.error('Failed to create map:', error)
      } finally {
        isLoading.value = false
      }
    }
  } else {
    // Clean up when modal closes
    if (map.value) {
      console.log('Cleaning up map on modal close')
      clearMapElements()
      map.value = null
    }
  }
})

// Redraw route when route changes
watch(() => props.route, async (newRoute) => {
  if (!map.value) return
  // ルート変更時は必ず一度クリア
  clearMapElements()
  if (newRoute) {
    await drawRoute()
  }
})

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
    clearMapElements()
    if (map.value) {
      map.value = null
    }
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
