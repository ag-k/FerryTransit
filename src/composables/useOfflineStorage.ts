import { createLogger } from '~/utils/logger'

export interface OfflineStorageItem {
  key: string
  data: any
  timestamp: number
  expiresAt?: number
}

export const useOfflineStorage = () => {
  const logger = createLogger('useOfflineStorage')
  
  // ストレージキーのプレフィックス
  const STORAGE_PREFIX = 'ferry-transit:'
  
  // ローカルストレージが利用可能かチェック
  const isStorageAvailable = (): boolean => {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }
  
  // データを保存
  const saveData = (key: string, data: any, ttlMinutes?: number): boolean => {
    if (!isStorageAvailable()) return false
    
    try {
      const item: OfflineStorageItem = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: ttlMinutes ? Date.now() + (ttlMinutes * 60 * 1000) : undefined
      }
      
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(item))
      return true
    } catch (e) {
      logger.error('Failed to save to localStorage', e)
      return false
    }
  }
  
  // データを取得
  const getData = <T = any>(key: string): T | null => {
    if (!isStorageAvailable()) return null
    
    try {
      const itemStr = localStorage.getItem(STORAGE_PREFIX + key)
      if (!itemStr) return null
      
      const item: OfflineStorageItem = JSON.parse(itemStr)
      
      // 有効期限チェック
      if (item.expiresAt && Date.now() > item.expiresAt) {
        removeData(key)
        return null
      }
      
      return item.data as T
    } catch (e) {
      logger.error('Failed to read from localStorage', e)
      return null
    }
  }
  
  // データを削除
  const removeData = (key: string): boolean => {
    if (!isStorageAvailable()) return false
    
    try {
      localStorage.removeItem(STORAGE_PREFIX + key)
      return true
    } catch {
      return false
    }
  }
  
  // キーパターンに一致するデータを削除
  const removeByPattern = (pattern: string): number => {
    if (!isStorageAvailable()) return 0
    
    let removed = 0
    const keys = Object.keys(localStorage)
    
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX + pattern)) {
        try {
          localStorage.removeItem(key)
          removed++
        } catch {
          // Skip errors
        }
      }
    }
    
    return removed
  }
  
  // すべてのデータを削除
  const clearAll = (): boolean => {
    if (!isStorageAvailable()) return false
    
    try {
      const keys = Object.keys(localStorage)
      
      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key)
        }
      }
      
      return true
    } catch {
      return false
    }
  }
  
  // ストレージ使用量を取得（概算）
  const getStorageSize = (): { used: number; total: number; percentage: number } => {
    if (!isStorageAvailable()) {
      return { used: 0, total: 0, percentage: 0 }
    }
    
    let used = 0
    const keys = Object.keys(localStorage)
    
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            used += key.length + value.length
          }
        } catch {
          // Skip errors
        }
      }
    }
    
    // LocalStorage の容量は通常 5-10MB
    const total = 5 * 1024 * 1024 // 5MB
    const percentage = Math.round((used / total) * 100)
    
    return { used, total, percentage }
  }
  
  // 期限切れデータをクリーンアップ
  const cleanupExpired = (): number => {
    if (!isStorageAvailable()) return 0
    
    let cleaned = 0
    const keys = Object.keys(localStorage)
    const now = Date.now()
    
    for (const key of keys) {
      if (key.startsWith(STORAGE_PREFIX)) {
        try {
          const value = localStorage.getItem(key)
          if (!value) continue
          
          const item: OfflineStorageItem = JSON.parse(value)
          if (item.expiresAt && now > item.expiresAt) {
            localStorage.removeItem(key)
            cleaned++
          }
        } catch {
          // Skip errors
        }
      }
    }
    
    return cleaned
  }
  
  // 時刻表データを保存
  const saveTimetableData = (data: any): boolean => {
    return saveData('timetable', data, 60 * 24) // 24時間
  }
  
  // 時刻表データを取得
  const getTimetableData = (): any => {
    return getData('timetable')
  }
  
  // 料金データを保存
  const saveFareData = (data: any): boolean => {
    return saveData('fare', data, 60 * 24 * 7) // 1週間
  }
  
  // 料金データを取得
  const getFareData = (): any => {
    return getData('fare')
  }
  
  // 祝日データを保存
  const saveHolidayData = (data: any): boolean => {
    return saveData('holiday', data, 60 * 24 * 30) // 30日
  }
  
  // 祝日データを取得
  const getHolidayData = (): any => {
    return getData('holiday')
  }
  
  // データのタイムスタンプを取得
  const getDataTimestamp = (key: string): number | null => {
    if (!isStorageAvailable()) return null
    
    try {
      const itemStr = localStorage.getItem(STORAGE_PREFIX + key)
      if (!itemStr) return null
      
      const item: OfflineStorageItem = JSON.parse(itemStr)
      return item.timestamp
    } catch {
      return null
    }
  }
  
  // データが有効かチェック
  const isDataValid = (key: string, maxAgeMinutes: number): boolean => {
    const timestamp = getDataTimestamp(key)
    if (!timestamp) return false
    
    const age = Date.now() - timestamp
    return age < (maxAgeMinutes * 60 * 1000)
  }
  
  return {
    isStorageAvailable,
    saveData,
    getData,
    removeData,
    removeByPattern,
    clearAll,
    getStorageSize,
    cleanupExpired,
    saveTimetableData,
    getTimetableData,
    saveFareData,
    getFareData,
    saveHolidayData,
    getHolidayData,
    getDataTimestamp,
    isDataValid
  }
}
