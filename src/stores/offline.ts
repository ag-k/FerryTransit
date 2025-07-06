import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import type { TimetableData } from '@/types/timetable'
import type { FerryStatus } from '@/types/ferry'
import type { FareMaster } from '@/types/fare'
import type { HolidayMaster } from '@/types/holiday'

export const useOfflineStore = defineStore('offline', () => {
  const { 
    isStorageAvailable,
    saveTimetableData,
    getTimetableData,
    saveStatusData,
    getStatusData,
    saveFareData,
    getFareData,
    saveHolidayData,
    getHolidayData,
    getDataTimestamp,
    isDataValid,
    getStorageSize,
    cleanupExpired,
    clearAll
  } = useOfflineStorage()
  
  // State
  const isOffline = ref(false)
  const lastSync = ref<{
    timetable?: number
    status?: number
    fare?: number
    holiday?: number
  }>({})
  
  // オフライン状態の監視
  const setupOfflineDetection = () => {
    if (process.client) {
      isOffline.value = !navigator.onLine
      
      window.addEventListener('online', () => {
        isOffline.value = false
      })
      
      window.addEventListener('offline', () => {
        isOffline.value = true
      })
    }
  }
  
  // 時刻表データの取得（オフライン対応）
  const fetchTimetableData = async (): Promise<TimetableData | null> => {
    try {
      // オンラインの場合は通常通り取得
      if (!isOffline.value) {
        const data = await $fetch<TimetableData>('/api/timetable')
        // 成功したらローカルに保存
        if (data) {
          saveTimetableData(data)
          lastSync.value.timetable = Date.now()
        }
        return data
      }
    } catch (e) {
      console.error('Failed to fetch timetable data:', e)
    }
    
    // オフラインまたはエラーの場合はローカルから取得
    const localData = getTimetableData()
    if (localData) {
      console.info('Using offline timetable data')
      return localData
    }
    
    return null
  }
  
  // 運航状況データの取得（オフライン対応）
  const fetchStatusData = async (): Promise<FerryStatus | null> => {
    try {
      // オンラインの場合は通常通り取得
      if (!isOffline.value) {
        // 実際のAPIエンドポイントに置き換える
        const data = await $fetch<FerryStatus>('/api/status')
        // 成功したらローカルに保存
        if (data) {
          saveStatusData(data)
          lastSync.value.status = Date.now()
        }
        return data
      }
    } catch (e) {
      console.error('Failed to fetch status data:', e)
    }
    
    // オフラインまたはエラーの場合はローカルから取得
    const localData = getStatusData()
    if (localData) {
      console.info('Using offline status data')
      return localData
    }
    
    return null
  }
  
  // 料金データの取得（オフライン対応）
  const fetchFareData = async (): Promise<FareMaster | null> => {
    try {
      // データが新しい場合はローカルから返す
      if (isDataValid('fare', 60 * 24 * 7)) { // 1週間
        const localData = getFareData()
        if (localData) return localData
      }
      
      // オンラインの場合は新しいデータを取得
      if (!isOffline.value) {
        const data = await $fetch<FareMaster>('/data/fare-master.json')
        // 成功したらローカルに保存
        if (data) {
          saveFareData(data)
          lastSync.value.fare = Date.now()
        }
        return data
      }
    } catch (e) {
      console.error('Failed to fetch fare data:', e)
    }
    
    // オフラインまたはエラーの場合はローカルから取得
    const localData = getFareData()
    if (localData) {
      console.info('Using offline fare data')
      return localData
    }
    
    return null
  }
  
  // 祝日データの取得（オフライン対応）
  const fetchHolidayData = async (): Promise<HolidayMaster | null> => {
    try {
      // データが新しい場合はローカルから返す
      if (isDataValid('holiday', 60 * 24 * 30)) { // 30日
        const localData = getHolidayData()
        if (localData) return localData
      }
      
      // オンラインの場合は新しいデータを取得
      if (!isOffline.value) {
        const data = await $fetch<HolidayMaster>('/data/holidays.json')
        // 成功したらローカルに保存
        if (data) {
          saveHolidayData(data)
          lastSync.value.holiday = Date.now()
        }
        return data
      }
    } catch (e) {
      console.error('Failed to fetch holiday data:', e)
    }
    
    // オフラインまたはエラーの場合はローカルから取得
    const localData = getHolidayData()
    if (localData) {
      console.info('Using offline holiday data')
      return localData
    }
    
    return null
  }
  
  // すべてのデータを事前ダウンロード
  const downloadAllData = async (): Promise<{
    success: boolean
    errors: string[]
  }> => {
    const errors: string[] = []
    
    // 時刻表データ
    try {
      const timetable = await $fetch<TimetableData>('/api/timetable')
      if (timetable) {
        saveTimetableData(timetable)
        lastSync.value.timetable = Date.now()
      }
    } catch (e) {
      errors.push('Failed to download timetable data')
    }
    
    // 料金データ
    try {
      const fare = await $fetch<FareMaster>('/data/fare-master.json')
      if (fare) {
        saveFareData(fare)
        lastSync.value.fare = Date.now()
      }
    } catch (e) {
      errors.push('Failed to download fare data')
    }
    
    // 祝日データ
    try {
      const holiday = await $fetch<HolidayMaster>('/data/holidays.json')
      if (holiday) {
        saveHolidayData(holiday)
        lastSync.value.holiday = Date.now()
      }
    } catch (e) {
      errors.push('Failed to download holiday data')
    }
    
    return {
      success: errors.length === 0,
      errors
    }
  }
  
  // 最終同期時刻を取得
  const getLastSyncTimes = () => {
    return {
      timetable: getDataTimestamp('timetable'),
      status: getDataTimestamp('status'),
      fare: getDataTimestamp('fare'),
      holiday: getDataTimestamp('holiday')
    }
  }
  
  // オフラインデータのサイズ情報を取得
  const getOfflineDataInfo = () => {
    const storage = getStorageSize()
    const syncTimes = getLastSyncTimes()
    
    return {
      storage,
      syncTimes,
      isOffline: isOffline.value,
      isStorageAvailable: isStorageAvailable()
    }
  }
  
  // クリーンアップ
  const cleanup = () => {
    return cleanupExpired()
  }
  
  // すべてのオフラインデータを削除
  const clearOfflineData = () => {
    const result = clearAll()
    if (result) {
      lastSync.value = {}
    }
    return result
  }
  
  // 初期化
  onMounted(() => {
    setupOfflineDetection()
    cleanup() // 期限切れデータをクリーンアップ
  })
  
  return {
    // State
    isOffline: readonly(isOffline),
    lastSync: readonly(lastSync),
    
    // Actions
    fetchTimetableData,
    fetchStatusData,
    fetchFareData,
    fetchHolidayData,
    downloadAllData,
    getLastSyncTimes,
    getOfflineDataInfo,
    cleanup,
    clearOfflineData
  }
})