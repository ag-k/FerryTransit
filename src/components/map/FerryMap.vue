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
      <div
        v-if="showTouchHint"
        class="map-touch-hint"
        role="status"
        aria-live="polite"
      >
        {{ $t('map.touchHint') }}
      </div>
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
        :show-route-set-actions="true"
        @close="closePortModal"
        @set-departure="handlePortModalSetDeparture"
        @set-arrival="handlePortModalSetArrival"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { PORTS_DATA } from '~/data/ports'
import CommonShipModal from '~/components/common/ShipModal.vue'
import type { LocationType, Port, TransportMode } from '~/types'
import type { RouteData, RoutePoint, RoutesDataFile } from '~/types/route'
import { getJSONData } from '~/composables/useDataPublish'
import { createLogger } from '~/utils/logger'
import { getPortMapZoom } from '@/utils/portMapZoom'
import { useSettingsStore } from '@/stores/settings'
import { ensureLeafletLoaded } from '@/utils/leafletLoader'
import { installLeafletTwoFingerTouchGuard } from '@/utils/leafletTouchGuard'
import {
  getBusStopConnectedPortId,
  getBusStopPortBadgeLabel,
  type BusStopLocation
} from '@/utils/gtfsBusTimetable'
import {
  buildPortLabelA11yLabel,
  expandMainlandPortId,
  findMatchingRouteForSegment,
  findRoutesForSelection,
  getFerryRouteStyle,
  getPortLabelVariant,
  getRouteSourceLabel
} from '@/utils/ferryMap'

type RouteSegment = { from: string; to: string; ship?: string }
type MapMode = Extract<TransportMode, 'FERRY' | 'BUS'>
type MapLocationPoint = {
  id: string
  type: LocationType
  titleJa: string
  titleEn: string
  location: RoutePoint
  port?: Port
  operatorId?: string
  townLabelKey?: string | null
}

interface Props {
  selectedPort?: string
  selectedRoute?: { from: string; to: string }
  selectedRouteSegments?: RouteSegment[]
  transportMode?: MapMode
  busStops?: BusStopLocation[]
  showPortDetails?: boolean
  height?: string
}

type LocationMarkerRecord = {
  marker: any
  location: MapLocationPoint
  labelVisible: boolean
}

type RouteLayerRecord = {
  layer: any
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
  transportMode: 'FERRY',
  busStops: () => [],
  showPortDetails: true,
  selectedPort: undefined,
  selectedRoute: undefined,
  selectedRouteSegments: undefined
})

const emit = defineEmits<{
  portClick: [port: Port]
  locationClick: [location: { id: string; type: LocationType }]
  locationSetDeparture: [location: { id: string; type: LocationType }]
  locationSetArrival: [location: { id: string; type: LocationType }]
  portSetDeparture: [portId: string]
  portSetArrival: [portId: string]
  routeSelect: [route: { from: string; to: string }]
}>()

const logger = createLogger('FerryMap')
const { $i18n } = useNuxtApp()
const settingsStore = useSettingsStore()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(false)
const mapError = ref(false)
const showTouchHint = ref(false)
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
let teardownTouchGuard: (() => void) | null = null
let touchHintTimer: number | null = null
const markers = ref<Map<string, LocationMarkerRecord>>(new Map())
const routeLayers = ref<RouteLayerRecord[]>([])

const portLocations = computed<MapLocationPoint[]>(() => {
  return Object.values(PORTS_DATA).map(port => ({
    id: port.id,
    type: 'PORT',
    titleJa: port.name,
    titleEn: port.nameEn,
    location: { ...port.location },
    port
  }))
})

const busStopLocations = computed<MapLocationPoint[]>(() => {
  return props.busStops.map(stop => ({
    id: stop.id,
    type: 'STOP',
    titleJa: stop.name,
    titleEn: stop.name,
    location: {
      lat: stop.lat,
      lng: stop.lng
    },
    operatorId: stop.operatorId,
    townLabelKey: stop.townLabelKey
  }))
})

