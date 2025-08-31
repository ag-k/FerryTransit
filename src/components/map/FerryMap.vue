<template>
  <div class="ferry-map-container">
    <div v-if="!isMapEnabled" class="map-disabled-notice">
      <Icon name="heroicons:map" class="w-8 h-8 text-gray-400" />
      <p>{{ $t('map.disabled') }}</p>
      <button
        @click="enableMap"
        class="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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

    <!-- Port Details Modal -->
    <PortDetailsModal
      v-if="selectedPortData"
      :is-open="showPortModal"
      :port="selectedPortData"
      @close="closePortModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Loader } from '@googlemaps/js-api-loader'
import { PORTS_DATA, ROUTES_DATA } from '~/data/ports'
import { getRoutePath, smoothPath } from '~/data/ferry-routes'
import PortDetailsModal from './PortDetailsModal.vue'
import type { Port } from '~/types'
import type { RouteData, RoutesDataFile } from '~/types/route'
import { getJSONData } from '~/composables/useDataPublish'

// Props
interface Props {
  selectedPort?: string
  selectedRoute?: { from: string; to: string }
  showPortDetails?: boolean
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
  showPortDetails: true
})

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
const infoWindow = ref<google.maps.InfoWindow>()
const isLoading = ref(false)
const showPortModal = ref(false)
const selectedPortData = ref<Port | null>(null)
const routesFromStorage = ref<RouteData[]>([])

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

// Computed
const isMapEnabled = computed(() => settingsStore.mapEnabled)
const currentLocale = computed(() => $i18n.locale.value)

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
  selectedPortData.value = null
}

// Firebase Storageから航路データを取得
const loadRoutesFromStorage = async () => {
  try {
    const data = await getJSONData<RoutesDataFile>('routes/ferry-routes.json')
    if (data && data.routes) {
      routesFromStorage.value = data.routes
      console.log(`Loaded ${data.routes.length} routes from Firebase Storage (v${data.metadata.version})`)
      return true
    }
  } catch (error) {
    console.log('No route data found in Firebase Storage, using fallback routes')
  }
  return false
}

const initializeMap = async () => {
  if (!mapContainer.value) return

  // APIキーがない場合は警告を表示
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key is not configured. Map features will be limited.')
    isLoading.value = false
    return
  }

  isLoading.value = true

  try {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'marker', 'geometry', 'routes'],
      mapIds: ['ca20a2dbd2ddb20bccb48876']
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

    // 港のマーカーを追加
    addPortMarkers()
    
    // Firebase Storageから航路データを読み込み
    await loadRoutesFromStorage()
    console.log('[FerryMap] init: selectedRoute=', props.selectedRoute)
    // 現在の選択状態に合わせて描画（未選択なら消去）
    renderActiveRoute()
    
    isLoading.value = false
  } catch (error) {
    console.error('Failed to load Google Maps:', error)
    isLoading.value = false
  }
}

// 現在の選択状態に合わせて再描画
const renderActiveRoute = () => {
  if (!map.value) return
  // 既存のpolylineを必ずクリア
  polylines.value.forEach(polyline => polyline.setMap(null))
  polylines.value = []
  if (infoWindow.value) {
    try { infoWindow.value.close() } catch {}
  }

  console.log('[FerryMap] renderActiveRoute selectedRoute=', props.selectedRoute, 'storageRoutes=', routesFromStorage.value.length)
  if (props.selectedRoute) {
    // ストレージに存在するルートのみ描画（フォールバックは行わない）
    const drawn = drawRoutesFromStorage()
    console.log('[FerryMap] drawRoutesFromStorage drawn=', drawn)
  } else {
    // 未選択なら非表示のまま
  }
}

const addPortMarkers = () => {
  if (!map.value || !window.google) return

  console.log('Adding port markers...')
  
  Object.values(PORTS_DATA).forEach(port => {
    // 通常のMarkerを作成（アイコンなしでテスト）
    const marker = new google.maps.Marker({
      position: port.location,
      map: map.value,
      title: currentLocale.value === 'ja' ? port.name : port.nameEn
    })

    // クリックイベント
    marker.addListener('click', () => {
      if (props.showPortDetails) {
        selectedPortData.value = port
        showPortModal.value = true
      }
      emit('portClick', port)
    })

    markers.value.set(port.id, marker)
    console.log(`Marker added for ${port.id} at lat:${port.location.lat}, lng:${port.location.lng}`)
  })
}

