<template>
  <div class="ferry-map-container">
    <div v-if="!isMapEnabled" class="map-disabled-notice">
      <Icon name="heroicons:map" class="w-8 h-8 text-gray-400" />
      <p>{{ $t('map.disabled') }}</p>
      <button
        @click="enableMap"
        class="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-700"
      >
        {{ $t('map.enable') }}
      </button>
    </div>
    <div v-else-if="!GOOGLE_MAPS_API_KEY && isMapEnabled" class="map-disabled-notice">
      <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 text-yellow-500" />
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('map.apiKeyMissing') }}</p>
    </div>
    <div
      v-show="isMapEnabled && GOOGLE_MAPS_API_KEY"
      ref="mapContainer"
      class="map-container"
      :class="{ 'loading': isLoading }"
    />
    <div v-if="isLoading && isMapEnabled" class="map-loading">
      <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin" />
    </div>

    <!-- Port Details Modal (unified with timetable popup) -->
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
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { Loader } from '@googlemaps/js-api-loader'
import { PORTS_DATA, ROUTES_DATA } from '~/data/ports'
import CommonShipModal from '~/components/common/ShipModal.vue'
import type { Port } from '~/types'
import type { RouteData, RoutePoint, RoutesDataFile } from '~/types/route'
import { getJSONData } from '~/composables/useDataPublish'
import { createLogger } from '~/utils/logger'
import { getGoogleMapsLocaleOptions } from '~/utils/googleMapsLocale'

// Props
type RouteSegment = { from: string; to: string; ship?: string }

interface Props {
  selectedPort?: string
  selectedRoute?: { from: string; to: string }
  selectedRouteSegments?: RouteSegment[]
  showPortDetails?: boolean
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
  showPortDetails: true
})

const logger = createLogger('FerryMap')

// Emits
const emit = defineEmits<{
  portClick: [port: Port]
  routeSelect: [route: { from: string; to: string }]
}>()

// Composables
const { $i18n } = useNuxtApp()
const settingsStore = useSettingsStore()

// State
const mapContainer = ref<HTMLElement>()
const map = ref<google.maps.Map>()
const markers = ref<Map<string, google.maps.Marker>>(new Map())
const polylines = ref<google.maps.Polyline[]>([])
const allPolylines = new Set<google.maps.Polyline>()
const mapListeners: google.maps.MapsEventListener[] = []
const infoWindow = ref<google.maps.InfoWindow>()
const isLoading = ref(false)
const showPortModal = ref(false)
const modalPortId = ref<string>('')
const modalPortZoom = computed<number>(() => {
  const id = modalPortId.value
  if (!id) return 15
  return id === 'BEPPU' ? 17
    : id === 'HISHIURA' ? 18
    : id === 'KURI' ? 18
    : 15
})
const modalPortTitle = computed(() => {
  return modalPortId.value ? String($i18n.t(modalPortId.value)) : ''
})
const routesFromStorage = ref<RouteData[]>([])
const labelOverlays = ref<Map<string, any>>(new Map())

// 地図のfitBoundsにUIを考慮した余白を適用
const fitBoundsWithUiPadding = (bounds: google.maps.LatLngBounds) => {
  if (!map.value) return
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const padding: any = {
    top: 80,
    right: 110,
    bottom: isMobile ? 190 : 130, // モバイルではボトムナビ分を多めに確保
    left: 110
  }
  map.value.fitBounds(bounds, padding)
}

const detachPolyline = (polyline: google.maps.Polyline) => {
  try {
    polyline.setMap(null)
  } catch {}
  if (typeof window !== 'undefined') {
    const g: any = (window as any).google
    g?.maps?.event?.clearInstanceListeners(polyline)
  }
  allPolylines.delete(polyline)
}

const syncActivePolylineCache = () => {
  polylines.value = polylines.value.filter(polyline => allPolylines.has(polyline))
}