const mapLocations = computed<MapLocationPoint[]>(() => {
  return props.transportMode === 'BUS' ? busStopLocations.value : portLocations.value
})

const getLocationTitle = (location: MapLocationPoint) => {
  return currentLocale.value === 'ja' ? location.titleJa : location.titleEn
}

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const getBusOperatorLabelKey = (operatorId?: string) => {
  if (operatorId === 'AMA_TOWN') return 'AMA_TOWN_BUS'
  if (operatorId === 'NISHINOSHIMA_TOWN') return 'NISHINOSHIMA_TOWN_BUS'
  if (operatorId === 'CHIBU_VILLAGE') return 'CHIBU_VILLAGE_BUS'
  if (operatorId === 'OKINOSHIMA_TOWN') return 'OKINOSHIMA_TOWN_BUS'
  if (operatorId === 'OKINOSHIMA' || operatorId === 'OKI_ICHIBATA') return 'OKI_ICHIBATA_BUS'
  if (operatorId === 'ICHIBATA_BUS') return 'ICHIBATA_BUS'
  return ''
}

const createBusStopPopupHtml = (location: MapLocationPoint) => {
  const title = escapeHtml(getLocationTitle(location))
  const town = location.townLabelKey ? String($i18n.t(location.townLabelKey)) : ''
  const operatorLabelKey = getBusOperatorLabelKey(location.operatorId)
  const operatorLabel = operatorLabelKey ? String($i18n.t(operatorLabelKey)) : ''
  const portBadgeLabel = getBusStopPortBadgeLabel(location.id)
  const connectedPortId = getBusStopConnectedPortId(location.id)
  const connectedPortLabel = connectedPortId ? String($i18n.t(connectedPortId)) : portBadgeLabel
  const rows = [
    [String($i18n.t('LOCATION_TYPES.STOP')), town],
    [String($i18n.t('TRANSPORT_NAME')), operatorLabel],
    [String($i18n.t('map.connectedPort')), connectedPortLabel || '']
  ].filter(([, value]) => value)

  return `
    <div class="ferry-map-stop-popup" data-location-id="${escapeHtml(location.id)}">
      <div class="ferry-map-stop-popup__title">${title}</div>
      <dl class="ferry-map-stop-popup__list">
        ${rows.map(([label, value]) => `
          <div class="ferry-map-stop-popup__row">
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `).join('')}
      </dl>
      <div class="ferry-map-stop-popup__actions">
        <button type="button" class="ferry-map-stop-popup__button" data-map-action="set-departure">
          ${escapeHtml(String($i18n.t('map.setAsDeparture')))}
        </button>
        <button type="button" class="ferry-map-stop-popup__button ferry-map-stop-popup__button--primary" data-map-action="set-arrival">
          ${escapeHtml(String($i18n.t('map.setAsArrival')))}
        </button>
      </div>
    </div>
  `
}

const getPortBadgeLabel = (portId: string) => {
  const label = String($i18n.t(portId))
  const parenRegex = /[（(]([^）)]+)[）)]/
  const match = label.match(parenRegex)
  return match?.[1]?.trim() || ''
}

const getLocationLabelClassName = (location: MapLocationPoint) => {
  if (location.type === 'STOP') {
    const townLabel = location.townLabelKey ? String($i18n.t(location.townLabelKey)) : ''
    return `ferry-map-port-label ferry-map-port-label--bus-stop ferry-map-port-label--${getPortLabelVariant(townLabel)}`
  }

  return `ferry-map-port-label ferry-map-port-label--${getPortLabelVariant(getPortBadgeLabel(location.id))}`
}

const enableMap = () => {
  ;(settingsStore as any).setMapEnabled(true)
}

const closePortModal = () => {
  showPortModal.value = false
  modalPortId.value = ''
}

const handlePortModalSetDeparture = (portId: string) => {
  emit('portSetDeparture', portId)
  closePortModal()
}

const handlePortModalSetArrival = (portId: string) => {
  emit('portSetArrival', portId)
  closePortModal()
}

