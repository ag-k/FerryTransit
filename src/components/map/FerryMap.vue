<template>
  <div class="ferry-map-container">
    <div v-if="!isMapEnabled" class="map-disabled-notice">
      <Icon name="heroicons:map" class="w-8 h-8 text-gray-400" />
      <p>{{ $t('map.disabled') }}</p>
      <button
        class="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-700"
        @click="enableMap"
      >
        {{ $t('map.enable') }}
      </button>
    </div>
    <div v-else-if="mapError" class="map-disabled-notice">
      <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 text-yellow-500" />
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('map.error') }}</p>
    </div>
    <div
      v-show="isMapEnabled && !mapError"
      class="map-container"
      :class="{ loading: isLoading }"
    >
      <div ref="mapContainer" class="map-surface" />
    </div>
    <div v-if="isLoading && isMapEnabled" class="map-loading">
      <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin" />
      <span class="sr-only">{{ $t('map.loading') }}</span>
    </div>

    <ClientOnly>
      <CommonShipModal
        v-if="props.showPortDetails && modalPortId"
        v-model:visible="showPortModal"
        :title="modalPortTitle"
        type="port"
        :port-id="modalPortId"
        :port-zoom="modalPortZoom"
        @close="closePortModal"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { PORTS_DATA } from '~/data/ports'
import CommonShipModal from '~/components/common/ShipModal.vue'
import type { Port } from '~/types'
import type { RouteData, RoutePoint, RoutesDataFile } from '~/types/route'
import { getJSONData } from '~/composables/useDataPublish'
import { createLogger } from '~/utils/logger'
import { getPortMapZoom } from '@/utils/portMapZoom'
import { useSettingsStore } from '@/stores/settings'
import { ensureLeafletLoaded } from '@/utils/leafletLoader'
import {
  expandMainlandPortId,
  findMatchingRouteForSegment,
  findRoutesForSelection,
  getFerryRouteStyle,
  getPortLabelVariant,
  getRouteSourceLabel
} from '@/utils/ferryMap'

type RouteSegment = { from: string; to: string; ship?: string }

interface Props {
  selectedPort?: string
  selectedRoute?: { from: string; to: string }
  selectedRouteSegments?: RouteSegment[]
  showPortDetails?: boolean
  height?: string
}

type PortMarkerRecord = {
  marker: any
  port: Port
  labelVisible: boolean
}

type RouteLayerRecord = {
  layer: any
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
  showPortDetails: true,
  selectedPort: undefined,
  selectedRoute: undefined,
  selectedRouteSegments: undefined
})

const emit = defineEmits<{
  portClick: [port: Port]
  routeSelect: [route: { from: string; to: string }]
}>()

const logger = createLogger('FerryMap')
const { $i18n } = useNuxtApp()
const settingsStore = useSettingsStore()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(false)
const mapError = ref(false)
const showPortModal = ref(false)
const modalPortId = ref<string>('')
const routesFromStorage = ref<RouteData[]>([])

const currentLocale = computed(() => $i18n.locale.value)
const isMapEnabled = computed(() => settingsStore.mapEnabled)
const modalPortZoom = computed<number>(() => getPortMapZoom(modalPortId.value))
const modalPortTitle = computed(() => {
  return modalPortId.value ? String($i18n.t(modalPortId.value)) : ''
})

let L: any = null
let map: any | null = null
const markers = ref<Map<string, PortMarkerRecord>>(new Map())
const routeLayers = ref<RouteLayerRecord[]>([])

const getPortTitle = (port: Port) => {
  return currentLocale.value === 'ja' ? port.name : port.nameEn
}

const getPortBadgeLabel = (portId: string) => {
  const label = String($i18n.t(portId))
  const parenRegex = /[（(]([^）)]+)[）)]/
  const match = label.match(parenRegex)
  return match?.[1]?.trim() || ''
}

const getPortLabelClassName = (portId: string) => {
  return `ferry-map-port-label ferry-map-port-label--${getPortLabelVariant(getPortBadgeLabel(portId))}`
}

const enableMap = () => {
  ;(settingsStore as any).setMapEnabled(true)
}

const closePortModal = () => {
  showPortModal.value = false
  modalPortId.value = ''
}

const invalidateMapSize = () => {
  if (!map) return
  requestAnimationFrame(() => {
    try {
      map?.invalidateSize?.(false)
    } catch {
      // noop
    }
  })
}

const fitBoundsWithUiPadding = (bounds: any) => {
  if (!map || !bounds?.isValid?.()) return

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  map.fitBounds(bounds, {
    paddingTopLeft: [110, 80],
    paddingBottomRight: [110, isMobile ? 190 : 130],
    animate: false
  })
}

