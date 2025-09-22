import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFerryStore } from '@/stores/ferry'
import { mockTrips, mockShipStatus, mockFerryStatus } from '@/test/mocks/mockData'

const mockGetCachedJsonFile = vi.fn()

// Mock fetch
global.fetch = vi.fn()
global.$fetch = vi.fn()

// Mock nextTick
global.nextTick = vi.fn(() => Promise.resolve())

// Mock useRuntimeConfig
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    public: {
      firebase: {
        projectId: 'test-project',
        storageBucket: 'test-bucket'
      }
    }
  })
}))

// Mock Firebase composables
vi.mock('@/composables/useFirebase', () => ({
  useFirebase: () => ({
    app: {},
    auth: {},
    firestore: {},
    storage: {}
  })
}))

vi.mock('@/composables/useFirebaseStorage', () => ({
  useFirebaseStorage: () => ({
    downloadJSON: vi.fn().mockResolvedValue(mockTrips),
    getCachedJsonFile: mockGetCachedJsonFile
  })
}))

describe('Ferry Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    mockGetCachedJsonFile.mockReset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useFerryStore()
      
      expect(store.timetableData).toEqual([])
      expect(store.shipStatus.isokaze).toBeNull()
      expect(store.shipStatus.dozen).toBeNull()
      expect(store.shipStatus.ferry).toBeNull()
      expect(store.departure).toBe('')
      expect(store.arrival).toBe('')
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
      
      const mockData = mockTrips.map(trip => ({
        trip_id: trip.tripId.toString(),
        start_date: trip.startDate,
        end_date: trip.endDate,
        name: trip.name,
        departure: trip.departure,
        departure_time: trip.departureTime,
        arrival: trip.arrival,
        arrival_time: trip.arrivalTime,
        status: trip.status.toString(),
        next_id: trip.nextId ? trip.nextId.toString() : undefined
      }))
      
      mockGetCachedJsonFile.mockResolvedValueOnce(mockData)

      await store.fetchTimetable()

      expect(store.timetableData).toHaveLength(mockTrips.length)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(mockGetCachedJsonFile).toHaveBeenCalledWith(
        'data/timetable.json',
        'rawTimetable',
        15
      )
    })

    it('should handle fetch timetable error', async () => {
      const store = useFerryStore()
      
      // Mock fetch error
      mockGetCachedJsonFile.mockRejectedValueOnce(new Error('Network error'))

      await store.fetchTimetable()

      expect(store.timetableData).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBe('LOAD_TIMETABLE_ERROR')
    })

    it('should fetch ship status successfully', async () => {
      const store = useFerryStore()
      
      // Mock successful $fetch - return array format as expected by the store
      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('/status-kankou')) {
          return Promise.resolve(null)
        }
        return Promise.resolve([
          { ...mockShipStatus, status: 0 },
          { ...mockShipStatus, status: 0 },
          {
            ...mockFerryStatus,
            ferry_state: '定期運航',
            ferry_comment: mockFerryStatus.ferryComment,
            fast_ferry_state: '( in Operation )',
            fast_ferry_comment: mockFerryStatus.fastFerryComment,
            today_wave: mockFerryStatus.todayWave,
            tomorrow_wave: mockFerryStatus.tomorrowWave
          } // ferry
        ])
      })

      await store.fetchShipStatus()

      expect(store.shipStatus.isokaze).toBeTruthy()
      expect(store.shipStatus.isokaze?.hasAlert).toBe(false)
      expect(store.shipStatus.dozen).toBeTruthy()
      expect(store.shipStatus.dozen?.hasAlert).toBe(false)
      expect(store.shipStatus.ferry).toBeTruthy()
      expect(store.shipStatus.ferry?.hasAlert).toBe(false)
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

    it('should use cached loader for timetable data on client', async () => {
      Object.defineProperty(process, 'client', {
        value: true,
        configurable: true
      })

      const store = useFerryStore()
      const mockSetItem = vi.fn()
      ;(localStorage.setItem as any) = mockSetItem

      const mockData = mockTrips.map(trip => ({
        trip_id: trip.tripId.toString(),
        start_date: trip.startDate,
        end_date: trip.endDate,
        name: trip.name,
        departure: trip.departure,
        departure_time: trip.departureTime,
        arrival: trip.arrival,
        arrival_time: trip.arrivalTime,
        status: trip.status.toString()
      }))

      mockGetCachedJsonFile.mockResolvedValueOnce(mockData)

      await store.fetchTimetable()

      expect(mockGetCachedJsonFile).toHaveBeenCalledWith(
        'data/timetable.json',
        'rawTimetable',
        15
      )
      expect(mockSetItem).not.toHaveBeenCalled()

      Object.defineProperty(process, 'client', {
        value: undefined,
        configurable: true
      })
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
    it('should initialize from localStorage', async () => {
      // Mock process.client and document
      Object.defineProperty(process, 'client', {
        value: true,
        configurable: true
      })
      Object.defineProperty(global, 'document', {
        value: { readyState: 'complete' },
        configurable: true
      })
      
      // Mock localStorage
      ;(localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'departure') return 'HONDO_SHICHIRUI'
        if (key === 'arrival') return 'SAIGO'
        if (key === 'lastFetchTime') return new Date().toISOString()
        return null
      })
      
      const store = useFerryStore()
      await store.initializeFromStorage()
      
      expect(store.departure).toBe('HONDO_SHICHIRUI')
      expect(store.arrival).toBe('SAIGO')
      
      // Restore mocks
      Object.defineProperty(process, 'client', {
        value: undefined,
        configurable: true
      })
    })

    it('should use cached data when force fetch is false', async () => {
      const store = useFerryStore()
      
      // Set up fresh cache
      const cachedData = {
        data: mockTrips,
        timestamp: new Date().toISOString()
      }
      ;(localStorage.getItem as any).mockReturnValue(JSON.stringify(cachedData))
      store.lastFetchTime = new Date()
      store.timetableData = mockTrips
      
      await store.fetchTimetable(false)
      
      // Should not have called fetch
      expect(global.fetch).not.toHaveBeenCalled()
      expect(store.timetableData).toEqual(mockTrips)
    })
  })
})