const ensureOnlySelectedRouteVisible = () => {
  const segments = (props.selectedRouteSegments || []).filter(seg => seg.from && seg.to)
  const hasSegments = segments.length > 0
  const selected = props.selectedRoute

  if (!selected && !hasSegments) {
    for (const polyline of Array.from(allPolylines)) {
      detachPolyline(polyline)
    }
    polylines.value = []
    return
  }

  const isNearPort = (point: google.maps.LatLng, portId: string) => {
    const port = PORTS_DATA[portId]
    if (!port) return false
    return (
      Math.abs(point.lat() - port.location.lat) < 0.001 &&
      Math.abs(point.lng() - port.location.lng) < 0.001
    )
  }

  const matchesSelectedRoute = (route: RouteData): boolean => {
    if (!selected) return false
    const fromCandidates = expandMainland(selected.from)
    const toCandidates = expandMainland(selected.to)
    return fromCandidates.includes(route.from) && toCandidates.includes(route.to)
  }

  const matchesSelectedSegment = (segment: { from: string; to: string }): boolean => {
    return segments.some(candidate => {
      const fromCandidates = expandMainland(candidate.from)
      const toCandidates = expandMainland(candidate.to)
      return fromCandidates.includes(segment.from) && toCandidates.includes(segment.to)
    })
  }

  const matchesPolylineWithoutMetadata = (polyline: google.maps.Polyline): boolean => {
    const path = polyline.getPath()
    if (!path || path.getLength() < 2) return false

    const start = path.getAt(0)
    const end = path.getAt(path.getLength() - 1)
    if (!start || !end) return false

    if (hasSegments) {
      return segments.some(candidate => {
        const fromCandidates = expandMainland(candidate.from)
        const toCandidates = expandMainland(candidate.to)
        return fromCandidates.some(fromId => isNearPort(start, fromId)) &&
          toCandidates.some(toId => isNearPort(end, toId))
      })
    }

    if (!selected) return false
    const fromCandidates = expandMainland(selected.from)
    const toCandidates = expandMainland(selected.to)
    return fromCandidates.some(fromId => isNearPort(start, fromId)) &&
      toCandidates.some(toId => isNearPort(end, toId))
  }

  for (const polyline of Array.from(allPolylines)) {
    const routeData = (polyline as any).routeData as RouteData | undefined
    const routeSegment = (polyline as any).routeSegment as { from: string; to: string } | undefined
    const isMatch = routeSegment
      ? matchesSelectedSegment(routeSegment)
      : routeData
        ? (hasSegments ? matchesSelectedSegment({ from: routeData.from, to: routeData.to }) : matchesSelectedRoute(routeData))
        : matchesPolylineWithoutMetadata(polyline)
    if (!isMatch) {
      detachPolyline(polyline)
    } else if (map.value && polyline.getMap() !== map.value) {
      polyline.setMap(map.value)
    }
  }
  syncActivePolylineCache()
}

const registerPolyline = (polyline: google.maps.Polyline, route?: RouteData, segment?: RouteSegment) => {
  if (route) {
    ;(polyline as any).routeData = route
  }
  if (segment) {
    ;(polyline as any).routeSegment = { from: segment.from, to: segment.to }
  }
  polylines.value.push(polyline)
  allPolylines.add(polyline)
}

const resetRouteOverlays = () => {
  if (directionsRenderer.value) {
    try { directionsRenderer.value.setMap(null) } catch {}
  }
  polylines.value.forEach(detachPolyline)
  polylines.value = []
}

// Computed
const isMapEnabled = computed(() => settingsStore.mapEnabled)
const currentLocale = computed(() => $i18n.locale.value)
const googleMapsLocaleOptions = computed(() => getGoogleMapsLocaleOptions(currentLocale.value))

// Google Maps APIキー（環境変数から取得）
const GOOGLE_MAPS_API_KEY = useRuntimeConfig().public.googleMapsApiKey || ''

// Directions Service
const directionsService = ref<google.maps.DirectionsService>()
const directionsRenderer = ref<google.maps.DirectionsRenderer>()

// Methods
const enableMap = () => {
  settingsStore.setMapEnabled(true)
}

const closePortModal = () => {
  showPortModal.value = false
  modalPortId.value = ''
}

// Firebase Storageから航路データを取得
const loadRoutesFromStorage = async () => {
  try {
    const data = await getJSONData<RoutesDataFile>('routes/ferry-routes.json')
    if (data && data.routes) {
      routesFromStorage.value = data.routes
      logger.info(`Loaded ${data.routes.length} routes from Firebase Storage (v${data.metadata.version})`)
      return true
    }
  } catch (error) {
    logger.warn('No route data found in Firebase Storage, using fallback routes')
  }
  return false
}

