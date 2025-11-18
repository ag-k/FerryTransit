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
  useHolidayCalendar: () => ({})
}))

// Mock useTimetableLoader
vi.mock('@/composables/useTimetableLoader', () => ({
  useTimetableLoader: () => ({
    ensureTimetableLoaded: vi.fn()
  })
}))

// Mock useI18n - Create translation function
const translations: Record<string, string> = {
  'MINUTES': '分',
  'HOURS': '時間',
  'HONDO': '本土'
}

const mockT = vi.fn((key: string) => translations[key] || key)

// Mock useI18n from #imports
vi.mock('#imports', async () => {
  const actual = await vi.importActual('#imports')
  const { ref } = await import('vue')

  return {
    ...actual,
    useI18n: vi.fn(() => ({
      locale: ref('ja'),
      t: mockT
    })),
    onMounted: vi.fn((fn: () => void) => fn())
  }
})

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

    it('should chain next_id segments on the same ship without counting as transfers', async () => {
      const store = useFerryStore()
      store.timetableData = [
        {
          tripId: 1,
          startDate: '2025-08-01',
          endDate: '2025-10-31',
          name: 'ISOKAZE',
          departure: 'KURI',
          departureTime: '07:17',
          arrival: 'HISHIURA',
          arrivalTime: '07:35',
          status: 0
        },
        {
          tripId: 2,
          nextId: 3,
          startDate: '2025-08-01',
          endDate: '2025-10-31',
          name: 'RAINBOWJET',
          departure: 'HISHIURA',
          departureTime: '08:14',
          arrival: 'SAIGO',
          arrivalTime: '08:45',
          status: 0
        },
        {
          tripId: 3,
          startDate: '2025-08-01',
          endDate: '2025-10-31',
          name: 'RAINBOWJET',
          departure: 'SAIGO',
          departureTime: '08:54',
          arrival: 'HONDO_SHICHIRUI',
          arrivalTime: '10:03',
          status: 0
        }
      ]

      const { searchRoutes } = useRouteSearch()

      const results = await searchRoutes(
        'KURI',
        'HONDO',
        new Date('2025-09-22'),
        '00:15',
        false
      )

      const transferRoute = results.find(r => r.transferCount === 1)
      expect(transferRoute).toBeDefined()
      expect(transferRoute!.segments).toHaveLength(2)
      expect(transferRoute!.segments[0].ship).toBe('ISOKAZE')
      expect(transferRoute!.segments[0].arrival).toBe('HISHIURA')
      expect(transferRoute!.segments[1].ship).toBe('RAINBOWJET')
      expect(transferRoute!.segments[1].departure).toBe('HISHIURA')
      expect(transferRoute!.segments[1].arrival).toBe('HONDO_SHICHIRUI')
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
      const store = useFerryStore()
      store.timetableData = mockTrips

      const { calculateDuration } = useRouteSearch()

      const start = new Date('2024-01-15T09:00:00')
      const end = new Date('2024-01-15T09:45:00')

      const duration = calculateDuration(start, end)

      // Check that duration calculation is correct (45 minutes)
      // Note: In test environment, i18n may return keys instead of translations
      expect(duration).toMatch(/45/)
      expect(duration).toMatch(/(分|MINUTES)/)
    })

    it('should calculate duration in hours and minutes', () => {
      const store = useFerryStore()
      store.timetableData = mockTrips

      const { calculateDuration } = useRouteSearch()

      const start = new Date('2024-01-15T09:00:00')
      const end = new Date('2024-01-15T11:25:00')

      const duration = calculateDuration(start, end)

      // Check that duration calculation is correct (2 hours 25 minutes)
      // Note: In test environment, i18n may return keys instead of translations
      expect(duration).toMatch(/2/)
      expect(duration).toMatch(/(時間|HOURS)/)
      expect(duration).toMatch(/25/)
      expect(duration).toMatch(/(分|MINUTES)/)
    })
  })

  describe('getPortDisplayName', () => {
    beforeEach(() => {
      const store = useFerryStore()
      // Set up mock port data
      store.ports = [
        { PORT_ID: 'SAIGO', PLACE_NAME_JA: '西郷港', PLACE_NAME_EN: 'Saigo', PLACE_ID: 1 } as any,
        { PORT_ID: 'BEPPU', PLACE_NAME_JA: '別府港', PLACE_NAME_EN: 'Beppu', PLACE_ID: 2 } as any,
        { PORT_ID: 'HONDO_SHICHIRUI', PLACE_NAME_JA: '七類港', PLACE_NAME_EN: 'Shichirui', PLACE_ID: 3 } as any,
        { PORT_ID: 'HONDO_SAKAIMINATO', PLACE_NAME_JA: '境港', PLACE_NAME_EN: 'Sakaiminato', PLACE_ID: 4 } as any
      ]
    })

    it('should return port name from ferryStore', () => {
      const { getPortDisplayName } = useRouteSearch()

      expect(getPortDisplayName('SAIGO')).toBe('西郷港')
      expect(getPortDisplayName('BEPPU')).toBe('別府港')
    })

    it('should handle HONDO_SHICHIRUI port', () => {
      const { getPortDisplayName } = useRouteSearch()

      expect(getPortDisplayName('HONDO_SHICHIRUI')).toBe('七類港')
    })

    it('should handle special HONDO case', () => {
      const { getPortDisplayName } = useRouteSearch()

      // HONDO is a special legacy port ID that should be translated
      expect(getPortDisplayName('HONDO')).toBe('HONDO')
    })

    it('should return empty string for empty port', () => {
      const { getPortDisplayName } = useRouteSearch()

      expect(getPortDisplayName('')).toBe('')
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
      
      // Check ferry fare (uses fare master data)
      const ferryRoute = results.find(r => r.segments[0].ship === 'FERRY_OKI')
      expect(ferryRoute?.totalFare).toBe(3520)
    })

    it('should calculate correct fares for local ferry (ISOKAZE)', async () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'BEPPU',
        'HISHIURA',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Check local ferry fare (should use inner island fare for BEPPU-HISHIURA)
      const localFerryRoute = results.find(r => r.segments[0].ship === 'ISOKAZE')
      expect(localFerryRoute?.totalFare).toBe(410) // From fare master data
    })

    it('should calculate correct fares for local ferry (FERRY_DOZEN)', async () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'BEPPU',
        'KURI',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Check local ferry fare (should use inner island fare for BEPPU-KURI)
      const localFerryRoute = results.find(r => r.segments[0].ship === 'FERRY_DOZEN')
      expect(localFerryRoute?.totalFare).toBe(780) // From fare master data
    })

    it('should calculate correct fares for regular ferry (FERRY_SHIRASHIMA)', async () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'SAIGO',
        'HISHIURA',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Check regular ferry fare (should use fare master data for SAIGO-HISHIURA)
      const ferryRoute = results.find(r => r.segments[0].ship === 'FERRY_SHIRASHIMA')
      expect(ferryRoute?.totalFare).toBe(1540) // From fare master data
    })

    it('should calculate correct fares for regular ferry (FERRY_KUNIGA)', async () => {
      const store = useFerryStore()
      store.timetableData = mockTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'HONDO_SHICHIRUI',
        'KURI',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Check regular ferry fare (should use fare master data for HONDO-KURI)
      const ferryRoute = results.find(r => r.segments[0].ship === 'FERRY_KUNIGA')
      expect(ferryRoute?.totalFare).toBe(3520) // From fare master data
    })
  })
})
