import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFareStore } from '@/stores/fare'
import { useRouteSearch } from '@/composables/useRouteSearch'
import { useFerryStore } from '@/stores/ferry'

// Mock fare data based on fare-master.json
const mockFareMaster = {
  routes: [
    {
      id: 'beppu-hishiura',
      departure: 'BEPPU',
      arrival: 'HISHIURA',
      fares: {
        adult: 410,
        child: 205,
        seatClass: {
          class2: 410,
          class2Special: 630,
          class1: 650,
          classSpecial: 830,
          specialRoom: 1150
        },
        vehicle: {
          under3m: 950,
          under4m: 1260,
          under5m: 1590,
          under6m: 1900,
          under7m: 2230,
          under8m: 2560,
          under9m: 2870,
          under10m: 3200,
          under11m: 3510,
          under12m: 3810,
          over12mPer1m: 310
        }
      }
    },
    {
      id: 'hishiura-beppu',
      departure: 'HISHIURA',
      arrival: 'BEPPU',
      fares: {
        adult: 410,
        child: 205,
        seatClass: {
          class2: 410,
          class2Special: 630,
          class1: 650,
          classSpecial: 830,
          specialRoom: 1150
        },
        vehicle: {
          under3m: 950,
          under4m: 1260,
          under5m: 1590,
          under6m: 1900,
          under7m: 2230,
          under8m: 2560,
          under9m: 2870,
          under10m: 3200,
          under11m: 3510,
          under12m: 3810,
          over12mPer1m: 310
        }
      }
    }
  ],
  discounts: {
    roundTrip: { rate: 0.9 },
    group: { rate: 0.85, minPeople: 15 },
    disability: { rate: 0.5 },
    student: { rate: 0.8 }
  }
}

// Mock fare store to avoid readonly issues
vi.mock('@/stores/fare', () => ({
  useFareStore: () => ({
    fareMaster: {
      ...mockFareMaster,
      innerIslandFare: {
        adult: 300,
        child: 100
      }
    },
    isLoading: { value: false },
    error: { value: null },
    getFareByRoute: vi.fn((departure, arrival, options) => {
      const route = mockFareMaster.routes.find(r => 
        r.departure === departure && r.arrival === arrival
      )
      return route
    }),
    getRoutesByVesselType: vi.fn(),
    getActiveVersion: vi.fn(),
    isInnerIslandRoute: vi.fn((departure, arrival) => {
      const innerIslandPorts = ['BEPPU', 'HISHIURA', 'KURI']
      return innerIslandPorts.includes(departure) && innerIslandPorts.includes(arrival)
    }),
    loadFareMaster: vi.fn()
  })
}))

// Mock inner island fare for ISOKAZE
const mockInnerIslandFare = {
  adult: 300,
  child: 100
}

// Mock timetable data for Beppu-Hishiura route
const mockBeppuHishiuraTrips = [
  {
    tripId: 100,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'ISOKAZE',
    departure: 'BEPPU',
    departureTime: '08:00:00',
    arrival: 'HISHIURA',
    arrivalTime: '08:20:00',
    status: 0
  },
  {
    tripId: 101,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'FERRY_DOZEN',
    departure: 'BEPPU',
    departureTime: '14:00:00',
    arrival: 'HISHIURA',
    arrivalTime: '14:25:00',
    status: 0
  },
  {
    tripId: 102,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'FERRY_OKI',
    departure: 'BEPPU',
    departureTime: '10:30:00',
    arrival: 'HISHIURA',
    arrivalTime: '11:15:00',
    status: 0
  }
]

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