const initializeMap = async () => {
  if (!mapContainer.value) return

  // APIキーがない場合は警告を表示
  if (!GOOGLE_MAPS_API_KEY) {
    logger.warn('Google Maps API key is not configured. Map features will be limited.')
    isLoading.value = false
    return
  }

  isLoading.value = true

  try {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'marker', 'geometry', 'routes'],
      mapIds: ['ca20a2dbd2ddb20bccb48876'],
      language: googleMapsLocaleOptions.value.language,
      region: googleMapsLocaleOptions.value.region
    })

    const google = await loader.load()

    // 地図の初期化
    map.value = new google.maps.Map(mapContainer.value, {
      center: { lat: 36.2, lng: 133.05 }, // 隠岐諸島の中心付近
      zoom: 10,
      mapId: 'ca20a2dbd2ddb20bccb48876', // カスタムマップID
      // mapIdを使用する場合、stylesはGoogle Cloud Consoleで管理される
      // モバイル向けのオプション
      gestureHandling: 'greedy',
      fullscreenControl: true,
      zoomControl: true,
      // 「地図 / 航空写真」切り替え（MapTypeControl）を非表示
      mapTypeControl: false,
      streetViewControl: false
    })

    // InfoWindow初期化
    infoWindow.value = new google.maps.InfoWindow()

    // Directions Service初期化
    directionsService.value = new google.maps.DirectionsService()
    directionsRenderer.value = new google.maps.DirectionsRenderer({
      map: map.value,
      suppressMarkers: true, // デフォルトマーカーを非表示
      polylineOptions: {
        strokeColor: '#4682B4',
        strokeWeight: 3,
        strokeOpacity: 0.7
      }
    })

    const zoomListener = map.value.addListener('zoom_changed', () => {
      ensureOnlySelectedRouteVisible()
    })
    mapListeners.push(zoomListener)

    // 港のマーカーを追加
    addPortMarkers()
    // 初期の選択状態に応じてマーカーの見た目を更新
    updateAllMarkerStyles()
    
    // Firebase Storageから航路データを読み込み
    await loadRoutesFromStorage()
    logger.debug('init selectedRoute', props.selectedRoute)
    // 現在の選択状態に合わせて描画（未選択なら消去）
    renderActiveRoute()

    isLoading.value = false
  } catch (error) {
    logger.error('Failed to load Google Maps', error)
    isLoading.value = false
  }
}

// 現在の選択状態に合わせて再描画
const renderActiveRoute = () => {
  if (!map.value) return
  resetRouteOverlays()
  if (infoWindow.value) {
    try { infoWindow.value.close() } catch {}
  }

  logger.debug('renderActiveRoute', {
    selectedRoute: props.selectedRoute,
    selectedRouteSegments: props.selectedRouteSegments?.length || 0,
    storageRoutes: routesFromStorage.value.length
  })
  if (props.selectedRouteSegments && props.selectedRouteSegments.length > 0) {
    const drawn = drawRouteSegmentsFromStorage(props.selectedRouteSegments)
    logger.debug('drawRouteSegmentsFromStorage drawn', drawn)
    if (!drawn) {
      logger.warn('Storage route not found for selected segments; drawing fallback lines')
    }
  } else if (props.selectedRoute) {
    // 出発地と目的地が同じ場合はルートを表示せず、当該港へズーム
    if (props.selectedRoute.from === props.selectedRoute.to) {
      focusPort(props.selectedRoute.from)
      ensureOnlySelectedRouteVisible()
      return
    }
    // ストレージに存在するルートのみ描画（フォールバックは行わない）
    const drawn = drawRoutesFromStorage()
    logger.debug('drawRoutesFromStorage drawn', drawn)
    if (!drawn) {
      logger.warn('Storage route not found; skipping fallback rendering')
    }
  } else {
    // 未選択なら非表示のまま
  }
  ensureOnlySelectedRouteVisible()
  // ルートに応じたマーカー強調を更新
  updateAllMarkerStyles()
}

const getRouteLineStyle = (route: RouteData) => {
  switch (route.source) {
    case 'google_transit':
      return { strokeColor: '#2E7D32', strokeOpacity: 0.8, strokeWeight: 3 }
    case 'google_driving':
      return { strokeColor: '#FF8C00', strokeOpacity: 0.6, strokeWeight: 2, dashArray: [10, 5] }
    case 'manual':
      return { strokeColor: '#4682B4', strokeOpacity: 0.7, strokeWeight: 2 }
    default:
      return { strokeColor: '#666666', strokeOpacity: 0.5, strokeWeight: 2, dashArray: [5, 5] }
  }
}

