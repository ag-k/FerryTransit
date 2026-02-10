import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import Transit from '~/pages/transit.vue'
import type { TransitRoute } from '@/types'

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

let routeQuery: Record<string, any> = {}

// Mock the router
vi.mock('#app', () => ({
  useRoute: () => ({
    query: routeQuery
  }),
  useHead: vi.fn(),
  useNuxtApp: () => ({
    $i18n: {
      t: (key: string) => key
    }
  })
}))

// Nuxt の auto-import で useRoute が vue-router 側を参照するケースに備えてこちらもモック
vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: routeQuery
  })
}))

// Nuxt の auto-import 集約 (#imports) から useRoute を参照するケースもあるので上書き
vi.mock('#imports', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useRoute: () => ({
      query: routeQuery
    })
  }
})

// Mock composables
const searchRoutesMock = vi.fn().mockResolvedValue([])
vi.mock('@/composables/useRouteSearch', () => ({
  useRouteSearch: () => ({
    searchRoutes: searchRoutesMock,
    formatTime: vi.fn((time: any) => {
      if (time instanceof Date) {
        return time.toISOString().slice(11, 16) // HH:MM
      }
      return String(time ?? '')
    }),
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
          tripId: 'route-same-departure-early',
          ship: 'FERRY_OKI',
          departure: 'HONDO',
          arrival: 'SAIGO',
          departureTime: toDate('08:00'),
          arrivalTime: toDate('09:30'),
          status: 1,
          fare: 6000
        }
      ],
      departureTime: toDate('08:00'),
      arrivalTime: toDate('09:30'),
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

  it('shows retry search button on empty results and searches with earlier time in departure mode', async () => {
    const wrapper = createWrapper()
    // onMounted による初期化（URLパラメータ反映）を待つ
    await flushPromises()
    await wrapper.vm.$nextTick()

    // 検索済み・結果0件状態を作る
    wrapper.vm.departure = 'HONDO'
    wrapper.vm.arrival = 'SAIGO'
    wrapper.vm.isArrivalMode = false
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    wrapper.vm.date = d
    wrapper.vm.time = '10:00'
    wrapper.vm.hasSearched = true
    wrapper.vm.searchResults = []
    await wrapper.vm.$nextTick()

    const retryBtn = wrapper.find('[data-testid="transit-retry-search"]')
    expect(retryBtn.exists()).toBe(true)
    expect(wrapper.vm.time).toBe('10:00')

    searchRoutesMock.mockClear()
    await retryBtn.trigger('click')
    await flushPromises()

    expect(searchRoutesMock).toHaveBeenCalledTimes(1)
    // handleSearch(departure, arrival, date, time, isArrivalMode)
    expect(searchRoutesMock).toHaveBeenCalledWith(
      'HONDO',
      'SAIGO',
      expect.any(Date),
      '09:00',
      false
    )
  })

  it('searches with later time in arrival mode when retry is clicked', async () => {
    const wrapper = createWrapper()
    // onMounted による初期化（URLパラメータ反映）を待つ
    await flushPromises()
    await wrapper.vm.$nextTick()

    wrapper.vm.departure = 'HONDO'
    wrapper.vm.arrival = 'SAIGO'
    wrapper.vm.isArrivalMode = true
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    wrapper.vm.date = d
    wrapper.vm.time = '10:00'
    wrapper.vm.hasSearched = true
    wrapper.vm.searchResults = []
    await wrapper.vm.$nextTick()

    const retryBtn = wrapper.find('[data-testid="transit-retry-search"]')
    expect(retryBtn.exists()).toBe(true)
    expect(wrapper.vm.time).toBe('10:00')

    searchRoutesMock.mockClear()
    await retryBtn.trigger('click')
    await flushPromises()

    expect(searchRoutesMock).toHaveBeenCalledTimes(1)
    expect(searchRoutesMock).toHaveBeenCalledWith(
      'HONDO',
      'SAIGO',
      expect.any(Date),
      '11:00',
      true
    )
  })

  it('shows CANCELLED badge in result header when the route includes a cancelled segment', async () => {
    const wrapper = createWrapper()
    const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)

    wrapper.vm.searchResults = [
      {
        segments: [
          {
            tripId: 'cancelled-seg-1',
            ship: 'FERRY_OKI',
            departure: 'HONDO',
            arrival: 'SAIGO',
            departureTime: toDate('08:00'),
            arrivalTime: toDate('09:00'),
            status: 2,
            fare: 1000
          }
        ],
        departureTime: toDate('08:00'),
        arrivalTime: toDate('09:00'),
        totalFare: 1000,
        transferCount: 0
      }
    ]

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="route-badge-cancelled"]').exists()).toBe(true)
  })

  it('shows CHANGED badge in result header when the route includes a changed segment', async () => {
    const wrapper = createWrapper()
    const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)

    wrapper.vm.searchResults = [
      {
        segments: [
          {
            tripId: 'changed-seg-1',
            ship: 'FERRY_OKI',
            departure: 'HONDO',
            arrival: 'SAIGO',
            departureTime: toDate('08:00'),
            arrivalTime: toDate('09:00'),
            status: 3,
            fare: 1000
          }
        ],
        departureTime: toDate('08:00'),
        arrivalTime: toDate('09:00'),
        totalFare: 1000,
        transferCount: 0
      }
    ]

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="route-badge-changed"]').exists()).toBe(true)
  })

  it('shows concise departure and arrival times in result header', async () => {
    const wrapper = createWrapper()
    const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)

    wrapper.vm.searchResults = [
      {
        segments: [
          {
            tripId: 'time-seg-1',
            ship: 'FERRY_OKI',
            departure: 'HONDO',
            arrival: 'SAIGO',
            departureTime: toDate('08:00'),
            arrivalTime: toDate('09:00'),
            status: 0,
            fare: 1000
          }
        ],
        departureTime: toDate('08:00'),
        arrivalTime: toDate('09:00'),
        totalFare: 1000,
        transferCount: 0
      }
    ]

    await wrapper.vm.$nextTick()

    // タイムゾーンに依存せず、"HH:MM→HH:MM" の形式で表示されていることだけ確認する
    const headerText = wrapper.find('[data-testid="transit-result-header"]').text()
    expect(headerText).toMatch(/\d{2}:\d{2}→\d{2}:\d{2}/)
  })

  it('does not show CANCELLED badge in result header when the route has no cancelled segments', async () => {
    const wrapper = createWrapper()
    const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)

    wrapper.vm.searchResults = [
      {
        segments: [
          {
            tripId: 'normal-seg-1',
            ship: 'FERRY_OKI',
            departure: 'HONDO',
            arrival: 'SAIGO',
            departureTime: toDate('08:00'),
            arrivalTime: toDate('09:00'),
            status: 0,
            fare: 1000
          }
        ],
        departureTime: toDate('08:00'),
        arrivalTime: toDate('09:00'),
        totalFare: 1000,
        transferCount: 0
      }
    ]

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="route-badge-cancelled"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="route-badge-changed"]').exists()).toBe(false)
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

  it('filters out routes with same departure time but later arrival', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    // 08:00出発のルートが2つある場合、到着が早い方（route-same-departure-early）だけが残る
    const results = wrapper.vm.sortedResults
    const route08_00 = results.find((route: TransitRoute) => 
      route.departureTime.getTime() === new Date('2024-01-01T08:00:00').getTime()
    )
    
    expect(route08_00).toBeDefined()
    expect(route08_00?.segments[0].tripId).toBe('route-same-departure-early')
    
    // 到着が遅い方（route-balanced-1）は除外されている
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).not.toContain('route-balanced-1')
  })

  it('sorts routes by shortest duration when fast option is selected', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    wrapper.vm.sortOption = 'fast'
    await wrapper.vm.$nextTick()

    const results = wrapper.vm.sortedResults
    // 所要時間が短い順になっていることを確認
    for (let i = 0; i < results.length - 1; i++) {
      const current = (results[i].arrivalTime.getTime() - results[i].departureTime.getTime()) / (1000 * 60)
      const next = (results[i + 1].arrivalTime.getTime() - results[i + 1].departureTime.getTime()) / (1000 * 60)
      expect(current).toBeLessThanOrEqual(next)
    }
    
    // 同じ出発時刻で到着が遅い結果が除外されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).not.toContain('route-balanced-1')
  })

  it('sorts routes by lowest fare when cheap option is selected', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    wrapper.vm.sortOption = 'cheap'
    await wrapper.vm.$nextTick()

    const results = wrapper.vm.sortedResults
    // 料金が安い順になっていることを確認
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i].totalFare
      const next = results[i + 1].totalFare
      expect(current).toBeLessThanOrEqual(next)
    }
    
    // 同じ出発時刻で到着が遅い結果が除外されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).not.toContain('route-balanced-1')
  })

  it('sorts routes by easiest transfer when easy option is selected', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    wrapper.vm.sortOption = 'easy'
    await wrapper.vm.$nextTick()

    const results = wrapper.vm.sortedResults
    // 乗り換え回数が少ない順になっていることを確認
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i].transferCount
      const next = results[i + 1].transferCount
      expect(current).toBeLessThanOrEqual(next)
    }
    
    // 同じ出発時刻で到着が遅い結果が除外されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).not.toContain('route-balanced-1')
  })

  it('sorts routes by chronological order (departure time) by default', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    const results = wrapper.vm.sortedResults
    // 時系列順（出発時刻順）になっていることを確認
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i].departureTime.getTime()
      const next = results[i + 1].departureTime.getTime()
      expect(current).toBeLessThanOrEqual(next)
    }
    
    // 同じ出発時刻で到着が遅い結果が除外されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).not.toContain('route-balanced-1')
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

    // 料金順になっていることを確認
    const results = wrapper.vm.sortedResults
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i].totalFare
      const next = results[i + 1].totalFare
      expect(current).toBeLessThanOrEqual(next)
    }
    
    // 同じ出発時刻で到着が遅い結果が除外されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).not.toContain('route-balanced-1')
  })

  describe('Edge cases', () => {
    it('handles empty search results', async () => {
      const wrapper = createWrapper()
      wrapper.vm.searchResults = []
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sortedResults).toEqual([])
    })

    it('handles single search result', async () => {
      const wrapper = createWrapper()
      const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)
      wrapper.vm.searchResults = [{
        segments: [{
          tripId: 'single-route',
          ship: 'FERRY_OKI',
          departure: 'HONDO',
          arrival: 'SAIGO',
          departureTime: toDate('08:00'),
          arrivalTime: toDate('10:00'),
          status: 1,
          fare: 6000
        }],
        departureTime: toDate('08:00'),
        arrivalTime: toDate('10:00'),
        totalFare: 6000,
        transferCount: 0
      }]
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sortedResults).toHaveLength(1)
      expect(wrapper.vm.sortedResults[0].segments[0].tripId).toBe('single-route')
    })

    it('handles multiple routes with same departure time correctly', async () => {
      const wrapper = createWrapper()
      const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)
      
      // 同じ出発時刻で3つのルート（到着時刻が異なる）
      wrapper.vm.searchResults = [
        {
          segments: [{ tripId: 'route-1', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('08:00'), arrivalTime: toDate('11:00'), status: 1, fare: 5000 }],
          departureTime: toDate('08:00'),
          arrivalTime: toDate('11:00'),
          totalFare: 5000,
          transferCount: 0
        },
        {
          segments: [{ tripId: 'route-2', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('08:00'), arrivalTime: toDate('09:30'), status: 1, fare: 5000 }],
          departureTime: toDate('08:00'),
          arrivalTime: toDate('09:30'),
          totalFare: 5000,
          transferCount: 0
        },
        {
          segments: [{ tripId: 'route-3', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('08:00'), arrivalTime: toDate('10:00'), status: 1, fare: 5000 }],
          departureTime: toDate('08:00'),
          arrivalTime: toDate('10:00'),
          totalFare: 5000,
          transferCount: 0
        }
      ]
      await wrapper.vm.$nextTick()

      const results = wrapper.vm.sortedResults
      // 到着が最も早いもの（route-2）だけが残る
      expect(results).toHaveLength(1)
      expect(results[0].segments[0].tripId).toBe('route-2')
    })
  })

  describe('Sort order verification', () => {
    it('sorts by fast: duration first, then fare, then departure time', async () => {
      const wrapper = createWrapper()
      const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)
      
      wrapper.vm.searchResults = [
        {
          segments: [{ tripId: 'long-cheap', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('08:00'), arrivalTime: toDate('12:00'), status: 1, fare: 3000 }],
          departureTime: toDate('08:00'),
          arrivalTime: toDate('12:00'),
          totalFare: 3000,
          transferCount: 0
        },
        {
          segments: [{ tripId: 'short-expensive', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('09:00'), arrivalTime: toDate('10:00'), status: 1, fare: 8000 }],
          departureTime: toDate('09:00'),
          arrivalTime: toDate('10:00'),
          totalFare: 8000,
          transferCount: 0
        },
        {
          segments: [{ tripId: 'medium-medium', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('10:00'), arrivalTime: toDate('12:00'), status: 1, fare: 5000 }],
          departureTime: toDate('10:00'),
          arrivalTime: toDate('12:00'),
          totalFare: 5000,
          transferCount: 0
        }
      ]
      await wrapper.vm.$nextTick()

      wrapper.vm.sortOption = 'fast'
      await wrapper.vm.$nextTick()

      const results = wrapper.vm.sortedResults
      // 所要時間が短い順: short-expensive (60分) < medium-medium (120分) < long-cheap (240分)
      expect(results[0].segments[0].tripId).toBe('short-expensive')
      expect(results[1].segments[0].tripId).toBe('medium-medium')
      expect(results[2].segments[0].tripId).toBe('long-cheap')
    })

    it('sorts by cheap: fare first, then departure time', async () => {
      const wrapper = createWrapper()
      const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)
      
      wrapper.vm.searchResults = [
        {
          segments: [{ tripId: 'expensive-early', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('08:00'), arrivalTime: toDate('10:00'), status: 1, fare: 8000 }],
          departureTime: toDate('08:00'),
          arrivalTime: toDate('10:00'),
          totalFare: 8000,
          transferCount: 0
        },
        {
          segments: [{ tripId: 'cheap-late', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('10:00'), arrivalTime: toDate('12:00'), status: 1, fare: 3000 }],
          departureTime: toDate('10:00'),
          arrivalTime: toDate('12:00'),
          totalFare: 3000,
          transferCount: 0
        },
        {
          segments: [{ tripId: 'medium-middle', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('09:00'), arrivalTime: toDate('11:00'), status: 1, fare: 5000 }],
          departureTime: toDate('09:00'),
          arrivalTime: toDate('11:00'),
          totalFare: 5000,
          transferCount: 0
        }
      ]
      await wrapper.vm.$nextTick()

      wrapper.vm.sortOption = 'cheap'
      await wrapper.vm.$nextTick()

      const results = wrapper.vm.sortedResults
      // 料金が安い順: cheap-late (3000) < medium-middle (5000) < expensive-early (8000)
      expect(results[0].segments[0].tripId).toBe('cheap-late')
      expect(results[1].segments[0].tripId).toBe('medium-middle')
      expect(results[2].segments[0].tripId).toBe('expensive-early')
    })

    it('sorts by easy: transfer count first, then departure time', async () => {
      const wrapper = createWrapper()
      const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)
      
      wrapper.vm.searchResults = [
        {
          segments: [
            { tripId: 'transfer-1', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'TRANSFER', departureTime: toDate('09:00'), arrivalTime: toDate('10:00'), status: 1, fare: 3000 },
            { tripId: 'transfer-2', ship: 'FERRY_KUNIGA', departure: 'TRANSFER', arrival: 'SAIGO', departureTime: toDate('10:30'), arrivalTime: toDate('11:30'), status: 1, fare: 2000 }
          ],
          departureTime: toDate('09:00'),
          arrivalTime: toDate('11:30'),
          totalFare: 5000,
          transferCount: 1
        },
        {
          segments: [{ tripId: 'direct-late', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('10:00'), arrivalTime: toDate('12:00'), status: 1, fare: 6000 }],
          departureTime: toDate('10:00'),
          arrivalTime: toDate('12:00'),
          totalFare: 6000,
          transferCount: 0
        },
        {
          segments: [{ tripId: 'direct-early', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('08:00'), arrivalTime: toDate('10:00'), status: 1, fare: 6000 }],
          departureTime: toDate('08:00'),
          arrivalTime: toDate('10:00'),
          totalFare: 6000,
          transferCount: 0
        }
      ]
      await wrapper.vm.$nextTick()

      wrapper.vm.sortOption = 'easy'
      await wrapper.vm.$nextTick()

      const results = wrapper.vm.sortedResults
      // 乗り換え回数が少ない順: direct-early (0回) < direct-late (0回) < transfer (1回)
      // 同じ乗り換え回数の場合は出発時刻順
      expect(results).toHaveLength(3)
      expect(results[0].segments[0].tripId).toBe('direct-early')
      expect(results[1].segments[0].tripId).toBe('direct-late')
      expect(results[2].segments[0].tripId).toBe('transfer-1')
    })

    it('sorts by chronological order: departure time first, then arrival time', async () => {
      const wrapper = createWrapper()
      const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)
      
      wrapper.vm.searchResults = [
        {
          segments: [
            { tripId: 'transfer-slow', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'TRANSFER', departureTime: toDate('09:00'), arrivalTime: toDate('11:00'), status: 1, fare: 3000 },
            { tripId: 'transfer-slow-2', ship: 'FERRY_KUNIGA', departure: 'TRANSFER', arrival: 'SAIGO', departureTime: toDate('12:00'), arrivalTime: toDate('15:00'), status: 1, fare: 2000 }
          ],
          departureTime: toDate('09:00'),
          arrivalTime: toDate('15:00'),
          totalFare: 5000,
          transferCount: 1
        },
        {
          segments: [{ tripId: 'direct-fast', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('10:00'), arrivalTime: toDate('11:00'), status: 1, fare: 6000 }],
          departureTime: toDate('10:00'),
          arrivalTime: toDate('11:00'),
          totalFare: 6000,
          transferCount: 0
        },
        {
          segments: [{ tripId: 'direct-slow', ship: 'FERRY_OKI', departure: 'HONDO', arrival: 'SAIGO', departureTime: toDate('08:00'), arrivalTime: toDate('11:00'), status: 1, fare: 6000 }],
          departureTime: toDate('08:00'),
          arrivalTime: toDate('11:00'),
          totalFare: 6000,
          transferCount: 0
        }
      ]
      await wrapper.vm.$nextTick()

      wrapper.vm.sortOption = 'recommended'
      await wrapper.vm.$nextTick()

      const results = wrapper.vm.sortedResults
      // 時系列順（出発時刻順）になっていることを確認
      // direct-slow (08:00) < transfer-slow (09:00) < direct-fast (10:00)
      expect(results).toHaveLength(3)
      expect(results[0].segments[0].tripId).toBe('direct-slow')
      expect(results[1].segments[0].tripId).toBe('transfer-slow')
      expect(results[2].segments[0].tripId).toBe('direct-fast')
      
      // 出発時刻が時系列順になっていることを確認
      for (let i = 0; i < results.length - 1; i++) {
        const current = results[i].departureTime.getTime()
        const next = results[i + 1].departureTime.getTime()
        expect(current).toBeLessThanOrEqual(next)
      }
    })
  })
})
