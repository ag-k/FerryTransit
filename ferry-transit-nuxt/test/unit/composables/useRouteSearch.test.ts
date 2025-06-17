import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRouteSearch } from '@/composables/useRouteSearch'
import { useFerryStore } from '@/stores/ferry'
import { mockTrips } from '@/test/mocks/mockData'

// Mock useFerryData
vi.mock('@/composables/useFerryData', () => ({
  useFerryData: () => ({
    getTripStatus: vi.fn(() => 0)
  })
}))

describe('useRouteSearch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('searchRoutes', () => {
    it('should find direct routes', () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = searchRoutes(
        'HONDO_SHICHIRUI',
        'SAIGO',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      expect(results).toHaveLength(1)
      expect(results[0].segments).toHaveLength(1)
      expect(results[0].segments[0].departure).toBe('HONDO_SHICHIRUI')
      expect(results[0].segments[0].arrival).toBe('SAIGO')
      expect(results[0].transferCount).toBe(0)
    })

    it('should find transfer routes', () => {
      const store = useFerryStore()
      store.timetableData = [
        ...mockTrips,
        {
          tripId: 4,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          name: 'FERRY_DOZEN',
          departure: 'SAIGO',
          departureTime: new Date('2024-01-15T12:00:00'),
          arrival: 'BEPPU',
          arrivalTime: new Date('2024-01-15T13:30:00'),
          status: 0,
          price: 1680
        }
      ]
      
      const { searchRoutes } = useRouteSearch()
      
      const results = searchRoutes(
        'HONDO_SHICHIRUI',
        'BEPPU',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Should find transfer route via SAIGO
      const transferRoute = results.find(r => r.transferCount === 1)
      expect(transferRoute).toBeDefined()
      expect(transferRoute!.segments).toHaveLength(2)
      expect(transferRoute!.segments[0].arrival).toBe('SAIGO')
      expect(transferRoute!.segments[1].departure).toBe('SAIGO')
    })

    it('should handle HONDO port mapping', () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = searchRoutes(
        'HONDO', // Generic HONDO
        'SAIGO',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Should find routes from both HONDO_SHICHIRUI and HONDO_SAKAIMINATO
      expect(results.length).toBeGreaterThan(0)
    })

    it('should filter by arrival time in arrival mode', () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = searchRoutes(
        'HONDO_SHICHIRUI',
        'SAIGO',
        new Date('2024-01-15'),
        '12:00',
        true // Arrival mode
      )
      
      // Should only find trips arriving before 12:00
      expect(results).toHaveLength(1)
      expect(new Date(results[0].arrivalTime).getHours()).toBeLessThanOrEqual(12)
    })

    it('should exclude cancelled trips', () => {
      const store = useFerryStore()
      store.timetableData = [
        {
          ...mockTrips[0],
          status: 2 // Cancelled
        }
      ]
      
      // Mock getTripStatus to return cancelled status
      vi.mocked(useFerryData().getTripStatus).mockReturnValue(2)
      
      const { searchRoutes } = useRouteSearch()
      
      const results = searchRoutes(
        'HONDO_SHICHIRUI',
        'SAIGO',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      expect(results).toHaveLength(0)
    })
  })

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const { formatTime } = useRouteSearch()
      
      const date = new Date('2024-01-15T09:30:00')
      const formatted = formatTime(date)
      
      expect(formatted).toBe('09:30')
    })
  })

  describe('calculateDuration', () => {
    it('should calculate duration in minutes', () => {
      const { calculateDuration } = useRouteSearch()
      
      const start = new Date('2024-01-15T09:00:00')
      const end = new Date('2024-01-15T09:45:00')
      
      const duration = calculateDuration(start, end)
      
      expect(duration).toBe('45分')
    })

    it('should calculate duration in hours and minutes', () => {
      const { calculateDuration } = useRouteSearch()
      
      const start = new Date('2024-01-15T09:00:00')
      const end = new Date('2024-01-15T11:25:00')
      
      const duration = calculateDuration(start, end)
      
      expect(duration).toBe('2時間25分')
    })
  })

  describe('getPortDisplayName', () => {
    it('should return special display name for HONDO ports', () => {
      const { getPortDisplayName } = useRouteSearch()
      
      expect(getPortDisplayName('HONDO_SHICHIRUI')).toBe('HONDO (SHICHIRUI)')
      expect(getPortDisplayName('HONDO_SAKAIMINATO')).toBe('HONDO (SAKAIMINATO)')
    })

    it('should return regular name for other ports', () => {
      const { getPortDisplayName } = useRouteSearch()
      
      expect(getPortDisplayName('SAIGO')).toBe('SAIGO')
      expect(getPortDisplayName('BEPPU')).toBe('BEPPU')
    })
  })

  describe('fare calculation', () => {
    it('should calculate correct fares', () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = searchRoutes(
        'HONDO_SHICHIRUI',
        'SAIGO',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Check ferry fare
      const ferryRoute = results.find(r => r.segments[0].ship === 'FERRY_OKI')
      expect(ferryRoute?.totalFare).toBe(3360)
    })
  })
})