const createRoutePolyline = (route: RouteData, pathOverride?: RoutePoint[]) => {
  const { strokeColor, strokeOpacity, strokeWeight, dashArray } = getRouteLineStyle(route)
  const path = pathOverride || route.path
  return new google.maps.Polyline({
    path,
    geodesic: route.geodesic !== false,
    strokeColor,
    strokeOpacity,
    strokeWeight,
    zIndex: 5,
    strokeDasharray: dashArray,
    icons: [{
      icon: {
        path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
        scale: 2,
        strokeColor,
        strokeOpacity
      },
      offset: '50%'
    }],
    map: map.value
  })
}

const drawRouteSegmentsFromStorage = (segments: RouteSegment[]): boolean => {
  if (!map.value) return false
  const bounds = new google.maps.LatLngBounds()
  let drew = false

  segments.forEach(segment => {
    const fromCandidates = expandMainland(segment.from)
    const toCandidates = expandMainland(segment.to)
    const directMatch = routesFromStorage.value.find(route =>
      fromCandidates.includes(route.from) && toCandidates.includes(route.to)
    )
    const reverseMatch = !directMatch
      ? routesFromStorage.value.find(route =>
        fromCandidates.includes(route.to) && toCandidates.includes(route.from)
      )
      : undefined

    if (directMatch || reverseMatch) {
      const route = directMatch || reverseMatch!
      const path = reverseMatch ? [...route.path].reverse() : route.path
      const polyline = createRoutePolyline(route, path)
      registerPolyline(polyline, route, segment)
      path.forEach(pt => bounds.extend(pt as any))
      drew = true
      return
    }

    const fromPort = fromCandidates.map(id => PORTS_DATA[id]).find(Boolean)
    const toPort = toCandidates.map(id => PORTS_DATA[id]).find(Boolean)
    if (fromPort && toPort) {
      bounds.extend(fromPort.location as any)
      bounds.extend(toPort.location as any)
    }
  })

  if (drew && map.value) {
    fitBoundsWithUiPadding(bounds)
  }
  return drew
}

const addPortMarkers = () => {
  if (!map.value || !window.google) return

  logger.debug('Adding port markers')
  
  Object.values(PORTS_DATA).forEach(port => {
    // デフォルト（非アクティブ）のスタイルでマーカーを作成
    const marker = new google.maps.Marker({
      position: port.location,
      map: map.value,
      title: currentLocale.value === 'ja' ? port.name : port.nameEn,
      icon: getMarkerIcon(false),
      zIndex: 1
    })

    // クリックイベント
    marker.addListener('click', () => {
      if (props.showPortDetails) {
        modalPortId.value = port.id
        showPortModal.value = true
      }
      emit('portClick', port)
    })

    markers.value.set(port.id, marker)
    logger.debug('Marker added', {
      id: port.id,
      lat: port.location.lat,
      lng: port.location.lng
    })
  })
}

// 'HONDO' を本土2港に展開
const expandMainland = (id: string): string[] => {
  return id === 'HONDO' ? ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'] : [id]
}

// 選択状態に応じてアクティブな港ID集合を取得
const getActivePortIds = (): Set<string> => {
  const active = new Set<string>()
  if (props.selectedRouteSegments && props.selectedRouteSegments.length > 0) {
    props.selectedRouteSegments.forEach(segment => {
      expandMainland(segment.from).forEach(id => active.add(id))
      expandMainland(segment.to).forEach(id => active.add(id))
    })
  } else if (props.selectedRoute) {
    expandMainland(props.selectedRoute.from).forEach(id => active.add(id))
    expandMainland(props.selectedRoute.to).forEach(id => active.add(id))
  } else if (props.selectedPort) {
    expandMainland(props.selectedPort).forEach(id => active.add(id))
  }
  return active
}

// マーカー用のアイコン（アクティブ/非アクティブ）
const getMarkerIcon = (active: boolean): google.maps.Icon | google.maps.Symbol => {
  const googleAny: any = (window as any).google
  const SymbolPath = googleAny?.maps?.SymbolPath
  const base = {
    path: SymbolPath ? SymbolPath.CIRCLE : 0,
    scale: active ? 8 : 6,
    fillOpacity: 1,
    strokeWeight: active ? 2 : 1
  } as any
  if (active) {
    base.fillColor = '#2563EB' // blue-700
    base.strokeColor = '#1D4ED8' // blue-800
  } else {
    base.fillColor = '#9CA3AF' // gray-400
    base.strokeColor = '#6B7280' // gray-500
  }
  return base
}

