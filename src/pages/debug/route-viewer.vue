<template>
  <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">航路ビューワ（暫定）</h1>

      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          ローカルJSON（例: output/routes/BEPPU_HONDO_SHICHIRUI.json）を読み込み、海上ルートを地図に表示します。
        </p>
        <p v-if="mapError" class="text-sm text-red-600 dark:text-red-400">
          {{ mapError }}
        </p>

        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <input type="file" accept="application/json" class="block" @change="onFileChange" />
          <button class="px-3 py-2 rounded bg-blue-700 text-white text-sm disabled:opacity-50" :disabled="!textInput" @click="loadFromTextarea">
            テキストから読み込み
          </button>
          <button class="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 text-sm" @click="clearRoute">クリア</button>
        </div>

        <textarea v-model="textInput" rows="6" placeholder="JSONを貼り付け（RouteData 形式）" class="w-full rounded border dark:bg-gray-900 dark:border-gray-700 p-2 text-sm"></textarea>

        <div v-if="routeData" class="text-sm text-gray-700 dark:text-gray-300">
          <div class="flex flex-wrap gap-4">
            <div><strong>航路:</strong> {{ routeData.fromName }} → {{ routeData.toName }}</div>
            <div><strong>距離:</strong> {{ routeData.distance ? (routeData.distance/1000).toFixed(1) + ' km' : '-' }}</div>
            <div><strong>時間:</strong> {{ routeData.duration ? Math.round(routeData.duration/60) + ' 分' : '-' }}</div>
            <div><strong>ソース:</strong> {{ routeData.source }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div ref="mapEl" class="w-full h-[60vh] rounded-b" />
      </div>
    </div>
  </template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Loader } from '@googlemaps/js-api-loader'
import type { RouteData } from '~/types/route'

definePageMeta({ layout: 'default' })

const mapEl = ref<HTMLDivElement | null>(null)
const map = ref<google.maps.Map | null>(null)
const polyline = ref<google.maps.Polyline | null>(null)
const startMarker = ref<google.maps.Marker | null>(null)
const endMarker = ref<google.maps.Marker | null>(null)

const routeData = ref<RouteData | null>(null)
const textInput = ref('')
const mapReady = ref(false)
const mapError = ref<string | null>(null)

const initMap = async () => {
  const apiKey = useRuntimeConfig().public.googleMapsApiKey
  if (!apiKey) {
    mapError.value = 'Google Maps APIキーが設定されていません (.env の NUXT_PUBLIC_GOOGLE_MAPS_API_KEY)'
    return
  }
  if (!mapEl.value) return
  try {
    const loader = new Loader({ apiKey, version: 'weekly' })
    await loader.load()
    map.value = new google.maps.Map(mapEl.value, {
      center: { lat: 36.0, lng: 133.2 },
      zoom: 7,
      mapTypeId: 'terrain',
      // 「地図 / 航空写真」切り替え（MapTypeControl）を非表示
      mapTypeControl: false,
    })
    mapReady.value = true
    if (routeData.value) drawRoute()
  } catch (e: any) {
    mapError.value = 'Google Maps の初期化に失敗しました: ' + (e?.message || e)
  }
}

const drawRoute = () => {
  if (!map.value || !routeData.value) return
  const path = routeData.value.path.map(p => ({ lat: p.lat, lng: p.lng }))

  // 既存をクリア
  polyline.value?.setMap(null)
  startMarker.value?.setMap(null)
  endMarker.value?.setMap(null)

  polyline.value = new google.maps.Polyline({
    path,
    geodesic: true,
    strokeColor: '#2563EB',
    strokeOpacity: 0.85,
    strokeWeight: 3,
  })
  polyline.value.setMap(map.value)

  if (path.length > 0) {
    startMarker.value = new google.maps.Marker({ position: path[0], map: map.value, label: 'S' })
    endMarker.value = new google.maps.Marker({ position: path[path.length - 1], map: map.value, label: 'E' })

    const bounds = new google.maps.LatLngBounds()
    path.forEach(pt => bounds.extend(pt as any))
    map.value.fitBounds(bounds)
  }
}

const validateRoute = (obj: any): obj is RouteData => {
  return obj && Array.isArray(obj.path) && typeof obj.from === 'string' && typeof obj.to === 'string'
}

const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    if (!validateRoute(json)) throw new Error('RouteData 形式ではありません')
    routeData.value = json
  } catch (err: any) {
    alert('読み込みエラー: ' + (err?.message || err))
  }
}

const loadFromTextarea = () => {
  try {
    const json = JSON.parse(textInput.value)
    if (!validateRoute(json)) throw new Error('RouteData 形式ではありません')
    routeData.value = json
  } catch (err: any) {
    alert('読み込みエラー: ' + (err?.message || err))
  }
}

const clearRoute = () => {
  routeData.value = null
  polyline.value?.setMap(null)
  startMarker.value?.setMap(null)
  endMarker.value?.setMap(null)
}

watch(routeData, () => drawRoute())
watch(mapReady, (ready) => { if (ready) drawRoute() })

onMounted(async () => {
  await initMap()
})
</script>

<style scoped>
</style>
