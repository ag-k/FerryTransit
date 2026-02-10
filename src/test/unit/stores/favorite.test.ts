import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFavoriteStore } from '@/stores/favorite'
import type { FavoriteRoute, FavoritePort } from '@/types/favorite'

// Set up test environment
vi.stubGlobal('process', { 
  client: true,
  env: { NODE_ENV: 'test' }
})

// Mock Nuxt auto-imports
vi.mock('#app', () => ({
  onMounted: vi.fn((fn) => fn()),
  nextTick: vi.fn(() => Promise.resolve()),
  readonly: vi.fn((val) => val),
  ref: vi.fn((val) => ({ value: val })),
  computed: vi.fn((fn) => ({ value: fn() }))
}))

// Mock useOfflineStorage composable
vi.mock('@/composables/useOfflineStorage', () => ({
  useOfflineStorage: () => ({
    saveData: vi.fn().mockReturnValue(true),
    getData: vi.fn().mockReturnValue(null),
    removeData: vi.fn().mockReturnValue(true)
  })
}))

describe('Favorite Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Mock client-side environment
    vi.stubGlobal('document', { readyState: 'complete' })
    vi.stubGlobal('window', {
      addEventListener: vi.fn()
    })
    // Clear mocks before each test
    vi.clearAllMocks()
  })

  describe('Route Management', () => {
    it('should add a favorite route', () => {
      const store = useFavoriteStore()
      
      store.addFavoriteRoute({
        departure: 'HONDO',
        arrival: 'SAIGO',
        nickname: 'My Route'
      })
      
      expect(store.routes).toHaveLength(1)
      expect(store.routes[0]).toMatchObject({
        departure: 'HONDO',
        arrival: 'SAIGO',
        nickname: 'My Route',
        sortOrder: 0
      })
      expect(store.routes[0].id).toBeDefined()
      expect(store.routes[0].createdAt).toBeInstanceOf(Date)
    })

    it('should not add duplicate routes', () => {
      const store = useFavoriteStore()
      
      store.addFavoriteRoute({
        departure: 'HONDO',
        arrival: 'SAIGO'
      })
      
      expect(() => {
        store.addFavoriteRoute({
          departure: 'HONDO',
          arrival: 'SAIGO'
        })
      }).toThrow('This route is already in favorites')
    })

    it('should enforce maximum routes limit', () => {
      const store = useFavoriteStore()
      
      // Add maximum allowed routes
      for (let i = 0; i < 10; i++) {
        store.addFavoriteRoute({
          departure: `PORT${i}`,
          arrival: `PORT${i + 1}`
        })
      }
      
      expect(() => {
        store.addFavoriteRoute({
          departure: 'EXTRA',
          arrival: 'ROUTE'
        })
      }).toThrow('Maximum 10 favorite routes allowed')
    })

    it('should remove a favorite route', () => {
      const store = useFavoriteStore()
      
      store.addFavoriteRoute({
        departure: 'HONDO',
        arrival: 'SAIGO'
      })
      
      const routeId = store.routes[0].id
      store.removeFavoriteRoute(routeId)
      
      expect(store.routes).toHaveLength(0)
    })

    it('should update a favorite route', () => {
      const store = useFavoriteStore()
      
      store.addFavoriteRoute({
        departure: 'HONDO',
        arrival: 'SAIGO'
      })
      
      const routeId = store.routes[0].id
      store.updateFavoriteRoute(routeId, {
        nickname: 'Updated Route',
        sortOrder: 5
      })
      
      expect(store.routes[0].nickname).toBe('Updated Route')
      expect(store.routes[0].sortOrder).toBe(5)
    })

    it('should reorder favorite routes', () => {
      const store = useFavoriteStore()
      
      // Add 3 routes
      store.addFavoriteRoute({ departure: 'A', arrival: 'B' })
      store.addFavoriteRoute({ departure: 'C', arrival: 'D' })
      store.addFavoriteRoute({ departure: 'E', arrival: 'F' })
      
      const ids = store.routes.map(r => r.id)
      // Reverse the order
      store.reorderFavoriteRoutes([ids[2], ids[1], ids[0]])
      
      expect(store.routes[0].departure).toBe('E')
      expect(store.routes[1].departure).toBe('C')
      expect(store.routes[2].departure).toBe('A')
      expect(store.routes[0].sortOrder).toBe(0)
      expect(store.routes[1].sortOrder).toBe(1)
      expect(store.routes[2].sortOrder).toBe(2)
    })
  })

  describe('Port Management', () => {
    it('should add a favorite port', () => {
      const store = useFavoriteStore()
      
      store.addFavoritePort({
        portCode: 'SAIGO',
        nickname: 'My Port'
      })
      
      expect(store.ports).toHaveLength(1)
      expect(store.ports[0]).toMatchObject({
        portCode: 'SAIGO',
        nickname: 'My Port',
        sortOrder: 0
      })
      expect(store.ports[0].id).toBeDefined()
      expect(store.ports[0].createdAt).toBeInstanceOf(Date)
    })

    it('should not add duplicate ports', () => {
      const store = useFavoriteStore()
      
      store.addFavoritePort({ portCode: 'SAIGO' })
      
      expect(() => {
        store.addFavoritePort({ portCode: 'SAIGO' })
      }).toThrow('This port is already in favorites')
    })

    it('should enforce maximum ports limit', () => {
      const store = useFavoriteStore()
      
      // Add maximum allowed ports
      for (let i = 0; i < 5; i++) {
        store.addFavoritePort({ portCode: `PORT${i}` })
      }
      
      expect(() => {
        store.addFavoritePort({ portCode: 'EXTRA' })
      }).toThrow('Maximum 5 favorite ports allowed')
    })

    it('should remove a favorite port', () => {
      const store = useFavoriteStore()
      
      store.addFavoritePort({ portCode: 'SAIGO' })
      
      const portId = store.ports[0].id
      store.removeFavoritePort(portId)
      
      expect(store.ports).toHaveLength(0)
    })

    it('should update a favorite port', () => {
      const store = useFavoriteStore()
      
      store.addFavoritePort({ portCode: 'SAIGO' })
      
      const portId = store.ports[0].id
      store.updateFavoritePort(portId, {
        nickname: 'Updated Port',
        sortOrder: 3
      })
      
      expect(store.ports[0].nickname).toBe('Updated Port')
      expect(store.ports[0].sortOrder).toBe(3)
    })

    it('should reorder favorite ports', () => {
      const store = useFavoriteStore()
      
      // Add 3 ports
      store.addFavoritePort({ portCode: 'A' })
      store.addFavoritePort({ portCode: 'B' })
      store.addFavoritePort({ portCode: 'C' })
      
      const ids = store.ports.map(p => p.id)
      // Reverse the order
      store.reorderFavoritePorts([ids[2], ids[1], ids[0]])
      
      expect(store.ports[0].portCode).toBe('C')
      expect(store.ports[1].portCode).toBe('B')
      expect(store.ports[2].portCode).toBe('A')
      expect(store.ports[0].sortOrder).toBe(0)
      expect(store.ports[1].sortOrder).toBe(1)
      expect(store.ports[2].sortOrder).toBe(2)
    })
  })

  describe('Getters', () => {
    it('should return routes sorted by recent', async () => {
      const store = useFavoriteStore()
      
      // Add routes with time delays to ensure different createdAt times
      store.addFavoriteRoute({ departure: 'A', arrival: 'B' })
      await new Promise(resolve => setTimeout(resolve, 10))
      
      store.addFavoriteRoute({ departure: 'C', arrival: 'D' })
      await new Promise(resolve => setTimeout(resolve, 10))
      
      store.addFavoriteRoute({ departure: 'E', arrival: 'F' })
      
      const recent = store.recentRoutes
      // Should be ordered by most recent first
      expect(recent[0].departure).toBe('E') // Most recent
      expect(recent[1].departure).toBe('C')
      expect(recent[2].departure).toBe('A') // Oldest
    })

    it('should return routes sorted by order', () => {
      const store = useFavoriteStore()
      
      // Add routes - they will get sortOrder 0, 1, 2
      store.addFavoriteRoute({ departure: 'A', arrival: 'B' })
      store.addFavoriteRoute({ departure: 'C', arrival: 'D' })
      store.addFavoriteRoute({ departure: 'E', arrival: 'F' })
      
      // Reorder them
      const ids = store.routes.map(r => r.id)
      store.reorderFavoriteRoutes([ids[2], ids[0], ids[1]]) // E-F, A-B, C-D
      
      const ordered = store.orderedRoutes
      expect(ordered[0].departure).toBe('E') // sortOrder: 0
      expect(ordered[1].departure).toBe('A') // sortOrder: 1
      expect(ordered[2].departure).toBe('C') // sortOrder: 2
    })

    it('should check if route is favorited', () => {
      const store = useFavoriteStore()
      
      store.addFavoriteRoute({
        departure: 'HONDO',
        arrival: 'SAIGO'
      })
      
      expect(store.isRouteFavorited('HONDO', 'SAIGO')).toBe(true)
      expect(store.isRouteFavorited('SAIGO', 'HONDO')).toBe(false)
    })

    it('should check if port is favorited', () => {
      const store = useFavoriteStore()
      
      store.addFavoritePort({ portCode: 'SAIGO' })
      
      expect(store.isPortFavorited('SAIGO')).toBe(true)
      expect(store.isPortFavorited('HONDO')).toBe(false)
    })

    it('should get favorite route by id', () => {
      const store = useFavoriteStore()
      
      store.addFavoriteRoute({
        departure: 'HONDO',
        arrival: 'SAIGO'
      })
      
      const routeId = store.routes[0].id
      const route = store.getFavoriteRoute(routeId)
      
      expect(route).toBeDefined()
      expect(route?.departure).toBe('HONDO')
      expect(route?.arrival).toBe('SAIGO')
      
      expect(store.getFavoriteRoute('non-existent')).toBeUndefined()
    })

    it('should get favorite port by id', () => {
      const store = useFavoriteStore()
      
      store.addFavoritePort({ portCode: 'SAIGO' })
      
      const portId = store.ports[0].id
      const port = store.getFavoritePort(portId)
      
      expect(port).toBeDefined()
      expect(port?.portCode).toBe('SAIGO')
      
      expect(store.getFavoritePort('non-existent')).toBeUndefined()
    })
  })

  describe('Clear All', () => {
    it('should clear all favorites', () => {
      const store = useFavoriteStore()
      
      // Add some data
      store.addFavoriteRoute({
        departure: 'HONDO',
        arrival: 'SAIGO'
      })
      store.addFavoritePort({ portCode: 'SAIGO' })
      
      expect(store.routes).toHaveLength(1)
      expect(store.ports).toHaveLength(1)
      
      store.clearAllFavorites()
      
      expect(store.routes).toHaveLength(0)
      expect(store.ports).toHaveLength(0)
    })
  })
})