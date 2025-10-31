import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountWithI18n } from '@/test/utils/mountWithI18n'
import { setActivePinia, createPinia } from 'pinia'
import { useFerryStore } from '@/stores/ferry'
import { useFareStore } from '@/stores/fare'
import { useHistoryStore } from '@/stores/history'
import Transit from '@/pages/transit.vue'
import { createRouter, createWebHistory } from 'vue-router'

// Mock data
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
  }
]

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
        }
      }
    }
  ]
}

// Mock components
vi.mock('@/components/common/PortSelector.vue', () => ({
  default: {
    name: 'PortSelector',
    template: '<div class="mock-port-selector"><slot /></div>',
    props: ['modelValue', 'label', 'placeholder', 'disabledPorts'],
    emits: ['update:modelValue']
  }
}))

vi.mock('@/components/common/DatePicker.vue', () => ({
  default: {
    name: 'DatePicker',
    template: '<div class="mock-date-picker"><slot /></div>',
    props: ['modelValue', 'label', 'minDate'],
    emits: ['update:modelValue']
  }
}))

vi.mock('@/components/common/ShipModal.vue', () => ({
  default: {
    name: 'CommonShipModal',
    template: '<div class="mock-ship-modal"><slot /></div>',
    props: ['visible', 'title', 'type', 'shipId', 'content'],
    emits: ['update:visible']
  }
}))

vi.mock('@/components/common/StatusAlerts.vue', () => ({
  default: {
    name: 'StatusAlerts',
    template: '<div class="mock-status-alerts" />'
  }
}))

vi.mock('@/components/favorites/FavoriteButton.vue', () => ({
  default: {
    name: 'FavoriteButton',
    template: '<div class="mock-favorite-button" />',
    props: ['type', 'port', 'route']
  }
}))

vi.mock('@/components/map/RouteMapModal.vue', () => ({
  default: {
    name: 'RouteMapModal',
    template: '<div class="mock-route-map-modal" />',
    props: ['visible', 'route'],
    emits: ['update:visible']
  }
}))

// Mock composables
vi.mock('@/composables/useRouteSearch', () => ({
  useRouteSearch: () => ({
    searchRoutes: vi.fn().mockResolvedValue([
      {
        segments: [
          {
            tripId: '100',
            ship: 'ISOKAZE',
            departure: 'BEPPU',
            arrival: 'HISHIURA',
            departureTime: new Date('2024-01-15T08:00:00'),
            arrivalTime: new Date('2024-01-15T08:20:00'),
            status: 0,
            fare: 410
          }
        ],
        departureTime: new Date('2024-01-15T08:00:00'),
        arrivalTime: new Date('2024-01-15T08:20:00'),
        totalFare: 410,
        transferCount: 0
      },
      {
        segments: [
          {
            tripId: '101',
            ship: 'FERRY_DOZEN',
            departure: 'BEPPU',
            arrival: 'HISHIURA',
            departureTime: new Date('2024-01-15T14:00:00'),
            arrivalTime: new Date('2024-01-15T14:25:00'),
            status: 0,
            fare: 410
          }
        ],
        departureTime: new Date('2024-01-15T14:00:00'),
        arrivalTime: new Date('2024-01-15T14:25:00'),
        totalFare: 410,
        transferCount: 0
      }
    ]),
    formatTime: vi.fn((date) => {
      return date.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    }),
    calculateDuration: vi.fn(() => '20分'),
    getPortDisplayName: vi.fn((port) => port)
  })
}))

vi.mock('@/composables/useFerryData', () => ({
  useFerryData: () => ({
    getTripStatus: vi.fn(() => 0),
    initializeData: vi.fn()
  })
}))

vi.mock('@/composables/useHolidayCalendar', () => ({
  useHolidayCalendar: () => ({})
}))

