<template>
  <TransitionRoot as="template" :show="open">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel :class="[
              'relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full',
              sizeClass
            ]">
              <form @submit.prevent="handleSubmit">
                <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div class="sm:flex sm:items-start">
                    <div
                      v-if="icon"
                      :class="[
                        'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10',
                        iconColorClass
                      ]"
                    >
                      <component :is="icon" class="h-6 w-6" :class="iconTextColorClass" />
                    </div>
                    <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                      <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        {{ title }}
                      </DialogTitle>
                      <div v-if="description" class="mt-2">
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          {{ description }}
                        </p>
                      </div>
                      <div class="mt-4">
                        <slot />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    :disabled="loading"
                    :class="[
                      'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm',
                      primaryButtonClass,
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    ]"
                  >
                    <svg
                      v-if="loading"
                      class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ loading ? loadingText : confirmText }}
                  </button>
                  <button
                    type="button"
                    @click="$emit('close')"
                    :disabled="loading"
                    class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ cancelText }}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import type { Component } from 'vue'

interface Props {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  loadingText?: string
  loading?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'info' | 'success' | 'warning' | 'danger'
  icon?: Component
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: '保存',
  cancelText: 'キャンセル',
  loadingText: '処理中...',
  loading: false,
  size: 'md',
  variant: 'info'
})

const emit = defineEmits<{
  close: []
  submit: []
}>()

const sizeClass = computed(() => {
  const sizes = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl'
  }
  return sizes[props.size]
})

const iconColorClass = computed(() => {
  const colors = {
    info: 'bg-blue-100 dark:bg-blue-900',
    success: 'bg-green-100 dark:bg-green-900',
    warning: 'bg-yellow-100 dark:bg-yellow-900',
    danger: 'bg-red-100 dark:bg-red-900'
  }
  return colors[props.variant]
})

const iconTextColorClass = computed(() => {
  const colors = {
    info: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400'
  }
  return colors[props.variant]
})

const primaryButtonClass = computed(() => {
  const colors = {
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
  }
  return colors[props.variant]
})

const handleSubmit = () => {
  if (!props.loading) {
    emit('submit')
  }
}
</script>