const openLocationDetails = (location: MapLocationPoint) => {
  if (location.type === 'PORT' && location.port) {
    if (props.showPortDetails) {
      modalPortId.value = location.port.id
      showPortModal.value = true
    }
    emit('portClick', location.port)
    return
  }

  emit('locationClick', {
    id: location.id,
    type: location.type
  })
}

const bindStopPopupActions = (marker: any, location: MapLocationPoint) => {
  marker.on('popupopen', (event: any) => {
    const popupElement = event.popup?.getElement?.() as HTMLElement | null
    if (!popupElement || !L) return

    const departureButton = popupElement.querySelector<HTMLButtonElement>('[data-map-action="set-departure"]')
    const arrivalButton = popupElement.querySelector<HTMLButtonElement>('[data-map-action="set-arrival"]')

    const bindButton = (
      button: HTMLButtonElement | null,
      eventName: 'locationSetDeparture' | 'locationSetArrival'
    ) => {
      if (!button) return
      L.DomEvent.disableClickPropagation(button)
      L.DomEvent.disableScrollPropagation(button)
      L.DomEvent.on(button, 'click', (clickEvent: Event) => {
        L.DomEvent.stop(clickEvent)
        emit(eventName, { id: location.id, type: location.type })
        marker.closePopup?.()
      })
    }

    bindButton(departureButton, 'locationSetDeparture')
    bindButton(arrivalButton, 'locationSetArrival')
  })
}

const clearTouchHintTimer = () => {
  if (!touchHintTimer) return
  window.clearTimeout(touchHintTimer)
  touchHintTimer = null
}

const revealTouchHint = () => {
  if (typeof window === 'undefined') return

  showTouchHint.value = true
  clearTouchHintTimer()
  touchHintTimer = window.setTimeout(() => {
    showTouchHint.value = false
    touchHintTimer = null
  }, 1600)
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

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ferry-map-port-label__button'
  button.textContent = getLocationTitle(record.location)
  button.title = getLocationTitle(record.location)
  button.setAttribute('aria-label', buildPortLabelA11yLabel(
    getLocationTitle(record.location),
    record.location.type === 'STOP' ? String($i18n.t('LOCATION_TYPES.STOP')) : String($i18n.t('map.portDetails'))
  ))

  L.DomEvent.disableClickPropagation(button)
  L.DomEvent.disableScrollPropagation(button)
  L.DomEvent.on(button, 'click', (event: Event) => {
    L.DomEvent.stop(event)
    openLocationDetails(record.location)
  })

  record.marker.bindTooltip(button, {
    permanent: true,
    interactive: true,
    direction: 'right',
    offset: [12, 0],
    opacity: 1,
    className: getLocationLabelClassName(record.location)
  })
  record.marker.openTooltip?.()
  record.labelVisible = true
}

const expandSelectedLocationId = (id: string): string[] => {
  return props.transportMode === 'FERRY' ? expandMainlandPortId(id) : [id]
}

const getMapLocationById = (id: string): MapLocationPoint | undefined => {
  return mapLocations.value.find(location => location.id === id)
}

const getActiveLocationIds = (): Set<string> => {
  const active = new Set<string>()
  if (props.selectedRouteSegments && props.selectedRouteSegments.length > 0) {
    props.selectedRouteSegments.forEach(segment => {
      expandSelectedLocationId(segment.from).forEach(id => active.add(id))
      expandSelectedLocationId(segment.to).forEach(id => active.add(id))
    })
  } else if (props.selectedRoute) {
    expandSelectedLocationId(props.selectedRoute.from).forEach(id => active.add(id))
    expandSelectedLocationId(props.selectedRoute.to).forEach(id => active.add(id))
  } else if (props.selectedPort) {
    expandSelectedLocationId(props.selectedPort).forEach(id => active.add(id))
  }
  return active
}