describe('Transit Page - Fare Display', () => {
  let router: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Setup router
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/transit', component: Transit }
      ]
    })
    
    // Setup stores
    const ferryStore = useFerryStore()
    const fareStore = useFareStore()
    const historyStore = useHistoryStore()
    
    ferryStore.timetableData = mockBeppuHishiuraTrips
    fareStore.fareMaster = mockFareMaster
  })

  describe('Fare Display in Search Results', () => {
    it('should display fare information in route headers', async () => {
      const wrapper = mountWithI18n(Transit, {
        global: {
          plugins: [router],
          stubs: {
            PortSelector: true,
            DatePicker: true,
            CommonShipModal: true,
            StatusAlerts: true,
            FavoriteButton: true,
            RouteMapModal: true
          }
        }
      })

      // Set search parameters
      await wrapper.setData({
        departure: 'BEPPU',
        arrival: 'HISHIURA',
        date: new Date('2024-01-15'),
        time: '08:00',
        isArrivalMode: false,
        hasSearched: true,
        searchResults: [
          {
            segments: [
              {
                tripId: '100',
                ship: 'ISOKAZE',
                departure: 'BEPPU',
                arrival: 'HISHIURA',
                departureTime: new Date('2024-01-15T08:00:00'),
                arrivalTime: new Date('2024-01-15T08:20:00'),
                status: 0,
                fare: 410
              }
            ],
            departureTime: new Date('2024-01-15T08:00:00'),
            arrivalTime: new Date('2024-01-15T08:20:00'),
            totalFare: 410,
            transferCount: 0
          }
        ]
      })

      await wrapper.vm.$nextTick()

      // Check that fare is displayed in route header
      const routeHeaders = wrapper.findAll('.bg-blue-600')
      expect(routeHeaders.length).toBeGreaterThan(0)
      
      const fareText = wrapper.text()
      expect(fareText).toContain('¥410')
      expect(fareText).toContain('20分') // Duration should also be displayed
    })

    it('should display fare information in route details table', async () => {
      const wrapper = mountWithI18n(Transit, {
        global: {
          plugins: [router],
          stubs: {
            PortSelector: true,
            DatePicker: true,
            CommonShipModal: true,
            StatusAlerts: true,
            FavoriteButton: true,
            RouteMapModal: true
          }
        }
      })

      // Set search results
      await wrapper.setData({
        departure: 'BEPPU',
        arrival: 'HISHIURA',
        hasSearched: true,
        searchResults: [
          {
            segments: [
              {
                tripId: '100',
                ship: 'ISOKAZE',
                departure: 'BEPPU',
                arrival: 'HISHIURA',
                departureTime: new Date('2024-01-15T08:00:00'),
                arrivalTime: new Date('2024-01-15T08:20:00'),
                status: 0,
                fare: 410
              }
            ],
            departureTime: new Date('2024-01-15T08:00:00'),
            arrivalTime: new Date('2024-01-15T08:20:00'),
            totalFare: 410,
            transferCount: 0
          }
        ]
      })

      await wrapper.vm.$nextTick()

      // Check that fare is displayed in the table
      const tableCells = wrapper.findAll('td')
      const fareCells = tableCells.filter(cell => cell.text().includes('¥410'))
      
      expect(fareCells.length).toBeGreaterThan(0)
      
      // Check total fare display
      const totalFareText = wrapper.text()
      expect(totalFareText).toContain('TOTAL: ¥410')
    })

    it('should display multiple routes with different fares correctly', async () => {
      const wrapper = mountWithI18n(Transit, {
        global: {
          plugins: [router],
          stubs: {
            PortSelector: true,
            DatePicker: true,
            CommonShipModal: true,
            StatusAlerts: true,
            FavoriteButton: true,
            RouteMapModal: true
          }
        }
      })

      // Set multiple search results with different fares
      await wrapper.setData({
        departure: 'BEPPU',
        arrival: 'HISHIURA',
        hasSearched: true,
        searchResults: [
          {
            segments: [
              {
                tripId: '100',
                ship: 'ISOKAZE',
                departure: 'BEPPU',
                arrival: 'HISHIURA',
                departureTime: new Date('2024-01-15T08:00:00'),
                arrivalTime: new Date('2024-01-15T08:20:00'),
                status: 0,
                fare: 410
              }
            ],
            departureTime: new Date('2024-01-15T08:00:00'),
            arrivalTime: new Date('2024-01-15T08:20:00'),
            totalFare: 410,
            transferCount: 0
          },
          {
            segments: [
              {
                tripId: '101',
                ship: 'FERRY_DOZEN',
                departure: 'BEPPU',
                arrival: 'HISHIURA',
                departureTime: new Date('2024-01-15T14:00:00'),
                arrivalTime: new Date('2024-01-15T14:25:00'),
                status: 0,
                fare: 630 // 2等特別
              }
            ],
            departureTime: new Date('2024-01-15T14:00:00'),
            arrivalTime: new Date('2024-01-15T14:25:00'),
            totalFare: 630,
            transferCount: 0
          }
        ]
      })

      await wrapper.vm.$nextTick()

      const pageText = wrapper.text()
      
      // Both fares should be displayed
      expect(pageText).toContain('¥410')
      expect(pageText).toContain('¥630')
    })

    it('should display transfer routes with summed fares correctly', async () => {
      const wrapper = mountWithI18n(Transit, {
        global: {
          plugins: [router],
          stubs: {
            PortSelector: true,
            DatePicker: true,
            CommonShipModal: true,
            StatusAlerts: true,
            FavoriteButton: true,
            RouteMapModal: true
          }
        }
      })

      // Set transfer route results
      await wrapper.setData({
        departure: 'BEPPU',
        arrival: 'SAIGO',
        hasSearched: true,
        searchResults: [
          {
            segments: [
              {
                tripId: '100',
                ship: 'ISOKAZE',
                departure: 'BEPPU',
                arrival: 'HISHIURA',
                departureTime: new Date('2024-01-15T08:00:00'),
                arrivalTime: new Date('2024-01-15T08:20:00'),
                status: 0,
                fare: 410
              },
              {
                tripId: '101',
                ship: 'FERRY_DOZEN',
                departure: 'HISHIURA',
                arrival: 'SAIGO',
                departureTime: new Date('2024-01-15T09:00:00'),
                arrivalTime: new Date('2024-01-15T10:30:00'),
                status: 0,
                fare: 1540
              }
            ],
            departureTime: new Date('2024-01-15T08:00:00'),
            arrivalTime: new Date('2024-01-15T10:30:00'),
            totalFare: 1950, // 410 + 1540
            transferCount: 1
          }
        ]
      })

      await wrapper.vm.$nextTick()

      const pageText = wrapper.text()
      
      // Individual segment fares should be displayed
      expect(pageText).toContain('¥410')
      expect(pageText).toContain('¥1540')
      
      // Total fare should be displayed
      expect(pageText).toContain('TOTAL: ¥1,950')
    })
  })

  describe('Fare Format and Localization', () => {
    it('should format fares with proper thousand separators', async () => {
      const wrapper = mountWithI18n(Transit, {
        global: {
          plugins: [router],
          stubs: {
            PortSelector: true,
            DatePicker: true,
            CommonShipModal: true,
            StatusAlerts: true,
            FavoriteButton: true,
            RouteMapModal: true
          }
        }
      })

      // Set search results with high fare
      await wrapper.setData({
        departure: 'BEPPU',
        arrival: 'HISHIURA',
        hasSearched: true,
        searchResults: [
          {
            segments: [
              {
                tripId: '100',
                ship: 'ISOKAZE',
                departure: 'BEPPU',
                arrival: 'HISHIURA',
                departureTime: new Date('2024-01-15T08:00:00'),
                arrivalTime: new Date('2024-01-15T08:20:00'),
                status: 0,
                fare: 1150
              }
            ],
            departureTime: new Date('2024-01-15T08:00:00'),
            arrivalTime: new Date('2024-01-15T08:20:00'),
            totalFare: 1150,
            transferCount: 0
          }
        ]
      })

      await wrapper.vm.$nextTick()

      const pageText = wrapper.text()
      
      // Should format with thousand separator
      expect(pageText).toContain('¥1,150')
      expect(pageText).not.toContain('¥1150')
    })

    it('should display fare information in route details modal', async () => {
      const wrapper = mountWithI18n(Transit, {
        global: {
          plugins: [router],
          stubs: {
            PortSelector: true,
            DatePicker: true,
            CommonShipModal: true,
            StatusAlerts: true,
            FavoriteButton: true,
            RouteMapModal: true
          }
        }
      })

      // Set search results and show details modal
      await wrapper.setData({
        departure: 'BEPPU',
        arrival: 'HISHIURA',
        hasSearched: true,
        searchResults: [
          {
            segments: [
              {
                tripId: '100',
                ship: 'ISOKAZE',
                departure: 'BEPPU',
                arrival: 'HISHIURA',
                departureTime: new Date('2024-01-15T08:00:00'),
                arrivalTime: new Date('2024-01-15T08:20:00'),
                status: 0,
                fare: 410
              }
            ],
            departureTime: new Date('2024-01-15T08:00:00'),
            arrivalTime: new Date('2024-01-15T08:20:00'),
            totalFare: 410,
            transferCount: 0
          }
        ],
        showDetailsModal: true,
        selectedRoute: {
          segments: [
            {
              tripId: '100',
              ship: 'ISOKAZE',
              departure: 'BEPPU',
              arrival: 'HISHIURA',
              departureTime: new Date('2024-01-15T08:00:00'),
              arrivalTime: new Date('2024-01-15T08:20:00'),
              status: 0,
              fare: 410
            }
          ],
          departureTime: new Date('2024-01-15T08:00:00'),
          arrivalTime: new Date('2024-01-15T08:20:00'),
          totalFare: 410,
          transferCount: 0
        }
      })

      await wrapper.vm.$nextTick()

      const pageText = wrapper.text()
      
      // Should show fare in modal
      expect(pageText).toContain('¥410')
      expect(pageText).toContain('TOTAL_FARE')
    })
  })
})
