<template>
  <div :class="containerClass">
    <label v-if="label" :for="buttonId" class="block text-sm font-medium text-app-fg mb-2">
      {{ label }}
    </label>

    <!-- Button (opens modal) -->
    <button :id="buttonId" type="button" data-testid="port-selector-button"
      class="w-full px-3 py-2 border border-app-border rounded-md text-left bg-app-surface text-app-fg focus:outline-none focus:ring-2 focus:ring-app-primary-2 focus:border-app-primary-2 disabled:bg-app-surface-2 disabled:text-app-muted disabled:cursor-not-allowed flex items-center justify-between gap-3"
      :disabled="disabled" :aria-label="label || placeholder || $t('SELECT')" :aria-haspopup="'dialog'"
      :aria-expanded="isOpen ? 'true' : 'false'" @click="open">
      <span class="min-w-0">
        <span v-if="modelValue" class="text-app-fg flex items-center gap-2 min-w-0">
          <LocationTypeIcon v-if="showLocationTypeBadge" :type="getLocationType(modelValue)" />
          <span class="truncate">{{ getPortLabelParts(modelValue).name }}</span>
          <PortBadges :badges="getPortLabelParts(modelValue).badges" class="flex flex-1 items-center gap-1" />
        </span>
        <span v-else class="text-app-muted truncate">{{ placeholder || '-' }}</span>
      </span>
      <svg class="port-selector__caret w-5 h-5 text-app-muted flex-none" fill="currentColor" viewBox="0 0 20 20"
        aria-hidden="true">
        <path fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
          clip-rule="evenodd" />
      </svg>
    </button>
    <small v-if="hint" class="text-app-muted text-sm mt-1 block">{{ hint }}</small>

    <!-- Modal -->
    <Teleport v-if="canUseDom" to="body">
      <Transition name="modal-fade">
        <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 z-40" data-testid="port-selector-backdrop"
          @click="close"></div>
      </Transition>

      <Transition name="modal-slide">
        <div v-if="isOpen"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto" role="dialog"
          aria-modal="true" data-testid="port-selector-modal" @click.self="close">
          <div
            class="bg-app-surface text-app-fg rounded-t-2xl sm:rounded-lg shadow-xl border border-app-border/70 w-full max-w-lg max-h-[90vh] h-full sm:h-auto"
            @click.stop>
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-app-border">
              <h3 class="text-lg font-semibold text-app-fg">
                {{ label || placeholder || $t('SELECT') }}
              </h3>
              <button type="button"
                class="p-3 -m-3 hover:bg-app-surface-2 rounded-lg transition-colors touch-manipulation"
                aria-label="Close" @click="close">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
                    clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-4 max-h-[calc(90vh-4.5rem)] overflow-y-auto">
              <div class="space-y-5">
                <div
                  v-if="showTransportTabsControl"
                  class="grid grid-cols-2 gap-2"
                  role="tablist"
                  :aria-label="$t('UI.TRANSPORT_FILTER')"
                  data-testid="port-selector-transport-tabs"
                >
                  <button
                    v-for="tab in transportTabs"
                    :key="tab.key"
                    type="button"
                    role="tab"
                    data-testid="port-selector-transport-tab"
                    :aria-selected="selectedTransportTab === tab.key ? 'true' : 'false'"
                    class="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary-2"
                    :class="[
                      selectedTransportTab === tab.key
                        ? 'bg-app-primary text-white border-app-primary'
                        : 'bg-app-surface text-app-fg border-app-border hover:bg-app-surface-2'
                    ]"
                    @click="selectedTransportTab = tab.key"
                  >
                    <Icon :name="tab.icon" class="h-5 w-5" aria-hidden="true" />
                    <span>{{ $t(`TRANSPORT_MODES.${tab.key}`) }}</span>
                  </button>
                </div>

                <div class="relative">
                  <Icon
                    name="heroicons:magnifying-glass"
                    class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-app-muted"
                    aria-hidden="true"
                  />
                  <input
                    v-model="searchQuery"
                    type="search"
                    class="w-full rounded-md border border-app-border bg-app-surface py-2 pl-10 pr-10 text-base text-app-fg placeholder:text-app-muted focus:border-app-primary-2 focus:outline-none focus:ring-2 focus:ring-app-primary-2"
                    :placeholder="$t('UI.SEARCH_LOCATION_PLACEHOLDER')"
                    data-testid="port-selector-search-input"
                  >
                  <button
                    v-if="searchQuery"
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-app-muted hover:bg-app-surface-2 hover:text-app-fg"
                    :aria-label="$t('CLEAR')"
                    @click="searchQuery = ''"
                  >
                    <Icon name="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <section v-if="favoriteRoutes.length > 0" class="space-y-2" data-testid="port-section-favorite-routes">
                  <h4 class="text-sm font-semibold text-app-fg">
                    {{ $t('favorites.favoriteRoutes') }}
                  </h4>
                  <div class="grid grid-cols-1 gap-2">
                    <button v-for="route in favoriteRoutes" :key="route.id" type="button"
                      class="w-full px-3 py-3 rounded-md border border-app-border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary-2 bg-app-surface text-app-fg hover:bg-app-surface-2"
                      :aria-label="getRouteLabel(route)" @click="selectRoute(route)">
                      <span class="flex items-start gap-3">
                        <span class="min-w-0 flex-1">
                          <span class="block text-sm font-semibold truncate">{{ getRouteDisplayName(route) }}</span>
                          <span v-if="route.nickname" class="block text-xs text-app-muted truncate">{{
                            getRouteLabel(route) }}</span>
                        </span>
                      </span>
                    </button>
                  </div>
                </section>
                <section v-for="section in sections" :key="section.key" class="space-y-2"
                  :data-testid="`port-section-${section.key}`">
                  <h4 class="text-sm font-semibold text-app-fg">
                    {{ $t(section.labelKey) }}
                  </h4>
                  <div v-if="section.key === 'busStops' && !normalizedSearchQuery && busStopTownTabs.length > 1"
                    class="grid grid-cols-2 gap-2" role="tablist" :aria-label="$t('BUS_STOPS')"
                    data-testid="bus-stop-town-tabs">
                    <button v-for="tab in busStopTownTabs" :key="tab.key" type="button" role="tab"
                      data-testid="bus-stop-town-tab" :aria-selected="tab.key === currentBusStopTownKey ? 'true' : 'false'"
                      class="px-3 py-2 rounded-md border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary-2"
                      :class="[
                        tab.key === currentBusStopTownKey
                          ? 'bg-app-primary text-white border-app-primary'
                          : 'bg-app-surface text-app-fg border-app-border hover:bg-app-surface-2'
                      ]" @click="selectBusStopTown(tab.key)">
                      {{ getTownBadgeLabel(tab.labelKey) }}
                    </button>
                  </div>
                  <div class="grid grid-cols-1 gap-2">
                    <button v-for="port in section.ports" :key="port" type="button"
                      class="w-full px-3 py-3 rounded-md border border-app-border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary-2"
                      :class="[
                        isPortDisabled(port)
                          ? 'bg-app-surface-2 text-app-muted cursor-not-allowed opacity-70'
                          : 'bg-app-surface text-app-fg hover:bg-app-surface-2'
                      ]" :disabled="isPortDisabled(port)" @click="selectPort(port)">
                      <span class="flex items-center gap-3">
                        <LocationTypeIcon v-if="showLocationTypeBadge" :type="getLocationType(port)" />
                        <span class="min-w-0 truncate">{{ getPortLabelParts(port).name }}</span>
                      <PortBadges :badges="getPortLabelParts(port).badges"
                          class="ml-auto flex items-center gap-1.5" />
                      </span>
                    </button>
                  </div>
                  <div v-if="section.ports.length === 0" class="rounded-md border border-dashed border-app-border px-3 py-4 text-sm text-app-muted">
                    {{ $t('NO_RESULTS') }}
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
import LocationTypeIcon from '@/components/common/LocationTypeIcon.vue'
import type { LocationType } from '@/types'
import type { FavoriteRoute } from '@/types/favorite'
import { getBusStopPortBadgeLabel, getBusStopTownLabelKey, getLocationTypeForCode } from '@/utils/gtfsBusTimetable'

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
  allowedLocationType?: LocationType | 'ALL'
  showTransportTabs?: boolean
  showLocationTypeBadge?: boolean
  preferredBusStopTownSource?: string
  margin?: 'normal' | 'tight' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  allowedLocationType: 'ALL',
  showTransportTabs: false,
  showLocationTypeBadge: true,
  preferredBusStopTownSource: '',
  margin: 'normal'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
  'selectRoute': [route: FavoriteRoute]
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
const busStops = computed(() => ferryStore?.busStops || [])
const showPorts = computed(() => props.allowedLocationType === 'ALL' || props.allowedLocationType === 'PORT')
const showStops = computed(() => props.allowedLocationType === 'ALL' || props.allowedLocationType === 'STOP')
type TransportTabKey = 'FERRY' | 'BUS'