// LabelOverlay のコンストラクタを遅延生成（SSR/未ロード時の参照を回避）
let LabelOverlayCtor: any | null = null
const ensureLabelOverlayCtor = (): any | null => {
  if (LabelOverlayCtor) return LabelOverlayCtor
  if (typeof window === 'undefined') return null
  const g: any = (window as any).google
  if (!g?.maps?.OverlayView) return null
  LabelOverlayCtor = class LabelOverlay extends g.maps.OverlayView {
    position: any
    text: string
    div: HTMLDivElement | null
    constructor(position: any, text: string) {
      super()
      this.position = position
      this.text = text
      this.div = null
    }
    onAdd() {
      const div = document.createElement('div')
      div.style.position = 'absolute'
      div.style.whiteSpace = 'nowrap'
      div.style.padding = '2px 6px'
      div.style.borderRadius = '6px'
      div.style.fontSize = '12px'
      div.style.lineHeight = '18px'
      div.style.color = '#111827'
      div.style.background = '#FFFFFF'
      div.style.border = '1px solid #E5E7EB'
      div.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)'
      div.style.pointerEvents = 'none'
      div.textContent = this.text
      this.div = div
      const panes = (this as any).getPanes()
      panes?.overlayLayer.appendChild(div)
    }
    draw() {
      if (!this.div) return
      const projection = (this as any).getProjection()
      const point = projection?.fromLatLngToDivPixel(this.position)
      if (point) {
        this.div.style.left = `${point.x + 10}px`
        this.div.style.top = `${point.y - 14}px`
      }
    }
    onRemove() {
      if (this.div && this.div.parentNode) {
        this.div.parentNode.removeChild(this.div)
      }
      this.div = null
    }
    setText(text: string) {
      this.text = text
      if (this.div) this.div.textContent = text
    }
    setPosition(position: any) {
      this.position = position
      this.draw()
    }
  }
  return LabelOverlayCtor
}

// ラベルの表示/更新
const showOrUpdateLabel = (portId: string) => {
  if (!map.value) return
  const port = PORTS_DATA[portId]
  if (!port) return
  const text = currentLocale.value === 'ja' ? port.name : port.nameEn
  const g: any = (window as any).google
  const pos = new g.maps.LatLng(port.location.lat, port.location.lng)

  const existing = labelOverlays.value.get(portId) as any
  if (existing) {
    existing.setText(text)
    existing.setPosition(pos)
    existing.draw()
    return
  }
  const Ctor = ensureLabelOverlayCtor()
  if (!Ctor) return
  const overlay = new Ctor(pos, text)
  overlay.setMap(map.value)
  labelOverlays.value.set(portId, overlay)
}

// ラベルの非表示
const hideLabel = (portId: string) => {
  const overlay = labelOverlays.value.get(portId) as any
  if (overlay) {
    overlay.setMap(null as any)
    labelOverlays.value.delete(portId)
  }
}

// すべてのマーカー/ラベルを選択状態に応じて更新
const updateAllMarkerStyles = () => {
  if (!map.value || markers.value.size === 0) return
  const activeIds = getActivePortIds()
  markers.value.forEach((marker, id) => {
    const isActive = activeIds.has(id)
    marker.setIcon(getMarkerIcon(isActive))
    marker.setZIndex(isActive ? 10 : 1)
    marker.setOpacity(isActive ? 1 : 0.85)
    if (isActive) {
      showOrUpdateLabel(id)
    } else {
      hideLabel(id)
    }
  })
}