const clearRouteLayers = () => {
  routeLayers.value.forEach(({ layer }) => {
    try {
      layer.remove?.()
    } catch {
      // noop
    }
  })
  routeLayers.value = []
}

const setMarkerLabelVisibility = (portId: string, visible: boolean) => {
  const record = markers.value.get(portId)
  if (!record) return

  record.marker.closeTooltip?.()
  record.marker.unbindTooltip?.()

  if (!visible) {
    record.labelVisible = false
    return
  }

  record.marker.bindTooltip(getPortTitle(record.port), {
    permanent: true,
    direction: 'right',
    offset: [12, 0],
    opacity: 1,
    className: getPortLabelClassName(portId)
  })
  record.marker.openTooltip?.()
  record.labelVisible = true
}

const getActivePortIds = (): Set<string> => {
  const active = new Set<string>()
  if (props.selectedRouteSegments && props.selectedRouteSegments.length > 0) {
    props.selectedRouteSegments.forEach(segment => {
      expandMainlandPortId(segment.from).forEach(id => active.add(id))
      expandMainlandPortId(segment.to).forEach(id => active.add(id))
    })
  } else if (props.selectedRoute) {
    expandMainlandPortId(props.selectedRoute.from).forEach(id => active.add(id))
    expandMainlandPortId(props.selectedRoute.to).forEach(id => active.add(id))
  } else if (props.selectedPort) {
    expandMainlandPortId(props.selectedPort).forEach(id => active.add(id))
  }
  return active
}

const updateAllMarkerStyles = () => {
  if (!map || markers.value.size === 0) return

  const activeIds = getActivePortIds()

  markers.value.forEach((record, id) => {
    const isActive = activeIds.has(id)
    record.marker.setStyle({
      radius: isActive ? 8 : 6,
      fillColor: isActive ? '#2563EB' : '#9CA3AF',
      color: isActive ? '#1D4ED8' : '#6B7280',
      weight: isActive ? 2 : 1,
      fillOpacity: 1,
      opacity: 1
    })
    if (isActive) {
      record.marker.bringToFront?.()
    }
    setMarkerLabelVisibility(id, isActive)
  })
}

const addPortMarkers = () => {
  if (!map || !L) return

  Object.values(PORTS_DATA).forEach(port => {
    const marker = L.circleMarker([port.location.lat, port.location.lng], {
      radius: 6,
      fillColor: '#9CA3AF',
      color: '#6B7280',
      weight: 1,
      fillOpacity: 1,
      opacity: 1
    }).addTo(map)

    marker.on('click', () => {
      if (props.showPortDetails) {
        modalPortId.value = port.id
        showPortModal.value = true
      }
      emit('portClick', port)
    })

    markers.value.set(port.id, {
      marker,
      port,
      labelVisible: false
    })
  })
}

const loadRoutesFromStorage = async () => {
  try {
    const data = await getJSONData<RoutesDataFile>('routes/ferry-routes.json')
    if (data?.routes) {
      routesFromStorage.value = data.routes
      logger.info(`Loaded ${data.routes.length} routes from local data (v${data.metadata.version})`)
      return
    }
  } catch (error) {
    logger.warn('No route data found, using fallback straight lines', error)
  }
  routesFromStorage.value = []
}

const toLatLngBounds = (path: RoutePoint[]) => {
  return L.latLngBounds(path.map(point => [point.lat, point.lng]))
}

const createRouteTooltipHtml = (route: RouteData) => {
  const details = [
    getRouteSourceLabel(route.source),
    route.distance ? `距離: ${(route.distance / 1000).toFixed(1)} km` : '',
    route.duration ? `所要時間: ${Math.round(route.duration / 60)} 分` : ''
  ].filter(Boolean)

  return `
    <div class="ferry-map-route-tooltip__inner">
      <strong class="ferry-map-route-tooltip__title">${route.fromName} → ${route.toName}</strong>
      <span class="ferry-map-route-tooltip__meta">${details.join(' / ')}</span>
    </div>
  `
}

