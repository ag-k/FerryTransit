<template>
  <Teleport to="body">
    <!-- Modal Overlay -->
    <Transition name="modal-fade">
      <div 
        v-if="visible" 
        class="fixed inset-0 bg-black bg-opacity-50 z-40"
        @click="handleClose"
      ></div>
    </Transition>
    
    <!-- Modal Content -->
    <Transition name="modal-slide">
      <div 
        v-if="visible" 
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
        @click.self="handleClose"
      >
        <div class="bg-app-surface text-app-fg border border-app-border/70 rounded-t-2xl sm:rounded-lg shadow-xl w-full max-h-[90vh] sm:max-h-[90vh] sm:h-auto h-full" 
             :class="type === 'port' ? 'max-w-5xl' : 'max-w-4xl'" 
             @click.stop>
          <!-- Header -->
          <div class="flex items-center justify-between p-4 sm:p-4 border-b border-app-border">
            <h3 class="text-lg sm:text-xl font-semibold">
              <span v-if="type === 'port'" class="flex flex-wrap items-center gap-2">
                <span>{{ headerTitleParts.name }}</span>
                <PortBadges :badges="headerTitleParts.badges" />
              </span>
              <span v-else>{{ headerTitle }}</span>
            </h3>
            <button 
              type="button" 
              class="p-3 -m-3 sm:p-2 sm:-m-2 hover:bg-app-surface-2 rounded-lg transition-colors touch-manipulation"
              :aria-label="t('CLOSE')"
              @click="handleClose"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <!-- Body -->
          <div class="p-4 sm:p-6 max-h-[calc(90vh-8rem)] sm:max-h-[calc(90vh-8rem)] overflow-y-auto">
            <!-- Ship image -->
            <div v-if="type === 'ship' && shipId" class="text-center mb-4">
              <img 
                :src="`/images/${shipId}.jpg`"
                :alt="title"
                class="max-w-full h-auto max-h-72 sm:max-h-96 rounded-lg shadow-lg mx-auto"
                @error="handleImageError"
              >
            </div>
            
            <!-- Port map -->
            <div v-else-if="type === 'port'">
              <!-- Tab navigation for HONDO (mainland ports) -->
              <div v-if="portId === 'HONDO'" class="mb-4 border-b border-app-border">
                <nav class="flex space-x-1" :aria-label="t('port.modal.tabsLabel')">
                  <button
                    v-for="tab in hondoTabs"
                    :key="tab.id"
                    @click="selectedHondoPort = tab.id"
                    class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
                    :class="selectedHondoPort === tab.id
                      ? 'bg-app-surface-2 text-app-primary border-b-2 border-app-primary-2'
                      : 'text-app-muted hover:text-app-fg hover:bg-app-surface-2/60'"
                  >
                    {{ tab.name }}
                  </button>
                </nav>
              </div>

              <div class="sm:flex sm:gap-4 sm:items-start">
                <div class="sm:flex-1">
                  <div class="map-container">
                    <!-- Leaflet + OpenStreetMap (preferred) -->
                    <PortAreaLeafletMap
                      v-if="currentPortId"
                      :port-id="currentPortId"
                      :title="currentPortTitle"
                      :zoom="currentPortZoom"
                      :focus="selectedBoarding?.location ? { ...selectedBoarding.location, title: selectedBoarding.label } : undefined"
                    />
                    <!-- Backward compatibility: legacy iframe HTML -->
                    <div v-else-if="content" class="legacy-map-iframe" v-html="content"></div>
                    <div v-else class="p-4 text-sm text-app-muted">
                      {{ t('port.modal.noMap') }}
                    </div>
                  </div>
                </div>

                <!-- Boarding info (PC: right side) -->
                <div v-if="portBoarding.length" class="mt-4 sm:mt-0 sm:w-80">
                  <h4 class="text-base font-semibold text-app-fg">{{ t('port.modal.boardingTitle') }}</h4>
                  <div class="mt-2 space-y-3 sm:max-h-[420px] overflow-y-auto pr-1">
                    <div
                      v-for="item in portBoarding"
                      :key="item.key"
                      class="rounded-lg border bg-app-surface-2/70 p-3"
                      :class="[
                        item.location ? 'cursor-pointer' : 'opacity-70',
                        selectedBoardingKey === item.key
                          ? 'border-app-primary-2 ring-2 ring-app-primary-2/30'
                          : 'border-app-border'
                      ]"
                      @click="item.location ? (selectedBoardingKey = item.key) : undefined"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="text-sm font-medium text-app-fg inline-flex items-center gap-1.5">
                            {{ item.label }}
                            <span v-if="item.shipIds.includes('RAINBOWJET')" class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
                              <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5" />
                              {{ t('port.modal.reservationRequired') }}
                            </span>
                          </div>
                          <div class="mt-1 inline-flex items-start gap-1 text-xs text-app-muted">
                            <Icon name="heroicons:map-pin" class="w-4 h-4 mt-0.5 text-app-muted flex-none" />
                            <span class="min-w-0">
                              {{ item.place }}
                            </span>
                          </div>
                        </div>
                        <a
                          v-if="item.sourceUrl"
                          class="text-xs text-app-primary-2 hover:underline whitespace-nowrap"
                          :href="item.sourceUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          @click.stop
                        >
                          {{ t('port.modal.reference') }}
                        </a>
                      </div>

                      <div v-if="Array.isArray(item.shipIds) && item.shipIds.length" class="mt-2 text-xs text-app-muted">
                        {{ t('port.modal.target') }}
                        <span class="ml-1">
                          {{ item.shipIds.map((id: string) => (nuxtApp as any).$i18n?.t?.(id) ?? id).join(' / ') }}
                        </span>
                      </div>
                      <div v-if="!item.location" class="mt-1 text-xs text-app-muted">
                        {{ t('port.modal.pinMissing') }}
                      </div>
                      <div v-if="item.note" class="mt-1 text-xs text-app-muted">
                        {{ item.note }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Custom content slot -->
            <slot v-else></slot>
          </div>
          
          <!-- Footer -->
          <div v-if="$slots.footer" class="p-4 border-t border-app-border">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import PortAreaLeafletMap from '@/components/map/PortAreaLeafletMap.client.vue'
import PortBadges from '@/components/common/PortBadges.vue'
import { PORTS_DATA } from '~/data/ports'

interface Props {
  visible: boolean
  title: string
  type?: 'ship' | 'port' | 'custom'
  shipId?: string
  portId?: string
  portZoom?: number
  content?: string
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'custom',
  closeOnBackdrop: true
})

