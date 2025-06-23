import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFavorites } from './useFavorites'
import { useFavoriteStore } from '@/stores/favorite'
import { useUIStore } from '@/stores/ui'
import { useFerryStore } from '@/stores/ferry'

// Mock Nuxt composables
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $i18n: {
      t: (key: string) => key
    }
  }),
  useRouter: () => ({
    push: vi.fn()
  })
}))

// Mock window.confirm
global.window = {
  confirm: vi.fn(() => true)
} as any

describe('useFavorites', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('toggleFavoriteRoute', () => {
    it('should add a route to favorites', async () => {
      const { toggleFavoriteRoute, isFavoriteRoute } = useFavorites()
      
      const result = await toggleFavoriteRoute('HONDO', 'SAIGO', 'My Route')
      
      expect(result).toBe(true)
      expect(isFavoriteRoute('HONDO', 'SAIGO')).toBe(true)
    })

    it('should remove a route from favorites', async () => {
      const { toggleFavoriteRoute, isFavoriteRoute } = useFavorites()
      
      // First add the route
      await toggleFavoriteRoute('HONDO', 'SAIGO')
      expect(isFavoriteRoute('HONDO', 'SAIGO')).toBe(true)
      
      // Then remove it
      const result = await toggleFavoriteRoute('HONDO', 'SAIGO')
      expect(result).toBe(false)
      expect(isFavoriteRoute('HONDO', 'SAIGO')).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const { toggleFavoriteRoute } = useFavorites()
      const favoriteStore = useFavoriteStore()
      
      // Add 10 routes to reach the limit
      for (let i = 0; i < 10; i++) {
        favoriteStore.addFavoriteRoute({
          departure: `PORT${i}`,
          arrival: `DEST${i}`
        })
      }
      
      // Try to add one more
      const result = await toggleFavoriteRoute('HONDO', 'SAIGO')
      expect(result).toBe(false)
    })
  })

  describe('toggleFavoritePort', () => {
    it('should add a port to favorites', async () => {
      const { toggleFavoritePort, isFavoritePort } = useFavorites()
      
      const result = await toggleFavoritePort('SAIGO', 'My Port')
      
      expect(result).toBe(true)
      expect(isFavoritePort('SAIGO')).toBe(true)
    })

    it('should remove a port from favorites', async () => {
      const { toggleFavoritePort, isFavoritePort } = useFavorites()
      
      // First add the port
      await toggleFavoritePort('SAIGO')
      expect(isFavoritePort('SAIGO')).toBe(true)
      
      // Then remove it
      const result = await toggleFavoritePort('SAIGO')
      expect(result).toBe(false)
      expect(isFavoritePort('SAIGO')).toBe(false)
    })
  })

  describe('display names', () => {
    it('should get route display name with nickname', () => {
      const { getRouteDisplayName } = useFavorites()
      const route = {
        id: '1',
        departure: 'HONDO',
        arrival: 'SAIGO',
        nickname: 'Home Route',
        createdAt: new Date(),
        sortOrder: 0
      }
      
      expect(getRouteDisplayName(route)).toBe('Home Route (HONDO → SAIGO)')
    })

    it('should get route display name without nickname', () => {
      const { getRouteDisplayName } = useFavorites()
      const route = {
        id: '1',
        departure: 'HONDO',
        arrival: 'SAIGO',
        createdAt: new Date(),
        sortOrder: 0
      }
      
      expect(getRouteDisplayName(route)).toBe('HONDO → SAIGO')
    })

    it('should get port display name with nickname', () => {
      const { getPortDisplayName } = useFavorites()
      const port = {
        id: '1',
        portCode: 'SAIGO',
        nickname: 'Main Port',
        createdAt: new Date(),
        sortOrder: 0
      }
      
      expect(getPortDisplayName(port)).toBe('Main Port (SAIGO)')
    })
  })

  describe('searchFavoriteRoute', () => {
    it('should set ferry store values and navigate', async () => {
      const { searchFavoriteRoute } = useFavorites()
      const ferryStore = useFerryStore()
      const router = useRouter()
      
      const route = {
        id: '1',
        departure: 'HONDO',
        arrival: 'SAIGO',
        createdAt: new Date(),
        sortOrder: 0
      }
      
      await searchFavoriteRoute(route)
      
      expect(ferryStore.departure).toBe('HONDO')
      expect(ferryStore.arrival).toBe('SAIGO')
      expect(router.push).toHaveBeenCalledWith({
        path: '/transit',
        query: {
          from: 'HONDO',
          to: 'SAIGO'
        }
      })
    })
  })

  describe('selectFavoritePort', () => {
    it('should set departure port', () => {
      const { selectFavoritePort } = useFavorites()
      const ferryStore = useFerryStore()
      
      const port = {
        id: '1',
        portCode: 'SAIGO',
        createdAt: new Date(),
        sortOrder: 0
      }
      
      selectFavoritePort(port, 'departure')
      expect(ferryStore.departure).toBe('SAIGO')
    })

    it('should set arrival port', () => {
      const { selectFavoritePort } = useFavorites()
      const ferryStore = useFerryStore()
      
      const port = {
        id: '1',
        portCode: 'HISHIURA',
        createdAt: new Date(),
        sortOrder: 0
      }
      
      selectFavoritePort(port, 'arrival')
      expect(ferryStore.arrival).toBe('HISHIURA')
    })
  })

  describe('clearAllFavorites', () => {
    it('should clear all favorites when confirmed', async () => {
      const { toggleFavoriteRoute, toggleFavoritePort, clearAllFavorites, getFavoriteStats } = useFavorites()
      
      // Add some favorites
      await toggleFavoriteRoute('HONDO', 'SAIGO')
      await toggleFavoritePort('BEPPU')
      
      // Verify they exist
      let stats = getFavoriteStats()
      expect(stats.routeCount).toBe(1)
      expect(stats.portCount).toBe(1)
      
      // Clear all
      const result = await clearAllFavorites()
      expect(result).toBe(true)
      
      // Verify they're gone
      stats = getFavoriteStats()
      expect(stats.routeCount).toBe(0)
      expect(stats.portCount).toBe(0)
    })

    it('should not clear favorites when cancelled', async () => {
      window.confirm = vi.fn(() => false)
      
      const { toggleFavoriteRoute, clearAllFavorites, getFavoriteStats } = useFavorites()
      
      // Add a favorite
      await toggleFavoriteRoute('HONDO', 'SAIGO')
      
      // Try to clear
      const result = await clearAllFavorites()
      expect(result).toBe(false)
      
      // Verify it still exists
      const stats = getFavoriteStats()
      expect(stats.routeCount).toBe(1)
    })
  })

  describe('getFavoriteStats', () => {
    it('should return correct statistics', async () => {
      const { toggleFavoriteRoute, toggleFavoritePort, getFavoriteStats } = useFavorites()
      
      const stats1 = getFavoriteStats()
      expect(stats1).toEqual({
        routeCount: 0,
        routeLimit: 10,
        portCount: 0,
        portLimit: 5,
        canAddRoute: true,
        canAddPort: true
      })
      
      await toggleFavoriteRoute('HONDO', 'SAIGO')
      await toggleFavoritePort('BEPPU')
      
      const stats2 = getFavoriteStats()
      expect(stats2).toEqual({
        routeCount: 1,
        routeLimit: 10,
        portCount: 1,
        portLimit: 5,
        canAddRoute: true,
        canAddPort: true
      })
    })
  })
})