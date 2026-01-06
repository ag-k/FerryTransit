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
          class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all duration-200"
          :class="isOpen ? 'scale-100' : 'scale-95'"
        >
          <!-- Title -->
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ title }}
          </h3>
          
          <!-- Message -->
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            {{ message }}
          </p>
          
          <!-- Actions -->
          <div class="flex justify-end space-x-2">
            <button
              @click="cancel"
              class="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              {{ cancelText }}
            </button>
            <button
              @click="confirm"
              :class="[
                'px-4 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                confirmType === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : 'bg-blue-700 hover:bg-blue-800 text-white focus:ring-blue-500'
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