const transportTabs: Array<{ key: TransportTabKey; icon: string }> = [
  { key: 'FERRY', icon: 'mdi:ferry' },
  { key: 'BUS', icon: 'mdi:bus' }
]

const selectedTransportTab = ref<TransportTabKey>('FERRY')
const showTransportTabsControl = computed(() => {
  return props.showTransportTabs &&
    props.allowedLocationType === 'ALL' &&
    showPorts.value &&
    showStops.value &&
    busStops.value.length > 0
})

const showPortsInCurrentView = computed(() => {
  return showPorts.value && (!showTransportTabsControl.value || selectedTransportTab.value === 'FERRY')
})

const showStopsInCurrentView = computed(() => {
  return showStops.value && (!showTransportTabsControl.value || selectedTransportTab.value === 'BUS')
})

// Unique ID for accessibility
const buttonId = `port-selector-${Math.random().toString(36).substr(2, 9)}`

const canUseDom = computed(() => process.client && typeof document !== 'undefined')
const isOpen = ref(false)
const searchQuery = ref('')
const normalizedSearchQuery = computed(() => normalizeSearchText(searchQuery.value))

const availablePortsSet = computed(() => {
  const locations: string[] = []
  if (showPortsInCurrentView.value) {
    locations.push(...hondoPorts.value, ...dozenPorts.value, ...dogoPorts.value)
  }
  if (showStopsInCurrentView.value) {
    locations.push(...busStops.value)
  }
  return new Set<string>(locations)
})

