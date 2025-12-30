<template>
  <div :class="containerClass">
    <label
      v-if="label"
      :for="buttonId"
      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
    >
      {{ label }}
    </label>

    <!-- Button (opens modal) -->
    <button
      :id="buttonId"
      type="button"
      data-testid="port-selector-button"
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-between gap-3"
      :disabled="disabled"
      :aria-label="label || placeholder || $t('SELECT')"
      :aria-haspopup="'dialog'"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="open"
    >
      <span class="min-w-0 truncate">
        <span v-if="modelValue" class="text-gray-900 dark:text-white">{{ $t(modelValue) }}</span>
        <span v-else class="text-gray-500 dark:text-gray-300">{{ placeholder || '-' }}</span>
      </span>
      <svg
        class="w-5 h-5 text-gray-500 dark:text-gray-300 flex-none"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
    <small v-if="hint" class="text-gray-500 dark:text-gray-400 text-sm mt-1 block">{{ hint }}</small>

    <!-- Modal -->
    <Teleport v-if="canUseDom" to="body">
      <Transition name="modal-fade">
        <div
          v-if="isOpen"
          class="fixed inset-0 bg-black bg-opacity-50 z-40"
          data-testid="port-selector-backdrop"
          @click="close"
        ></div>
      </Transition>

      <Transition name="modal-slide">
        <div
          v-if="isOpen"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          data-testid="port-selector-modal"
          @click.self="close"
        >
          <div
            class="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] h-full sm:h-auto"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ label || placeholder || $t('SELECT') }}
              </h3>
              <button
                type="button"
                class="p-3 -m-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
                aria-label="Close"
                @click="close"
              >
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-4 max-h-[calc(90vh-4.5rem)] overflow-y-auto">
              <div class="space-y-5">
                <section
                  v-for="section in sections"
                  :key="section.key"
                  class="space-y-2"
                  :data-testid="`port-section-${section.key}`"
                >
                  <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {{ $t(section.labelKey) }}
                  </h4>
                  <div class="grid grid-cols-1 gap-2">
                    <button
                      v-for="port in section.ports"
                      :key="port"
                      type="button"
                      class="w-full px-3 py-3 rounded-md border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :class="[
                        isPortDisabled(port)
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700'
                      ]"
                      :disabled="isPortDisabled(port)"
                      @click="selectPort(port)"
                    >
                      {{ $t(port) }}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useFerryStore } from '@/stores/ferry'
import { useFavoriteStore } from '@/stores/favorite'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  hint?: string
  disabled?: boolean
  disabledPorts?: string[]
  hondoPorts?: string[]
  dozenPorts?: string[]
  dogoPorts?: string[]
  margin?: 'normal' | 'tight' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  margin: 'normal'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const ferryStore = process.client ? useFerryStore() : null
const favoriteStore = process.client ? useFavoriteStore() : null

const containerClass = computed(() => {
  if (props.margin === 'none') return ''
  if (props.margin === 'tight') return 'mb-2'
  return 'mb-4'
})

const hondoPorts = computed(() => (Array.isArray(props.hondoPorts) ? props.hondoPorts : (ferryStore?.hondoPorts || [])))
const dozenPorts = computed(() => (Array.isArray(props.dozenPorts) ? props.dozenPorts : (ferryStore?.dozenPorts || [])))
const dogoPorts = computed(() => (Array.isArray(props.dogoPorts) ? props.dogoPorts : (ferryStore?.dogoPorts || [])))

// Unique ID for accessibility
const buttonId = `port-selector-${Math.random().toString(36).substr(2, 9)}`

const canUseDom = computed(() => process.client && typeof document !== 'undefined')
const isOpen = ref(false)

const availablePortsSet = computed(() => {
  return new Set<string>([
    ...hondoPorts.value,
    ...dozenPorts.value,
    ...dogoPorts.value
  ])
})

const favoritePortCodes = computed(() => {
  const raw = favoriteStore?.orderedPorts?.map(p => p.portCode) || []
  const unique = Array.from(new Set(raw))
  return unique.filter(code => availablePortsSet.value.has(code))
})

type Section = { key: 'favorites' | 'mainland' | 'dozen' | 'dogo'; labelKey: string; ports: string[] }

const sections = computed<Section[]>(() => {
  const result: Section[] = []

  if (favoritePortCodes.value.length > 0) {
    result.push({
      key: 'favorites',
      labelKey: 'favorites.favoritePorts',
      ports: favoritePortCodes.value
    })
  }

  result.push(
    { key: 'mainland', labelKey: 'MAINLAND', ports: hondoPorts.value },
    { key: 'dozen', labelKey: 'DOZEN', ports: dozenPorts.value },
    { key: 'dogo', labelKey: 'DOGO', ports: dogoPorts.value }
  )

  return result
})

const isPortDisabled = (port: string) => {
  return Boolean(props.disabled) || (Array.isArray(props.disabledPorts) && props.disabledPorts.includes(port))
}

const open = () => {
  if (props.disabled) return
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const selectPort = (port: string) => {
  if (isPortDisabled(port)) return
  emit('update:modelValue', port)
  emit('change', port)
  close()
}

// ESC key
onMounted(() => {
  if (!canUseDom.value) return
  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen.value) {
      close()
    }
  }
  document.addEventListener('keydown', handleEsc)

  onUnmounted(() => {
    document.removeEventListener('keydown', handleEsc)
  })
})

// Prevent body scroll when modal is open
watch(isOpen, (newValue) => {
  if (!canUseDom.value) return
  if (newValue) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  if (!canUseDom.value) return
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-slide-enter-from,
.modal-slide-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
