import { defineStore } from 'pinia'
import { ref, readonly, onMounted } from 'vue'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import type { TimetableData } from '@/types/timetable'
import type { FareMaster } from '@/types/fare'
import type { HolidayMaster } from '@/types/holiday'
import { createLogger } from '@/utils/logger'
import { buildStorageObjectDownloadUrl } from '@/utils/firebaseStorageUrl'

/**
 * Firebase Storage公開URLを構築（SDKに依存しない）
 * Capacitor環境でも動作する
 */
const getStoragePublicURLCandidates = (path: string): string[] => {
  const config = useRuntimeConfig()
  const url = buildStorageObjectDownloadUrl(
    config.public.firebase,
    `data/${path}`
  )
  return [
    url
  ]
}

export const useOfflineStore = defineStore('offline', () => {
  const logger = createLogger('offlineStore')
  const { 
    isStorageAvailable,
    saveTimetableData,
    getTimetableData,
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
    fare?: number
    holiday?: number
  }>({})

  const fetchJsonFromStorageCandidates = async <T>(
    path: string,
    timeoutMs = 5000
  ): Promise<T | null> => {
    const remoteUrls = getStoragePublicURLCandidates(path)

    for (const remoteUrl of remoteUrls) {
      logger.debug(`Fetching ${path} from:`, remoteUrl)

      const response = await Promise.race([
        fetch(remoteUrl, { cache: 'no-store' }),
        new Promise<Response>((_resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        })
      ]).catch((e) => {
        logger.warn(`Fetch failed or timeout for ${path}`, e)
        return null
      })

      if (response?.ok) {
        const data = await response.json() as T
        return data
      }

      if (response) {
        logger.warn(`Failed to fetch ${path} from Cloud Storage`, {
          status: response.status,
          url: remoteUrl
        })
      }
    }

    return null
  }
  
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
        const data = await fetchJsonFromStorageCandidates<TimetableData>('timetable.json')
        // 成功したらローカルに保存
        if (data) {
          saveTimetableData(data)
          lastSync.value.timetable = Date.now()
          logger.info('Timetable data loaded from Cloud Storage')
          return data
        }
      }
    } catch (e) {
      logger.warn('Failed to fetch timetable data from Cloud Storage', e)
      /* ignore network failures and fallback to cached data */
    }
    
    // オフラインまたはエラーの場合はローカルから取得
    const localData = getTimetableData()
    if (localData) return localData
    
    return null
  }
  
  // 料金データの取得（オフライン対応）
  const fetchFareData = async (): Promise<FareMaster | null> => {
    const localData = getFareData()

    // オンライン時はCloud Storageから取得を試みる
    if (!isOffline.value) {
      try {
        // 公開URLを直接構築（Firebase SDKに依存しない）
        // Capacitor環境でも動作する
        const remoteUrls = getStoragePublicURLCandidates('fare-master.json')

        for (const remoteUrl of remoteUrls) {
          logger.debug('Fetching fare data from:', remoteUrl)

          const response = await Promise.race([
            fetch(remoteUrl, { cache: 'no-store' }),
            new Promise<Response>((_resolve, reject) => {
              setTimeout(() => reject(new Error('Timeout')), 5000) // 5秒でタイムアウト
            })
          ]).catch((e) => {
            logger.warn('Fetch failed or timeout', e)
            return null
          })

          if (response?.ok) {
            const data = await response.json() as FareMaster
            if (data) {
              saveFareData(data)
              lastSync.value.fare = Date.now()
              logger.info('Fare data loaded from Cloud Storage')
              return data
            }
          } else if (response) {
            logger.warn('Failed to fetch fare data from Cloud Storage', {
              status: response.status,
              url: remoteUrl
            })
          }
        }
      } catch (e) {
        logger.warn('Failed to fetch fare data from Cloud Storage', e)
      }
    }

    // オフライン時または取得失敗時はキャッシュを返す
    if (localData) {
      logger.info('Using cached fare data')
      return localData
    }

    logger.warn('No fare data available')
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
      const timetable = await fetchJsonFromStorageCandidates<TimetableData>('timetable.json')
      if (timetable) {
        saveTimetableData(timetable)
        lastSync.value.timetable = Date.now()
      } else {
        errors.push('Failed to download timetable data')
      }
    } catch (e) {
      errors.push('Failed to download timetable data')
    }
    
    // 料金データ（Cloud Storageから取得するため、publicディレクトリからの読み込みは削除）
    // 料金データはfetchFareData()経由でCloud Storageから取得してください
    try {
      const fare = await fetchFareData()
      if (fare) {
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
    fetchFareData,
    fetchHolidayData,
    downloadAllData,
    getLastSyncTimes,
    getOfflineDataInfo,
    cleanup,
    clearOfflineData
  }
})