const addRouteLayer = (
  path: RoutePoint[],
  route?: RouteData,
  clickableRoute?: { from: string; to: string },
  styleOverride?: { color: string; opacity: number; weight: number; dashArray?: string }
) => {
  if (!map || !L || path.length === 0) return

  const baseStyle = styleOverride || getFerryRouteStyle(route?.source || 'custom')
  const polyline = L.polyline(
    path.map(point => [point.lat, point.lng]),
    {
      color: baseStyle.color,
      opacity: baseStyle.opacity,
      weight: baseStyle.weight,
      dashArray: baseStyle.dashArray,
      lineCap: 'round',
      lineJoin: 'round'
    }
  ).addTo(map)

  if (route) {
    polyline.bindTooltip(createRouteTooltipHtml(route), {
      sticky: true,
      direction: 'top',
      opacity: 1,
      className: 'ferry-map-route-tooltip'
    })
  }

  polyline.on('mouseover', () => {
    polyline.setStyle({
      weight: baseStyle.weight + 1,
      opacity: Math.min(1, baseStyle.opacity + 0.18)
    })
    polyline.bringToFront?.()
  })

  polyline.on('mouseout', () => {
    polyline.setStyle({
      weight: baseStyle.weight,
      opacity: baseStyle.opacity
    })
  })

  if (clickableRoute) {
    polyline.on('click', () => {
      emit('routeSelect', clickableRoute)
    })
  }

  routeLayers.value.push({ layer: polyline })
}

const buildFallbackPath = (fromId: string, toId: string): RoutePoint[] => {
  const fromPort = PORTS_DATA[fromId]
  const toPort = PORTS_DATA[toId]
  if (!fromPort || !toPort) return []
  return [
    { ...fromPort.location },
    { ...toPort.location }
  ]
}

const drawRouteSegments = (segments: RouteSegment[]) => {
  if (!map || !L) return

  const bounds = L.latLngBounds([])
  let drewAny = false

  segments.forEach((segment) => {
    const matched = findMatchingRouteForSegment(routesFromStorage.value, segment)
    if (matched) {
      addRouteLayer(matched.path, matched.route)
      bounds.extend(toLatLngBounds(matched.path))
      drewAny = true
      return
    }

    const fromCandidates = expandMainlandPortId(segment.from)
    const toCandidates = expandMainlandPortId(segment.to)
    fromCandidates.forEach((fromId) => {
      toCandidates.forEach((toId) => {
        const fallbackPath = buildFallbackPath(fromId, toId)
        if (fallbackPath.length === 0) return
        addRouteLayer(fallbackPath, undefined, undefined, {
          color: '#64748B',
          opacity: 0.55,
          weight: 3,
          dashArray: '7 7'
        })
        bounds.extend(toLatLngBounds(fallbackPath))
        drewAny = true
      })
    })
  })

  if (drewAny) {
    fitBoundsWithUiPadding(bounds)
  }
}

const drawSelectedRoutes = (selectedRoute: { from: string; to: string }) => {
  if (!map || !L) return

  const bounds = L.latLngBounds([])
  const selectedRoutes = findRoutesForSelection(routesFromStorage.value, selectedRoute)

  if (selectedRoutes.length > 0) {
    selectedRoutes.forEach((route) => {
      addRouteLayer(route.path, route, { from: route.from, to: route.to })
      bounds.extend(toLatLngBounds(route.path))
    })
    fitBoundsWithUiPadding(bounds)
    return
  }

  const fromCandidates = expandMainlandPortId(selectedRoute.from)
  const toCandidates = expandMainlandPortId(selectedRoute.to)
  let drewAny = false

  fromCandidates.forEach((fromId) => {
    toCandidates.forEach((toId) => {
      const fallbackPath = buildFallbackPath(fromId, toId)
      if (fallbackPath.length === 0) return
      addRouteLayer(fallbackPath, undefined, { from: fromId, to: toId }, {
        color: '#64748B',
        opacity: 0.55,
        weight: 3,
        dashArray: '7 7'
      })
      bounds.extend(toLatLngBounds(fallbackPath))
      drewAny = true
    })
  })

  if (drewAny) {
    fitBoundsWithUiPadding(bounds)
  }
}

const renderActiveRoute = () => {
  if (!map) return

  clearRouteLayers()

  if (props.selectedRouteSegments && props.selectedRouteSegments.length > 0) {
    drawRouteSegments(props.selectedRouteSegments)
  } else if (props.selectedRoute) {
    if (props.selectedRoute.from === props.selectedRoute.to) {
      focusPort(props.selectedRoute.from)
    } else {
      drawSelectedRoutes(props.selectedRoute)
    }
  } else {
    focusAllPorts()
  }

  updateAllMarkerStyles()
  invalidateMapSize()
}

const focusPort = (portId: string) => {
  if (!map || !L) return

  const portIds = expandMainlandPortId(portId)
  const points = portIds
    .map(id => PORTS_DATA[id])
    .filter((port): port is Port => !!port)

  if (points.length === 0) return

  if (points.length === 1) {
    const point = points[0]
    if (!point) return
    map.setView([point.location.lat, point.location.lng], 12, { animate: false })
  } else {
    const bounds = L.latLngBounds(points.map(port => [port.location.lat, port.location.lng]))
    fitBoundsWithUiPadding(bounds)
  }
}

