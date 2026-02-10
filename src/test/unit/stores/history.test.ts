import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore } from '@/stores/history'
import type { SearchHistoryItem } from '@/types/history'
import { HISTORY_STORAGE_KEY, HISTORY_SETTINGS } from '@/types/history'

// Mock functions for storage
const mockSaveData = vi.fn()
const mockGetData = vi.fn()
const mockRemoveData = vi.fn()

// Mock useOfflineStorage
vi.mock('@/composables/useOfflineStorage', () => ({
  useOfflineStorage: () => ({
    saveData: mockSaveData,
    getData: mockGetData,
    removeData: mockRemoveData
  })
}))

// Mock window.addEventListener for storage sync
const mockAddEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
})

describe('History Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Mock client-side environment
    vi.stubGlobal('process', { 
      client: true,
      env: {
        NODE_ENV: 'test'
      }
    })
    // Mock document.readyState
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('初期化', () => {
    it('ストアが正しく初期化される', () => {
      const store = useHistoryStore()
      expect(store.history).toEqual([])
      expect(store.hasHistory).toBe(false)
    })
  })

  describe('履歴の追加', () => {
    it('検索履歴を追加できる', () => {
      const store = useHistoryStore()
      const historyItem: Omit<SearchHistoryItem, 'id' | 'searchedAt'> = {
        type: 'route',
        departure: 'hongo',
        arrival: 'saigo',
        date: new Date('2025-06-23'),
        isArrivalMode: false
      }

      store.addSearchHistory(historyItem)

      expect(store.history).toHaveLength(1)
      expect(store.history[0]).toMatchObject({
        type: 'route',
        departure: 'hongo',
        arrival: 'saigo',
        isArrivalMode: false
      })
      expect(store.history[0].id).toBeDefined()
      expect(store.history[0].searchedAt).toBeDefined()
    })

    it('重複する検索は最新のもののみ保持される', () => {
      const store = useHistoryStore()
      const historyItem: Omit<SearchHistoryItem, 'id' | 'searchedAt'> = {
        type: 'route',
        departure: 'hongo',
        arrival: 'saigo',
        date: new Date('2025-06-23'),
        isArrivalMode: false
      }

      store.addSearchHistory(historyItem)
      const firstId = store.history[0].id

      // 同じ検索を再度追加
      store.addSearchHistory({
        ...historyItem,
        date: new Date('2025-06-24')
      })

      expect(store.history).toHaveLength(1)
      expect(store.history[0].id).not.toBe(firstId)
      expect(store.history[0].date).toEqual(new Date('2025-06-24'))
    })

    it('カスタムsearchedAtを指定して検索履歴を追加できる', () => {
      const store = useHistoryStore()
      const customSearchedAt = new Date('2025-01-15T10:00:00')
      const historyItem: Omit<SearchHistoryItem, 'id' | 'searchedAt'> = {
        type: 'route',
        departure: 'hongo',
        arrival: 'saigo',
        date: new Date('2025-06-23'),
        isArrivalMode: false
      }

      store.addSearchHistory(historyItem, customSearchedAt)

      expect(store.history).toHaveLength(1)
      expect(store.history[0].searchedAt).toEqual(customSearchedAt)
    })

    it('searchedAtを省略すると現在時刻が設定される', () => {
      const store = useHistoryStore()
      const beforeAdd = new Date()

      const historyItem: Omit<SearchHistoryItem, 'id' | 'searchedAt'> = {
        type: 'route',
        departure: 'hongo',
        arrival: 'saigo',
        date: new Date('2025-06-23'),
        isArrivalMode: false
      }

      store.addSearchHistory(historyItem)

      const afterAdd = new Date()

      expect(store.history).toHaveLength(1)
      expect(store.history[0].searchedAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime())
      expect(store.history[0].searchedAt.getTime()).toBeLessThanOrEqual(afterAdd.getTime())
    })

    it('最大エントリ数を超えたら古いものが削除される', () => {
      const store = useHistoryStore()
      
      // 最大数+1のエントリを追加
      for (let i = 0; i <= HISTORY_SETTINGS.MAX_ENTRIES; i++) {
        store.addSearchHistory({
          type: 'route',
          departure: `port${i}`,
          arrival: 'saigo',
          date: new Date(),
          isArrivalMode: false
        })
      }

      expect(store.history).toHaveLength(HISTORY_SETTINGS.MAX_ENTRIES)
      // 最初に追加したものが削除されている
      expect(store.history.find(h => h.departure === 'port0')).toBeUndefined()
      // 最後に追加したものは残っている
      expect(store.history.find(h => h.departure === `port${HISTORY_SETTINGS.MAX_ENTRIES}`)).toBeDefined()
    })
  })

  describe('履歴の取得', () => {
    beforeEach(() => {
      const store = useHistoryStore()
      // テストデータを追加
      store.addSearchHistory({
        type: 'route',
        departure: 'hongo',
        arrival: 'saigo',
        date: new Date(),
        isArrivalMode: false
      })
      store.addSearchHistory({
        type: 'timetable',
        departure: 'saigo',
        arrival: 'hishiura',
        date: new Date(),
        isArrivalMode: true
      })
      store.addSearchHistory({
        type: 'route',
        departure: 'saigo',
        arrival: 'beppu',
        date: new Date(),
        isArrivalMode: false
      })
    })

    it('最近の検索履歴を取得できる', () => {
      const store = useHistoryStore()
      expect(store.recentSearches).toHaveLength(3)
      // 最新のものが最初に来る
      expect(store.recentSearches[0].departure).toBe('saigo')
      expect(store.recentSearches[0].arrival).toBe('beppu')
    })

    it('指定した数の最近の検索履歴を取得できる', () => {
      const store = useHistoryStore()
      const recent = store.getRecentSearches(2)
      expect(recent).toHaveLength(2)
    })

    it('ルート検索履歴のみ取得できる', () => {
      const store = useHistoryStore()
      expect(store.routeHistory).toHaveLength(2)
      store.routeHistory.forEach(item => {
        expect(item.type).toBe('route')
      })
    })

    it('時刻表検索履歴のみ取得できる', () => {
      const store = useHistoryStore()
      expect(store.timetableHistory).toHaveLength(1)
      store.timetableHistory.forEach(item => {
        expect(item.type).toBe('timetable')
      })
    })

    it('IDで特定の履歴を取得できる', () => {
      const store = useHistoryStore()
      const targetItem = store.history[0]
      const foundItem = store.getHistoryItem(targetItem.id)
      expect(foundItem).toEqual(targetItem)
    })

    it('存在しないIDではundefinedが返る', () => {
      const store = useHistoryStore()
      expect(store.getHistoryItem('non-existent-id')).toBeUndefined()
    })

    it('特定の検索が存在するか確認できる', () => {
      const store = useHistoryStore()
      expect(store.hasRecentSearch('route', 'hongo', 'saigo')).toBe(true)
      expect(store.hasRecentSearch('route', 'unknown', 'port')).toBe(false)
    })
  })

  describe('履歴の削除', () => {
    it('特定の履歴を削除できる', () => {
      const store = useHistoryStore()
      store.addSearchHistory({
        type: 'route',
        departure: 'hongo',
        arrival: 'saigo',
        date: new Date(),
        isArrivalMode: false
      })
      
      const itemId = store.history[0].id
      store.removeHistoryItem(itemId)
      
      expect(store.history).toHaveLength(0)
    })

    it('すべての履歴をクリアできる', () => {
      const store = useHistoryStore()
      // 複数の履歴を追加
      for (let i = 0; i < 5; i++) {
        store.addSearchHistory({
          type: 'route',
          departure: `port${i}`,
          arrival: 'saigo',
          date: new Date(),
          isArrivalMode: false
        })
      }
      
      expect(store.history).toHaveLength(5)
      store.clearHistory()
      expect(store.history).toHaveLength(0)
    })

    it('古いエントリを削除できる', () => {
      const store = useHistoryStore()
      
      // 現在の日付
      const now = new Date()
      
      // テスト用に内部状態にアクセス（通常は推奨されない）
      const internalHistory = (store as any).history as any
      
      // 10日前の履歴を直接追加
      internalHistory.value = [{
        id: 'old-id',
        type: 'route',
        departure: 'old',
        arrival: 'saigo',
        date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        searchedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        isArrivalMode: false
      }]
      
      // 5日前の履歴を追加
      store.addSearchHistory({
        type: 'route',
        departure: 'recent',
        arrival: 'saigo',
        date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        isArrivalMode: false
      })
      
      // 7日以上古いエントリを削除
      store.removeOldEntries(7)
      
      expect(store.history).toHaveLength(1)
      expect(store.history[0].departure).toBe('recent')
    })
  })

  describe('ストレージとの連携', () => {
    it('履歴をストレージに保存する', () => {
      const store = useHistoryStore()
      
      // Clear previous mock calls
      mockSaveData.mockClear()
      
      store.saveToStorage()

      expect(mockSaveData).toHaveBeenCalledWith(
        HISTORY_STORAGE_KEY,
        [],
        HISTORY_SETTINGS.DEFAULT_DAYS_TO_KEEP * 24 * 60
      )
    })

    it('ストレージから履歴を読み込む', () => {
      const now = new Date()
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      const mockHistory: SearchHistoryItem[] = [{
        id: 'test-id',
        type: 'route',
        departure: 'hongo',
        arrival: 'saigo',
        date: recentDate,
        searchedAt: new Date(recentDate.getTime()),
        isArrivalMode: false
      }]

      // Setup mock for this test
      mockGetData.mockClear()
      mockGetData.mockReturnValue(mockHistory)
      
      const store = useHistoryStore()
      store.loadFromStorage()

      expect(mockGetData).toHaveBeenCalledWith(HISTORY_STORAGE_KEY)
      expect(store.history).toHaveLength(1)
      expect(store.history[0].departure).toBe('hongo')
    })
  })
})