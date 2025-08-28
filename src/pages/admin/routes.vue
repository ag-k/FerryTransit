<template>
  <AdminLayout>
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

      <!-- アクションボタン -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          航路データの取得と保存
        </h2>
        
        <div class="space-y-4">
          <button
            @click="fetchAllRoutes"
            :disabled="isFetching"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              :name="isFetching ? 'heroicons:arrow-path' : 'heroicons:cloud-arrow-down'"
              :class="{ 'animate-spin': isFetching }"
              class="mr-2 h-5 w-5"
            />
            {{ isFetching ? '取得中...' : 'Google Maps APIから航路データを取得' }}
          </button>

          <button
            v-if="fetchedRoutes.length > 0"
            @click="saveToStorage"
            :disabled="isSaving"
            class="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              :name="isSaving ? 'heroicons:arrow-path' : 'heroicons:cloud-arrow-up'"
              :class="{ 'animate-spin': isSaving }"
              class="mr-2 h-5 w-5"
            />
            {{ isSaving ? '保存中...' : 'Firebase Storageに保存' }}
          </button>
        </div>

        <!-- 進捗表示 -->
        <div v-if="progress.total > 0" class="mt-6">
          <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>進捗: {{ progress.current }} / {{ progress.total }}</span>
            <span>{{ Math.round((progress.current / progress.total) * 100) }}%</span>
          </div>
          <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${(progress.current / progress.total) * 100}%` }"
            ></div>
          </div>
          <p v-if="progress.message" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {{ progress.message }}
          </p>
        </div>
      </div>

      <!-- 取得結果プレビュー -->
      <div v-if="fetchedRoutes.length > 0" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
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
                      'text-blue-600': route.source === 'manual',
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
      </div>

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
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader } from '@googlemaps/js-api-loader'
import { PORTS_DATA, ROUTES_DATA } from '~/data/ports'
import type { RouteData, RoutesDataFile, RoutesMetadata } from '~/types/route'
import { uploadJSON, getJSONData } from '~/composables/useDataPublish'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { getAuth } from 'firebase/auth'

const { user } = useAdminAuth()
const { $toast } = useNuxtApp()

// Firebase Auth の現在のユーザーを直接取得
const auth = getAuth()
const currentUser = ref(auth.currentUser)

// デバッグ用
console.log('Admin Routes - User from composable:', user.value)
console.log('Admin Routes - Current user from auth:', auth.currentUser)

// State
const isFetching = ref(false)
const isSaving = ref(false)
const fetchedRoutes = ref<RouteData[]>([])
const currentMetadata = ref<RoutesMetadata | null>(null)
const logs = ref<{ timestamp: number; type: 'info' | 'success' | 'error' | 'warning'; message: string }[]>([])
const progress = ref({
  current: 0,
  total: 0,
  message: ''
})

// Google Maps
const directionsService = ref<google.maps.DirectionsService>()

// 初期化
const initGoogleMaps = async () => {
  const apiKey = useRuntimeConfig().public.googleMapsApiKey
  
  if (!apiKey) {
    addLog('error', 'Google Maps APIキーが設定されていません')
    return
  }

  try {
    const loader = new Loader({
      apiKey: apiKey,
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
    case 'google_transit':
      return 'Google Transit'
    case 'google_driving':
      return 'Google Driving'
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
      addLog('info', `現在の航路データを読み込みました (v${data.metadata.version})`)
    }
  } catch (error) {
    addLog('warning', '現在の航路データが見つかりません')
  }
}

// 単一ルートを取得
const fetchSingleRoute = async (from: string, to: string): Promise<RouteData | null> => {
  if (!directionsService.value) return null

  const fromPort = PORTS_DATA[from]
  const toPort = PORTS_DATA[to]
  
  if (!fromPort || !toPort) return null

  // Google Directions APIで取得を試行
  try {
    // TRANSITモードで試行
    let request: google.maps.DirectionsRequest = {
      origin: fromPort.location,
      destination: toPort.location,
      travelMode: google.maps.TravelMode.TRANSIT,
      transitOptions: {
        modes: [google.maps.TransitMode.FERRY],
        routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
      }
    }

    try {
      const result = await directionsService.value.route(request)
      
      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0]
        const leg = route.legs[0]
        
        addLog('success', `${fromPort.name} → ${toPort.name}: Google Transit APIで取得成功`)
        
        return {
          id: `${from}_${to}`,
          from,
          to,
          fromName: fromPort.name,
          toName: toPort.name,
          path: route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() })),
          distance: leg.distance?.value,
          duration: leg.duration?.value,
          source: 'google_transit',
          geodesic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    } catch (transitError) {
      // TRANSITが失敗したらDRIVINGモードで試行
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
        addLog('error', `${fromPort.name} → ${toPort.name}: APIで取得失敗、スキップします`)
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

    // API制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 500))
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
  console.log('Save - Current user:', authUser)
  
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
    
    currentMetadata.value = metadata
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

// マウント時の処理
onMounted(async () => {
  // Firebase Auth の状態を待つ
  const { getCurrentUser } = useAdminAuth()
  const authUser = await getCurrentUser()
  currentUser.value = authUser
  console.log('Mounted - Current user:', authUser)
  
  await loadCurrentData()
  await initGoogleMaps()
})
</script>