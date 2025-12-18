<template>
  <div class="port-leaflet-root" :data-port-id="portId">
    <div v-if="!center" class="p-4 text-sm text-gray-600 dark:text-gray-300">
      {{ fallbackText }}
    </div>
    <div v-else ref="mapEl" class="port-leaflet-map" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { PORTS_DATA } from '~/data/ports'

type LatLng = { lat: number; lng: number }

interface Props {
  portId?: string
  title?: string
  zoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 15
})

declare global {
  interface Window {
    L?: any
  }
}

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

const mapEl = ref<HTMLDivElement | null>(null)
let map: any | null = null
let marker: any | null = null

const center = computed<LatLng | null>(() => {
  const id = props.portId
  if (!id) return null

  // 通常の港は data/ports.ts の location を利用
  const port = (PORTS_DATA as any)?.[id]
  if (port?.location?.lat != null && port?.location?.lng != null) {
    return { lat: Number(port.location.lat), lng: Number(port.location.lng) }
  }

  // 互換: HONDO（本土）など、location を持たない ID は代表地点へ
  if (id === 'HONDO') {
    // 七類港と境港のだいたい中間
    return { lat: 35.5584, lng: 133.2262 }
  }

  return null
})

const fallbackText = computed(() => {
  if (!props.portId) return '港情報が指定されていません。'
  return 'この港の地図情報が見つかりませんでした。'
})

const loadStyleOnce = (href: string): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve()
  const existing = document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${href}"]`)
  if (existing) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`))
    document.head.appendChild(link)
  })
}

const loadScriptOnce = (src: string): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve()
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
  if (existing) {
    // 既にロード済み or ロード中
    if ((window as any).L) return Promise.resolve()
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)))
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

const ensureLeafletLoaded = async () => {
  await loadStyleOnce(LEAFLET_CSS_URL)
  await loadScriptOnce(LEAFLET_JS_URL)
  if (!window.L) {
    throw new Error('Leaflet (window.L) is not available after loading scripts.')
  }
  return window.L
}

const createOrUpdateMap = async () => {
  if (!mapEl.value) return
  if (!center.value) return

  const L = await ensureLeafletLoaded()

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
  }

  // Update view
  map.setView([center.value.lat, center.value.lng], props.zoom)

  // Marker
  if (marker) {
    marker.setLatLng([center.value.lat, center.value.lng])
  } else {
    marker = L.marker([center.value.lat, center.value.lng]).addTo(map)
    const popupText = props.title || props.portId || ''
    if (popupText) marker.bindPopup(popupText)
  }
}

onMounted(async () => {
  await createOrUpdateMap()
})

watch([() => props.portId, () => props.zoom], async () => {
  await createOrUpdateMap()
})

onUnmounted(() => {
  try {
    map?.remove?.()
  } catch {
    // noop
  }
  map = null
  marker = null
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

/* Leaflet が生成する要素のサイズを強制 */
.port-leaflet-map :deep(.leaflet-container) {
  width: 100%;
  height: 100%;
}
</style>