const nuxtApp = useNuxtApp()
const { t } = useI18n()
const currentLocale = computed(() => String((nuxtApp as any)?.$i18n?.locale?.value || 'ja'))

const selectedBoardingKey = ref<string>('')

// Tab management for HONDO (mainland ports)
const selectedHondoPort = ref<'HONDO_SHICHIRUI' | 'HONDO_SAKAIMINATO'>('HONDO_SHICHIRUI')

const hondoTabs = computed(() => {
  const shichirui = (PORTS_DATA as any)?.HONDO_SHICHIRUI
  const sakaiminato = (PORTS_DATA as any)?.HONDO_SAKAIMINATO
  const isJa = currentLocale.value.startsWith('ja')
  return [
    {
      id: 'HONDO_SHICHIRUI' as const,
      name: String(isJa ? shichirui?.name : shichirui?.nameEn || shichirui?.name || t('HONDO_SHICHIRUI'))
    },
    {
      id: 'HONDO_SAKAIMINATO' as const,
      name: String(isJa ? sakaiminato?.name : sakaiminato?.nameEn || sakaiminato?.name || t('HONDO_SAKAIMINATO'))
    }
  ]
})

// Current port ID (HONDOの場合は選択されたタブの港ID、それ以外はそのまま)
const currentPortId = computed(() => {
  if (props.portId === 'HONDO') {
    return selectedHondoPort.value
  }
  return props.portId
})

// Current port title
const currentPortTitle = computed(() => {
  if (props.portId === 'HONDO') {
    const port = (PORTS_DATA as any)?.[selectedHondoPort.value]
    const isJa = currentLocale.value.startsWith('ja')
    return String(isJa ? port?.name : port?.nameEn || port?.name || selectedHondoPort.value)
  }
  return props.title
})

