// Search history type definition
export interface SearchHistoryItem {
  id: string
  type: 'route' | 'timetable'
  departure?: string
  arrival?: string
  date: Date
  time?: Date
  isArrivalMode?: boolean
  searchedAt: Date
  resultCount?: number
}

// Search history store interface
export interface SearchHistoryStore {
  // State
  history: SearchHistoryItem[]

  // Getters
  recentSearches: SearchHistoryItem[]
  routeHistory: SearchHistoryItem[]
  timetableHistory: SearchHistoryItem[]
  getHistoryItem: (id: string) => SearchHistoryItem | undefined
  hasRecentSearch: (type: 'route' | 'timetable', departure?: string, arrival?: string) => boolean

  // Actions
  addSearchHistory: (item: Omit<SearchHistoryItem, 'id' | 'searchedAt'>) => void
  removeSearchHistory: (id: string) => void
  clearSearchHistory: () => void
  clearOldEntries: (daysToKeep?: number) => void
  getRecentSearches: (limit?: number) => SearchHistoryItem[]
  loadHistory: () => void
  persistHistory: () => void
}

// Local storage key constants
export const HISTORY_STORAGE_KEY = 'ferry_search_history' as const

// History settings
export const HISTORY_SETTINGS = {
  MAX_ENTRIES: 50,
  DEFAULT_DAYS_TO_KEEP: 30,
  DEFAULT_RECENT_LIMIT: 10
} as const