const focusAllPorts = () => {
  if (!map || !L) return

  const points = Object.values(PORTS_DATA)
  if (points.length === 0) return

  const bounds = L.latLngBounds(points.map(port => [port.location.lat, port.location.lng]))
  fitBoundsWithUiPadding(bounds)
}

const initializeMap = async () => {
  if (!mapContainer.value || map) return

  isLoading.value = true
  mapError.value = false

  try {
    L = await ensureLeafletLoaded()

    map = L.map(mapContainer.value, {
      center: [36.2, 133.05],
      zoom: 10,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    addPortMarkers()
    await loadRoutesFromStorage()
    renderActiveRoute()
    updateAllMarkerStyles()

    await nextTick()
    invalidateMapSize()
  } catch (error) {
    logger.error('Failed to initialize Leaflet map', error)
    mapError.value = true
  } finally {
    isLoading.value = false
  }
}

watch(() => props.selectedPort, (portId) => {
  if (portId) {
    focusPort(portId)
  }
  updateAllMarkerStyles()
})

watch(() => props.selectedRoute, () => {
  renderActiveRoute()
})

watch(() => props.selectedRouteSegments, () => {
  renderActiveRoute()
}, { deep: true })

watch(routesFromStorage, () => {
  renderActiveRoute()
})

watch(isMapEnabled, (enabled) => {
  if (enabled && !map) {
    nextTick(() => initializeMap())
  }
})

watch(currentLocale, () => {
  updateAllMarkerStyles()
})

onMounted(() => {
  if (isMapEnabled.value) {
    initializeMap()
  }
})

onUnmounted(() => {
  clearRouteLayers()
  markers.value.forEach(({ marker }) => {
    try {
      marker.remove?.()
    } catch {
      // noop
    }
  })
  markers.value.clear()
  try {
    map?.remove?.()
  } catch {
    // noop
  }
  map = null
  L = null
})
</script>

<style scoped>
.ferry-map-container {
  position: relative;
  width: 100%;
  height: v-bind(height);
}

.map-container {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.18), transparent 40%),
    linear-gradient(180deg, #eef6ff 0%, #dbeafe 100%);
}

.map-container.loading {
  background-color: #f3f4f6;
}

.map-surface {
  width: 100%;
  height: 100%;
}

.map-container :deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  font: inherit;
}

.map-container :deep(.leaflet-control-attribution) {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.92);
}

.map-container :deep(.ferry-map-route-tooltip) {
  border: 0;
  background: rgba(15, 23, 42, 0.94);
  color: #f8fafc;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.22);
}

.map-container :deep(.ferry-map-route-tooltip::before) {
  border-top-color: rgba(15, 23, 42, 0.94);
}

.map-container :deep(.ferry-map-route-tooltip .leaflet-tooltip-content) {
  margin: 0;
  padding: 8px 10px;
}

.map-container :deep(.ferry-map-route-tooltip__inner) {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.map-container :deep(.ferry-map-route-tooltip__title) {
  font-size: 0.875rem;
  line-height: 1.2;
}

.map-container :deep(.ferry-map-route-tooltip__meta) {
  font-size: 0.75rem;
  line-height: 1.3;
  color: rgba(226, 232, 240, 0.88);
}

.map-container :deep(.ferry-map-port-label) {
  border-radius: 9999px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  border: 1px solid #cbd5e1;
  background: rgba(255, 255, 255, 0.95);
  color: #334155;
}

.map-container :deep(.ferry-map-port-label::before) {
  display: none;
}

.map-container :deep(.ferry-map-port-label .leaflet-tooltip-content) {
  margin: 0;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.map-container :deep(.ferry-map-port-label--nishinoshima) {
  background: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}

.map-container :deep(.ferry-map-port-label--ama) {
  background: #eff6ff;
  color: #0369a1;
  border-color: #bae6fd;
}

.map-container :deep(.ferry-map-port-label--chibu) {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.map-container :deep(.ferry-map-port-label--okinoshima) {
  background: #fffbeb;
  color: #92400e;
  border-color: #fde68a;
}

.map-container :deep(.ferry-map-port-label--mainland) {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.map-container :deep(.ferry-map-port-label--default) {
  background: rgba(255, 255, 255, 0.95);
  color: #334155;
  border-color: #cbd5e1;
}

.map-disabled-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #3b82f6;
}

@media (max-width: 640px) {
  .ferry-map-container {
    height: 300px;
  }
}
</style>