// Header title (prefer portId based formatting for port modals)
const headerTitle = computed(() => {
  if (props.type !== 'port') return props.title
  const id = currentPortId.value
  if (!id) return props.title

  const isJa = currentLocale.value.startsWith('ja')
  if (!isJa) return currentPortTitle.value

  const raw = String((nuxtApp as any).$i18n?.t?.(id) ?? currentPortTitle.value)
  const m = raw.match(/^(.+?)\((.+)\)$/)
  if (m) {
    const base = m[1].trim()
    const area = m[2].trim()
    const baseWithPort = base.endsWith('港') ? base : `${base}港`
    return `${baseWithPort}（${area}）`
  }
  // No parentheses → just ensure "港" suffix if missing
  return raw.endsWith('港') ? raw : `${raw}港`
})

const getBadgeList = (label: string) => {
  const parenRegex = /[（(]([^）)]+)[）)]/g
  const badges: string[] = []
  let match = parenRegex.exec(label)
  while (match) {
    const value = match[1]?.trim()
    if (value) badges.push(value)
    match = parenRegex.exec(label)
  }
  return badges
}

const headerTitleParts = computed(() => {
  if (props.type !== 'port') {
    return { name: headerTitle.value, badges: [] }
  }
  const id = currentPortId.value
  const isJa = currentLocale.value.startsWith('ja')
  if (!id) return { name: currentPortTitle.value, badges: [] }

  const label = String(t(id))
  const parenRegex = /[（(]([^）)]+)[）)]/g
  const base = label.replace(parenRegex, '').replace(/\s+/g, ' ').trim()
  const baseName = base || currentPortTitle.value
  const name = isJa && baseName && !baseName.endsWith('港') ? `${baseName}港` : baseName

  return {
    name,
    badges: getBadgeList(label)
  }
})

// Current port zoom
const currentPortZoom = computed(() => {
  if (props.portId === 'HONDO') {
    // HONDO_SHICHIRUI と HONDO_SAKAIMINATO のズームレベル（デフォルト15）
    return 15
  }
  return props.portZoom || 15
})

const portBoarding = computed(() => {
  const portIdToUse = currentPortId.value
  if (!portIdToUse) return []
  const port = (PORTS_DATA as any)?.[portIdToUse]
  const items = (port?.boarding || []) as Array<any>
  return items
    .filter((x) => Array.isArray(x?.shipIds) && x.shipIds.length > 0 && x?.placeJa)
    .map((x, idx) => {
      const isJa = currentLocale.value.startsWith('ja')
      return {
        key: `${portIdToUse}-${idx}`,
        shipIds: x.shipIds as string[],
        label: String((isJa ? x.labelJa : x.labelEn) || x.labelJa || ''),
        place: String((isJa ? x.placeJa : x.placeEn) || x.placeJa || ''),
        note: String((isJa ? x.noteJa : x.noteEn) || x.noteJa || ''),
        sourceUrl: x.sourceUrl ? String(x.sourceUrl) : '',
        location: x.location && Number.isFinite(x.location.lat) && Number.isFinite(x.location.lng)
          ? { lat: Number(x.location.lat), lng: Number(x.location.lng) }
          : null
      }
    })
})

const selectedBoarding = computed(() => {
  if (!selectedBoardingKey.value) return null
  return portBoarding.value.find((x: any) => x.key === selectedBoardingKey.value) || null
})

watch(
  () => props.portId,
  () => {
    selectedBoardingKey.value = ''
    if (props.portId === 'HONDO') {
      selectedHondoPort.value = 'HONDO_SHICHIRUI'
    }
  }
)

watch(
  () => selectedHondoPort.value,
  () => {
    selectedBoardingKey.value = ''
  }
)

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
/* Map container responsive styles */
.map-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  overflow: hidden;
  background-color: hsl(var(--app-surface-2));
  border-radius: 0.5rem;
}

.map-container :deep(iframe) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.legacy-map-iframe {
  position: absolute;
  inset: 0;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-slide-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.modal-slide-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Mobile fullscreen adjustments */
@media (max-width: 640px) {
  .map-container {
    padding-bottom: 75%; /* 4:3 aspect ratio for mobile */
  }
}

/* Desktop: fixed height so the boarding panel can sit on the right */
@media (min-width: 640px) {
  .map-container {
    height: 420px;
    padding-bottom: 0;
  }
}
</style>
