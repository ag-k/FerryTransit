import { defineStore } from 'pinia'
import { ref, computed, readonly, nextTick, onMounted, getCurrentInstance } from 'vue'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import type { SearchHistoryItem } from '@/types/history'
import { HISTORY_STORAGE_KEY, HISTORY_SETTINGS } from '@/types/history'

export const useHistoryStore = defineStore('history', () => {
  // Composables
  const { saveData, getData } = useOfflineStorage()
  
  // State
  const history = ref<SearchHistoryItem[]>([])
  
  // Getters
  const recentSearches = computed(() => 
    getRecentSearches(HISTORY_SETTINGS.DEFAULT_RECENT_LIMIT)
  )
  
  const routeHistory = computed(() => 
    history.value
      .filter(item => item.type === 'route')
      .sort((a, b) => 
        new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
      )
  )
  
  const timetableHistory = computed(() => 
    history.value
      .filter(item => item.type === 'timetable')
      .sort((a, b) => 
        new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
      )
  )
  
  const getHistoryItem = computed(() => (id: string): SearchHistoryItem | undefined => {
    return history.value.find(item => item.id === id)
  })
  
  const hasHistory = computed(() => history.value.length > 0)
  
  const hasRecentSearch = (
    type: 'route' | 'timetable', 
    departure?: string, 
    arrival?: string
  ): boolean => {
    return history.value.some(item => 
      item.type === type &&
      item.departure === departure &&
      item.arrival === arrival
    )
  }
  
  // Actions
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  const getRecentSearches = (limit: number = HISTORY_SETTINGS.DEFAULT_RECENT_LIMIT): SearchHistoryItem[] => {
    return [...history.value]
      .sort((a, b) => 
        new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
      )
      .slice(0, limit)
  }
  
  const addSearchHistory = (
    item: Omit<SearchHistoryItem, 'id' | 'searchedAt'>,
    searchedAt?: Date
  ): void => {
    // 重複チェック（同じ検索条件は最新のもののみ保持）
    const existingIndex = history.value.findIndex(h => 
      h.type === item.type &&
      h.departure === item.departure &&
      h.arrival === item.arrival &&
      h.isArrivalMode === item.isArrivalMode
    )
    
    // 既存の重複エントリを削除
    if (existingIndex > -1) {
      history.value.splice(existingIndex, 1)
    }
    
    // 時刻を正しく変換
    let convertedTime: Date | undefined
    if (item.time) {
      if (item.time instanceof Date) {
        convertedTime = item.time
      } else if (typeof item.time === 'string') {
        // 時刻文字列の場合は、今日の日付と組み合わせてDateオブジェクトを作成
        const today = new Date()
        const [hours, minutes] = item.time.split(':')
        convertedTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                                 parseInt(hours), parseInt(minutes), 0, 0)
      } else {
        convertedTime = new Date(item.time)
      }
      
      // 無効な日付の場合はundefinedに設定
      if (isNaN(convertedTime.getTime())) {
        convertedTime = undefined
      }
    }
    
    // 新しいエントリを追加
    const newItem: SearchHistoryItem = {
      ...item,
      id: generateId(),
      searchedAt: searchedAt || new Date(),
      date: item.date instanceof Date ? item.date : new Date(item.date),
      time: convertedTime
    }
    
    // 先頭に追加
    history.value.unshift(newItem)
    
    // 最大エントリ数を超えたら古いものを削除
    if (history.value.length > HISTORY_SETTINGS.MAX_ENTRIES) {
      history.value = history.value.slice(0, HISTORY_SETTINGS.MAX_ENTRIES)
    }
    
    saveToStorage()
  }
  
  const removeHistoryItem = (id: string): void => {
    const index = history.value.findIndex(item => item.id === id)
    if (index > -1) {
      history.value.splice(index, 1)
      saveToStorage()
    }
  }
  
  const clearHistory = (): void => {
    history.value = []
    saveToStorage()
  }
  
  const removeOldEntries = (daysToKeep: number = HISTORY_SETTINGS.DEFAULT_DAYS_TO_KEEP): void => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    const initialLength = history.value.length
    history.value = history.value.filter(item => 
      new Date(item.searchedAt).getTime() > cutoffDate.getTime()
    )
    
    // 変更があった場合のみ保存
    if (history.value.length !== initialLength) {
      saveToStorage()
    }
  }
  
  const loadFromStorage = (): void => {
    const savedHistory = getData<SearchHistoryItem[]>(HISTORY_STORAGE_KEY)
    if (savedHistory && Array.isArray(savedHistory)) {
      // 日付を復元
      history.value = savedHistory.map(item => {
        // 時刻を正しく変換
        let convertedTime: Date | undefined
        if (item.time) {
          if (item.time instanceof Date) {
            convertedTime = new Date(item.time)
          } else if (typeof item.time === 'string') {
            // 時刻文字列の場合は、今日の日付と組み合わせてDateオブジェクトを作成
            const today = new Date()
            const timeMatch = item.time.match(/(\d{1,2}):(\d{2})/)
            if (timeMatch) {
              const [, hours, minutes] = timeMatch
              convertedTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                                       parseInt(hours), parseInt(minutes), 0, 0)
            } else {
              // その他の形式の場合は通常のDate変換を試みる
              convertedTime = new Date(item.time)
            }
          } else {
            convertedTime = new Date(item.time)
          }
          
          // 無効な日付の場合はundefinedに設定
          if (isNaN(convertedTime!.getTime())) {
            convertedTime = undefined
          }
        }
        
        return {
          ...item,
          date: new Date(item.date),
          time: convertedTime,
          searchedAt: new Date(item.searchedAt)
        }
      })
      
      // Migrate old data: remove time from timetable entries
      let hasMigrations = false
      history.value = history.value.map(item => {
        if (item.type === 'timetable' && item.time) {
          hasMigrations = true
          return { ...item, time: undefined }
        }
        return item
      })
      
      // Save migrated data back to storage
      if (hasMigrations) {
        saveToStorage()
      }
      
      // 古いエントリを自動削除
      removeOldEntries()
    }
  }
  
  const saveToStorage = (): void => {
    // 30日間の有効期限で保存（分単位に変換）
    const ttlMinutes = HISTORY_SETTINGS.DEFAULT_DAYS_TO_KEEP * 24 * 60
    saveData(HISTORY_STORAGE_KEY, history.value, ttlMinutes)
  }
  
  // ストレージの変更を監視（他のタブからの変更を反映）
  const setupStorageSync = () => {
    if (process.client) {
      window.addEventListener('storage', (e) => {
        if (e.key === `ferry-transit:${HISTORY_STORAGE_KEY}`) {
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
  
  // マウント時に自動的に初期化（非コンポーネント利用時は直接実行）
  if (getCurrentInstance()) {
    onMounted(() => {
      initializeStore()
    })
  } else if (process.client) {
    initializeStore()
  }
  
  return {
    // State
    history: readonly(history),
    
    // Getters
    recentSearches,
    routeHistory,
    timetableHistory,
    getHistoryItem,
    hasHistory,
    
    // Computed functions
    hasRecentSearch,
    
    // Actions
    addSearchHistory,
    removeHistoryItem,
    clearHistory,
    removeOldEntries,
    getRecentSearches,
    loadFromStorage,
    saveToStorage,
    initializeStore
  }
})
