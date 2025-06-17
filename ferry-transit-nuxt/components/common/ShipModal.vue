<template>
  <Teleport to="body">
    <div 
      v-if="visible" 
      class="modal fade show d-block" 
      tabindex="-1"
      @click.self="handleClose"
    >
      <div class="modal-dialog modal-lg" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ title }}</h5>
            <button 
              type="button" 
              class="btn-close"
              aria-label="Close"
              @click="handleClose"
            ></button>
          </div>
          <div class="modal-body">
            <!-- Ship image -->
            <div v-if="type === 'ship' && shipId" class="text-center mb-3">
              <img 
                :src="`/images/${shipId}.jpg`"
                :alt="title"
                class="img-fluid ship-image"
                @error="handleImageError"
              >
            </div>
            
            <!-- Port map -->
            <div v-else-if="type === 'port' && content" v-html="content"></div>
            
            <!-- Custom content slot -->
            <slot v-else></slot>
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </div>
    <div v-if="visible" class="modal-backdrop fade show" @click="handleClose"></div>
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
.modal {
  overflow-y: auto;
}

.ship-image {
  max-height: 400px;
  border-radius: 0.5rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.modal-backdrop {
  z-index: 1040;
}

.modal {
  z-index: 1050;
}
</style>