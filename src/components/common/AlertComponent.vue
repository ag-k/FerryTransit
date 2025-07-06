<template>
  <Transition name="alert-fade">
    <div 
      v-if="visible"
      :class="alertClasses"
      role="alert"
    >
      <div class="flex items-center">
        <div class="flex-grow">
          <strong v-if="title" class="mr-2">{{ title }}</strong>
          <span>{{ message }}</span>
        </div>
        <button 
          v-if="dismissible"
          type="button" 
          class="ml-auto -mr-1.5 -my-1.5 p-1.5 inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          aria-label="Close"
          @click="handleClose"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
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

// Computed classes based on type
const alertClasses = computed(() => {
  const baseClasses = 'px-4 py-3 rounded-lg mb-4 relative'
  
  const typeClasses = {
    success: 'bg-green-100 text-green-800 border border-green-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-gray-600 text-white',
    light: 'bg-gray-100 text-gray-800 border border-gray-200',
    dark: 'bg-gray-800 text-white'
  }
  
  return [baseClasses, typeClasses[props.type]]
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