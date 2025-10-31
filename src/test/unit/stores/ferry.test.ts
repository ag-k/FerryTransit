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

  describe('Ship Status API mapping', () => {
    const baseFerryResponse = {
      id: 187,
      date: '2024-06-15 08:30 更新',
      ferry_state: '全便通常運航',
      ferry_comment: '気象条件により一部で遅延の可能性があります。',
      fast_ferry_state: '1便目欠航',
      fast_ferry_comment: '波浪の影響により午前便を欠航します。',
      today_wave: '1.5m（波浪・うねりあり）',
      tomorrow_wave: '1.0m（うねり弱）'
    }

    it('maps status payload according to API spec', async () => {
      const store = useFerryStore()
      store.selectedDate = new Date('2024-06-15T00:00:00+09:00')
      store.timetableData = []

      const apiResponse = [
        {
          id: 4581,
          ship_id: 1,
          date: '2024-06-15',
          status: '2',
          prev_status: 0,
          reason: '濃霧のため視界不良',
          last_departure_port: '別府港',
          last_arrival_port: '菱浦港',
          start_time: '08:30',
          comment: '午後便以降の見通しは11時頃に再案内予定です。',
          extraShips: [
            {
              id: 921,
              departure_port_id: 1,
              arrival_port_id: 2,
              departure_time: '10:15',
              departure: 'BEPPU',
              arrival: 'HISHIURA'
            }
          ],
          lastShips: [
            {
              name: 'ISOKAZE',
              departure: 'BEPPU',
              departure_time: '06:30',
              arrival: 'HISHIURA',
              arrival_time: '07:40',
              via: null
            }
          ],
          departure: 'BEPPU',
          arrival: 'HISHIURA'
        },
        {
          id: 4590,
          ship_id: 2,
          date: '2024-06-15',
          status: 0,
          prev_status: 0,
          reason: null,
          start_time: null,
          comment: null,
          extraShips: [],
          lastShips: [],
          departure: null,
          arrival: null
        },
        baseFerryResponse
      ]

      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('/status-kankou')) {
          return Promise.resolve(null)
        }
        return Promise.resolve([
          apiResponse[0],
          apiResponse[1],
          { ...baseFerryResponse }
        ])
      })

      await store.fetchShipStatus()

      const isokaze = store.shipStatus.isokaze
      const dozen = store.shipStatus.dozen
      const ferry = store.shipStatus.ferry

      expect(isokaze).toBeTruthy()
      expect(isokaze?.status).toBe(2)
      expect(isokaze?.hasAlert).toBe(true)
      expect(isokaze?.departure).toBe('BEPPU')
      expect(isokaze?.arrival).toBe('HISHIURA')
      expect(isokaze?.start_time).toBe('08:30')
      expect(isokaze?.extraShips).toHaveLength(1)
      expect(isokaze?.lastShips).toHaveLength(1)

      expect(dozen).toBeTruthy()
      expect(dozen?.status).toBe(0)
      expect(dozen?.hasAlert).toBe(false)

      expect(ferry).toBeTruthy()
      expect(ferry?.ferryState).toBe('全便通常運航')
      expect(ferry?.fastFerryState).toBe('1便目欠航')
      expect(ferry?.todayWave).toBe('1.5m（波浪・うねりあり）')
      expect(ferry?.hasAlert).toBe(true)

      const extraTrip = store.timetableData.find(trip => trip.tripId === 1000)
      expect(extraTrip).toBeTruthy()
      expect(extraTrip?.name).toBe('ISOKAZE')
      expect(extraTrip?.status).toBe(4)
      expect(extraTrip?.departureTime).toBe('10:15')
    })

    it('handles null ship states gracefully', async () => {
      const store = useFerryStore()
      store.timetableData = []

      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('/status-kankou')) {
          return Promise.resolve(null)
        }
        return Promise.resolve([null, null, null])
      })

      await store.fetchShipStatus()

      expect(store.shipStatus.isokaze).toBeNull()
      expect(store.shipStatus.dozen).toBeNull()
      expect(store.shipStatus.ferry).toBeNull()
      expect(store.timetableData.every(trip => trip.tripId < 1000)).toBe(true)
    })

    it('treats status 5 as alert payload', async () => {
      const store = useFerryStore()
      store.timetableData = []

      ;(global.$fetch as any).mockImplementation((url: string) => {
        if (url.includes('/status-kankou')) {
          return Promise.resolve(null)
        }
        return Promise.resolve([
          null,
          {
            id: 5000,
            ship_id: 2,
            date: '2024-06-16',
            status: '5',
            prev_status: 2,
            reason: '自由記述',
            start_time: null,
            comment: '自由入力のテキスト',
            extraShips: [],
            lastShips: [],
            departure: null,
            arrival: null
          },
          { ...baseFerryResponse }
        ])
      })

      await store.fetchShipStatus()

      expect(store.shipStatus.isokaze).toBeNull()
      expect(store.shipStatus.dozen?.status).toBe(5)
      expect(store.shipStatus.dozen?.hasAlert).toBe(true)
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
