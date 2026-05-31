<template>
  <div class="port-leaflet-root" :data-port-id="portId">
    <div v-if="points.length === 0" class="p-4 text-sm text-gray-600 dark:text-gray-300">
      {{ fallbackText }}
    </div>
    <div v-else class="port-leaflet-map-shell">
      <div v-if="routeFilterOptions.length > 1" class="bus-route-filter" aria-label="路線フィルタ">
        <button
          type="button"
          class="bus-route-filter-button"
          :class="{ 'is-active': selectedBusRouteTitle === '' }"
          @click="selectedBusRouteTitle = ''"
        >
          {{ $t('ALL') }}
        </button>
        <button
          v-for="routeTitle in routeFilterOptions"
          :key="routeTitle"
          type="button"
          class="bus-route-filter-button"
          :class="{ 'is-active': selectedBusRouteTitle === routeTitle }"
          @click="selectedBusRouteTitle = routeTitle"
        >
          {{ routeTitle }}
        </button>
      </div>
      <div ref="mapEl" class="port-leaflet-map" />
      <div
        v-if="showTouchHint"
        class="port-leaflet-touch-hint"
        role="status"
        aria-live="polite"
      >
        {{ $t('map.touchHint') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { PORTS_DATA } from '~/data/ports'
import { ensureLeafletLoaded } from '@/utils/leafletLoader'
import { installLeafletTwoFingerTouchGuard } from '@/utils/leafletTouchGuard'
import { getBusFeedIdForStopCode, loadBusSearchFeed } from '@/utils/gtfsBusTimetable'

type MarkerPoint = { id: string; title: string; lat: number; lng: number }
type BusRoutePattern = {
  id: string
  title: string
  points: MarkerPoint[]
}

interface Props {
  portId?: string
  title?: string
  zoom?: number
  focus?: {
    lat: number
    lng: number
    title?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 16,
  portId: undefined,
  title: undefined,
  focus: undefined
})

const mapEl = ref<HTMLDivElement | null>(null)
const showTouchHint = ref(false)
let map: any | null = null
let markerById: Map<string, any> | null = null
let routeLayers: any[] = []
let teardownTouchGuard: (() => void) | null = null
let touchHintTimer: number | null = null
const isFiniteCoord = (value: unknown) => Number.isFinite(Number(value))
const busRoutePatterns = ref<BusRoutePattern[]>([])
const selectedBusStopId = computed(() => (isBusStopId.value ? props.portId : undefined))
const selectedBusRouteTitle = ref('')

const routeFilterOptions = computed(() => {
  return Array.from(new Set(busRoutePatterns.value.map(pattern => pattern.title).filter(Boolean)))
})

const visibleBusRoutePatterns = computed(() => {
  if (!selectedBusRouteTitle.value) return busRoutePatterns.value
  return busRoutePatterns.value.filter(pattern => pattern.title === selectedBusRouteTitle.value)
})

const clearTouchHintTimer = () => {
  if (!touchHintTimer) return
  window.clearTimeout(touchHintTimer)
  touchHintTimer = null
}

const revealTouchHint = () => {
  showTouchHint.value = true
  clearTouchHintTimer()
  touchHintTimer = window.setTimeout(() => {
    showTouchHint.value = false
    touchHintTimer = null
  }, 1600)
}

const uniqueByCoordinate = (list: MarkerPoint[]): MarkerPoint[] => {
  const seen = new Set<string>()
  const unique: MarkerPoint[] = []
  for (const point of list) {
    const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`
    if (seen.has(key)) {
      if (point.id === selectedBusStopId.value) {
        const duplicateIndex = unique.findIndex(item => `${item.lat.toFixed(6)},${item.lng.toFixed(6)}` === key)
        if (duplicateIndex >= 0) unique.splice(duplicateIndex, 1, point)
      }
      continue
    }
    seen.add(key)
    unique.push(point)
  }
  return unique
}

const points = computed<MarkerPoint[]>(() => {
  if (isBusStopId.value) {
    return uniqueByCoordinate(visibleBusRoutePatterns.value.flatMap(pattern => pattern.points))
  }

  // 乗り場など、明示的なフォーカス座標が来たらそれを優先（=ピンを移動）
  if (props.focus && isFiniteCoord(props.focus.lat) && isFiniteCoord(props.focus.lng)) {
    return [
      {
        id: 'FOCUS',
        title: String(props.focus.title || props.title || props.portId || ''),
        lat: Number(props.focus.lat),
        lng: Number(props.focus.lng)
      }
    ]
  }

  const id = props.portId
  if (!id) return []

  const port = (PORTS_DATA as any)?.[id]
  const boardingPoints: MarkerPoint[] = Array.isArray(port?.boarding)
    ? port.boarding
      .map((item: any, idx: number) => {
        const lat = item?.location?.lat
        const lng = item?.location?.lng
        if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) return null
        return {
          id: `${id}-BOARDING-${idx}`,
          title: String(item?.labelJa || item?.labelEn || item?.placeJa || item?.placeEn || port?.name || id),
          lat: Number(lat),
          lng: Number(lng)
        }
      })
      .filter((point: MarkerPoint | null): point is MarkerPoint => point !== null)
    : []
  if (boardingPoints.length > 0) {
    return uniqueByCoordinate(boardingPoints)
  }

  // 乗り場情報がない港は港座標を表示
  if (isFiniteCoord(port?.location?.lat) && isFiniteCoord(port?.location?.lng)) {
    const title = String(props.title || port?.name || port?.nameEn || id)
    return [{ id, title, lat: Number(port.location.lat), lng: Number(port.location.lng) }]
  }

  // 互換: HONDO（本土）など、location を持たない ID は代表地点/複数港へ
  if (id === 'HONDO') {
    const shichirui = (PORTS_DATA as any)?.HONDO_SHICHIRUI
    const sakaiminato = (PORTS_DATA as any)?.HONDO_SAKAIMINATO
    const list: MarkerPoint[] = []
    if (isFiniteCoord(shichirui?.location?.lat) && isFiniteCoord(shichirui?.location?.lng)) {
      list.push({
        id: 'HONDO_SHICHIRUI',
        title: String(shichirui?.name || shichirui?.nameEn || 'HONDO_SHICHIRUI'),
        lat: Number(shichirui.location.lat),
        lng: Number(shichirui.location.lng)
      })
    }
    if (isFiniteCoord(sakaiminato?.location?.lat) && isFiniteCoord(sakaiminato?.location?.lng)) {
      list.push({
        id: 'HONDO_SAKAIMINATO',
        title: String(sakaiminato?.name || sakaiminato?.nameEn || 'HONDO_SAKAIMINATO'),
        lat: Number(sakaiminato.location.lat),
        lng: Number(sakaiminato.location.lng)
      })
    }
    return list
  }

  return []
})

const fallbackText = computed(() => {
  if (!props.portId) return '港情報が指定されていません。'
  if (isBusStopId.value) return 'この停留所を含む路線の地図情報が見つかりませんでした。'
  return 'この港の地図情報が見つかりませんでした。'
})

const isBusStopId = computed(() => typeof props.portId === 'string' && props.portId.startsWith('BUS_'))

const loadBusRoutePatterns = async () => {
  const stopId = props.portId
  if (!stopId || !isBusStopId.value) {
    busRoutePatterns.value = []
    return
  }

  const feedId = getBusFeedIdForStopCode(stopId)
  if (!feedId) {
    busRoutePatterns.value = []
    return
  }

  try {
    const feed = await loadBusSearchFeed(feedId)
    const stopLocationByCode = new Map(
      (feed.stops || [])
        .map(([code, name, latValue, lngValue]) => {
          const lat = Number(latValue)
          const lng = Number(lngValue)
          if (!code || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
          return [code, { id: code, title: name || code, lat, lng }] as const
        })
        .filter((item): item is readonly [string, MarkerPoint] => item !== null)
    )

    const patterns: BusRoutePattern[] = []
    const seen = new Set<string>()
    for (const trip of feed.trips || []) {
      if (!trip.stops?.some(([code]) => code === stopId)) continue

      const routePoints = trip.stops
        .map(([code]) => stopLocationByCode.get(code))
        .filter((point): point is MarkerPoint => Boolean(point))

      if (routePoints.length === 0) continue

      const patternKey = `${trip.routeId}|${routePoints.map(point => point.id).join('>')}`
      if (seen.has(patternKey)) continue
      seen.add(patternKey)

      const route = feed.routes?.[trip.routeId]
      patterns.push({
        id: patternKey,
        title: route?.shortName || route?.longName || trip.shortName || trip.headsign || trip.routeId,
        points: routePoints
      })
    }

    busRoutePatterns.value = patterns
  } catch {
    busRoutePatterns.value = []
  }
}

const clearRouteLayers = () => {
  for (const layer of routeLayers) {
    try {
      layer.remove?.()
    } catch {
      // noop
    }
  }
  routeLayers = []
}

const createOrUpdateMap = async () => {
  if (!mapEl.value) return
  if (points.value.length === 0) return

  const L = await ensureLeafletLoaded()
  const defaultMarkerIcon = new L.Icon.Default()
  const selectedBusStopIcon = L.divIcon({
    className: 'selected-bus-stop-marker',
    html: '<span></span>',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36]
  })

  // Create
  if (!map) {
    map = L.map(mapEl.value, {
      zoomControl: true,
      attributionControl: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    teardownTouchGuard?.()
    teardownTouchGuard = installLeafletTwoFingerTouchGuard({
      map,
      container: map.getContainer?.() ?? mapEl.value,
      onSingleTouchMove: revealTouchHint
    })

    markerById = new Map()
  }

  if (!markerById) markerById = new Map()

  // Remove stale markers
  const nextIds = new Set(points.value.map(p => p.id))
  for (const [id, mk] of Array.from(markerById.entries())) {
    if (!nextIds.has(id)) {
      try {
        mk.remove?.()
      } catch {
        // noop
      }
      markerById.delete(id)
    }
  }

  // Add/update markers
  for (const p of points.value) {
    const markerIcon = p.id === selectedBusStopId.value ? selectedBusStopIcon : defaultMarkerIcon
    const existing = markerById.get(p.id)
    if (existing) {
      existing.setLatLng([p.lat, p.lng])
      existing.setIcon?.(markerIcon)
    } else {
      const mk = L.marker([p.lat, p.lng], { icon: markerIcon }).addTo(map)
      if (p.title) mk.bindPopup(p.title)
      markerById.set(p.id, mk)
    }
  }

  clearRouteLayers()
  const palette = ['#0b5cad', '#d97706', '#059669', '#7c3aed', '#dc2626']
  visibleBusRoutePatterns.value.forEach((pattern, index) => {
    if (pattern.points.length < 2) return
    const color = palette[index % palette.length]
    const polyline = L.polyline(
      pattern.points.map(point => [point.lat, point.lng]),
      {
        color,
        weight: 4,
        opacity: 0.85
      }
    ).addTo(map)
    if (pattern.title) {
      polyline.bindTooltip(pattern.title, {
        sticky: true,
        direction: 'top'
      })
    }
    routeLayers.push(polyline)
  })

  // Update view
  if (visibleBusRoutePatterns.value.length > 0) {
    const bounds = L.latLngBounds(points.value.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [32, 32] })
  } else if (points.value.length === 1) {
    const p = points.value[0]
    if (!p) return
    map.setView([p.lat, p.lng], props.zoom, { animate: false })
  } else {
    const bounds = L.latLngBounds(points.value.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [24, 24] })
  }
}

onMounted(async () => {
  await loadBusRoutePatterns()
  await createOrUpdateMap()
})

watch([() => props.portId, () => props.zoom], async () => {
  selectedBusRouteTitle.value = ''
  await loadBusRoutePatterns()
  await createOrUpdateMap()
})

watch(selectedBusRouteTitle, async () => {
  await createOrUpdateMap()
})

watch(
  () => `${props.focus?.lat ?? ''},${props.focus?.lng ?? ''}`,
  async () => {
    await createOrUpdateMap()
  }
)

onUnmounted(() => {
  teardownTouchGuard?.()
  teardownTouchGuard = null
  clearTouchHintTimer()
  showTouchHint.value = false
  try {
    map?.remove?.()
  } catch {
    // noop
  }
  clearRouteLayers()
  map = null
  markerById = null
})
</script>

<style scoped>
.port-leaflet-root {
  position: absolute;
  inset: 0;
}

.port-leaflet-map {
  position: absolute;
  inset: 0;
}

.port-leaflet-map-shell {
  position: absolute;
  inset: 0;
}

.bus-route-filter {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  left: 3.5rem;
  z-index: 500;
  display: flex;
  gap: 0.375rem;
  overflow-x: auto;
  padding: 0.25rem;
  border: 1px solid rgba(148, 163, 184, 0.42);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(8px);
}

.bus-route-filter-button {
  flex: 0 0 auto;
  min-height: 2rem;
  padding: 0.25rem 0.625rem;
  border: 1px solid rgba(11, 92, 173, 0.28);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.bus-route-filter-button:hover {
  background: #eff6ff;
}

.bus-route-filter-button.is-active {
  border-color: #0b5cad;
  background: #0b5cad;
  color: #ffffff;
}

/* Leaflet が生成する要素のサイズを強制 */
.port-leaflet-map :deep(.leaflet-container) {
  width: 100%;
  height: 100%;
}

.port-leaflet-touch-hint {
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

.port-leaflet-map :deep(.selected-bus-stop-marker) {
  background: transparent;
  border: 0;
}

.port-leaflet-map :deep(.selected-bus-stop-marker span) {
  position: relative;
  display: block;
  width: 28px;
  height: 28px;
  border: 3px solid #ffffff;
  border-radius: 50% 50% 50% 0;
  background: #dc2626;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.28);
  transform: rotate(-45deg);
}

.port-leaflet-map :deep(.selected-bus-stop-marker span::after) {
  position: absolute;
  top: 7px;
  left: 7px;
  width: 8px;
  height: 8px;
  content: '';
  border-radius: 9999px;
  background: #ffffff;
}

@media (pointer: coarse) {
  .bus-route-filter {
    right: 0.5rem;
    left: 3.25rem;
  }

  .port-leaflet-map :deep(.leaflet-container) {
    touch-action: pan-x pan-y;
  }
}
</style>