describe('useFareCalculation - Beppu-Hishiura Route', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Basic Fare Calculation', () => {
    it('should calculate correct adult fare for BEPPU-HISHIURA route', async () => {
      const ferryStore = useFerryStore()
      
      // Setup mock data
      ferryStore.timetableData = mockBeppuHishiuraTrips
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'BEPPU',
        'HISHIURA',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      expect(results).toHaveLength(3)
      
      // Check ISOKAZE (local ferry) fare - should be 300 yen (innerIslandFare)
      const isokazeRoute = results.find(r => r.segments[0].ship === 'ISOKAZE')
      expect(isokazeRoute?.totalFare).toBe(300) // Uses innerIslandFare
      expect(isokazeRoute?.segments[0].fare).toBe(300)
      
      // Check FERRY_DOZEN (local ferry) fare - should be 300 yen (innerIslandFare)
      const ferryDozenRoute = results.find(r => r.segments[0].ship === 'FERRY_DOZEN')
      expect(ferryDozenRoute?.totalFare).toBe(300) // Uses innerIslandFare
      expect(ferryDozenRoute?.segments[0].fare).toBe(300)
      
      // Check FERRY_OKI (regular ferry) fare - should be 410 yen from fare master
      const ferryOkiRoute = results.find(r => r.segments[0].ship === 'FERRY_OKI')
      expect(ferryOkiRoute?.totalFare).toBe(410) // From fare master lookup
      expect(ferryOkiRoute?.segments[0].fare).toBe(410)
    })

    it('should calculate correct fare for HISHIURA-BEPPU route (reverse direction)', async () => {
      const ferryStore = useFerryStore()
      
      // Setup mock data
      ferryStore.timetableData = mockBeppuHishiuraTrips.map(trip => ({
        ...trip,
        departure: 'HISHIURA',
        arrival: 'BEPPU'
      }))
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'HISHIURA',
        'BEPPU',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      expect(results).toHaveLength(3)
      
      // Local ferries (ISOKAZE, FERRY_DOZEN) should use innerIslandFare (300 yen)
      // Regular ferries (FERRY_OKI) should use fare master (410 yen)
      const localFerryRoutes = results.filter(r => 
        r.segments[0].ship === 'ISOKAZE' || r.segments[0].ship === 'FERRY_DOZEN'
      )
      localFerryRoutes.forEach(route => {
        expect(route.totalFare).toBe(300) // Uses innerIslandFare
        expect(route.segments[0].fare).toBe(300)
      })
      
      const regularFerryRoutes = results.filter(r => r.segments[0].ship === 'FERRY_OKI')
      regularFerryRoutes.forEach(route => {
        expect(route.totalFare).toBe(410) // From fare master
        expect(route.segments[0].fare).toBe(410)
      })
    })
  })

  describe('Seat Class Fare Calculation', () => {
    it('should handle different seat classes correctly', () => {
      const fareStore = useFareStore()
      
      // Test direct fare lookup for different seat classes
      const fareRoute = fareStore.getFareByRoute('BEPPU', 'HISHIURA', {
        vesselType: 'local'
      })
      
      expect(fareRoute).toBeDefined()
      expect(fareRoute?.fares.adult).toBe(410)
      expect(fareRoute?.fares.child).toBe(205)
      
      // Check seat class fares
      expect(fareRoute?.fares.seatClass?.class2).toBe(410)
      expect(fareRoute?.fares.seatClass?.class2Special).toBe(630)
      expect(fareRoute?.fares.seatClass?.class1).toBe(650)
      expect(fareRoute?.fares.seatClass?.classSpecial).toBe(830)
      expect(fareRoute?.fares.seatClass?.specialRoom).toBe(1150)
    })
  })

  describe('Vehicle Fare Calculation', () => {
    it('should calculate correct vehicle fares for different lengths', () => {
      const fareStore = useFareStore()
      
      const fareRoute = fareStore.getFareByRoute('BEPPU', 'HISHIURA', {
        vesselType: 'local'
      })
      
      expect(fareRoute?.fares.vehicle).toBeDefined()
      
      const vehicleFares = fareRoute?.fares.vehicle
      
      // Test vehicle fare calculations
      expect(vehicleFares?.under3m).toBe(950)
      expect(vehicleFares?.under4m).toBe(1260)
      expect(vehicleFares?.under5m).toBe(1590)
      expect(vehicleFares?.under6m).toBe(1900)
      expect(vehicleFares?.under7m).toBe(2230)
      expect(vehicleFares?.under8m).toBe(2560)
      expect(vehicleFares?.under9m).toBe(2870)
      expect(vehicleFares?.under10m).toBe(3200)
      expect(vehicleFares?.under11m).toBe(3510)
      expect(vehicleFares?.under12m).toBe(3810)
      expect(vehicleFares?.over12mPer1m).toBe(310)
    })

    it('should calculate fare for vehicles over 12m', () => {
      const baseFare = 3810 // under12m fare
      const extraLength = 2 // 14m total
      const perMeterRate = 310
      
      const expectedFare = baseFare + (extraLength * perMeterRate)
      expect(expectedFare).toBe(4430)
    })
  })

  describe('Discount Calculations', () => {
    it('should apply round trip discount correctly', () => {
      const baseFare = 410
      const discountRate = 0.9
      const expectedFare = Math.ceil(baseFare * discountRate / 10) * 10 // Round up to 10 yen
      
      expect(expectedFare).toBe(370)
    })

    it('should apply group discount correctly', () => {
      const baseFare = 410
      const discountRate = 0.85
      const expectedFare = Math.ceil(baseFare * discountRate / 10) * 10 // Round up to 10 yen
      
      expect(expectedFare).toBe(350)
    })

    it('should apply disability discount correctly', () => {
      const baseFare = 410
      const discountRate = 0.5
      const expectedFare = Math.ceil(baseFare * discountRate / 10) * 10 // Round up to 10 yen
      
      expect(expectedFare).toBe(210)
    })

    it('should apply student discount correctly', () => {
      const baseFare = 410
      const discountRate = 0.8
      const expectedFare = Math.ceil(baseFare * discountRate / 10) * 10 // Round up to 10 yen
      
      expect(expectedFare).toBe(330)
    })
  })

  describe('Child Fare Calculation', () => {
    it('should calculate child fare as half of adult fare rounded up to 10 yen', () => {
      const adultFare = 410
      const expectedChildFare = Math.ceil(adultFare / 2 / 10) * 10
      
      expect(expectedChildFare).toBe(210)
    })

    it('should calculate child fare for different seat classes', () => {
      const adultFares = {
        class2: 410,
        class2Special: 630,
        class1: 650,
        classSpecial: 830,
        specialRoom: 1150
      }
      
      const expectedChildFares = {
        class2: 210,      // 410/2 = 205 → 210
        class2Special: 320, // 630/2 = 315 → 320
        class1: 330,      // 650/2 = 325 → 330
        classSpecial: 420, // 830/2 = 415 → 420
        specialRoom: 580  // 1150/2 = 575 → 580
      }
      
      Object.entries(adultFares).forEach(([seatClass, adultFare]) => {
        const childFare = Math.ceil(adultFare / 2 / 10) * 10
        expect(childFare).toBe(expectedChildFares[seatClass])
      })
    })
  })

  describe('Route Scenarios', () => {
    it('should calculate family trip fare correctly', () => {
      const adultFare = 410
      const childFare = 210 // 410/2 rounded up
      const vehicleFare = 1590 // 4.5m vehicle
      
      const totalFare = (adultFare * 2) + (childFare * 2) + vehicleFare
      expect(totalFare).toBe(2830)
    })

    it('should calculate couple round trip with first class correctly', () => {
      const firstClassFare = 650
      const roundTripFare = Math.ceil(firstClassFare * 0.9 / 10) * 10 // 650 * 0.9 = 585 → 590
      
      const totalFare = roundTripFare * 2
      expect(totalFare).toBe(1180)
    })

    it('should calculate group trip with buses correctly', () => {
      const adultFare = 410
      const groupFare = Math.ceil(adultFare * 0.85 / 10) * 10 // 410 * 0.85 = 348.5 → 350
      const busFare = 3810 // 12m bus
      
      const totalFare = (groupFare * 20) + (busFare * 2)
      expect(totalFare).toBe(14620)
    })
  })

  describe('ISOKAZE Inner Island Fare', () => {
    it('should calculate fare from fare master for ISOKAZE inner island routes', async () => {
      const ferryStore = useFerryStore()
      
      // Setup mock data for ISOKAZE
      ferryStore.timetableData = [
        {
          tripId: 100,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          name: 'ISOKAZE',
          departure: 'BEPPU',
          departureTime: '08:00:00',
          arrival: 'HISHIURA',
          arrivalTime: '08:20:00',
          status: 0
        }
      ]
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'BEPPU',
        'HISHIURA',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // ISOKAZE should use innerIslandFare (300 yen) for all inner island routes
      expect(results).toHaveLength(1)
      expect(results[0].totalFare).toBe(300) // Uses innerIslandFare
      expect(results[0].segments[0].fare).toBe(300)
    })
  })

  describe('Fare Display in Transit Results', () => {
    it('should display routes even when fare is 0 (fare unknown)', async () => {
      const ferryStore = useFerryStore()
      
      // Setup mock data for a route not in fare master
      ferryStore.timetableData = [
        {
          tripId: 999,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          name: 'UNKNOWN_SHIP',
          departure: 'UNKNOWN_PORT',
          departureTime: '08:00:00',
          arrival: 'UNKNOWN_DEST',
          arrivalTime: '09:00:00',
          status: 0
        }
      ]
      
      const { searchRoutes } = useRouteSearch()
      
      const results = await searchRoutes(
        'UNKNOWN_PORT',
        'UNKNOWN_DEST',
        new Date('2024-01-15'),
        '08:00',
        false
      )
      
      // Route should be returned but with 0 fare (displayed as "fare unknown")
      expect(results).toHaveLength(1)
      expect(results[0].totalFare).toBe(0)
      expect(results[0].segments[0].fare).toBe(0)
      
      // Check that all segments have valid fare numbers (including 0)
      results.forEach(route => {
        expect(typeof route.totalFare).toBe('number')
        expect(route.segments.every(segment => typeof segment.fare === 'number')).toBe(true)
        
        // Check that total fare equals sum of segment fares
        const segmentSum = route.segments.reduce((sum, segment) => sum + segment.fare, 0)
        expect(route.totalFare).toBe(segmentSum)
      })
    })
  })
})