const getMarkerStyle = (location: MapLocationPoint, isActive: boolean) => {
  if (location.type === 'STOP') {
    return {
      radius: isActive ? 8 : 5,
      fillColor: isActive ? '#4F46E5' : '#A5B4FC',
      color: isActive ? '#3730A3' : '#6366F1',
      weight: isActive ? 2 : 1,
      fillOpacity: isActive ? 1 : 0.9,
      opacity: 1
    }
  }

  return {
    radius: isActive ? 8 : 6,
    fillColor: isActive ? '#2563EB' : '#9CA3AF',
    color: isActive ? '#1D4ED8' : '#6B7280',
    weight: isActive ? 2 : 1,
    fillOpacity: 1,
    opacity: 1
  }
}

const updateAllMarkerStyles = () => {
  if (!map || markers.value.size === 0) return

  const activeIds = getActiveLocationIds()

  markers.value.forEach((record, id) => {
    const isActive = activeIds.has(id)
    record.marker.setStyle(getMarkerStyle(record.location, isActive))
    if (isActive) {
      record.marker.bringToFront?.()
    }
    setMarkerLabelVisibility(id, isActive)
  })
}

const syncLocationMarkers = () => {
  if (!map || !L) return

  const nextIds = new Set(mapLocations.value.map(location => location.id))
  markers.value.forEach(({ marker }, id) => {
    if (nextIds.has(id)) return
    try {
      marker.remove?.()
    } catch {
      // noop
    }
    markers.value.delete(id)
  })

  mapLocations.value.forEach(location => {
    if (markers.value.has(location.id)) return

    const marker = L.circleMarker(
      [location.location.lat, location.location.lng],
      getMarkerStyle(location, false)
    ).addTo(map)

    marker.on('click', () => {
      openLocationDetails(location)
    })

    if (location.type === 'STOP') {
      marker.bindPopup(createBusStopPopupHtml(location))
      bindStopPopupActions(marker, location)
    }

    markers.value.set(location.id, {
      marker,
      location,
      labelVisible: false
    })
  })

  updateAllMarkerStyles()
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
  const fromLocation = getMapLocationById(fromId)
  const toLocation = getMapLocationById(toId)
  if (!fromLocation || !toLocation) return []
  return [
    { ...fromLocation.location },
    { ...toLocation.location }
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

    const fromCandidates = expandSelectedLocationId(segment.from)
    const toCandidates = expandSelectedLocationId(segment.to)
    fromCandidates.forEach((fromId) => {
      toCandidates.forEach((toId) => {
        const fallbackPath = buildFallbackPath(fromId, toId)
        if (fallbackPath.length === 0) return
        addRouteLayer(fallbackPath, undefined, undefined, {
          color: props.transportMode === 'BUS' ? '#4F46E5' : '#64748B',
          opacity: props.transportMode === 'BUS' ? 0.72 : 0.55,
          weight: props.transportMode === 'BUS' ? 4 : 3,
          dashArray: props.transportMode === 'BUS' ? '8 6' : '7 7'
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
  if (props.transportMode === 'BUS') {
    const fallbackPath = buildFallbackPath(selectedRoute.from, selectedRoute.to)
    if (fallbackPath.length === 0) return
    addRouteLayer(fallbackPath, undefined, undefined, {
      color: '#4F46E5',
      opacity: 0.72,
      weight: 4,
      dashArray: '8 6'
    })
    bounds.extend(toLatLngBounds(fallbackPath))
    fitBoundsWithUiPadding(bounds)
    return
  }

  const selectedRoutes = findRoutesForSelection(routesFromStorage.value, selectedRoute)

  if (selectedRoutes.length > 0) {
    selectedRoutes.forEach((route) => {
      addRouteLayer(route.path, route, { from: route.from, to: route.to })
      bounds.extend(toLatLngBounds(route.path))
    })
    fitBoundsWithUiPadding(bounds)
    return
  }

  const fromCandidates = expandSelectedLocationId(selectedRoute.from)
  const toCandidates = expandSelectedLocationId(selectedRoute.to)
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
      focusLocation(props.selectedRoute.from)
    } else {
      drawSelectedRoutes(props.selectedRoute)
    }
  } else {
    focusAllLocations()
  }

  updateAllMarkerStyles()
  invalidateMapSize()
}

const focusLocation = (locationId: string) => {
  if (!map || !L) return

  const locationIds = expandSelectedLocationId(locationId)
  const points = locationIds
    .map(id => getMapLocationById(id))
    .filter((location): location is MapLocationPoint => !!location)

  if (points.length === 0) return

  if (points.length === 1) {
    const point = points[0]
    if (!point) return
    map.setView([point.location.lat, point.location.lng], props.transportMode === 'BUS' ? 14 : 12, { animate: false })
  } else {
    const bounds = L.latLngBounds(points.map(location => [location.location.lat, location.location.lng]))
    fitBoundsWithUiPadding(bounds)
  }
}

const focusAllLocations = () => {
  if (!map || !L) return

  const points = mapLocations.value
  if (points.length === 0) return

  const bounds = L.latLngBounds(points.map(location => [location.location.lat, location.location.lng]))
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

    teardownTouchGuard?.()
    teardownTouchGuard = installLeafletTwoFingerTouchGuard({
      map,
      container: map.getContainer?.() ?? mapContainer.value,
      onSingleTouchMove: revealTouchHint
    })

    syncLocationMarkers()
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
    focusLocation(portId)
  }
  updateAllMarkerStyles()
})

watch(() => props.selectedRoute, () => {
  renderActiveRoute()
})

watch(() => props.selectedRouteSegments, () => {
  renderActiveRoute()
}, { deep: true })

watch([() => props.transportMode, () => props.busStops], () => {
  if (!map) return
  syncLocationMarkers()
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
  teardownTouchGuard?.()
  teardownTouchGuard = null
  clearTouchHintTimer()
  showTouchHint.value = false
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
  z-index: 0;
  isolation: isolate;
}

.map-container {
  position: relative;
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

.map-touch-hint {
  position: absolute;
  left: 50%;
  bottom: 0.75rem;
  z-index: 450;
  transform: translateX(-50%);
  max-width: calc(100% - 1.5rem);
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
  font-size: 0.75rem;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2);
  pointer-events: none;
}

@media (pointer: coarse) {
  .map-container :deep(.leaflet-container) {
    touch-action: pan-x pan-y;
  }
}

.map-container :deep(.leaflet-control-attribution) {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.92);
}

.map-container :deep(.ferry-map-stop-popup) {
  min-width: 180px;
  color: #0f172a;
}

.map-container :deep(.ferry-map-stop-popup__title) {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.map-container :deep(.ferry-map-stop-popup__list) {
  display: grid;
  gap: 5px;
  margin: 0;
}

.map-container :deep(.ferry-map-stop-popup__row) {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  line-height: 1.35;
}

.map-container :deep(.ferry-map-stop-popup__row dt) {
  color: #64748b;
  font-weight: 600;
}

.map-container :deep(.ferry-map-stop-popup__row dd) {
  margin: 0;
  color: #0f172a;
  overflow-wrap: anywhere;
}

.map-container :deep(.ferry-map-stop-popup__actions) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 10px;
}

.map-container :deep(.ferry-map-stop-popup__button) {
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}

.map-container :deep(.ferry-map-stop-popup__button:hover) {
  background: #f8fafc;
}

.map-container :deep(.ferry-map-stop-popup__button--primary) {
  border-color: #0f5bb8;
  background: #0f5bb8;
  color: #ffffff;
}

.map-container :deep(.ferry-map-stop-popup__button--primary:hover) {
  background: #0b4fa3;
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
  padding: 0;
}

.map-container :deep(.ferry-map-port-label__button) {
  display: block;
  padding: 4px 10px;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}

.map-container :deep(.ferry-map-port-label__button:focus-visible) {
  outline: 2px solid currentColor;
  outline-offset: 2px;
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

.map-container :deep(.ferry-map-port-label--bus-stop) {
  background: #eef2ff;
  color: #3730a3;
  border-color: #c7d2fe;
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
