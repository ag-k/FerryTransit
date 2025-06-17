<template>
  <Transition name="alert-fade">
    <div 
      v-if="visible"
      :class="alertClasses"
      role="alert"
    >
      <div class="d-flex align-items-center">
        <div class="flex-grow-1">
          <strong v-if="title" class="me-2">{{ title }}</strong>
          <span>{{ message }}</span>
        </div>
        <button 
          v-if="dismissible"
          type="button" 
          class="btn-close"
          aria-label="Close"
          @click="handleClose"
        ></button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  type?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'light' | 'dark'
  title?: string
  message: string
  dismissible?: boolean
  autoClose?: boolean
  autoCloseDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  dismissible: true,
  autoClose: false,
  autoCloseDelay: 5000
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'close': []
}>()

// Computed classes
const alertClasses = computed(() => {
  return [
    'alert',
    `alert-${props.type}`,
    {
      'alert-dismissible': props.dismissible,
      'fade': props.dismissible,
      'show': props.visible
    }
  ]
})

// Handle close
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// Auto close timer
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.visible, (newValue) => {
  if (newValue && props.autoClose) {
    autoCloseTimer = setTimeout(() => {
      handleClose()
    }, props.autoCloseDelay)
  } else if (!newValue && autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
})

onUnmounted(() => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
  }
})
</script>

<style scoped>
.alert {
  margin-bottom: 1rem;
}

/* Transition styles */
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.alert-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.alert-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>