const favoritePortCodes = computed(() => {
  const raw = favoriteStore?.orderedPorts?.map(p => p.portCode) || []
  const unique = Array.from(new Set(raw))
  return unique.filter(code => availablePortsSet.value.has(code) && matchesLocationSearch(code))
})

const favoriteRoutes = computed(() => {
  const raw = favoriteStore?.orderedRoutes || []
  return raw.filter(route => {
    const isAvailable = availablePortsSet.value.has(route.departure) && availablePortsSet.value.has(route.arrival)
    if (!isAvailable) return false
    if (!normalizedSearchQuery.value) return true
    return normalizeSearchText(`${getRouteDisplayName(route)} ${getRouteLabel(route)}`).includes(normalizedSearchQuery.value)
  })
})

type Section = { key: 'favorites' | 'mainland' | 'dozen' | 'dogo' | 'busStops'; labelKey: string; ports: string[] }
type BusStopTownTab = { key: string; labelKey: string; ports: string[] }

const busStopTownOrder = ['OKINOSHIMA_CHO', 'NISHINOSHIMA_CHO', 'AMA_CHO', 'CHIBU_MURA', 'BUS_STOPS']
const activeBusStopTownKey = ref<string | null>(null)

const busStopTownTabs = computed<BusStopTownTab[]>(() => {
  const groupedStops = new Map<string, string[]>()

  for (const stop of busStops.value) {
    const townKey = getBusStopTownLabelKey(stop) || 'BUS_STOPS'
    groupedStops.set(townKey, [...(groupedStops.get(townKey) || []), stop])
  }

  return Array.from(groupedStops.entries())
    .sort(([leftKey], [rightKey]) => {
      const leftIndex = busStopTownOrder.indexOf(leftKey)
      const rightIndex = busStopTownOrder.indexOf(rightKey)
      const normalizedLeft = leftIndex === -1 ? busStopTownOrder.length : leftIndex
      const normalizedRight = rightIndex === -1 ? busStopTownOrder.length : rightIndex
      return normalizedLeft - normalizedRight
    })
    .map(([labelKey, ports]) => ({
      key: labelKey,
      labelKey,
      ports
    }))
})

const getPreferredBusStopTownKey = () => {
  const selectedTownKey = getLocationType(props.modelValue) === 'STOP'
    ? getBusStopTownLabelKey(props.modelValue)
    : null

  if (selectedTownKey && busStopTownTabs.value.some(tab => tab.key === selectedTownKey)) {
    return selectedTownKey
  }

  const sourceTownKey = getLocationType(props.preferredBusStopTownSource) === 'STOP'
    ? getBusStopTownLabelKey(props.preferredBusStopTownSource)
    : null

  if (sourceTownKey && busStopTownTabs.value.some(tab => tab.key === sourceTownKey)) {
    return sourceTownKey
  }

  return busStopTownTabs.value[0]?.key || null
}

const currentBusStopTownKey = computed(() => {
  if (activeBusStopTownKey.value && busStopTownTabs.value.some(tab => tab.key === activeBusStopTownKey.value)) {
    return activeBusStopTownKey.value
  }

  return getPreferredBusStopTownKey()
})

