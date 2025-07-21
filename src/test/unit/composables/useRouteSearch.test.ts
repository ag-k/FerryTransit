import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRouteSearch } from '@/composables/useRouteSearch'
import { useFerryStore } from '@/stores/ferry'
import { mockTrips } from '@/test/mocks/mockData'

// Mock useFerryData
const mockGetTripStatus = vi.fn(() => 0)
vi.mock('@/composables/useFerryData', () => ({
  useFerryData: () => ({
    getTripStatus: mockGetTripStatus,
    initializeData: vi.fn()
  })
}))

// Mock useHolidayCalendar
vi.mock('@/composables/useHolidayCalendar', () => ({
  useHolidayCalendar: () => ({
    isPeakSeason: vi.fn(() => false),
    getPeakSeason: vi.fn(() => null)
  })
}))

describe('useRouteSearch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('searchRoutes', () => {
    it('should find direct routes', async () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
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

    it('should find transfer routes', async () => {
      const store = useFerryStore()
      store.timetableData = [
        ...mockTrips,
        {
          tripId: 4,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          name: 'FERRY_DOZEN',
          departure: 'SAIGO',
          departureTime: '12:00:00' as any,
          arrival: 'BEPPU',
          arrivalTime: '13:30:00' as any,
          status: 0,
          price: 1680
        }
      ]
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
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

    it('should handle HONDO port mapping', async () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'HONDO', // Generic HONDO
        'SAIGO',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Should find routes from both HONDO_SHICHIRUI and HONDO_SAKAIMINATO
      expect(results.length).toBeGreaterThan(0)
    })

    it('should filter by arrival time in arrival mode', async () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
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

    it('should exclude cancelled trips', async () => {
      const store = useFerryStore()
      store.timetableData = [
        {
          ...mockTrips[0],
          status: 2 // Cancelled
        }
      ]
      
      // Mock getTripStatus to return the status from the trip data
      mockGetTripStatus.mockImplementation((trip) => trip.status || 0)
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'HONDO_SHICHIRUI',
        'SAIGO',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // When getTripStatus returns 2 (cancelled), the trip should be excluded
      expect(results).toHaveLength(0)
      
      // Reset mock
      mockGetTripStatus.mockReturnValue(0)
    })

    it('should exclude routes via mainland when traveling between islands (BUG-001)', async () => {
      const store = useFerryStore()
      // Set up routes including mainland detour
      store.timetableData = [
        // Direct route: SAIGO -> HISHIURA
        {
          tripId: 10,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          name: 'FERRY_DOZEN',
          departure: 'SAIGO',
          departureTime: '14:00:00' as any,
          arrival: 'HISHIURA',
          arrivalTime: '15:00:00' as any,
          status: 0,
          price: 1680
        },
        // Detour via mainland: SAIGO -> HONDO
        {
          tripId: 11,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          name: 'FERRY_OKI',
          departure: 'SAIGO',
          departureTime: '08:00:00' as any,
          arrival: 'HONDO_SHICHIRUI',
          arrivalTime: '10:25:00' as any,
          status: 0,
          price: 3510
        },
        // Detour via mainland: HONDO -> HISHIURA
        {
          tripId: 12,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          name: 'FERRY_KUNIGA',
          departure: 'HONDO_SHICHIRUI',
          departureTime: '11:00:00' as any,
          arrival: 'HISHIURA',
          arrivalTime: '13:50:00' as any,
          status: 0,
          price: 3300
        }
      ]
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'SAIGO',
        'HISHIURA',
        new Date('2024-01-15'),
        '07:00',
        false
      )
      
      // Should only find the direct route, not the mainland detour
      expect(results).toHaveLength(1)
      expect(results[0].segments).toHaveLength(1)
      expect(results[0].segments[0].departure).toBe('SAIGO')
      expect(results[0].segments[0].arrival).toBe('HISHIURA')
      expect(results[0].segments[0].ship).toBe('FERRY_DOZEN')
      
      // Verify no routes go through mainland
      const mainlandRoute = results.find(r => 
        r.segments.some(s => 
          s.departure.includes('HONDO') || s.arrival.includes('HONDO')
        )
      )
      expect(mainlandRoute).toBeUndefined()
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
      
      // Since i18n is mocked to return the key, the expected output will include the key
      expect(getPortDisplayName('HONDO_SHICHIRUI')).toBe('HONDO (HONDO_SHICHIRUI)')
      expect(getPortDisplayName('HONDO_SAKAIMINATO')).toBe('HONDO (HONDO_SAKAIMINATO)')
    })

    it('should return regular name for other ports', () => {
      const { getPortDisplayName } = useRouteSearch()
      
      expect(getPortDisplayName('SAIGO')).toBe('SAIGO')
      expect(getPortDisplayName('BEPPU')).toBe('BEPPU')
    })
  })

  describe('fare calculation', () => {
    it('should calculate correct fares', async () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'HONDO_SHICHIRUI',
        'SAIGO',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Check ferry fare (uses fallback value since fareStore is not mocked)
      const ferryRoute = results.find(r => r.segments[0].ship === 'FERRY_OKI')
      expect(ferryRoute?.totalFare).toBe(3510)
    })
  })
})