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
import PortDetailsModal from './PortDetailsModal.vue'
import type { Port } from '~/types'

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

// Computed
const isMapEnabled = computed(() => settingsStore.mapEnabled)
const currentLocale = computed(() => $i18n.locale.value)

// Google Maps APIキー（環境変数から取得）
const GOOGLE_MAPS_API_KEY = useRuntimeConfig().public.googleMapsApiKey || ''

// Methods
const enableMap = () => {
  settingsStore.setMapEnabled(true)
}

const closePortModal = () => {
  showPortModal.value = false
  selectedPortData.value = null
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
      libraries: ['places', 'marker'],
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

    // 港のマーカーを追加
    addPortMarkers()
    
    // 航路を描画
    drawRoutes()
    
    isLoading.value = false
  } catch (error) {
    console.error('Failed to load Google Maps:', error)
    isLoading.value = false
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

const drawRoutes = () => {
  if (!map.value) return

  // 既存のpolylineをクリア
  polylines.value.forEach(polyline => polyline.setMap(null))
  polylines.value = []

  ROUTES_DATA.forEach(route => {
    const fromPort = PORTS_DATA[route.from]
    const toPort = PORTS_DATA[route.to]

    if (fromPort && toPort) {
      const polyline = new google.maps.Polyline({
        path: [fromPort.location, toPort.location],
        geodesic: true,
        strokeColor: '#64748b',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        map: map.value
      })

      // クリックイベント
      polyline.addListener('click', () => {
        emit('routeSelect', { from: route.from, to: route.to })
      })

      polylines.value.push(polyline)
    }
  })
}

const highlightRoute = (from: string, to: string) => {
  if (!map.value) return

  // すべてのpolylineをデフォルトスタイルに戻す
  polylines.value.forEach(polyline => {
    polyline.setOptions({
      strokeColor: '#64748b',
      strokeOpacity: 0.5,
      strokeWeight: 2
    })
  })

  // 選択された航路をハイライト
  const fromPort = PORTS_DATA[from]
  const toPort = PORTS_DATA[to]

  if (fromPort && toPort) {
    const selectedPolyline = polylines.value.find(polyline => {
      const path = polyline.getPath()
      const start = path.getAt(0)
      const end = path.getAt(1)
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
        strokeColor: '#3b82f6',
        strokeOpacity: 1,
        strokeWeight: 4
      })

      // 航路の中心にズーム
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(fromPort.location)
      bounds.extend(toPort.location)
      map.value.fitBounds(bounds, { padding: 100 })
    }
  }
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

watch(() => props.selectedRoute, (route) => {
  if (route) {
    highlightRoute(route.from, route.to)
  }
})

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