const activeBusStopPorts = computed(() => {
  if (normalizedSearchQuery.value) return busStops.value.filter(matchesLocationSearch)
  return busStopTownTabs.value.find(tab => tab.key === currentBusStopTownKey.value)?.ports || []
})

const sections = computed<Section[]>(() => {
  const result: Section[] = []

  if (favoritePortCodes.value.length > 0) {
    result.push({
      key: 'favorites',
      labelKey: 'favorites.favoritePorts',
      ports: favoritePortCodes.value
    })
  }

  if (showStopsInCurrentView.value && busStops.value.length > 0) {
    result.push({ key: 'busStops', labelKey: 'BUS_STOPS', ports: activeBusStopPorts.value })
  }

  if (showPortsInCurrentView.value) {
    result.push(
      { key: 'dozen', labelKey: 'DOZEN', ports: dozenPorts.value.filter(matchesLocationSearch) },
      { key: 'dogo', labelKey: 'DOGO', ports: dogoPorts.value.filter(matchesLocationSearch) },
      { key: 'mainland', labelKey: 'MAINLAND', ports: hondoPorts.value.filter(matchesLocationSearch) }
    )
  }

  return result
})

const isPortDisabled = (port: string) => {
  return Boolean(props.disabled) || (Array.isArray(props.disabledPorts) && props.disabledPorts.includes(port))
}

const getLocationType = (port?: string): LocationType => {
  return getLocationTypeForCode(port)
}

const getTownBadgeLabel = (labelKey: string): string => {
  const translated = String(t(labelKey))
  if (translated !== labelKey) return translated
  if (labelKey === 'AMA_CHO') return '海士町'
  if (labelKey === 'NISHINOSHIMA_CHO') return '西ノ島町'
  if (labelKey === 'CHIBU_MURA') return '知夫村'
  if (labelKey === 'OKINOSHIMA_CHO') return '隠岐の島町'
  return translated
}

const normalizeSearchText = (value: string): string => {
  return value
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, '')
}

const matchesLocationSearch = (port: string): boolean => {
  const query = normalizedSearchQuery.value
  if (!query) return true

  const labelParts = getPortLabelParts(port)
  const haystack = normalizeSearchText([
    port,
    labelParts.name,
    ...labelParts.badges
  ].join(' '))

  return haystack.includes(query)
}

const getPortLabelParts = (port: string) => {
  const label = ferryStore?.getLocationLabel(port) || String(t(port))
  const parenRegex = /[（(]([^）)]+)[）)]/g
  const townLabelKey = getLocationType(port) === 'STOP' ? getBusStopTownLabelKey(port) : null
  const badges: string[] = townLabelKey ? [getTownBadgeLabel(townLabelKey)] : []
  const portBadgeLabel = getBusStopPortBadgeLabel(port)
  if (portBadgeLabel) badges.push(portBadgeLabel)

  let match = parenRegex.exec(label)
  while (match) {
    const value = match[1]?.trim()
    if (value && !badges.includes(value)) badges.push(value)
    match = parenRegex.exec(label)
  }

  const name = label.replace(parenRegex, '').replace(/\s+/g, ' ').trim()

  return {
    name: name || label.trim(),
    badges
  }
}

const getRouteLabel = (route: FavoriteRoute) => {
  const departure = getPortLabelParts(route.departure).name
  const arrival = getPortLabelParts(route.arrival).name
  return `${departure} → ${arrival}`
}

const getRouteDisplayName = (route: FavoriteRoute) => {
  if (route.nickname) return route.nickname
  return getRouteLabel(route)
}

const getPreferredTransportTab = (): TransportTabKey => {
  return getLocationType(props.modelValue) === 'STOP' ||
    getLocationType(props.preferredBusStopTownSource) === 'STOP'
    ? 'BUS'
    : 'FERRY'
}

const open = () => {
  if (props.disabled) return
  selectedTransportTab.value = getPreferredTransportTab()
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const selectBusStopTown = (townKey: string) => {
  activeBusStopTownKey.value = townKey
}

const selectPort = (port: string) => {
  if (isPortDisabled(port)) return
  emit('update:modelValue', port)
  emit('change', port)
  close()
}

const selectRoute = (route: FavoriteRoute) => {
  if (props.disabled) return
  emit('selectRoute', route)
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
    selectedTransportTab.value = getPreferredTransportTab()
    activeBusStopTownKey.value = getPreferredBusStopTownKey()
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

watch(busStopTownTabs, (tabs) => {
  if (!tabs.some(tab => tab.key === activeBusStopTownKey.value)) {
    activeBusStopTownKey.value = getPreferredBusStopTownKey()
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
