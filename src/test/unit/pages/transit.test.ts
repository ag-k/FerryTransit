import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import Transit from '~/pages/transit.vue'
import type { TransitRoute } from '@/types'

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

const routeQuery: Record<string, any> = {}

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

const buildRoute = ({
  tripId,
  departureTime,
  arrivalTime,
  totalFare,
  transferCount = 0,
  status = 1
}: {
  tripId: string
  departureTime: string
  arrivalTime: string
  totalFare: number
  transferCount?: number
  status?: number
}): TransitRoute => {
  const toDate = (time: string): Date => new Date(`2024-01-01T${time}:00`)
  const departureDate = toDate(departureTime)
  const arrivalDate = toDate(arrivalTime)

  return {
    segments: [
      {
        tripId,
        ship: 'FERRY_OKI',
        departure: 'HONDO',
        arrival: 'SAIGO',
        departureTime: departureDate,
        arrivalTime: arrivalDate,
        status,
        fare: totalFare
      }
    ],
    departureTime: departureDate,
    arrivalTime: arrivalDate,
    totalFare,
    transferCount
  }
}

const getTripIds = (routes: TransitRoute[]): string[] => {
  return routes.map(route => route.segments[0].tripId)
}

describe('Transit Page', () => {
  beforeEach(() => {
    Object.keys(routeQuery).forEach((key) => {
      delete routeQuery[key]
    })
    searchRoutesMock.mockReset()
    searchRoutesMock.mockResolvedValue([])
  })

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

  it('shows vehicle length select when car boarding is enabled', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="transit-vehicle-length-select"]').exists()).toBe(false)

    const checkbox = wrapper.find('[data-testid="transit-with-car-toggle"] input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
    await checkbox.setValue(true)

    const select = wrapper.find('[data-testid="transit-vehicle-length-select"]')
    expect(select.exists()).toBe(true)
    expect((select.element as HTMLSelectElement).value).toBe('5')
  })

  it('initializes car boarding options from URL query and passes them to search', async () => {
    Object.assign(routeQuery, {
      departure: 'HONDO',
      arrival: 'SAIGO',
      date: '2024-01-15',
      time: '08:00',
      autoSearch: '1',
      withCar: '1',
      vehicleLengthMeters: '7'
    })

    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.vm.$nextTick()
    await flushPromises()

    const vm = wrapper.vm as typeof wrapper.vm & {
      withCar: boolean
      vehicleLengthMeters: number
    }
    expect(vm.withCar).toBe(true)
    expect(vm.vehicleLengthMeters).toBe(7)
    expect(searchRoutesMock).toHaveBeenCalledWith(
      'HONDO',
      'SAIGO',
      expect.any(Date),
      '08:00',
      false,
      true,
      7
    )
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
      false,
      false,
      5
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
      true,
      false,
      5
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

  it('keeps routes with the same departure time as distinct alternatives', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = buildSampleRoutes()
    await wrapper.vm.$nextTick()

    const sameDepartureRoutes = wrapper.vm.sortedResults.filter((route: TransitRoute) =>
      route.departureTime.getTime() === new Date('2024-01-01T08:00:00').getTime()
    )

    expect(getTripIds(sameDepartureRoutes)).toEqual([
      'route-same-departure-early',
      'route-balanced-1'
    ])
  })

  it('keeps all BUG-002 transfer alternatives in every sort mode', async () => {
    const wrapper = createWrapper()
    const toDate = (time: string): Date => new Date(`2026-07-05T${time}:00+09:00`)
    const bug002Routes: TransitRoute[] = [
      {
        segments: [
          { tripId: '979', ship: 'FERRY_SHIRASHIMA', departure: 'HONDO_SAKAIMINATO', arrival: 'KURI', departureTime: toDate('14:10'), arrivalTime: toDate('16:35'), status: 0, fare: 3510 },
          { tripId: '570', ship: 'ISOKAZE', departure: 'KURI', arrival: 'HISHIURA', departureTime: toDate('17:49'), arrivalTime: toDate('18:07'), status: 0, fare: 300 }
        ],
        departureTime: toDate('14:10'),
        arrivalTime: toDate('18:07'),
        totalFare: 3810,
        transferCount: 1
      },
      {
        segments: [
          { tripId: '979-980', ship: 'FERRY_SHIRASHIMA', departure: 'HONDO_SAKAIMINATO', arrival: 'BEPPU', departureTime: toDate('14:10'), arrivalTime: toDate('17:10'), status: 0, fare: 3510 },
          { tripId: '568', ship: 'ISOKAZE', departure: 'BEPPU', arrival: 'HISHIURA', departureTime: toDate('17:20'), arrivalTime: toDate('17:27'), status: 0, fare: 300 }
        ],
        departureTime: toDate('14:10'),
        arrivalTime: toDate('17:27'),
        totalFare: 3810,
        transferCount: 1
      },
      {
        segments: [
          { tripId: '979-980', ship: 'FERRY_SHIRASHIMA', departure: 'HONDO_SAKAIMINATO', arrival: 'BEPPU', departureTime: toDate('14:10'), arrivalTime: toDate('17:10'), status: 0, fare: 3510 },
          { tripId: '782', ship: 'FERRY_DOZEN', departure: 'BEPPU', arrival: 'HISHIURA', departureTime: toDate('17:40'), arrivalTime: toDate('17:52'), status: 0, fare: 300 }
        ],
        departureTime: toDate('14:10'),
        arrivalTime: toDate('17:52'),
        totalFare: 3810,
        transferCount: 1
      }
    ]
    const expectedSignatures = [
      'HONDO_SAKAIMINATO->KURI:FERRY_SHIRASHIMA|KURI->HISHIURA:ISOKAZE',
      'HONDO_SAKAIMINATO->BEPPU:FERRY_SHIRASHIMA|BEPPU->HISHIURA:ISOKAZE',
      'HONDO_SAKAIMINATO->BEPPU:FERRY_SHIRASHIMA|BEPPU->HISHIURA:FERRY_DOZEN'
    ].sort()

    wrapper.vm.searchResults = bug002Routes

    for (const sortOption of ['recommended', 'fast', 'cheap', 'easy']) {
      wrapper.vm.sortOption = sortOption
      await wrapper.vm.$nextTick()

      const signatures = wrapper.vm.sortedResults
        .map((route: TransitRoute) => route.segments
          .map(segment => `${segment.departure}->${segment.arrival}:${segment.ship}`)
          .join('|'))
        .sort()
      expect(signatures).toEqual(expectedSignatures)
    }
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
    
    // 同じ出発時刻の有効な代替経路が維持されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).toContain('route-balanced-1')
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
    
    // 同じ出発時刻の有効な代替経路が維持されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).toContain('route-balanced-1')
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
    
    // 同じ出発時刻の有効な代替経路が維持されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).toContain('route-balanced-1')
  })

  it('sorts recommended routes by earliest arrival and latest departure by default', async () => {
    const wrapper = createWrapper()
    wrapper.vm.searchResults = [
      buildRoute({ tripId: 'same-arrival-early-departure', departureTime: '08:00', arrivalTime: '10:00', totalFare: 6000 }),
      buildRoute({ tripId: 'early-arrival', departureTime: '07:30', arrivalTime: '09:30', totalFare: 7000 }),
      buildRoute({ tripId: 'same-arrival-late-departure', departureTime: '09:00', arrivalTime: '10:00', totalFare: 6000 })
    ]
    await wrapper.vm.$nextTick()

    const results = wrapper.vm.sortedResults
    // 到着時刻が早い順。同着の場合は遅く出発できるルートを優先する。
    expect(getTripIds(results)).toEqual([
      'early-arrival',
      'same-arrival-late-departure',
      'same-arrival-early-departure'
    ])
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
    
    // 同じ出発時刻の有効な代替経路が維持されていることを確認
    const tripIds = results.map((route: TransitRoute) => route.segments[0].tripId)
    expect(tripIds).toContain('route-balanced-1')
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

    it('keeps multiple routes with the same departure time', async () => {
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
      expect(getTripIds(results)).toEqual(['route-2', 'route-3', 'route-1'])
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

    it('sorts by recommended order: arrival time first, then latest departure time', async () => {
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
      // おすすめ順: direct-fast / direct-slow は11:00同着なので出発が遅いdirect-fastを優先
      expect(results).toHaveLength(3)
      expect(results[0].segments[0].tripId).toBe('direct-fast')
      expect(results[1].segments[0].tripId).toBe('direct-slow')
      expect(results[2].segments[0].tripId).toBe('transfer-slow')
    })

    it('puts dominated routes later in recommended order', async () => {
      const wrapper = createWrapper()

      wrapper.vm.searchResults = [
        buildRoute({ tripId: 'dominated', departureTime: '08:00', arrivalTime: '13:00', totalFare: 5000 }),
        buildRoute({ tripId: 'dominant', departureTime: '09:00', arrivalTime: '12:00', totalFare: 5000 })
      ]
      await wrapper.vm.$nextTick()

      wrapper.vm.sortOption = 'recommended'
      await wrapper.vm.$nextTick()

      expect(getTripIds(wrapper.vm.sortedResults)).toEqual([
        'dominant',
        'dominated'
      ])
    })

    it('sorts recommended arrival-mode results by latest departure', async () => {
      const wrapper = createWrapper()

      wrapper.vm.isArrivalModeForResults = true
      wrapper.vm.searchResults = [
        buildRoute({ tripId: 'same-departure-late-arrival', departureTime: '09:00', arrivalTime: '12:00', totalFare: 6000 }),
        buildRoute({ tripId: 'early-departure', departureTime: '08:00', arrivalTime: '09:30', totalFare: 6000 }),
        buildRoute({ tripId: 'same-departure-early-arrival', departureTime: '09:00', arrivalTime: '11:00', totalFare: 6000 }),
        buildRoute({ tripId: 'latest-departure', departureTime: '10:00', arrivalTime: '12:30', totalFare: 6000 })
      ]
      await wrapper.vm.$nextTick()

      wrapper.vm.sortOption = 'recommended'
      await wrapper.vm.$nextTick()

      expect(getTripIds(wrapper.vm.sortedResults)).toEqual([
        'latest-departure',
        'same-departure-early-arrival',
        'same-departure-late-arrival',
        'early-departure'
      ])
    })

    it('puts cancelled routes last in recommended order', async () => {
      const wrapper = createWrapper()

      wrapper.vm.searchResults = [
        buildRoute({ tripId: 'normal-later', departureTime: '09:00', arrivalTime: '12:00', totalFare: 6000 }),
        buildRoute({ tripId: 'cancelled-earliest', departureTime: '08:00', arrivalTime: '09:00', totalFare: 6000, status: 2 }),
        buildRoute({ tripId: 'normal-middle', departureTime: '10:00', arrivalTime: '11:00', totalFare: 6000 })
      ]
      await wrapper.vm.$nextTick()

      wrapper.vm.sortOption = 'recommended'
      await wrapper.vm.$nextTick()

      expect(getTripIds(wrapper.vm.sortedResults)).toEqual([
        'normal-middle',
        'normal-later',
        'cancelled-earliest'
      ])
    })

    it('uses transfer count and fare as recommended tie breakers', async () => {
      const wrapper = createWrapper()
      const routes = [
        buildRoute({ tripId: 'same-time-expensive-direct', departureTime: '08:00', arrivalTime: '11:00', totalFare: 7000 }),
        buildRoute({ tripId: 'same-time-transfer', departureTime: '08:00', arrivalTime: '11:00', totalFare: 3000, transferCount: 1 }),
        buildRoute({ tripId: 'same-time-cheap-direct', departureTime: '08:00', arrivalTime: '11:00', totalFare: 5000 })
      ]

      wrapper.vm.searchResults = routes
      await wrapper.vm.$nextTick()

      wrapper.vm.sortOption = 'recommended'
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as typeof wrapper.vm & {
        compareByRecommended: (a: TransitRoute, b: TransitRoute) => number
      }

      expect(getTripIds([...routes].sort(vm.compareByRecommended))).toEqual([
        'same-time-cheap-direct',
        'same-time-expensive-direct',
        'same-time-transfer'
      ])
      expect(getTripIds(wrapper.vm.sortedResults)).toEqual([
        'same-time-cheap-direct',
        'same-time-expensive-direct',
        'same-time-transfer'
      ])
    })
  })
})