// Firebase Storageから取得したデータで航路を描画
// 描画に成功したら true、該当ルートなし等で何も描画しなければ false を返す
const drawRoutesFromStorage = (): boolean => {
  if (!map.value || routesFromStorage.value.length === 0) return false

  // 既存のpolylineをクリア
  polylines.value.forEach(polyline => polyline.setMap(null))
  polylines.value = []

  // アクティブルートのみ描画（selectedRoute が指定されている場合）
  const activeOnly = props.selectedRoute
    ? routesFromStorage.value.filter(r =>
        (r.from === props.selectedRoute!.from && r.to === props.selectedRoute!.to) ||
        (r.from === props.selectedRoute!.to && r.to === props.selectedRoute!.from)
      )
    : []

  const targetRoutes = props.selectedRoute ? activeOnly : []
  if (props.selectedRoute && targetRoutes.length === 0) {
    console.log('[FerryMap] storage: no target route for', props.selectedRoute)
    // ストレージに該当ルートが存在しない => フォールバック描画に委ねる
    return false
  }

  const bounds = new google.maps.LatLngBounds()
  let drew = false
  targetRoutes.forEach(route => {
    // ソースに応じて色とスタイルを設定
    let strokeColor: string
    let strokeOpacity: number
    let strokeWeight: number
    let dashArray: number[] | undefined
    
    switch (route.source) {
      case 'google_transit':
        strokeColor = '#2E7D32' // 緑色：Google Transit API
        strokeOpacity = 0.8
        strokeWeight = 3
        break
      case 'google_driving':
        strokeColor = '#FF8C00' // オレンジ色：Google Driving API
        strokeOpacity = 0.6
        strokeWeight = 2
        dashArray = [10, 5]
        break
      case 'manual':
        strokeColor = '#4682B4' // 青色：手動定義
        strokeOpacity = 0.7
        strokeWeight = 2
        break
      default:
        strokeColor = '#666666' // グレー：その他
        strokeOpacity = 0.5
        strokeWeight = 2
        dashArray = [5, 5]
    }

    const polyline = new google.maps.Polyline({
      path: route.path,
      geodesic: route.geodesic !== false,
      strokeColor,
      strokeOpacity,
      strokeWeight,
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
    ;(polyline as any).routeData = route

    polylines.value.push(polyline)
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

// drawRoutes はフォールバックを廃止したため未使用（将来の再利用に備え削除）

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
      // フォールバック（従来のスタイル）
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

  // 選択された航路をハイライト
  const selectedPolyline = polylines.value.find(polyline => {
    const routeData = (polyline as any).routeData
    
    // Storage由来のデータがある場合
    if (routeData) {
      return (routeData.from === from && routeData.to === to) || 
             (routeData.from === to && routeData.to === from)
    }
    
    // フォールバック：座標で判定
    const fromPort = PORTS_DATA[from]
    const toPort = PORTS_DATA[to]
    
    if (!fromPort || !toPort) return false
    
    const path = polyline.getPath()
    const pathLength = path.getLength()
    if (pathLength < 2) return false
    
    const start = path.getAt(0)
    const end = path.getAt(pathLength - 1)
    
    return (
      (Math.abs(start.lat() - fromPort.location.lat) < 0.001 &&
       Math.abs(start.lng() - fromPort.location.lng) < 0.001 &&
       Math.abs(end.lat() - toPort.location.lat) < 0.001 &&
       Math.abs(end.lng() - toPort.location.lng) < 0.001) ||
      (Math.abs(start.lat() - toPort.location.lat) < 0.001 &&
       Math.abs(start.lng() - toPort.location.lng) < 0.001 &&
       Math.abs(end.lat() - fromPort.location.lat) < 0.001 &&
       Math.abs(end.lng() - fromPort.location.lng) < 0.001)
    )
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

  console.log('Fetching ferry routes from Google Directions API...')

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

      console.log(`Trying TRANSIT mode for ${route.name}...`)
      
      try {
        const result = await directionsService.value.route(request)
        
        if (result.routes && result.routes.length > 0) {
          console.log(`✓ Found ferry route for ${route.name} (TRANSIT):`, result.routes[0])
          
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
            
            polylines.value.push(ferryRoute)
            continue // 成功したら次のルートへ
          }
        }
      } catch (transitError) {
        console.log(`✗ TRANSIT mode failed for ${route.name}:`, transitError)
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

      console.log(`Trying DRIVING mode for ${route.name}...`)
      
      try {
        const result = await directionsService.value.route(request)
        
        if (result.routes && result.routes.length > 0) {
          console.log(`✓ Found route for ${route.name} (DRIVING):`, result.routes[0])
          
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
            
            polylines.value.push(ferryRoute)
          }
        }
      } catch (drivingError) {
        console.log(`✗ DRIVING mode also failed for ${route.name}:`, drivingError)
        console.log(`Will use custom waypoints for ${route.name}`)
      }

    } catch (error) {
      console.error(`Unexpected error fetching route ${route.name}:`, error)
    }
  }

  console.log('Directions API fetch complete.')
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
})

watch(() => props.selectedRoute, () => {
  renderActiveRoute()
})

// ルートデータ読み込み後にも再描画（初期ロードや再取得に対応）
watch(routesFromStorage, () => {
  renderActiveRoute()
})

// 初回同期: 地図が初期化され、選択ルートが与えられたら即描画
watch(
  () => ({ hasMap: !!map.value, route: props.selectedRoute ? `${props.selectedRoute.from}->${props.selectedRoute.to}` : '' }),
  (state) => {
    if (state.hasMap && props.selectedRoute) {
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
  markers.value.clear()
  polylines.value = []
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