// Firebase Storageから取得したデータで航路を描画
// 描画に成功したら true、該当ルートなし等で何も描画しなければ false を返す
const drawRoutesFromStorage = (): boolean => {
  if (!map.value || routesFromStorage.value.length === 0) return false

  // アクティブルートのみ描画（selectedRoute が指定されている場合）
  let targetRoutes: RouteData[] = []
  if (props.selectedRoute) {
    const sel = props.selectedRoute
    const expandSide = (id: string) =>
      id === 'HONDO' ? ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'] : [id]
    const fromCandidates = expandSide(sel.from)
    const toCandidates = expandSide(sel.to)

    const directMatches = routesFromStorage.value.filter(r =>
      fromCandidates.includes(r.from) && toCandidates.includes(r.to)
    )

    if (directMatches.length > 0) {
      targetRoutes = directMatches
    }
  }

  if (props.selectedRoute && targetRoutes.length === 0) {
    logger.debug('Storage has no target route', props.selectedRoute)
    // ストレージに該当ルートが存在しない
    return false
  }

  const bounds = new google.maps.LatLngBounds()
  let drew = false
  targetRoutes.forEach(route => {
    const { strokeColor, strokeOpacity, strokeWeight } = getRouteLineStyle(route)
    const polyline = createRoutePolyline(route)

    // マウスオーバーでハイライト
    polyline.addListener('mouseover', () => {
      polyline.setOptions({
        strokeWeight: strokeWeight + 1,
        strokeOpacity: Math.min(1, strokeOpacity + 0.2)
      })
      
      // 情報を表示
      if (infoWindow.value && map.value) {
        const midPoint = Math.floor(route.path.length / 2)
        infoWindow.value.setContent(`
          <div class="p-2">
            <strong>${route.fromName} → ${route.toName}</strong><br>
            <span class="text-sm text-gray-600">
              ${getSourceLabel(route.source)}<br>
              ${route.distance ? `距離: ${(route.distance / 1000).toFixed(1)} km<br>` : ''}
              ${route.duration ? `所要時間: ${Math.round(route.duration / 60)} 分` : ''}
            </span>
          </div>
        `)
        infoWindow.value.setPosition(route.path[midPoint])
        infoWindow.value.open(map.value)
      }
    })

    polyline.addListener('mouseout', () => {
      polyline.setOptions({
        strokeWeight,
        strokeOpacity
      })
      if (infoWindow.value) {
        infoWindow.value.close()
      }
    })

    // クリックイベント
    polyline.addListener('click', () => {
      emit('routeSelect', { from: route.from, to: route.to })
    })

    // メタデータをpolylineに保存
    registerPolyline(polyline, route)
    // Fit bounds
    route.path.forEach(pt => bounds.extend(pt as any))
    drew = true
  })

  if (drew && map.value) {
    fitBoundsWithUiPadding(bounds)
  }
  return drew
}

// ソースラベルを取得
const getSourceLabel = (source: string) => {
  switch (source) {
    case 'overpass_osm':
      return 'Overpass (OSM)'
    case 'google_transit':
      return 'Google Transit API'
    case 'google_driving':
      return 'Google Driving API'
    case 'manual':
      return '手動定義'
    case 'custom':
      return 'カスタム'
    default:
      return source
  }
}

