import { defineStore } from 'pinia'
import { ref, readonly, onMounted } from 'vue'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import { getStorageDownloadURL } from '@/composables/useDataPublish'
import type { TimetableData } from '@/types/timetable'
import type { FerryStatus } from '@/types/ferry'
import type { FareMaster } from '@/types/fare'
import type { HolidayMaster } from '@/types/holiday'
import { createLogger } from '@/utils/logger'

export const useOfflineStore = defineStore('offline', () => {
  const logger = createLogger('offlineStore')
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
        // publicディレクトリから直接取得
        const data = await $fetch<TimetableData>('/data/timetable.json')
        // 成功したらローカルに保存
        if (data) {
          saveTimetableData(data)
          lastSync.value.timetable = Date.now()
        }
        return data
      }
    } catch (e) {
      /* ignore network failures and fallback to cached data */
    }
    
    // オフラインまたはエラーの場合はローカルから取得
    const localData = getTimetableData()
    if (localData) return localData
    
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
      /* ignore network failures and fallback to cached data */
    }
    
    // オフラインまたはエラーの場合はローカルから取得
    const localData = getStatusData()
    if (localData) return localData
    
    return null
  }
  
  // 料金データの取得（オフライン対応）
  const fetchFareData = async (): Promise<FareMaster | null> => {
    const localData = getFareData()

    if (!isOffline.value) {
      try {
        // Cloud Storageからのみ取得（ローカルファイルフォールバックなし）
        const remoteUrl = await getStorageDownloadURL('fare-master.json').catch(() => null)

        if (remoteUrl) {
          const response = await fetch(remoteUrl, {
            cache: 'no-store'
          })

          if (response.ok) {
            const data = await response.json() as FareMaster
            if (data) {
              saveFareData(data)
              lastSync.value.fare = Date.now()
              return data
            }
          } else {
            logger.warn('Failed to fetch latest fare data from Cloud Storage', { status: response.status })
          }
        } else {
          logger.warn('Fare data not found in Cloud Storage. Please publish data from admin panel.')
        }
      } catch (e) {
        logger.warn('Failed to fetch fare data from Cloud Storage', e)
      }
    }

    // オフライン時またはCloud Storage取得失敗時はキャッシュを返す
    if (localData) return localData
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
        // publicディレクトリから直接取得
        const data = await $fetch<HolidayMaster>('/data/holidays.json')
        // 成功したらローカルに保存
        if (data) {
          saveHolidayData(data)
          lastSync.value.holiday = Date.now()
        }
        return data
      }
    } catch (e) {
      /* ignore network failures and fallback to cached data */
    }
    
    // オフラインまたはエラーの場合はローカルから取得
    const localData = getHolidayData()
    if (localData) return localData
    
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
      const timetable = await $fetch<TimetableData>('/data/timetable.json')
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
