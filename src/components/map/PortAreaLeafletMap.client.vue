<template>
  <div class="port-leaflet-root" :data-port-id="portId">
    <div v-if="points.length === 0" class="p-4 text-sm text-gray-600 dark:text-gray-300">
      {{ fallbackText }}
    </div>
    <div v-else ref="mapEl" class="port-leaflet-map" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { PORTS_DATA } from '~/data/ports'

type LatLng = { lat: number; lng: number }
type MarkerPoint = { id: string; title: string; lat: number; lng: number }

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
let markerById: Map<string, any> | null = null

const points = computed<MarkerPoint[]>(() => {
  // 乗り場など、明示的なフォーカス座標が来たらそれを優先（=ピンを移動）
  if (props.focus && Number.isFinite(props.focus.lat) && Number.isFinite(props.focus.lng)) {
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

  // 通常の港は data/ports.ts の location を利用
  const port = (PORTS_DATA as any)?.[id]
  if (port?.location?.lat != null && port?.location?.lng != null) {
    const title = String(props.title || port?.name || port?.nameEn || id)
    return [{ id, title, lat: Number(port.location.lat), lng: Number(port.location.lng) }]
  }

  // 互換: HONDO（本土）など、location を持たない ID は代表地点/複数港へ
  if (id === 'HONDO') {
    const shichirui = (PORTS_DATA as any)?.HONDO_SHICHIRUI
    const sakaiminato = (PORTS_DATA as any)?.HONDO_SAKAIMINATO
    const list: MarkerPoint[] = []
    if (shichirui?.location?.lat != null && shichirui?.location?.lng != null) {
      list.push({
        id: 'HONDO_SHICHIRUI',
        title: String(shichirui?.name || shichirui?.nameEn || 'HONDO_SHICHIRUI'),
        lat: Number(shichirui.location.lat),
        lng: Number(shichirui.location.lng)
      })
    }
    if (sakaiminato?.location?.lat != null && sakaiminato?.location?.lng != null) {
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
  if (points.value.length === 0) return

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
    const existing = markerById.get(p.id)
    if (existing) {
      existing.setLatLng([p.lat, p.lng])
    } else {
      const mk = L.marker([p.lat, p.lng]).addTo(map)
      if (p.title) mk.bindPopup(p.title)
      markerById.set(p.id, mk)
    }
  }

  // Update view
  if (points.value.length === 1) {
    const p = points.value[0]
    map.setView([p.lat, p.lng], props.zoom, { animate: false })
  } else {
    const bounds = L.latLngBounds(points.value.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [24, 24] })
  }
}

onMounted(async () => {
  await createOrUpdateMap()
})

watch([() => props.portId, () => props.zoom], async () => {
  await createOrUpdateMap()
})

watch(
  () => `${props.focus?.lat ?? ''},${props.focus?.lng ?? ''}`,
  async () => {
    await createOrUpdateMap()
  }
)

onUnmounted(() => {
  try {
    map?.remove?.()
  } catch {
    // noop
  }
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

/* Leaflet が生成する要素のサイズを強制 */
.port-leaflet-map :deep(.leaflet-container) {
  width: 100%;
  height: 100%;
}
</style>


