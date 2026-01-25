<template>
  <div :class="containerClass">
    <label
      v-if="label"
      :for="buttonId"
      class="block text-sm font-medium text-app-fg mb-2"
    >
      {{ label }}
    </label>

    <!-- Button (opens modal) -->
    <button
      :id="buttonId"
      type="button"
      data-testid="port-selector-button"
      class="w-full px-3 py-2 border border-app-border rounded-md text-left bg-app-surface text-app-fg focus:outline-none focus:ring-2 focus:ring-app-primary-2 focus:border-app-primary-2 disabled:bg-app-surface-2 disabled:text-app-muted disabled:cursor-not-allowed flex items-center justify-between gap-3"
      :disabled="disabled"
      :aria-label="label || placeholder || $t('SELECT')"
      :aria-haspopup="'dialog'"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="open"
    >
      <span class="min-w-0">
        <span v-if="modelValue" class="text-app-fg flex items-center gap-2 min-w-0">
          <span class="truncate">{{ getPortLabelParts(modelValue).name }}</span>
          <PortBadges :badges="getPortLabelParts(modelValue).badges" class="flex items-center gap-1" />
        </span>
        <span v-else class="text-app-muted truncate">{{ placeholder || '-' }}</span>
      </span>
      <svg
        class="w-5 h-5 text-app-muted flex-none"
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
    <small v-if="hint" class="text-app-muted text-sm mt-1 block">{{ hint }}</small>

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
            class="bg-app-surface text-app-fg rounded-t-2xl sm:rounded-lg shadow-xl border border-app-border/70 w-full max-w-lg max-h-[90vh] h-full sm:h-auto"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-app-border">
              <h3 class="text-lg font-semibold text-app-fg">
                {{ label || placeholder || $t('SELECT') }}
              </h3>
              <button
                type="button"
                class="p-3 -m-3 hover:bg-app-surface-2 rounded-lg transition-colors touch-manipulation"
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
                  <h4 class="text-sm font-semibold text-app-fg">
                    {{ $t(section.labelKey) }}
                  </h4>
                  <div class="grid grid-cols-1 gap-2">
                    <button
                      v-for="port in section.ports"
                      :key="port"
                      type="button"
                      class="w-full px-3 py-3 rounded-md border border-app-border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary-2"
                      :class="[
                        isPortDisabled(port)
                          ? 'bg-app-surface-2 text-app-muted cursor-not-allowed opacity-70'
                          : 'bg-app-surface text-app-fg hover:bg-app-surface-2'
                      ]"
                      :disabled="isPortDisabled(port)"
                      @click="selectPort(port)"
                    >
                      <span class="flex items-center gap-3">
                        <span class="min-w-0 truncate">{{ getPortLabelParts(port).name }}</span>
                        <PortBadges :badges="getPortLabelParts(port).badges" class="ml-auto flex items-center gap-1.5" />
                      </span>
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
import PortBadges from '@/components/common/PortBadges.vue'

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
  showLocationTypeBadge?: boolean
  margin?: 'normal' | 'tight' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showLocationTypeBadge: true,
  margin: 'normal'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const ferryStore = process.client ? useFerryStore() : null
const favoriteStore = process.client ? useFavoriteStore() : null
const { t } = useI18n()

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

const getPortLabelParts = (port: string) => {
  const label = String(t(port))
  const parenRegex = /[（(]([^）)]+)[）)]/g
  const badges: string[] = []

  let match = parenRegex.exec(label)
  while (match) {
    const value = match[1]?.trim()
    if (value) badges.push(value)
    match = parenRegex.exec(label)
  }

  const name = label.replace(parenRegex, '').replace(/\s+/g, ' ').trim()
  const locationTypeLabel = props.showLocationTypeBadge ? String(t('LOCATION_TYPES.PORT')) : ''
  if (locationTypeLabel && locationTypeLabel !== 'LOCATION_TYPES.PORT' && !badges.includes(locationTypeLabel)) {
    badges.push(locationTypeLabel)
  }

  return {
    name: name || label.trim(),
    badges
  }
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
