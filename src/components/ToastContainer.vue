<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <TransitionGroup
        name="toast"
        tag="div"
        @enter="onEnter"
        @leave="onLeave"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'relative overflow-hidden rounded-lg shadow-lg pointer-events-auto',
            'transform transition-all duration-300 ease-in-out',
            getToastClasses(toast.type)
          ]"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <component
                  :is="getIcon(toast.type)"
                  :class="['h-6 w-6', getIconClasses(toast.type)]"
                  aria-hidden="true"
                />
              </div>
              <div class="ml-3 w-0 flex-1">
                <p class="text-sm font-medium">
                  {{ toast.message }}
                </p>
              </div>
              <div class="ml-4 flex-shrink-0 flex">
                <button
                  @click="removeToast(toast.id)"
                  class="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
                >
                  <span class="sr-only">閉じる</span>
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <div
            v-if="toast.duration && toast.duration > 0"
            class="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-10"
          >
            <div
              class="h-full bg-white bg-opacity-30 animate-shrink"
              :style="{ animationDuration: `${toast.duration}ms` }"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { useToast } from '~/composables/useToast'

const { toasts, removeToast } = useToast()

const getToastClasses = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-200'
    case 'error':
      return 'bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200'
    case 'warning':
      return 'bg-yellow-50 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
    case 'info':
      return 'bg-blue-50 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
    default:
      return 'bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200'
  }
}

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircleIcon
    case 'error':
      return XCircleIcon
    case 'warning':
      return ExclamationTriangleIcon
    case 'info':
      return InformationCircleIcon
    default:
      return InformationCircleIcon
  }
}

const getIconClasses = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-400 dark:text-green-300'
    case 'error':
      return 'text-red-400 dark:text-red-300'
    case 'warning':
      return 'text-yellow-400 dark:text-yellow-300'
    case 'info':
      return 'text-blue-400 dark:text-blue-300'
    default:
      return 'text-gray-400 dark:text-gray-300'
  }
}

const onEnter = (el: Element) => {
  ;(el as HTMLElement).style.opacity = '0'
  ;(el as HTMLElement).style.transform = 'translateX(100%)'
}

const onLeave = (el: Element) => {
  ;(el as HTMLElement).style.opacity = '0'
  ;(el as HTMLElement).style.transform = 'translateX(100%)'
}
</script>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@keyframes shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-shrink {
  animation: shrink linear forwards;
}
</style>