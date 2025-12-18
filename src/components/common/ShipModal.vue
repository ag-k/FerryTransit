<template>
  <Teleport to="body">
    <!-- Modal Overlay -->
    <Transition name="modal-fade">
      <div 
        v-if="visible" 
        class="fixed inset-0 bg-black bg-opacity-50 z-40"
        @click="handleClose"
      ></div>
    </Transition>
    
    <!-- Modal Content -->
    <Transition name="modal-slide">
      <div 
        v-if="visible" 
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
        @click.self="handleClose"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full max-h-[90vh] sm:max-h-[90vh] sm:h-auto h-full" 
             :class="type === 'port' ? 'max-w-5xl' : 'max-w-4xl'" 
             @click.stop>
          <!-- Header -->
          <div class="flex items-center justify-between p-4 sm:p-4 border-b">
            <h3 class="text-lg sm:text-xl font-semibold">{{ title }}</h3>
            <button 
              type="button" 
              class="p-3 -m-3 sm:p-2 sm:-m-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              aria-label="Close"
              @click="handleClose"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <!-- Body -->
          <div class="p-4 sm:p-6 max-h-[calc(90vh-8rem)] sm:max-h-[calc(90vh-8rem)] overflow-y-auto">
            <!-- Ship image -->
            <div v-if="type === 'ship' && shipId" class="text-center mb-4">
              <img 
                :src="`/images/${shipId}.jpg`"
                :alt="title"
                class="max-w-full h-auto max-h-72 sm:max-h-96 rounded-lg shadow-lg mx-auto"
                @error="handleImageError"
              >
            </div>
            
            <!-- Port map -->
            <div v-else-if="type === 'port'" class="map-container">
              <!-- Leaflet + OpenStreetMap (preferred) -->
              <PortAreaLeafletMap v-if="portId" :port-id="portId" :title="title" :zoom="portZoom" />
              <!-- Backward compatibility: legacy iframe HTML -->
              <div v-else-if="content" class="legacy-map-iframe" v-html="content"></div>
              <div v-else class="p-4 text-sm text-gray-600 dark:text-gray-300">
                地図情報がありません。
              </div>
            </div>
            
            <!-- Custom content slot -->
            <slot v-else></slot>
          </div>
          
          <!-- Footer -->
          <div v-if="$slots.footer" class="p-4 border-t">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import PortAreaLeafletMap from '@/components/map/PortAreaLeafletMap.client.vue'

interface Props {
  visible: boolean
  title: string
  type?: 'ship' | 'port' | 'custom'
  shipId?: string
  portId?: string
  portZoom?: number
  content?: string
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'custom',
  closeOnBackdrop: true
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'close': []
}>()

// Handle close
const handleClose = () => {
  if (props.closeOnBackdrop) {
    emit('update:visible', false)
    emit('close')
  }
}

// Handle image error
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.src = '/images/placeholder-ship.jpg'
}

// Handle ESC key
onMounted(() => {
  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.visible) {
      handleClose()
    }
  }
  document.addEventListener('keydown', handleEsc)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEsc)
  })
})

// Prevent body scroll when modal is open
watch(() => props.visible, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Map container responsive styles */
.map-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  overflow: hidden;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
}

.map-container :deep(iframe) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.legacy-map-iframe {
  position: absolute;
  inset: 0;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-slide-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.modal-slide-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Mobile fullscreen adjustments */
@media (max-width: 640px) {
  .map-container {
    padding-bottom: 75%; /* 4:3 aspect ratio for mobile */
  }
}
</style>