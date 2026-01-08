<template>
  <Transition name="alert-fade">
    <div
      v-if="visible"
      :class="[alertClasses, attrs.class]"
      v-bind="passThroughAttrs"
      role="alert"
      :data-variant="type"
    >
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <strong v-if="title" class="mr-2 font-semibold">{{ title }}</strong>
          <span v-if="message" class="break-words">{{ message }}</span>
          <slot />
        </div>
        <button
          v-if="dismissible"
          type="button"
          class="shrink-0 -mr-1 -mt-1 p-1.5 inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60"
          aria-label="Close"
          @click="handleClose"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onUnmounted, useAttrs, watch } from 'vue'

type Variant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'light'
  | 'dark'

interface Props {
  visible: boolean
  type?: Variant
  title?: string
  message?: string
  dismissible?: boolean
  autoClose?: boolean
  autoCloseDelay?: number
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  message: '',
  dismissible: true,
  autoClose: false,
  autoCloseDelay: 5000
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const attrs = useAttrs()

const passThroughAttrs = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { class: _class, ...rest } = attrs
  return rest
})

const alertClasses = computed(() => {
  const base = 'px-4 py-3 rounded-xl border shadow-sm'

  const typeClasses: Record<Variant, string> = {
    success:
      'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800/40',
    danger:
      'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800/40',
    warning:
      'bg-yellow-50 text-yellow-950 border-yellow-200 dark:bg-yellow-900/25 dark:text-yellow-200 dark:border-yellow-700/40',
    info:
      'bg-blue-50 text-blue-950 border-blue-200 dark:bg-blue-900/25 dark:text-blue-200 dark:border-blue-800/40',
    primary: 'bg-app-primary text-white border-transparent',
    secondary: 'bg-app-surface-2 text-app-fg border-app-border/70',
    light: 'bg-app-surface text-app-fg border-app-border/70',
    dark: 'bg-gray-900 text-white border-gray-800'
  }

  return [base, typeClasses[props.type]].join(' ')
})

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.visible,
  (newValue) => {
    if (newValue && props.autoClose) {
      autoCloseTimer = setTimeout(() => {
        handleClose()
      }, props.autoCloseDelay)
    } else if (!newValue && autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      autoCloseTimer = null
    }
  }
)

onUnmounted(() => {
  if (autoCloseTimer) clearTimeout(autoCloseTimer)
})
</script>

<style scoped>
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
