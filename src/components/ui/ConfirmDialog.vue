<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black bg-opacity-50"
          @click="cancel"
        ></div>
        
        <!-- Dialog -->
        <div
          class="relative bg-app-surface text-app-fg border border-app-border/70 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all duration-200"
          :class="isOpen ? 'scale-100' : 'scale-95'"
        >
          <!-- Title -->
          <h3 class="text-lg font-semibold text-app-fg mb-4">
            {{ title }}
          </h3>
          
          <!-- Message -->
          <p class="text-app-muted mb-6">
            {{ message }}
          </p>
          
          <!-- Actions -->
          <div class="flex justify-end space-x-2">
            <button
              @click="cancel"
              class="px-4 py-2 text-app-fg bg-app-surface-2 hover:bg-app-surface-2/80 border border-app-border/70 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-app-primary-2 focus:ring-offset-2 focus:ring-offset-app-surface"
            >
              {{ cancelText }}
            </button>
            <button
              @click="confirm"
              :class="[
                'px-4 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-app-surface',
                confirmType === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : 'bg-app-primary hover:bg-app-primary/90 text-white focus:ring-app-primary-2'
              ]"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmType?: 'primary' | 'danger'
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: '確認',
  cancelText: 'キャンセル',
  confirmType: 'primary'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirm = () => {
  emit('confirm')
}

const cancel = () => {
  emit('cancel')
}

// ESCキーでダイアログを閉じる
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.isOpen) {
      cancel()
    }
  }
  window.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleEscape)
  })
})
</script>
