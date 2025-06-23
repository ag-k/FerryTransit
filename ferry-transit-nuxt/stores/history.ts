import { defineStore } from 'pinia'
import { ref, computed, readonly, nextTick } from 'vue'
import { useOfflineStorage } from '@/composables/useOfflineStorage'
import type { SearchHistoryItem } from '@/types/history'
import { HISTORY_STORAGE_KEY, HISTORY_SETTINGS } from '@/types/history'

export const useHistoryStore = defineStore('history', () => {
  // Composables
  const { saveData, getData, removeData } = useOfflineStorage()
  
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
    item: Omit<SearchHistoryItem, 'id' | 'searchedAt'>
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
    
    // 新しいエントリを追加
    const newItem: SearchHistoryItem = {
      ...item,
      id: generateId(),
      searchedAt: new Date(),
      date: item.date instanceof Date ? item.date : new Date(item.date),
      time: item.time ? (item.time instanceof Date ? item.time : new Date(item.time)) : undefined
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
    try {
      const savedHistory = getData<SearchHistoryItem[]>(HISTORY_STORAGE_KEY)
      if (savedHistory && Array.isArray(savedHistory)) {
        // 日付を復元
        history.value = savedHistory.map(item => ({
          ...item,
          date: new Date(item.date),
          time: item.time ? new Date(item.time) : undefined,
          searchedAt: new Date(item.searchedAt)
        }))
        
        // 古いエントリを自動削除
        removeOldEntries()
      }
    } catch (error) {
      console.error('Failed to load search history from storage:', error)
    }
  }
  
  const saveToStorage = (): void => {
    try {
      // 30日間の有効期限で保存
      const ttl = HISTORY_SETTINGS.DEFAULT_DAYS_TO_KEEP * 24 * 60 * 60 * 1000
      saveData(HISTORY_STORAGE_KEY, history.value, ttl)
    } catch (error) {
      console.error('Failed to save search history to storage:', error)
    }
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
  
  // マウント時に自動的に初期化
  // Note: onMountedは省略し、コンポーネント側で明示的に初期化を呼ぶ
  // これによりテスト環境での警告を回避
  
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