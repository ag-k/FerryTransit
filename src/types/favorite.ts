// Favorite route type definition
export interface FavoriteRoute {
  id: string
  departure: string
  arrival: string
  nickname?: string
  createdAt: Date
  sortOrder: number
}

// Favorite port type definition
export interface FavoritePort {
  id: string
  portCode: string
  nickname?: string
  createdAt: Date
  sortOrder: number
}

// Favorite store interface
export interface FavoriteStore {
  // State
  routes: FavoriteRoute[]
  ports: FavoritePort[]

  // Getters
  favoriteRoutesByRecent: FavoriteRoute[]
  favoriteRoutesByOrder: FavoriteRoute[]
  favoritePortsByRecent: FavoritePort[]
  favoritePortsByOrder: FavoritePort[]
  isFavoriteRoute: (departure: string, arrival: string) => boolean
  isFavoritePort: (portCode: string) => boolean
  getFavoriteRoute: (id: string) => FavoriteRoute | undefined
  getFavoritePort: (id: string) => FavoritePort | undefined

  // Actions
  addFavoriteRoute: (route: Omit<FavoriteRoute, 'id' | 'createdAt' | 'sortOrder'>) => void
  addFavoritePort: (port: Omit<FavoritePort, 'id' | 'createdAt' | 'sortOrder'>) => void
  removeFavoriteRoute: (id: string) => void
  removeFavoritePort: (id: string) => void
  updateFavoriteRoute: (id: string, updates: Partial<Omit<FavoriteRoute, 'id' | 'createdAt'>>) => void
  updateFavoritePort: (id: string, updates: Partial<Omit<FavoritePort, 'id' | 'createdAt'>>) => void
  reorderFavoriteRoutes: (ids: string[]) => void
  reorderFavoritePorts: (ids: string[]) => void
  clearAllFavorites: () => void
  loadFavorites: () => void
  persistFavorites: () => void
}

// Local storage key constants
export const FAVORITE_STORAGE_KEYS = {
  ROUTES: 'ferry_favorite_routes',
  PORTS: 'ferry_favorite_ports'
} as const

// Maximum favorites allowed
export const MAX_FAVORITES = {
  ROUTES: 10,
  PORTS: 5
} as const
