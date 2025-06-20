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
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        @click.self="handleClose"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl sm:max-h-[90vh] sm:h-auto h-full" @click.stop>
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b">
            <h3 class="text-lg font-semibold">{{ title }}</h3>
            <button 
              type="button" 
              class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
              @click="handleClose"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <!-- Body -->
          <div class="p-4 sm:max-h-[calc(90vh-8rem)] overflow-y-auto">
            <!-- Ship image -->
            <div v-if="type === 'ship' && shipId" class="text-center mb-4">
              <img 
                :src="`/images/${shipId}.jpg`"
                :alt="title"
                class="max-w-full h-auto max-h-96 rounded-lg shadow-lg mx-auto"
                @error="handleImageError"
              >
            </div>
            
            <!-- Port map -->
            <div v-else-if="type === 'port' && content" class="aspect-w-4 aspect-h-3" v-html="content"></div>
            
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
interface Props {
  visible: boolean
  title: string
  type?: 'ship' | 'port' | 'custom'
  shipId?: string
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
.aspect-w-4 {
  position: relative;
  padding-bottom: 75%; /* 4:3 aspect ratio */
}

.aspect-h-3 {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.aspect-w-4 :deep(iframe) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
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
  .aspect-w-4 {
    padding-bottom: 80%; /* Slightly taller for mobile */
  }
}
</style>