const highlightRoute = (from: string, to: string) => {
  if (!map.value) return

  // すべてのpolylineをデフォルトスタイルに戻す
  polylines.value.forEach(polyline => {
    const routeData = (polyline as any).routeData
    
    if (routeData) {
      // Storage由来のデータがある場合
      let strokeColor: string
      let strokeOpacity: number
      let strokeWeight: number
      
      switch (routeData.source) {
        case 'google_transit':
          strokeColor = '#2E7D32'
          strokeOpacity = 0.8
          strokeWeight = 3
          break
        case 'google_driving':
          strokeColor = '#FF8C00'
          strokeOpacity = 0.6
          strokeWeight = 2
          break
        case 'manual':
          strokeColor = '#4682B4'
          strokeOpacity = 0.7
          strokeWeight = 2
          break
        default:
          strokeColor = '#666666'
          strokeOpacity = 0.5
          strokeWeight = 2
      }
      
      polyline.setOptions({
        strokeColor,
        strokeOpacity,
        strokeWeight,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
            scale: 2,
            strokeColor,
            strokeOpacity
          },
          offset: '50%'
        }]
      })
    } else {
      // routeDataが設定されていないポリライン（Directions APIなど）
      polyline.setOptions({
        strokeColor: '#4682B4',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
            scale: 2,
            strokeColor: '#4682B4',
            strokeOpacity: 0.8
          },
          offset: '50%'
        }]
      })
    }
  })

  const fromCandidates = expandMainland(from)
  const toCandidates = expandMainland(to)

  // 選択された航路をハイライト
  const selectedPolyline = polylines.value.find(polyline => {
    const routeData = (polyline as any).routeData
    
    // Storage由来のデータがある場合
    if (routeData) {
      const directMatch = fromCandidates.includes(routeData.from) && toCandidates.includes(routeData.to)
      const reverseMatch = fromCandidates.includes(routeData.to) && toCandidates.includes(routeData.from)
      return directMatch || reverseMatch
    }

    // フォールバック：座標で判定
    const fromPorts = fromCandidates
      .map(id => PORTS_DATA[id])
      .filter((port): port is Port => !!port)
    const toPorts = toCandidates
      .map(id => PORTS_DATA[id])
      .filter((port): port is Port => !!port)
    if (fromPorts.length === 0 || toPorts.length === 0) return false
    
    const path = polyline.getPath()
    const pathLength = path.getLength()
    if (pathLength < 2) return false

    const start = path.getAt(0)
    const end = path.getAt(pathLength - 1)

    const isClose = (point: google.maps.LatLng, port: Port) => (
      Math.abs(point.lat() - port.location.lat) < 0.001 &&
      Math.abs(point.lng() - port.location.lng) < 0.001
    )

    for (const fromPort of fromPorts) {
      for (const toPort of toPorts) {
        const directMatch = isClose(start, fromPort) && isClose(end, toPort)
        const reverseMatch = isClose(start, toPort) && isClose(end, fromPort)
        if (directMatch || reverseMatch) {
          return true
        }
      }
    }
    return false
  })

  if (selectedPolyline) {
    selectedPolyline.setOptions({
      strokeColor: '#FF4500', // オレンジレッド（選択時）
      strokeOpacity: 1,
      strokeWeight: 4,
      icons: [{
        icon: {
          path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
          scale: 3,
          strokeColor: '#FF4500',
          strokeOpacity: 1
        },
        offset: '50%'
      }]
    })

    // 航路の中心にズーム
    const fromPort = PORTS_DATA[from]
    const toPort = PORTS_DATA[to]
    
    if (fromPort && toPort) {
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(fromPort.location)
      bounds.extend(toPort.location)
      fitBoundsWithUiPadding(bounds)
    }
  }
}

const fetchDirectionsRoutes = async () => {
  if (!directionsService.value) return

  logger.info('Fetching ferry routes from Google Directions API...')

  // 主要なフェリー航路をDirections APIで取得
  const routeRequests = [
    { from: PORTS_DATA.HONDO_SHICHIRUI, to: PORTS_DATA.SAIGO, name: '七類港→西郷港' },
    { from: PORTS_DATA.HONDO_SAKAIMINATO, to: PORTS_DATA.SAIGO, name: '境港→西郷港' },
    { from: PORTS_DATA.SAIGO, to: PORTS_DATA.HISHIURA, name: '西郷港→菱浦港' }
  ]

  for (const route of routeRequests) {
    try {
      // まずTRANSITモードで試す
      let request: google.maps.DirectionsRequest = {
        origin: route.from.location,
        destination: route.to.location,
        travelMode: google.maps.TravelMode.TRANSIT,
        transitOptions: {
          modes: [google.maps.TransitMode.FERRY],
          routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
        }
      }

      logger.debug(`Trying TRANSIT mode for ${route.name}...`)
      
      try {
        const result = await directionsService.value.route(request)
        
        if (result.routes && result.routes.length > 0) {
          logger.info(`Found ferry route for ${route.name} (TRANSIT)`, result.routes[0])
          
          // 取得した航路データから経路を抽出
          const path = result.routes[0].overview_path
          if (path && path.length > 0) {
            // カスタムPolylineで描画
            const ferryRoute = new google.maps.Polyline({
              path: path,
              geodesic: true,
              strokeColor: '#FF6347', // トマトレッド（Directions API経由のルート）
              strokeOpacity: 0.8,
              strokeWeight: 3,
              icons: [{
                icon: {
                  path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                  scale: 2,
                  strokeColor: '#FF6347'
                },
                offset: '50%',
                repeat: '200px'
              }],
              map: map.value
            })
            registerPolyline(ferryRoute)
            continue // 成功したら次のルートへ
          }
        }
      } catch (transitError) {
        logger.warn(`TRANSIT mode failed for ${route.name}`, transitError)
      }

      // TRANSITが失敗したらDRIVINGモードで試す（海上ルート取得用）
      request = {
        origin: route.from.location,
        destination: route.to.location,
        travelMode: google.maps.TravelMode.DRIVING,
        avoidHighways: true,
        avoidTolls: true,
        avoidFerries: false // フェリーを避けない
      }

      logger.debug(`Trying DRIVING mode for ${route.name}...`)
      
      try {
        const result = await directionsService.value.route(request)
        
        if (result.routes && result.routes.length > 0) {
          logger.info(`Found route for ${route.name} (DRIVING)`, result.routes[0])
          
          // 取得した航路データから経路を抽出
          const path = result.routes[0].overview_path
          if (path && path.length > 0) {
            // カスタムPolylineで描画（DRIVINGモードは別の色）
            const ferryRoute = new google.maps.Polyline({
              path: path,
              geodesic: true,
              strokeColor: '#FF8C00', // ダークオレンジ（DRIVINGモード経由のルート）
              strokeOpacity: 0.6,
              strokeWeight: 2,
              strokeDasharray: [10, 5], // 破線にして区別
              icons: [{
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 3,
                  strokeColor: '#FF8C00',
                  fillColor: '#FF8C00',
                  fillOpacity: 0.8
                },
                offset: '0',
                repeat: '50px'
              }],
              map: map.value
            })
            registerPolyline(ferryRoute)
          }
        }
      } catch (drivingError) {
        logger.warn(`DRIVING mode failed for ${route.name}`, drivingError)
        logger.warn(`Using custom waypoints for ${route.name}`)
      }

    } catch (error) {
      logger.error(`Unexpected error fetching route ${route.name}`, error)
    }
  }

  logger.info('Directions API fetch complete.')
}

