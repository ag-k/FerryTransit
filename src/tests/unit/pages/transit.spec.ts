import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import Transit from '~/pages/transit.vue'
import type { TransitRoute } from '@/types'

// Mock the router
vi.mock('#app', () => ({
  useRoute: () => ({
    query: {}
  }),
  useHead: vi.fn(),
  useNuxtApp: () => ({
    $i18n: {
      t: (key: string) => key
    }
  })
}))

// Mock composables
vi.mock('@/composables/useRouteSearch', () => ({
  useRouteSearch: () => ({
    searchRoutes: vi.fn().mockResolvedValue([]),
    formatTime: vi.fn(time => time),
    calculateDuration: vi.fn(() => '1h 30m'),
    getPortDisplayName: vi.fn(port => port)
  })
}))

const buildSampleRoutes = (): TransitRoute[] => {
  const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)

  return [
    {
      segments: [
        {
          tripId: 'route-fast-1',
          ship: 'FERRY_OKI',
          departure: 'HONDO',
          arrival: 'SAIGO',
          departureTime: toDate('07:45'),
          arrivalTime: toDate('09:15'),
          status: 1,
          fare: 7500
        }
      ],
      departureTime: toDate('07:45'),
      arrivalTime: toDate('09:15'),
      totalFare: 7500,
      transferCount: 0
    },
    {
      segments: [
        {
          tripId: 'route-balanced-1',
          ship: 'FERRY_OKI',
          departure: 'HONDO',
          arrival: 'SAIGO',
          departureTime: toDate('08:00'),
          arrivalTime: toDate('10:00'),
          status: 1,
          fare: 6000
        }
      ],
      departureTime: toDate('08:00'),
      arrivalTime: toDate('10:00'),
      totalFare: 6000,
      transferCount: 0
    },
    {
      segments: [
        {
          tripId: 'route-cheap-1',
          ship: 'FERRY_OKI',
          departure: 'HONDO',
          arrival: 'TRANSFER_PORT',
          departureTime: toDate('08:30'),
          arrivalTime: toDate('09:30'),
          status: 1,
          fare: 2300
        },
        {
          tripId: 'route-cheap-2',
          ship: 'FERRY_KUNIGA',
          departure: 'TRANSFER_PORT',
          arrival: 'SAIGO',
          departureTime: toDate('09:40'),
          arrivalTime: toDate('11:00'),
          status: 1,
          fare: 2200
        }
      ],
      departureTime: toDate('08:30'),
      arrivalTime: toDate('11:00'),
      totalFare: 4500,
      transferCount: 1
    },
    {
      segments: [
        {
          tripId: 'route-late-1',
          ship: 'FERRY_OKI',
          departure: 'HONDO',
          arrival: 'SAIGO',
          departureTime: toDate('09:00'),
          arrivalTime: toDate('11:30'),
          status: 1,
          fare: 5000
        }
      ],
      departureTime: toDate('09:00'),
      arrivalTime: toDate('11:30'),
      totalFare: 5000,
      transferCount: 0
    }
  ]
}

