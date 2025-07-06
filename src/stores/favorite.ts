import { defineStore } from 'pinia'
import { ref, computed, readonly, onMounted, nextTick } from 'vue'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import type { 
  FavoriteRoute, 
  FavoritePort
} from '@/types/favorite'
import { FAVORITE_STORAGE_KEYS, MAX_FAVORITES } from '@/types/favorite'

export const useFavoriteStore = defineStore('favorite', () => {
  // Composables
  const { saveData, getData, removeData } = useOfflineStorage()
  
  // State
  const routes = ref<FavoriteRoute[]>([])
  const ports = ref<FavoritePort[]>([])
  
  // Getters
  const recentRoutes = computed(() => 
    [...routes.value].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )
  
  const orderedRoutes = computed(() => 
    [...routes.value].sort((a, b) => a.sortOrder - b.sortOrder)
  )
  
  const recentPorts = computed(() => 
    [...ports.value].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )
  
  const orderedPorts = computed(() => 
    [...ports.value].sort((a, b) => a.sortOrder - b.sortOrder)
  )
  
  const isRouteFavorited = (departure: string, arrival: string): boolean => {
    return routes.value.some(route => 
      route.departure === departure && route.arrival === arrival
    )
  }
  
  const isPortFavorited = (portCode: string): boolean => {
    return ports.value.some(port => port.portCode === portCode)
  }
  
  const getFavoriteRoute = (id: string): FavoriteRoute | undefined => {
    return routes.value.find(route => route.id === id)
  }
  
  const getFavoritePort = (id: string): FavoritePort | undefined => {
    return ports.value.find(port => port.id === id)
  }
  
  // Actions
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  const getNextSortOrder = (items: { sortOrder: number }[]): number => {
    if (items.length === 0) return 0
    return Math.max(...items.map(item => item.sortOrder)) + 1
  }
  
  const addFavoriteRoute = (
    route: Omit<FavoriteRoute, 'id' | 'createdAt' | 'sortOrder'>
  ): void => {
    // 上限チェック
    if (routes.value.length >= MAX_FAVORITES.ROUTES) {
      throw new Error(`Maximum ${MAX_FAVORITES.ROUTES} favorite routes allowed`)
    }
    
    // 重複チェック
    if (isRouteFavorited(route.departure, route.arrival)) {
      throw new Error('This route is already in favorites')
    }
    
    const newRoute: FavoriteRoute = {
      ...route,
      id: generateId(),
      createdAt: new Date(),
      sortOrder: getNextSortOrder(routes.value)
    }
    
    routes.value.push(newRoute)
    saveToStorage()
  }
  
  const addFavoritePort = (
    port: Omit<FavoritePort, 'id' | 'createdAt' | 'sortOrder'>
  ): void => {
    // 上限チェック
    if (ports.value.length >= MAX_FAVORITES.PORTS) {
      throw new Error(`Maximum ${MAX_FAVORITES.PORTS} favorite ports allowed`)
    }
    
    // 重複チェック
    if (isPortFavorited(port.portCode)) {
      throw new Error('This port is already in favorites')
    }
    
    const newPort: FavoritePort = {
      ...port,
      id: generateId(),
      createdAt: new Date(),
      sortOrder: getNextSortOrder(ports.value)
    }
    
    ports.value.push(newPort)
    saveToStorage()
  }
  
  const removeFavoriteRoute = (id: string): void => {
    const index = routes.value.findIndex(route => route.id === id)
    if (index > -1) {
      routes.value.splice(index, 1)
      // 並び順を再調整
      routes.value.forEach((route, i) => {
        route.sortOrder = i
      })
      saveToStorage()
    }
  }
  
  const removeFavoritePort = (id: string): void => {
    const index = ports.value.findIndex(port => port.id === id)
    if (index > -1) {
      ports.value.splice(index, 1)
      // 並び順を再調整
      ports.value.forEach((port, i) => {
        port.sortOrder = i
      })
      saveToStorage()
    }
  }
  
  const updateFavoriteRoute = (
    id: string, 
    updates: Partial<Omit<FavoriteRoute, 'id' | 'createdAt'>>
  ): void => {
    const route = routes.value.find(r => r.id === id)
    if (route) {
      Object.assign(route, updates)
      saveToStorage()
    }
  }
  
  const updateFavoritePort = (
    id: string, 
    updates: Partial<Omit<FavoritePort, 'id' | 'createdAt'>>
  ): void => {
    const port = ports.value.find(p => p.id === id)
    if (port) {
      Object.assign(port, updates)
      saveToStorage()
    }
  }
  
  const reorderFavoriteRoutes = (ids: string[]): void => {
    // すべてのIDが存在することを確認
    const routeMap = new Map(routes.value.map(route => [route.id, route]))
    if (ids.some(id => !routeMap.has(id))) {
      throw new Error('Invalid route IDs provided')
    }
    
    // 新しい順序で並び替え
    routes.value = ids.map((id, index) => {
      const route = routeMap.get(id)!
      route.sortOrder = index
      return route
    })
    
    saveToStorage()
  }
  
  const reorderFavoritePorts = (ids: string[]): void => {
    // すべてのIDが存在することを確認
    const portMap = new Map(ports.value.map(port => [port.id, port]))
    if (ids.some(id => !portMap.has(id))) {
      throw new Error('Invalid port IDs provided')
    }
    
    // 新しい順序で並び替え
    ports.value = ids.map((id, index) => {
      const port = portMap.get(id)!
      port.sortOrder = index
      return port
    })
    
    saveToStorage()
  }
  
  const clearAllFavorites = (): void => {
    routes.value = []
    ports.value = []
    saveToStorage()
  }
  
  const loadFromStorage = (): void => {
    try {
      // ルートを読み込み
      const savedRoutes = getData<FavoriteRoute[]>(FAVORITE_STORAGE_KEYS.ROUTES)
      if (savedRoutes && Array.isArray(savedRoutes)) {
        // 日付を復元
        routes.value = savedRoutes.map(route => ({
          ...route,
          createdAt: new Date(route.createdAt)
        }))
      }
      
      // 港を読み込み
      const savedPorts = getData<FavoritePort[]>(FAVORITE_STORAGE_KEYS.PORTS)
      if (savedPorts && Array.isArray(savedPorts)) {
        // 日付を復元
        ports.value = savedPorts.map(port => ({
          ...port,
          createdAt: new Date(port.createdAt)
        }))
      }
    } catch (error) {
      console.error('Failed to load favorites from storage:', error)
    }
  }
  
  const saveToStorage = (): void => {
    try {
      // ルートを保存（無期限）
      saveData(FAVORITE_STORAGE_KEYS.ROUTES, routes.value)
      
      // 港を保存（無期限）
      saveData(FAVORITE_STORAGE_KEYS.PORTS, ports.value)
    } catch (error) {
      console.error('Failed to save favorites to storage:', error)
    }
  }
  
  // ストレージの変更を監視（他のタブからの変更を反映）
  const setupStorageSync = () => {
    if (process.client) {
      window.addEventListener('storage', (e) => {
        if (e.key === `ferry-transit:${FAVORITE_STORAGE_KEYS.ROUTES}` || 
            e.key === `ferry-transit:${FAVORITE_STORAGE_KEYS.PORTS}`) {
          loadFromStorage()
        }
      })
    }
  }
  
  // 初期化
  const initializeStore = async () => {
    // SSR時はスキップ
    if (!process.client) return
    
    // ハイドレーション完了後に実行
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve(true)
      } else {
        window.addEventListener('load', () => resolve(true))
      }
    })
    
    await nextTick()
    
    loadFromStorage()
    setupStorageSync()
  }
  
  // マウント時に自動的に初期化
  onMounted(() => {
    initializeStore()
  })
  
  return {
    // State
    routes: readonly(routes),
    ports: readonly(ports),
    
    // Getters
    recentRoutes,
    orderedRoutes,
    recentPorts,
    orderedPorts,
    
    // Computed functions
    isRouteFavorited,
    isPortFavorited,
    getFavoriteRoute,
    getFavoritePort,
    
    // Actions
    addFavoriteRoute,
    addFavoritePort,
    removeFavoriteRoute,
    removeFavoritePort,
    updateFavoriteRoute,
    updateFavoritePort,
    reorderFavoriteRoutes,
    reorderFavoritePorts,
    clearAllFavorites,
    loadFromStorage,
    saveToStorage,
    initializeStore
  }
})