const focusPort = (portId: string) => {
  if (!map.value) return

  const port = PORTS_DATA[portId]
  const marker = markers.value.get(portId)

  if (port && marker) {
    map.value.setCenter(port.location)
    map.value.setZoom(12)

    // マーカーをアニメーション
    marker.setAnimation(google.maps.Animation.BOUNCE)
    setTimeout(() => {
      marker.setAnimation(null)
    }, 1500)
  }
}

// Watchers
watch(() => props.selectedPort, (portId) => {
  if (portId) {
    focusPort(portId)
  }
  // 港選択に応じてマーカー強調を更新
  updateAllMarkerStyles()
})

watch(() => props.selectedRoute, () => {
  renderActiveRoute()
  // ルート選択に応じてマーカー強調を更新
  updateAllMarkerStyles()
})

watch(() => props.selectedRouteSegments, () => {
  renderActiveRoute()
  updateAllMarkerStyles()
}, { deep: true })

// ルートデータ読み込み後にも再描画（初期ロードや再取得に対応）
watch(routesFromStorage, () => {
  renderActiveRoute()
})

// 初回同期: 地図が初期化され、選択ルートが与えられたら即描画
watch(
  () => ({
    hasMap: !!map.value,
    route: props.selectedRoute ? `${props.selectedRoute.from}->${props.selectedRoute.to}` : '',
    segments: (props.selectedRouteSegments || []).map(seg => `${seg.from}->${seg.to}`).join('|')
  }),
  (state) => {
    if (state.hasMap && (props.selectedRoute || (props.selectedRouteSegments && props.selectedRouteSegments.length > 0))) {
      renderActiveRoute()
    }
  },
  { immediate: true }
)

watch(isMapEnabled, (enabled) => {
  if (enabled && !map.value) {
    nextTick(() => initializeMap())
  }
})

watch(currentLocale, () => {
  // 言語変更時にマーカーのタイトルを更新
  markers.value.forEach((marker, portId) => {
    const port = PORTS_DATA[portId]
    if (port) {
      marker.setTitle(currentLocale.value === 'ja' ? port.name : port.nameEn)
    }
  })
  // 現在表示中のラベル文言も更新
  const activeIds = getActivePortIds()
  activeIds.forEach(id => showOrUpdateLabel(id))
})

// Lifecycle
onMounted(() => {
  if (isMapEnabled.value) {
    initializeMap()
  }
})

onUnmounted(() => {
  // クリーンアップ
  markers.value.forEach(marker => marker.setMap(null))
  polylines.value.forEach(polyline => polyline.setMap(null))
  for (const listener of mapListeners) {
    listener.remove()
  }
  for (const polyline of Array.from(allPolylines)) {
    detachPolyline(polyline)
  }
  markers.value.clear()
  polylines.value = []
  labelOverlays.value.forEach(overlay => overlay.setMap(null as any))
  labelOverlays.value.clear()
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
}

.map-container.loading {
  background-color: #f3f4f6;
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

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .ferry-map-container {
    height: 300px;
  }
}
</style>
