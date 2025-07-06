import { useFavoriteStore } from '@/stores/favorite'
import { useFerryStore } from '@/stores/ferry'
import { useUIStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import type { FavoriteRoute, FavoritePort } from '@/types/favorite'

export const useFavorites = () => {
  const favoriteStore = useFavoriteStore()
  const ferryStore = useFerryStore()
  const uiStore = useUIStore()
  const router = useRouter()
  const { $i18n } = useNuxtApp()
  const localePath = useLocalePath()

  // ルートのお気に入り切り替え
  const toggleFavoriteRoute = async (
    departure: string, 
    arrival: string, 
    nickname?: string
  ): Promise<boolean> => {
    try {
      const isFavorited = favoriteStore.isRouteFavorited(departure, arrival)
      
      if (isFavorited) {
        // お気に入りから削除
        const route = favoriteStore.orderedRoutes.find(
          r => r.departure === departure && r.arrival === arrival
        )
        if (route) {
          favoriteStore.removeFavoriteRoute(route.id)
          uiStore.addAlert('info', $i18n.t('FAVORITE_ROUTE_REMOVED'))
        }
        return false
      } else {
        // お気に入りに追加
        favoriteStore.addFavoriteRoute({
          departure,
          arrival,
          nickname
        })
        uiStore.addAlert('info', $i18n.t('FAVORITE_ROUTE_ADDED'))
        return true
      }
    } catch (error) {
      // エラーメッセージの表示
      if (error instanceof Error) {
        if (error.message.includes('Maximum')) {
          uiStore.addAlert('warning', $i18n.t('FAVORITE_ROUTE_LIMIT_EXCEEDED'))
        } else if (error.message.includes('already')) {
          uiStore.addAlert('warning', $i18n.t('FAVORITE_ROUTE_ALREADY_EXISTS'))
        } else {
          uiStore.addAlert('danger', $i18n.t('FAVORITE_ERROR'))
        }
      }
      return false
    }
  }

  // 港のお気に入り切り替え
  const toggleFavoritePort = async (
    portCode: string, 
    nickname?: string
  ): Promise<boolean> => {
    try {
      const isFavorited = favoriteStore.isPortFavorited(portCode)
      
      if (isFavorited) {
        // お気に入りから削除
        const port = favoriteStore.orderedPorts.find(p => p.portCode === portCode)
        if (port) {
          favoriteStore.removeFavoritePort(port.id)
          uiStore.addAlert('info', $i18n.t('FAVORITE_PORT_REMOVED'))
        }
        return false
      } else {
        // お気に入りに追加
        favoriteStore.addFavoritePort({
          portCode,
          nickname
        })
        uiStore.addAlert('info', $i18n.t('FAVORITE_PORT_ADDED'))
        return true
      }
    } catch (error) {
      // エラーメッセージの表示
      if (error instanceof Error) {
        if (error.message.includes('Maximum')) {
          uiStore.addAlert('warning', $i18n.t('FAVORITE_PORT_LIMIT_EXCEEDED'))
        } else if (error.message.includes('already')) {
          uiStore.addAlert('warning', $i18n.t('FAVORITE_PORT_ALREADY_EXISTS'))
        } else {
          uiStore.addAlert('danger', $i18n.t('FAVORITE_ERROR'))
        }
      }
      return false
    }
  }

  // ルートがお気に入りかチェック
  const isFavoriteRoute = (departure: string, arrival: string): boolean => {
    return favoriteStore.isRouteFavorited(departure, arrival)
  }

  // 港がお気に入りかチェック
  const isFavoritePort = (portCode: string): boolean => {
    return favoriteStore.isPortFavorited(portCode)
  }

  // ルートの表示名を取得（港名付き）
  const getRouteDisplayName = (route: FavoriteRoute): string => {
    const departurePort = $i18n.t(route.departure)
    const arrivalPort = $i18n.t(route.arrival)
    
    if (route.nickname) {
      return `${route.nickname} (${departurePort} → ${arrivalPort})`
    }
    return `${departurePort} → ${arrivalPort}`
  }

  // 港の表示名を取得（i18n対応）
  const getPortDisplayName = (port: FavoritePort): string => {
    const portName = $i18n.t(port.portCode)
    
    if (port.nickname) {
      return `${port.nickname} (${portName})`
    }
    return portName
  }

  // お気に入りルートで検索実行
  const searchFavoriteRoute = async (route: FavoriteRoute) => {
    // ferryStoreに検索条件を設定
    ferryStore.setDeparture(route.departure)
    ferryStore.setArrival(route.arrival)
    
    // 乗換案内ページへ遷移
    await router.push({
      path: localePath('/transit'),
      query: {
        from: route.departure,
        to: route.arrival
      }
    })
  }

  // お気に入り港を選択（港セレクターで使用）
  const selectFavoritePort = (port: FavoritePort, type: 'departure' | 'arrival') => {
    if (type === 'departure') {
      ferryStore.setDeparture(port.portCode)
    } else {
      ferryStore.setArrival(port.portCode)
    }
  }

  // お気に入りルートのニックネーム更新
  const updateFavoriteRouteNickname = async (id: string, nickname: string) => {
    try {
      favoriteStore.updateFavoriteRoute(id, { nickname: nickname || undefined })
      uiStore.addAlert('info', $i18n.t('FAVORITE_NICKNAME_UPDATED'))
    } catch (error) {
      uiStore.addAlert('danger', $i18n.t('FAVORITE_UPDATE_ERROR'))
    }
  }

  // お気に入り港のニックネーム更新
  const updateFavoritePortNickname = async (id: string, nickname: string) => {
    try {
      favoriteStore.updateFavoritePort(id, { nickname: nickname || undefined })
      uiStore.addAlert('info', $i18n.t('FAVORITE_NICKNAME_UPDATED'))
    } catch (error) {
      uiStore.addAlert('danger', $i18n.t('FAVORITE_UPDATE_ERROR'))
    }
  }

  // お気に入りリストの並び替え
  const reorderFavoriteRoutes = async (ids: string[]) => {
    try {
      favoriteStore.reorderFavoriteRoutes(ids)
      uiStore.addAlert('info', $i18n.t('FAVORITE_ORDER_UPDATED'))
    } catch (error) {
      uiStore.addAlert('danger', $i18n.t('FAVORITE_REORDER_ERROR'))
    }
  }

  const reorderFavoritePorts = async (ids: string[]) => {
    try {
      favoriteStore.reorderFavoritePorts(ids)
      uiStore.addAlert('info', $i18n.t('FAVORITE_ORDER_UPDATED'))
    } catch (error) {
      uiStore.addAlert('danger', $i18n.t('FAVORITE_REORDER_ERROR'))
    }
  }

  // すべてのお気に入りをクリア（確認付き）
  const clearAllFavorites = async (): Promise<boolean> => {
    const confirmed = window.confirm($i18n.t('FAVORITE_CLEAR_CONFIRM'))
    if (confirmed) {
      favoriteStore.clearAllFavorites()
      uiStore.addAlert('info', $i18n.t('FAVORITE_ALL_CLEARED'))
      return true
    }
    return false
  }

  // お気に入りデータの統計情報
  const getFavoriteStats = () => {
    return {
      routeCount: favoriteStore.routes.length,
      routeLimit: 10, // MAX_FAVORITES.ROUTES
      portCount: favoriteStore.ports.length,
      portLimit: 5, // MAX_FAVORITES.PORTS
      canAddRoute: favoriteStore.routes.length < 10,
      canAddPort: favoriteStore.ports.length < 5
    }
  }

  return {
    // トグル機能
    toggleFavoriteRoute,
    toggleFavoritePort,
    
    // チェック機能
    isFavoriteRoute,
    isFavoritePort,
    
    // 表示名取得
    getRouteDisplayName,
    getPortDisplayName,
    
    // アクション
    searchFavoriteRoute,
    selectFavoritePort,
    updateFavoriteRouteNickname,
    updateFavoritePortNickname,
    reorderFavoriteRoutes,
    reorderFavoritePorts,
    clearAllFavorites,
    
    // 統計情報
    getFavoriteStats,
    
    // ストアのデータへの直接アクセス
    favoriteRoutes: computed(() => favoriteStore.routes),
    favoritePorts: computed(() => favoriteStore.ports),
    recentRoutes: computed(() => favoriteStore.recentRoutes),
    recentPorts: computed(() => favoriteStore.recentPorts),
    orderedRoutes: computed(() => favoriteStore.orderedRoutes),
    orderedPorts: computed(() => favoriteStore.orderedPorts)
  }
}