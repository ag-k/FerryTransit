import { useFerryStore } from '@/stores/ferry'
import { useUIStore } from '@/stores/ui'

export const useFerryData = () => {
  const ferryStore = useFerryStore()
  const uiStore = useUIStore()
  const { $i18n } = useNuxtApp()

  // 初期データ読み込み
  const initializeData = async () => {
    uiStore.setLoading(true)
    
    try {
      // LocalStorageから初期化（クライアントサイドでのみ）
      await ferryStore.initializeFromStorage()
      
      // 時刻表データと運航状況を並行で取得
      await Promise.all([
        ferryStore.fetchTimetable(),
        ferryStore.fetchShipStatus()
      ])
    } catch (error) {
      console.error('Failed to initialize ferry data:', error)
      uiStore.addAlert('danger', $i18n.t('LOAD_TIMETABLE_ERROR'))
    } finally {
      uiStore.setLoading(false)
    }
  }

  // 時刻表の更新
  const updateTimetable = async () => {
    await ferryStore.fetchTimetable(true) // 強制更新
  }

  // 運航状況の更新
  const updateShipStatus = async () => {
    try {
      await ferryStore.fetchShipStatus()
    } catch (error) {
      uiStore.addAlert('warning', $i18n.t('LOAD_STATUS_ERROR'))
    }
  }

  // 出発地・到着地の入れ替え
  const reverseRoute = () => {
    ferryStore.reverseRoute()
  }

  // 欠航・変更の判定
  const getTripStatus = (trip: any): number => {
    const dateStr = ferryStore.selectedDate.toISOString().split('T')[0]
    const { isokaze, dozen, ferry } = ferryStore.shipStatus

    if (trip.name === 'RAINBOWJET') {
      if (ferry?.hasAlert && ferry.fastFerryState === '欠航') {
        return 2 // Cancel
      }
    } else if (trip.name === 'ISOKAZE' || trip.name === 'ISOKAZE_EX') {
      if (!isokaze?.hasAlert) return 0

      switch (isokaze.status) {
        case 0: return 0 // Normal
        case 1: return 2 // Cancel
        case 2: {
          // 一部欠航
          if (!isokaze.startTime) return 0
          // Compare times as strings (HH:mm format)
          const tripTime = typeof trip.departureTime === 'string' ? trip.departureTime : trip.departureTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
          return tripTime >= isokaze.startTime ? 2 : 0
        }
        case 3: return 3 // Change
        case 4: return 4 // Extra
        default: return 0
      }
    } else if (trip.name === 'FERRY_DOZEN') {
      if (!dozen?.hasAlert) return 0

      switch (dozen.status) {
        case 0: return 0 // Normal
        case 1: return 2 // Cancel
        case 2: {
          // 一部欠航
          if (!dozen.startTime) return 0
          // Compare times as strings (HH:mm format)
          const tripTime = typeof trip.departureTime === 'string' ? trip.departureTime : trip.departureTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
          return tripTime >= dozen.startTime ? 2 : 0
        }
        case 3: {
          // 来居便欠航
          if (!dozen.startTime) return 0
          // Compare times as strings (HH:mm format)
          const tripTime = typeof trip.departureTime === 'string' ? trip.departureTime : trip.departureTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
          return tripTime === dozen.startTime ? 2 : 0
        }
        default: return 0
      }
    } else if (['FERRY_OKI', 'FERRY_SHIRASHIMA', 'FERRY_KUNIGA'].includes(trip.name)) {
      if (ferry?.hasAlert && ferry.ferryState === '欠航') {
        return 2 // Cancel
      }
    }

    return trip.status || 0
  }

  // 港の地図情報取得
  const getPortMap = (portId: string): string | undefined => {
    return ferryStore.portMaps[portId]
  }

  return {
    initializeData,
    updateTimetable,
    updateShipStatus,
    reverseRoute,
    getTripStatus,
    getPortMap,
    
    // Store states
    timetableData: computed(() => ferryStore.timetableData),
    filteredTimetable: computed(() => ferryStore.filteredTimetable),
    shipStatus: computed(() => ferryStore.shipStatus),
    selectedDate: computed(() => ferryStore.selectedDate),
    departure: computed(() => ferryStore.departure),
    arrival: computed(() => ferryStore.arrival),
    isLoading: computed(() => ferryStore.isLoading),
    error: computed(() => ferryStore.error),
    
    // Port data
    hondoPorts: ferryStore.hondoPorts,
    dozenPorts: ferryStore.dozenPorts,
    dogoPorts: ferryStore.dogoPorts
  }
}