describe('Transit Page', () => {
  const createWrapper = () => {
    return mount(Transit, {
      global: {
        plugins: [createTestingPinia()],
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          PortSelector: true,
          DatePicker: true,
          CommonShipModal: true,
          FavoriteButton: true,
          RouteMapModal: true
        }
      }
    })
  }

  it('renders correctly', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('h2').text()).toBe('TRANSIT')
  })

  it('search button is disabled when departure or arrival is not selected', () => {
    const wrapper = createWrapper()
    const searchButtons = wrapper.findAll('button[type="button"]')
    const searchButton = searchButtons.find(btn => btn.text().includes('SEARCH'))
    expect(searchButton?.attributes('disabled')).toBeDefined()
  })

  it('search button is enabled when both departure and arrival are selected', async () => {
    const wrapper = createWrapper()
    
    // Set departure and arrival
    await wrapper.vm.$nextTick()
    wrapper.vm.departure = 'HONDO_SHICHIRUI'
    wrapper.vm.arrival = 'SAIGO'
    await wrapper.vm.$nextTick()
    
    const searchButtons = wrapper.findAll('button[type="button"]')
    const searchButton = searchButtons.find(btn => btn.text().includes('SEARCH'))
    expect(searchButton?.attributes('disabled')).toBeUndefined()
  })

  it('search button is disabled when departure and arrival are the same', async () => {
    const wrapper = createWrapper()
    
    // Set same port for departure and arrival
    await wrapper.vm.$nextTick()
    wrapper.vm.departure = 'SAIGO'
    wrapper.vm.arrival = 'SAIGO'
    await wrapper.vm.$nextTick()
    
    const searchButtons = wrapper.findAll('button[type="button"]')
    const searchButton = searchButtons.find(btn => btn.text().includes('SEARCH'))
    expect(searchButton?.attributes('disabled')).toBeDefined()
  })

  it('reverses route when reverse button is clicked', async () => {
    const wrapper = createWrapper()
    
    // Set initial values
    wrapper.vm.departure = 'HONDO_SHICHIRUI'
    wrapper.vm.arrival = 'SAIGO'
    await wrapper.vm.$nextTick()
    
    // Click reverse button
    const reverseButton = wrapper.find('button[aria-label="Reverse route"]')
    await reverseButton.trigger('click')
    
    expect(wrapper.vm.departure).toBe('SAIGO')
    expect(wrapper.vm.arrival).toBe('HONDO_SHICHIRUI')
  })

  it('date is properly initialized to today', () => {
    const wrapper = createWrapper()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const searchDate = wrapper.vm.date
    expect(searchDate.getFullYear()).toBe(today.getFullYear())
    expect(searchDate.getMonth()).toBe(today.getMonth())
    expect(searchDate.getDate()).toBe(today.getDate())
  })

  it('sorts routes by recommended order by default', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    const order = wrapper.vm.displayedResults.map((route: TransitRoute) => route.segments[0].tripId)
    expect(order).toEqual(['route-fast-1', 'route-balanced-1', 'route-late-1', 'route-cheap-1'])
  })

  it('sorts routes by shortest duration when fast option is selected', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    wrapper.vm.sortOption = 'fast'
    await wrapper.vm.$nextTick()

    const order = wrapper.vm.displayedResults.map((route: TransitRoute) => route.segments[0].tripId)
    expect(order).toEqual(['route-fast-1', 'route-balanced-1', 'route-cheap-1', 'route-late-1'])
  })

  it('sorts routes by lowest fare when cheap option is selected', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    wrapper.vm.sortOption = 'cheap'
    await wrapper.vm.$nextTick()

    const order = wrapper.vm.displayedResults.map((route: TransitRoute) => route.segments[0].tripId)
    expect(order).toEqual(['route-cheap-1', 'route-late-1', 'route-balanced-1', 'route-fast-1'])
  })

  it('sorts routes by easiest transfer when easy option is selected', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    wrapper.vm.sortOption = 'easy'
    await wrapper.vm.$nextTick()

    const order = wrapper.vm.displayedResults.map((route: TransitRoute) => route.segments[0].tripId)
    expect(order).toEqual(['route-fast-1', 'route-balanced-1', 'route-late-1', 'route-cheap-1'])
  })

  it('updates sort order when a tab is clicked', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findAll('[role="tab"]')
    const cheapTab = tabs.find(tab => tab.text() === 'SORT_CHEAP')
    expect(cheapTab).toBeDefined()

    await cheapTab?.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.sortOption).toBe('cheap')

    const order = wrapper.vm.displayedResults.map((route: TransitRoute) => route.segments[0].tripId)
    expect(order).toEqual(['route-cheap-1', 'route-late-1', 'route-balanced-1', 'route-fast-1'])
  })
})
