<template>
  <div class="space-y-6">
      <div class="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            航路データ管理
          </h1>
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Google Maps APIから航路データを取得し、Firebase Storageに保存します
          </p>
        </div>
      </div>

      <!-- 取得状況 -->
      <div v-if="currentMetadata" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          現在の航路データ
        </h2>
        <dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3">
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
              バージョン
            </dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ currentMetadata.version }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
              最終取得日時
            </dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ new Date(currentMetadata.lastFetchedAt).toLocaleString('ja-JP') }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
              航路数
            </dt>
            <dd class="mt-1 text-sm text-gray-900 dark:text-white">
              {{ currentMetadata.totalRoutes }} 件
            </dd>
          </div>
        </dl>
      </div>

      <!-- 現在の航路一覧 -->
      <div v-if="currentRoutes.length > 0" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          現在の航路一覧 ({{ currentRoutes.length }}件)
        </h2>

        <DataTable
          :columns="[
            { key: 'label', label: '航路', sortable: true },
            { key: 'source', label: '取得元' },
            { key: 'path', label: '経路点数', align: 'right' },
            { key: 'distance', label: '距離', align: 'right' },
            { key: 'duration', label: '所要時間', align: 'right' },
            { key: 'updatedAt', label: '更新日時', sortable: true, format: 'datetime' }
          ]"
          :data="currentRoutes"
          :pagination="true"
          :page-size="10"
        >
          <template #cell-label="{ row }">
            {{ row.fromName }} → {{ row.toName }}
          </template>
          <template #cell-source="{ value }">
            <span
              :class="{
                'text-green-600': value === 'google_transit',
                'text-yellow-600': value === 'google_driving',
                'text-blue-700': value === 'manual',
                'text-gray-600': value === 'custom' || value === 'google_routes' || value === 'overpass_osm'
              }"
            >
              {{ getSourceLabel(value) }}
            </span>
          </template>
          <template #cell-path="{ row }">
            {{ row.path?.length || 0 }}
          </template>
          <template #cell-distance="{ row }">
            {{ row.distance ? `${(row.distance / 1000).toFixed(1)} km` : '-' }}
          </template>
          <template #cell-duration="{ row }">
            {{ row.duration ? `${Math.round(row.duration / 60)} 分` : '-' }}
          </template>
          <template #row-actions="{ row }">
            <button
              class="text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
              @click.stop="openDetails(row)"
            >
              詳細
            </button>
          </template>
        </DataTable>
      </div>

      <!-- アクションボタン -->
      <Card class="shadow" padding="md">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          航路データの取得と保存
        </h2>
        
        <div class="space-y-4">
          <PrimaryButton :disabled="isFetching" @click="fetchAllRoutes">
            <Icon
              :name="isFetching ? 'heroicons:arrow-path' : 'heroicons:cloud-arrow-down'"
              :class="{ 'animate-spin': isFetching }"
              class="mr-2 h-5 w-5"
            />
            {{ isFetching ? '取得中...' : 'Google Maps APIから航路データを取得' }}
          </PrimaryButton>

          <PrimaryButton
            v-if="fetchedRoutes.length > 0"
            :disabled="isSaving"
            class="ml-4 bg-green-600 hover:bg-green-700 disabled:hover:bg-green-600"
            @click="saveToStorage"
          >
            <Icon
              :name="isSaving ? 'heroicons:arrow-path' : 'heroicons:cloud-arrow-up'"
              :class="{ 'animate-spin': isSaving }"
              class="mr-2 h-5 w-5"
            />
            {{ isSaving ? '保存中...' : 'Firebase Storageに保存' }}
          </PrimaryButton>

          <SecondaryButton
            :disabled="isDownloading"
            class="ml-4 bg-gray-700 text-white hover:bg-gray-800 disabled:hover:bg-gray-700"
            @click="downloadFromStorage"
          >
            <Icon
              :name="isDownloading ? 'heroicons:arrow-path' : 'heroicons:arrow-down-tray'"
              :class="{ 'animate-spin': isDownloading }"
              class="mr-2 h-5 w-5"
            />
            {{ isDownloading ? 'ダウンロード中...' : 'Storageからダウンロード' }}
          </SecondaryButton>
        </div>

        <!-- 進捗表示 -->
        <div v-if="progress.total > 0" class="mt-6">
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>進捗: {{ progress.current }} / {{ progress.total }}</span>
            <span>{{ Math.round((progress.current / progress.total) * 100) }}%</span>
          </div>
          <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-700 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${(progress.current / progress.total) * 100}%` }"
            ></div>
          </div>
          <p v-if="progress.message" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {{ progress.message }}
          </p>
        </div>
      </Card>

      <!-- 取得結果プレビュー -->
      <Card v-if="fetchedRoutes.length > 0" class="shadow" padding="md">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          取得した航路データ ({{ fetchedRoutes.length }}件)
        </h2>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  航路
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  取得方法
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  経路点数
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  距離
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  所要時間
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="route in fetchedRoutes" :key="route.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ route.fromName }} → {{ route.toName }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    :class="{
                      'text-green-600': route.source === 'google_transit',
                      'text-yellow-600': route.source === 'google_driving',
                      'text-blue-700': route.source === 'manual',
                      'text-gray-600': route.source === 'custom'
                    }"
                  >
                    {{ getSourceLabel(route.source) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ route.path.length }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ route.distance ? `${(route.distance / 1000).toFixed(1)} km` : '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ route.duration ? `${Math.round(route.duration / 60)} 分` : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- ログ表示 -->
      <div v-if="logs.length > 0" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          処理ログ
        </h2>
        <div class="max-h-64 overflow-y-auto">
          <div v-for="(log, index) in logs" :key="index" class="text-sm py-1">
            <span class="text-gray-500 dark:text-gray-400">
              {{ new Date(log.timestamp).toLocaleTimeString('ja-JP') }}
            </span>
            <span
              :class="{
                'text-green-600': log.type === 'success',
                'text-red-600': log.type === 'error',
                'text-yellow-600': log.type === 'warning',
                'text-gray-900 dark:text-white': log.type === 'info'
              }"
              class="ml-2"
            >
              {{ log.message }}
            </span>
          </div>
        </div>
    </div>

    <!-- 詳細モーダル -->
    <TransitionRoot as="template" :show="showDetails">
      <Dialog as="div" class="relative z-50" @close="closeDetails">
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div v-if="selectedRoute" class="fixed inset-0 z-10 overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div class="px-6 py-5">
                  <DialogTitle as="h3" class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {{ selectedRoute.fromName }} → {{ selectedRoute.toName }} の詳細
                  </DialogTitle>
                  <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div class="text-gray-500 dark:text-gray-400">ルートID</div>
                      <div class="text-gray-900 dark:text-gray-100">{{ selectedRoute.id }}</div>
                    </div>
                    <div>
                      <div class="text-gray-500 dark:text-gray-400">取得元</div>
                      <div class="text-gray-900 dark:text-gray-100">{{ getSourceLabel(selectedRoute.source) }}</div>
                    </div>
                    <div>
                      <div class="text-gray-500 dark:text-gray-400">経路点数</div>
                      <div class="text-gray-900 dark:text-gray-100">{{ selectedRoute.path?.length || 0 }}</div>
                    </div>
                    <div>
                      <div class="text-gray-500 dark:text-gray-400">距離</div>
                      <div class="text-gray-900 dark:text-gray-100">{{ selectedRoute.distance ? `${(selectedRoute.distance / 1000).toFixed(1)} km` : '-' }}</div>
                    </div>
                    <div>
                      <div class="text-gray-500 dark:text-gray-400">所要時間</div>
                      <div class="text-gray-900 dark:text-gray-100">{{ selectedRoute.duration ? `${Math.round(selectedRoute.duration / 60)} 分` : '-' }}</div>
                    </div>
                    <div>
                      <div class="text-gray-500 dark:text-gray-400">測地線</div>
                      <div class="text-gray-900 dark:text-gray-100">{{ selectedRoute.geodesic ? 'はい' : 'いいえ' }}</div>
                    </div>
                    <div>
                      <div class="text-gray-500 dark:text-gray-400">作成日時</div>
                      <div class="text-gray-900 dark:text-gray-100">{{ new Date(selectedRoute.createdAt).toLocaleString('ja-JP') }}</div>
                    </div>
                    <div>
                      <div class="text-gray-500 dark:text-gray-400">更新日時</div>
                      <div class="text-gray-900 dark:text-gray-100">{{ new Date(selectedRoute.updatedAt).toLocaleString('ja-JP') }}</div>
                    </div>
                  </div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700 px-6 py-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    @click="closeDetails"
                  >
                    閉じる
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { Loader } from '@googlemaps/js-api-loader'
import { getAuth } from 'firebase/auth'
import { PORTS_DATA, ROUTES_DATA } from '~/data/ports'
import type { RouteData, RoutesDataFile, RoutesMetadata } from '~/types/route'
import { uploadJSON, getJSONData, getStorageDownloadURL } from '~/composables/useDataPublish'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { createLogger } from '~/utils/logger'
import DataTable from '~/components/admin/DataTable.vue'
import Card from '@/components/common/Card.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import SecondaryButton from '@/components/common/SecondaryButton.vue'

definePageMeta({
  layout: 'admin',
})

const { $toast } = useNuxtApp()
const logger = createLogger('AdminRoutesPage')

// Firebase Auth の現在のユーザーを直接取得
const auth = getAuth()
const currentUser = ref(auth.currentUser)

// State
const isFetching = ref(false)
const isSaving = ref(false)
const isDownloading = ref(false)
const fetchedRoutes = ref<RouteData[]>([])
const currentMetadata = ref<RoutesMetadata | null>(null)
const currentRoutes = ref<RouteData[]>([])
const logs = ref<{ timestamp: number; type: 'info' | 'success' | 'error' | 'warning'; message: string }[]>([])
const progress = ref({
  current: 0,
  total: 0,
  message: ''
})

// 詳細モーダル
const showDetails = ref(false)
const selectedRoute = ref<RouteData | null>(null)
const openDetails = (route: RouteData) => {
  selectedRoute.value = route
  showDetails.value = true
}
const closeDetails = () => {
  showDetails.value = false
  selectedRoute.value = null
}

// Google Maps
const directionsService = ref<google.maps.DirectionsService>()

// 2点間の距離（メートル）を算出（ハバーサイン）
const haversineDistanceMeters = (a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral) => {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

const computePathDistanceMeters = (path: google.maps.LatLngLiteral[]) => {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    total += haversineDistanceMeters(path[i - 1], path[i])
  }
  return total
}

// グラフ構築用ユーティリティ（Overpassのway群から最短経路を探索）
type GraphNode = { lat: number; lng: number }
type Graph = { nodes: GraphNode[]; adj: Map<number, Array<{ to: number; w: number }>> }

const buildGraphFromWays = (ways: any[], joinTolerance = 300): Graph => {
  const nodes: GraphNode[] = []
  const adj: Map<number, Array<{ to: number; w: number }>> = new Map()

  // 各wayを細分化してノード・エッジ追加
  const pushNode = (pt: GraphNode) => {
    const idx = nodes.length
    nodes.push(pt)
    return idx
  }

  const addEdge = (a: number, b: number) => {
    const w = haversineDistanceMeters(nodes[a], nodes[b])
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push({ to: b, w })
    adj.get(b)!.push({ to: a, w })
  }

  // まず全てのwayのポイントをノードとして直列エッジを張る
  const wayEndpoints: Array<{ first: number; last: number }> = []
  for (const w of ways) {
    const geom = w.geometry as Array<{ lat: number; lon: number }>
    if (!geom || geom.length < 2) continue
    let prevIdx: number | null = null
    let firstIdx = -1
    for (let i = 0; i < geom.length; i++) {
      const idx = pushNode({ lat: geom[i].lat, lng: geom[i].lon })
      if (prevIdx !== null) addEdge(prevIdx, idx)
      else firstIdx = idx
      prevIdx = idx
    }
    if (firstIdx !== -1 && prevIdx !== null) wayEndpoints.push({ first: firstIdx, last: prevIdx })
  }

  // 端点が近い別way同士を接続（joinTolerance以内）
  const endpoints = wayEndpoints.flatMap(ep => [ep.first, ep.last])
  for (let i = 0; i < endpoints.length; i++) {
    for (let j = i + 1; j < endpoints.length; j++) {
      const a = endpoints[i]
      const b = endpoints[j]
      const d = haversineDistanceMeters(nodes[a], nodes[b])
      if (d <= joinTolerance) addEdge(a, b)
    }
  }

  return { nodes, adj }
}

const findNearestNode = (graph: Graph, pt: GraphNode) => {
  let best = -1
  let bestD = Number.POSITIVE_INFINITY
  for (let i = 0; i < graph.nodes.length; i++) {
    const d = haversineDistanceMeters(graph.nodes[i], pt)
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

const shortestPath = (graph: Graph, startIdx: number, goalIdx: number): number[] => {
  const n = graph.nodes.length
  const dist = new Array(n).fill(Number.POSITIVE_INFINITY)
  const prev = new Array(n).fill(-1)
  const visited = new Array(n).fill(false)

  // 2分ヒープなどは不要な規模想定、単純反復
  dist[startIdx] = 0
  for (let iter = 0; iter < n; iter++) {
    let u = -1
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < best) { best = dist[i]; u = i }
    }
    if (u === -1) break
    visited[u] = true
    if (u === goalIdx) break
    const edges = graph.adj.get(u) || []
    for (const { to, w } of edges) {
      const nd = dist[u] + w
      if (nd < dist[to]) { dist[to] = nd; prev[to] = u }
    }
  }
  if (prev[goalIdx] === -1) return []
  const path: number[] = []
  let cur = goalIdx
  while (cur !== -1) { path.push(cur); cur = prev[cur] }
  path.reverse()
  return path
}

// ============ Overpass API (OSM) ============
// Overpass で route=ferry の関係を取得し、港名（from/to）や空間条件で絞り込み
const fetchRouteViaOverpass = async (from: string, to: string): Promise<RouteData | null> => {
  const fromPort = PORTS_DATA[from]
  const toPort = PORTS_DATA[to]
  if (!fromPort || !toPort) return null

  // バウンディングボックス（両港を含む矩形に余白を持たせる）
  const minLat = Math.min(fromPort.location.lat, toPort.location.lat) - 0.6
  const maxLat = Math.max(fromPort.location.lat, toPort.location.lat) + 0.6
  const minLng = Math.min(fromPort.location.lng, toPort.location.lng) - 0.6
  const maxLng = Math.max(fromPort.location.lng, toPort.location.lng) + 0.6

  // bbox 内の route=ferry 関係と、そのメンバー ways の形状を取得
  // Relation は members 情報を含むように out body とし、ways は out geom
  const query = `
    [out:json][timeout:60];
    rel["route"="ferry"](${minLat},${minLng},${maxLat},${maxLng})->.rels;
    way(r.rels)->.wrel;
    way["route"="ferry"](${minLat},${minLng},${maxLat},${maxLng})->.wonly;
    (.wrel; .wonly;);
    out geom;`

  try {
    addLog('info', `${fromPort.name} → ${toPort.name}: Overpass API クエリ実行`)
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }) as any
    })
    if (!res.ok) {
      const t = await res.text()
      addLog('error', `Overpass API エラー: ${res.status} ${t}`)
      return null
    }
    const data = await res.json()

    const elements = data?.elements || []
    let ways = elements.filter((el: any) => el.type === 'way' && Array.isArray(el.geometry))
    if (ways.length === 0) {
      addLog('warning', `${fromPort.name} → ${toPort.name}: Overpassでフェリー形状が見つかりませんでした`)
      return null
    }

    // 経由地回避の簡易フィルタ（特定ペア向け）
    const filterWaysByAvoid = (inputWays: any[], avoidIds: string[], radius = 5000) => {
      const avoidPorts = avoidIds.map(id => PORTS_DATA[id]?.location).filter(Boolean)
      if (avoidPorts.length === 0) return inputWays
      const filtered = inputWays.filter((w: any) => {
        for (const g of w.geometry) {
          for (const ap of avoidPorts) {
            const d = haversineDistanceMeters({ lat: g.lat, lng: g.lon }, ap as any)
            if (d <= radius) return false
          }
        }
        return true
      })
      return filtered.length > 0 ? filtered : inputWays // 強すぎる場合は元に戻す
    }

    // ルール適用（特定経由地を避ける）
    const isBeppuShichirui = (from === 'BEPPU' && to === 'HONDO_SHICHIRUI') || (from === 'HONDO_SHICHIRUI' && to === 'BEPPU')
    if (isBeppuShichirui) {
      ways = filterWaysByAvoid(ways, ['SAIGO'], 5000)
    }
    const isShichiruiKuri = (from === 'HONDO_SHICHIRUI' && to === 'KURI') || (from === 'KURI' && to === 'HONDO_SHICHIRUI')
    if (isShichiruiKuri) {
      ways = filterWaysByAvoid(ways, ['SAIGO', 'BEPPU'], 5000)
    }
    const isHishiuraSaigo = (from === 'HISHIURA' && to === 'SAIGO') || (from === 'SAIGO' && to === 'HISHIURA')
    if (isHishiuraSaigo) {
      // 菱浦↔西郷は本土港（七類・境港）の経由のみ回避（別府は除外対象にしない）
      ways = filterWaysByAvoid(ways, ['HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO'], 8000)
    }
    // 最短経路（ノードグラフ）で直通最短を抽出
    const graph = buildGraphFromWays(ways, 300)
    const sIdx = findNearestNode(graph, { lat: fromPort.location.lat, lng: fromPort.location.lng })
    const tIdx = findNearestNode(graph, { lat: toPort.location.lat, lng: toPort.location.lng })
    let clipped: { lat: number; lng: number }[] = []
    if (sIdx !== -1 && tIdx !== -1) {
      const pathIdx = shortestPath(graph, sIdx, tIdx)
      if (pathIdx.length >= 2) {
        clipped = pathIdx.map(i => graph.nodes[i])
      }
    }

    // 最短経路が求められない場合は、従来クリップにフォールバック
    if (clipped.length < 2) {
      // 全ノードから港に最も近い点を検索して直線的に切り出し
      const allPts = graph.nodes
      const aIdx = allPts.reduce((best, p, idx) => {
        const d = haversineDistanceMeters(p, fromPort.location)
        return d < best.d ? { idx, d } : best
      }, { idx: 0, d: Number.POSITIVE_INFINITY }).idx
      const bIdx = allPts.reduce((best, p, idx) => {
        const d = haversineDistanceMeters(p, toPort.location)
        return d < best.d ? { idx, d } : best
      }, { idx: 0, d: Number.POSITIVE_INFINITY }).idx
      const start = Math.min(aIdx, bIdx)
      const end = Math.max(aIdx, bIdx)
      clipped = allPts.slice(start, end + 1)
    }

    if (clipped.length < 2) {
      addLog('warning', `${fromPort.name} → ${toPort.name}: Overpass形状のクリップに失敗（代替へ）`)
      return null
    }

    const distance = Math.round(computePathDistanceMeters(clipped))
    const duration = Math.round(distance / (37 * 1000 / 3600))
    addLog('success', `${fromPort.name} → ${toPort.name}: Overpassでフェリー形状取得成功`)

    return {
      id: `${from}_${to}`,
      from,
      to,
      fromName: fromPort.name,
      toName: toPort.name,
      path: clipped,
      distance,
      duration,
      source: 'overpass_osm',
      geodesic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  } catch (e) {
    addLog('error', `${fromPort.name} → ${toPort.name}: Overpass取得エラー - ${e}`)
    return null
  }
}

// 初期化
const initGoogleMaps = async () => {
  const apiKey = useRuntimeConfig().public.googleMapsApiKey
  
  if (!apiKey) {
    addLog('error', 'Google Maps APIキーが設定されていません')
    return
  }

  try {
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['routes']
    })

    await loader.load()
    directionsService.value = new google.maps.DirectionsService()
    addLog('success', 'Google Maps APIを初期化しました')
  } catch (error) {
    addLog('error', `Google Maps API初期化エラー: ${error}`)
  }
}


// Google Routes APIを使用してフェリールートを取得
const fetchRouteViaRoutesAPI = async (from: string, to: string): Promise<RouteData | null> => {
  const apiKey = useRuntimeConfig().public.googleMapsApiKey
  if (!apiKey) return null

  const fromPort = PORTS_DATA[from]
  const toPort = PORTS_DATA[to]
  if (!fromPort || !toPort) return null

  // 長距離海上ルートの場合は、DRIVINGモードと海上中継点を使用
  const isLongSeaRoute = (from === 'HONDO_SAKAIMINATO' && to === 'BEPPU') || 
                         (from === 'BEPPU' && to === 'HONDO_SAKAIMINATO') ||
                         (from === 'HONDO_SHICHIRUI' && to === 'BEPPU') ||
                         (from === 'BEPPU' && to === 'HONDO_SHICHIRUI')

  if (isLongSeaRoute) {
    try {
      // 海上中継点を設定（フェリー航路に沿った座標）
      let waypoints: any[] = []
      
      if (from === 'HONDO_SAKAIMINATO' || from === 'HONDO_SHICHIRUI') {
        // 境港/七類→別府の順方向
        waypoints = [
          { location: { latLng: { latitude: 35.8, longitude: 133.15 }}}, // 海上点1
          { location: { latLng: { latitude: 36.0, longitude: 133.10 }}}  // 海上点2
        ]
      } else {
        // 別府→境港/七類の逆方向
        waypoints = [
          { location: { latLng: { latitude: 36.0, longitude: 133.10 }}}, // 海上点1
          { location: { latLng: { latitude: 35.8, longitude: 133.15 }}}  // 海上点2
        ]
      }

      const requestBody: any = {
        origin: {
          location: {
            latLng: {
              latitude: fromPort.location.lat,
              longitude: fromPort.location.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: toPort.location.lat,
              longitude: toPort.location.lng
            }
          }
        },
        intermediates: waypoints,
        travelMode: 'DRIVE', // DRIVEモードで海上ルートを取得
        polylineQuality: 'HIGH_QUALITY',
        polylineEncoding: 'ENCODED_POLYLINE',
        languageCode: 'ja',
        units: 'METRIC'
      }

      addLog('info', `海上ルートAPI リクエスト: ${fromPort.name} → ${toPort.name}`)

      const response = await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline'
          },
          body: JSON.stringify(requestBody)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Routes API error response', errorText)
        throw new Error(`Routes API Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        
        if (route.polyline?.encodedPolyline) {
          // エンコードされたポリラインをデコード（フル経路）
          const decodedFullPath: google.maps.LatLngLiteral[] = []
          const encodedPolyline = route.polyline.encodedPolyline
          
          let index = 0
          let lat = 0
          let lng = 0
          
          while (index < encodedPolyline.length) {
            let b
            let shift = 0
            let result = 0
            do {
              b = encodedPolyline.charCodeAt(index++) - 63
              result |= (b & 0x1f) << shift
              shift += 5
            } while (b >= 0x20)
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
            lat += dlat

            shift = 0
            result = 0
            do {
              b = encodedPolyline.charCodeAt(index++) - 63
              result |= (b & 0x1f) << shift
              shift += 5
            } while (b >= 0x20)
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
            lng += dlng

            decodedFullPath.push({ lat: lat / 1e5, lng: lng / 1e5 })
          }
          
          // 海上中継点（waypoints）付近の区間のみを抽出して陸上を除去
          const wpA = waypoints[0]?.location?.latLng
          const wpB = waypoints[1]?.location?.latLng

          const nearestIndex = (target?: { latitude: number; longitude: number }) => {
            if (!target) return -1
            let bestIdx = -1
            let bestDist = Number.POSITIVE_INFINITY
            for (let i = 0; i < decodedFullPath.length; i++) {
              const d = haversineDistanceMeters(
                decodedFullPath[i],
                { lat: target.latitude, lng: target.longitude }
              )
              if (d < bestDist) {
                bestDist = d
                bestIdx = i
              }
            }
            return bestIdx
          }

          let clippedPath: google.maps.LatLngLiteral[] = decodedFullPath
          const idxA = nearestIndex(wpA)
          const idxB = nearestIndex(wpB)
          if (idxA !== -1 && idxB !== -1 && decodedFullPath.length > 1) {
            const start = Math.min(idxA, idxB)
            const end = Math.max(idxA, idxB)
            // start==end にならないように+1
            clippedPath = decodedFullPath.slice(start, end + 1)
          }

          if (clippedPath.length > 1) {
            // 海上区間の距離・時間を再計算（37km/hで近似）
            const seaDistance = Math.round(computePathDistanceMeters(clippedPath))
            const seaDuration = Math.round(seaDistance / (37 * 1000 / 3600))

            addLog('success', `${fromPort.name} → ${toPort.name}: 海上区間のみ抽出して取得成功`)

            return {
              id: `${from}_${to}`,
              from,
              to,
              fromName: fromPort.name,
              toName: toPort.name,
              path: clippedPath,
              distance: seaDistance,
              duration: seaDuration,
              source: 'google_routes',
              geodesic: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        }
      }
    } catch (error) {
      addLog('warning', `${fromPort.name} → ${toPort.name}: 海上ルートAPI失敗 - ${error}`)
      logger.error('Sea Route API Error', error)
    }
  }

  // 通常の短距離ルートの場合はTRANSITモードを試行
  try {
    // Routes API用のリクエストボディを構築（TRANSITモードでフェリーを探索）
    const departureTime = new Date()
    // デフォルトは10:00。境港→別府は14:25指定（フェリーしらしま直行便対策）
    if (from === 'HONDO_SAKAIMINATO' && to === 'BEPPU') {
      departureTime.setHours(14, 25, 0, 0)
    } else {
      departureTime.setHours(10, 0, 0, 0)
    }
    
    const requestBody: any = {
      origin: {
        location: {
          latLng: {
            latitude: fromPort.location.lat,
            longitude: fromPort.location.lng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: toPort.location.lat,
            longitude: toPort.location.lng
          }
        }
      },
      travelMode: 'TRANSIT',
      departureTime: departureTime.toISOString(),
      computeAlternativeRoutes: false,
      transitPreferences: {
        routingPreference: 'FEWER_TRANSFERS'
      },
      polylineQuality: 'HIGH_QUALITY',
      polylineEncoding: 'ENCODED_POLYLINE',
      languageCode: 'ja',
      units: 'METRIC'
    }

    addLog('info', `Routes API リクエスト: ${fromPort.name} (${fromPort.location.lat}, ${fromPort.location.lng}) → ${toPort.name} (${toPort.location.lat}, ${toPort.location.lng})`)

    // Routes APIを呼び出し（詳細なレスポンスを要求）
    const response = await fetch(
      `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs.steps.transitDetails,routes.legs.steps.polyline,routes.legs.steps.travelMode'
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Routes API error response', errorText)
      
      // エラーレスポンスをパースしてより詳細な情報を取得
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          addLog('error', `Routes API エラー: ${errorJson.error.message || errorJson.error.status}`)
          if (errorJson.error.details) {
            logger.error('Routes API error details', errorJson.error.details)
          }
        }
      } catch (e) {
        // JSONパースに失敗した場合はテキストをそのまま使用
      }
      
      throw new Error(`Routes API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      
      // FERRYステップのみを抽出してポリラインを結合
      const ferryPolylines: string[] = []
      let totalDistance = 0
      let totalDuration = 0
      
      // 各レグのステップを確認
      if (route.legs && route.legs.length > 0) {
        for (const leg of route.legs) {
          if (leg.steps) {
            for (const step of leg.steps) {
              // transitDetailsがあり、vehicle.typeがFERRYのステップのみ採用
              if (step.transitDetails?.transitLine?.vehicle?.type === 'FERRY') {
                if (step.polyline?.encodedPolyline) {
                  ferryPolylines.push(step.polyline.encodedPolyline)
                }
                if (step.distanceMeters) totalDistance += step.distanceMeters
                if (step.duration) {
                  const seconds = parseInt(step.duration.replace('s', '') || '0')
                  totalDuration += seconds
                }
                
                addLog('info', `FERRYステップ検出: ${step.transitDetails.transitLine.name || 'フェリー'}`)
              }
            }
          }
        }
      }
      
      // FERRYステップが見つからない場合は、陸上区間を含む恐れがあるため
      // 全体ルートは使わず、海上直線ルートにフォールバック
      if (ferryPolylines.length === 0) {
        addLog('warning', `${fromPort.name} → ${toPort.name}: FERRYステップなし → 海上直線ルートにフォールバック`)

        // 直線補間の海上経路（50点）
        const steps = 50
        const seaPath: google.maps.LatLngLiteral[] = []
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          seaPath.push({
            lat: fromPort.location.lat + (toPort.location.lat - fromPort.location.lat) * t,
            lng: fromPort.location.lng + (toPort.location.lng - fromPort.location.lng) * t
          })
        }

        const seaDistance = Math.round(computePathDistanceMeters(seaPath))
        const seaDuration = Math.round(seaDistance / (37 * 1000 / 3600))

        return {
          id: `${from}_${to}`,
          from,
          to,
          fromName: fromPort.name,
          toName: toPort.name,
          path: seaPath,
          distance: seaDistance,
          duration: seaDuration,
          source: 'custom',
          geodesic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
      
      // エンコードされたポリラインをデコード
      const decodedPath: google.maps.LatLngLiteral[] = []
      
      for (const encodedPolyline of ferryPolylines) {
        let index = 0
        let lat = 0
        let lng = 0
        
        while (index < encodedPolyline.length) {
          let b
          let shift = 0
          let result = 0
          do {
            b = encodedPolyline.charCodeAt(index++) - 63
            result |= (b & 0x1f) << shift
            shift += 5
          } while (b >= 0x20)
          const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
          lat += dlat

          shift = 0
          result = 0
          do {
            b = encodedPolyline.charCodeAt(index++) - 63
            result |= (b & 0x1f) << shift
            shift += 5
          } while (b >= 0x20)
          const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
          lng += dlng

          decodedPath.push({ lat: lat / 1e5, lng: lng / 1e5 })
        }
      }
      
      if (decodedPath.length > 0) {
        addLog('success', `${fromPort.name} → ${toPort.name}: フェリールート取得成功 (${ferryPolylines.length}区間)`)

        return {
          id: `${from}_${to}`,
          from,
          to,
          fromName: fromPort.name,
          toName: toPort.name,
          path: decodedPath,
          distance: totalDistance || route.distanceMeters,
          duration: totalDuration || parseInt(route.duration?.replace('s', '') || '0'),
          source: 'google_routes',
          geodesic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    } else {
      addLog('warning', `${fromPort.name} → ${toPort.name}: Routes APIがルートを返しませんでした`)
    }
  } catch (error) {
    addLog('error', `${fromPort.name} → ${toPort.name}: Routes API失敗 - ${error}`)
    logger.error('Routes API Error', error)
  }

  return null
}

// ログを追加
const addLog = (type: 'info' | 'success' | 'error' | 'warning', message: string) => {
  logs.value.unshift({
    timestamp: Date.now(),
    type,
    message
  })
  
  // 最大100件まで保持
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

// ソースラベルを取得
const getSourceLabel = (source: string) => {
  switch (source) {
    case 'overpass_osm':
      return 'Overpass (OSM)'
    case 'google_transit':
      return 'Google Transit'
    case 'google_driving':
      return 'Google Driving'
    case 'google_routes':
      return 'Google Routes API'
    case 'manual':
      return '手動定義'
    case 'custom':
      return 'カスタム'
    default:
      return source
  }
}

// 現在のデータを読み込み
const loadCurrentData = async () => {
  try {
    const data = await getJSONData<RoutesDataFile>('routes/ferry-routes.json')
    if (data) {
      currentMetadata.value = data.metadata
      currentRoutes.value = data.routes || []
      addLog('info', `現在の航路データを読み込みました (v${data.metadata.version})`)
    }
  } catch (error) {
    addLog('warning', '現在の航路データが見つかりません')
  }
}

// 単一ルートを取得
const fetchSingleRoute = async (from: string, to: string): Promise<RouteData | null> => {
  const fromPort = PORTS_DATA[from]
  const toPort = PORTS_DATA[to]
  
  if (!fromPort || !toPort) return null

  // 長距離海上ルートかどうか判定（境港/七類→別府など）
  const isLongSeaRoute = (from === 'HONDO_SAKAIMINATO' && to === 'BEPPU') || 
                         (from === 'BEPPU' && to === 'HONDO_SAKAIMINATO') ||
                         (from === 'HONDO_SHICHIRUI' && to === 'BEPPU') ||
                         (from === 'BEPPU' && to === 'HONDO_SHICHIRUI')
  
  // まず Overpass (OSM) を優先
  addLog('info', `${fromPort.name} → ${toPort.name}: Overpass (OSM) を試行中...`)
  const overpassResult = await fetchRouteViaOverpass(from, to)
  if (overpassResult) return overpassResult

  // 長距離海上ルートはGoogle Routes API（中継点＋クリップ）でフォールバック
  if (isLongSeaRoute) {
    addLog('info', `${fromPort.name} → ${toPort.name}: Overpass失敗、Routes APIを試行`)
    const routesApiResult = await fetchRouteViaRoutesAPI(from, to)
    if (routesApiResult) return routesApiResult

    addLog('info', `${fromPort.name} → ${toPort.name}: Routes API失敗、Directions APIを試行`)
  }

  // Directions Serviceが初期化されていない場合はnullを返す
  if (!directionsService.value) return null
  
  // Google Directions APIで取得を試行
  try {
    // 長距離海上ルートの場合は複数の海上中継点を設定
    let waypoints: google.maps.DirectionsWaypoint[] = []
    
    if (isLongSeaRoute) {
      // 境港/七類→別府の実際のフェリー航路に沿った中継点
      if (from === 'HONDO_SAKAIMINATO' || from === 'HONDO_SHICHIRUI') {
        // 境港/七類→別府の順方向
        waypoints = [
          { location: { lat: 36.05, lng: 133.25 }, stopover: false }, // 隠岐諸島西側海域
          { location: { lat: 36.20, lng: 133.35 }, stopover: false }, // 島前海域
          { location: { lat: 36.10, lng: 133.55 }, stopover: false }  // 別府港への接近海域
        ]
      } else {
        // 別府→境港/七類の逆方向
        waypoints = [
          { location: { lat: 36.10, lng: 133.55 }, stopover: false }, // 別府港からの出発海域
          { location: { lat: 36.20, lng: 133.35 }, stopover: false }, // 島前海域
          { location: { lat: 36.05, lng: 133.25 }, stopover: false }  // 隠岐諸島西側海域
        ]
      }
    }
    
    // TRANSITモードで試行（フェリー優先）
    let request: google.maps.DirectionsRequest = {
      origin: fromPort.location,
      destination: toPort.location,
      travelMode: google.maps.TravelMode.TRANSIT,
      transitOptions: {
        modes: [google.maps.TransitMode.FERRY],
        routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
      }
    }
    // 境港→別府は 14:25 発で検索（直行便ヒット率を上げる）
    if (isLongSeaRoute && from === 'HONDO_SAKAIMINATO' && to === 'BEPPU') {
      const dt = new Date()
      dt.setHours(14, 25, 0, 0)
      request.transitOptions = {
        ...request.transitOptions,
        departureTime: dt
      }
    }
    
    // 長距離海上ルートの場合は中継点を追加
    if (isLongSeaRoute && waypoints.length > 0) {
      request.waypoints = waypoints
      request.optimizeWaypoints = false // 中継点の順序を維持
    }

    try {
      const result = await directionsService.value.route(request)
      
      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0]
        const legs = route.legs

        // フェリー区間のみ抽出
        let ferryPath: google.maps.LatLng[] = []
        let totalDistance = 0
        let totalDuration = 0

        for (const leg of legs) {
          if (!leg.steps) continue
          for (const step of leg.steps) {
            const isFerry = step.travel_mode === google.maps.TravelMode.TRANSIT &&
              // @ts-ignore: transit オブジェクトはランタイムに存在
              step.transit?.line?.vehicle?.type === google.maps.TransitVehicleType.FERRY
            if (isFerry) {
              // 距離・時間
              if (step.distance?.value) totalDistance += step.distance.value
              if (step.duration?.value) totalDuration += step.duration.value
              // 経路点
              if (step.path && step.path.length > 0) {
                ferryPath = ferryPath.concat(step.path)
              }
            }
          }
        }

        if (ferryPath.length > 0) {
          addLog('success', `${fromPort.name} → ${toPort.name}: Transitのフェリー区間のみ抽出して取得成功`)
          return {
            id: `${from}_${to}`,
            from,
            to,
            fromName: fromPort.name,
            toName: toPort.name,
            path: ferryPath.map(p => ({ lat: p.lat(), lng: p.lng() })),
            distance: totalDistance || undefined,
            duration: totalDuration || undefined,
            source: 'google_transit',
            geodesic: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }

        // フェリー区間が見つからない場合のフォールバック
        if (isLongSeaRoute) {
          // 直線の海上ルートを生成
          const stepsCount = 50
          const seaPath: google.maps.LatLngLiteral[] = []
          for (let i = 0; i <= stepsCount; i++) {
            const t = i / stepsCount
            seaPath.push({
              lat: fromPort.location.lat + (toPort.location.lat - fromPort.location.lat) * t,
              lng: fromPort.location.lng + (toPort.location.lng - fromPort.location.lng) * t
            })
          }
          const seaDistance = Math.round(computePathDistanceMeters(seaPath))
          const seaDuration = Math.round(seaDistance / (37 * 1000 / 3600))
          addLog('warning', `${fromPort.name} → ${toPort.name}: TransitでFERRYなし → 海上直線ルートにフォールバック`)
          return {
            id: `${from}_${to}`,
            from,
            to,
            fromName: fromPort.name,
            toName: toPort.name,
            path: seaPath,
            distance: seaDistance,
            duration: seaDuration,
            source: 'custom',
            geodesic: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }
    } catch (transitError) {
      // TRANSITが失敗した場合のみDRIVINGモードを試行（ただし長距離海上ルートは除く）
      if (!isLongSeaRoute) {
        request = {
          origin: fromPort.location,
          destination: toPort.location,
          travelMode: google.maps.TravelMode.DRIVING,
          avoidHighways: true,
          avoidTolls: true,
          avoidFerries: false
        }

        try {
          const result = await directionsService.value.route(request)
          
          if (result.routes && result.routes.length > 0) {
            const route = result.routes[0]
            const leg = route.legs[0]
            
            addLog('warning', `${fromPort.name} → ${toPort.name}: Google Driving APIで取得`)
            
            return {
              id: `${from}_${to}`,
              from,
              to,
              fromName: fromPort.name,
              toName: toPort.name,
              path: route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() })),
              distance: leg.distance?.value,
              duration: leg.duration?.value,
              source: 'google_driving',
              geodesic: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        } catch (drivingError) {
          addLog('error', `${fromPort.name} → ${toPort.name}: APIで取得失敗`)
        }
      } else {
        // 長距離海上ルートの場合は直線を生成（フォールバック）
        const generateSeaPath = (from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral) => {
          const points = []
          const steps = 50 // 経路点数
          
          for (let i = 0; i <= steps; i++) {
            const ratio = i / steps
            points.push({
              lat: from.lat + (to.lat - from.lat) * ratio,
              lng: from.lng + (to.lng - from.lng) * ratio
            })
          }
          
          return points
        }
        
        const path = generateSeaPath(fromPort.location, toPort.location)
        
        // 大まかな距離計算（球面三角法）
        const R = 6371000 // 地球の半径（メートル）
        const lat1 = fromPort.location.lat * Math.PI / 180
        const lat2 = toPort.location.lat * Math.PI / 180
        const deltaLat = (toPort.location.lat - fromPort.location.lat) * Math.PI / 180
        const deltaLng = (toPort.location.lng - fromPort.location.lng) * Math.PI / 180
        
        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng/2) * Math.sin(deltaLng/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        const distance = R * c
        
        // フェリーの平均速度を20ノット（約37km/h）と仮定
        const duration = Math.round(distance / (37 * 1000 / 3600))
        
        addLog('warning', `${fromPort.name} → ${toPort.name}: 海上直線ルートを生成（フォールバック）`)
        
        return {
          id: `${from}_${to}`,
          from,
          to,
          fromName: fromPort.name,
          toName: toPort.name,
          path,
          distance: Math.round(distance),
          duration,
          source: 'custom',
          geodesic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    }
  } catch (error) {
    addLog('error', `${fromPort.name} → ${toPort.name}: エラー - ${error}`)
  }

  // Google Directions APIで取得できなかった場合はnullを返す
  addLog('warning', `${fromPort.name} → ${toPort.name}: Google APIで取得できなかったためスキップ`)
  return null
}

// すべての航路データを取得
const fetchAllRoutes = async () => {
  if (!directionsService.value) {
    await initGoogleMaps()
    if (!directionsService.value) return
  }

  isFetching.value = true
  fetchedRoutes.value = []
  progress.value = {
    current: 0,
    total: ROUTES_DATA.length,
    message: '航路データを取得中...'
  }

  addLog('info', '航路データの取得を開始します')

  for (const routeInfo of ROUTES_DATA) {
    progress.value.current++
    progress.value.message = `${PORTS_DATA[routeInfo.from]?.name} → ${PORTS_DATA[routeInfo.to]?.name} を取得中...`
    
    const routeData = await fetchSingleRoute(routeInfo.from, routeInfo.to)
    
    if (routeData) {
      fetchedRoutes.value.push(routeData)
    }

    // API制限（特に Overpass API）を避けるため待機を延長
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  progress.value.message = ''
  isFetching.value = false
  
  const skippedCount = ROUTES_DATA.length - fetchedRoutes.value.length
  if (skippedCount > 0) {
    addLog('warning', `${fetchedRoutes.value.length}件取得、${skippedCount}件はAPIで取得できませんでした`)
  } else {
    addLog('success', `${fetchedRoutes.value.length}件の航路データを取得しました`)
  }
}

// Firebase Storageに保存
const saveToStorage = async () => {
  // 現在のユーザーを確認
  const authUser = currentUser.value || auth.currentUser
  if (!authUser) {
    addLog('error', '認証が必要です。ログインしてください。')
    $toast.error('認証が必要です。ログインしてください。')
    return
  }

  if (fetchedRoutes.value.length === 0) {
    addLog('error', '保存する航路データがありません')
    return
  }

  isSaving.value = true

  try {
    // メタデータを作成
    const metadata: RoutesMetadata = {
      version: currentMetadata.value ? currentMetadata.value.version + 1 : 1,
      lastFetchedAt: new Date().toISOString(),
      totalRoutes: fetchedRoutes.value.length,
      fetchedBy: authUser.email || 'admin'
    }

    // データファイルを作成
    const dataFile: RoutesDataFile = {
      metadata,
      routes: fetchedRoutes.value
    }

    // Firebase Storageにアップロード
    await uploadJSON('routes/ferry-routes.json', dataFile, authUser ? { uid: authUser.uid } : undefined)

    // 画面にも即時反映
    currentMetadata.value = metadata
    currentRoutes.value = [...fetchedRoutes.value]
    addLog('success', `Firebase Storageに保存しました (v${metadata.version})`)
    
    // 成功通知
    $toast.success('航路データをFirebase Storageに保存しました')
  } catch (error) {
    addLog('error', `保存エラー: ${error}`)
    $toast.error('航路データの保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

// Firebase Storage から現在のデータをダウンロード
const downloadFromStorage = async () => {
  isDownloading.value = true
  try {
    const url = await getStorageDownloadURL('routes/ferry-routes.json')
    // 直接URLを開くと保存名が付かない可能性があるため、Blob化して保存
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const version = currentMetadata.value?.version
    a.href = objectUrl
    a.download = version ? `ferry-routes.v${version}.json` : 'ferry-routes.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
    addLog('success', 'Storageから航路データをダウンロードしました')
    $toast.success('Storageから航路データをダウンロードしました')
  } catch (error) {
    logger.error('Download failed', error)
    addLog('error', 'Storageからのダウンロードに失敗しました')
    $toast.error('Storageからのダウンロードに失敗しました')
  } finally {
    isDownloading.value = false
  }
}

// マウント時の処理
onMounted(async () => {
  // Firebase Auth の状態を待つ
  const { getCurrentUser } = useAdminAuth()
  const authUser = await getCurrentUser()
  currentUser.value = authUser
  await loadCurrentData()
  await initGoogleMaps()
})
</script>
