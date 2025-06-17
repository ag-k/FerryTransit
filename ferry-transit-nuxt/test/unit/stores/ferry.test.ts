import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFerryStore } from '@/stores/ferry'
import { mockTrips, mockShipStatus, mockFerryStatus } from '@/test/mocks/mockData'

// Mock fetch
global.fetch = vi.fn()

describe('Ferry Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useFerryStore()
      
      expect(store.timetableData).toEqual([])
      expect(store.shipStatus.isokaze).toBeNull()
      expect(store.shipStatus.dozen).toBeNull()
      expect(store.shipStatus.ferry).toBeNull()
      expect(store.departure).toBe('DEPARTURE')
      expect(store.arrival).toBe('ARRIVAL')
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should have correct port definitions', () => {
      const store = useFerryStore()
      
      expect(store.hondoPorts).toContain('HONDO_SHICHIRUI')
      expect(store.hondoPorts).toContain('HONDO_SAKAIMINATO')
      expect(store.dozenPorts).toContain('BEPPU')
      expect(store.dozenPorts).toContain('HISHIURA')
      expect(store.dozenPorts).toContain('KURI')
      expect(store.dogoPorts).toContain('SAIGO')
    })
  })

  describe('Actions', () => {
    it('should fetch timetable data successfully', async () => {
      const store = useFerryStore()
      
      // Mock successful fetch
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips
      })

      await store.fetchTimetable()

      expect(store.timetableData).toEqual(mockTrips)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(global.fetch).toHaveBeenCalledWith('/api/timetable')
    })

    it('should handle fetch timetable error', async () => {
      const store = useFerryStore()
      
      // Mock fetch error
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await store.fetchTimetable()

      expect(store.timetableData).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBe('Failed to fetch timetable')
    })

    it('should fetch ship status successfully', async () => {
      const store = useFerryStore()
      
      // Mock successful fetch
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isokaze: mockShipStatus,
          dozen: mockShipStatus,
          ferry: mockFerryStatus
        })
      })

      await store.fetchShipStatus()

      expect(store.shipStatus.isokaze).toEqual(mockShipStatus)
      expect(store.shipStatus.dozen).toEqual(mockShipStatus)
      expect(store.shipStatus.ferry).toEqual(mockFerryStatus)
    })

    it('should set departure and arrival', () => {
      const store = useFerryStore()
      
      store.setDeparture('HONDO_SHICHIRUI')
      expect(store.departure).toBe('HONDO_SHICHIRUI')
      
      store.setArrival('SAIGO')
      expect(store.arrival).toBe('SAIGO')
    })

    it('should reverse route', () => {
      const store = useFerryStore()
      
      store.setDeparture('HONDO_SHICHIRUI')
      store.setArrival('SAIGO')
      
      store.reverseRoute()
      
      expect(store.departure).toBe('SAIGO')
      expect(store.arrival).toBe('HONDO_SHICHIRUI')
    })

    it('should set selected date', () => {
      const store = useFerryStore()
      const newDate = new Date('2024-02-01')
      
      store.setSelectedDate(newDate)
      
      expect(store.selectedDate).toEqual(newDate)
    })

    it('should cache data in localStorage', async () => {
      const store = useFerryStore()
      
      // Mock successful fetch
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips
      })

      await store.fetchTimetable()

      const cached = localStorage.getItem('ferry_timetable')
      expect(cached).toBeTruthy()
      
      const parsedCache = JSON.parse(cached!)
      expect(parsedCache.data).toEqual(mockTrips)
    })
  })

  describe('Getters', () => {
    it('should filter timetable by selected date and ports', async () => {
      const store = useFerryStore()
      
      // Set up test data
      store.timetableData = mockTrips
      store.setDeparture('HONDO_SHICHIRUI')
      store.setArrival('SAIGO')
      store.setSelectedDate(new Date('2024-01-15'))

      const filtered = store.filteredTimetable
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].tripId).toBe(1)
    })

    it('should check if data is stale', () => {
      const store = useFerryStore()
      
      // No fetch time - should be stale
      expect(store.isDataStale).toBe(true)
      
      // Recent fetch - should not be stale
      store.lastFetchTime = new Date()
      expect(store.isDataStale).toBe(false)
      
      // Old fetch - should be stale
      const oldTime = new Date()
      oldTime.setMinutes(oldTime.getMinutes() - 20)
      store.lastFetchTime = oldTime
      expect(store.isDataStale).toBe(true)
    })
  })

  describe('LocalStorage Integration', () => {
    it('should initialize from localStorage', () => {
      // Set up localStorage data
      const cachedData = {
        data: mockTrips,
        timestamp: new Date().toISOString(),
        departure: 'HONDO_SHICHIRUI',
        arrival: 'SAIGO'
      }
      localStorage.setItem('ferry_timetable', JSON.stringify(cachedData))
      
      const store = useFerryStore()
      store.initializeFromStorage()
      
      expect(store.timetableData).toEqual(mockTrips)
      expect(store.departure).toBe('HONDO_SHICHIRUI')
      expect(store.arrival).toBe('SAIGO')
    })

    it('should use cached data when force fetch is false', async () => {
      const store = useFerryStore()
      
      // Set up fresh cache
      const cachedData = {
        data: mockTrips,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('ferry_timetable', JSON.stringify(cachedData))
      store.lastFetchTime = new Date()
      
      await store.fetchTimetable(false)
      
      // Should not have called fetch
      expect(global.fetch).not.toHaveBeenCalled()
      expect(store.timetableData).toEqual(mockTrips)
    })
  })
})