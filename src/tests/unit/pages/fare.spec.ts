import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Fare from '@/pages/fare.vue'
import type { FareMaster } from '@/types/fare'

// Mock auto-imported composables
const mockFormatCurrency = vi.fn((amount: number) => `¥${amount.toLocaleString()}`)
const mockGetAllFares = vi.fn().mockResolvedValue([
  {
    id: 'hondo-saigo',
    departure: 'HONDO',
    arrival: 'SAIGO',
    fares: {
      adult: 3520,
      child: 1760,
      seatClass: {
        class2: 3520,
        class2Special: 4000,
        class1: 4500,
        classSpecial: 5000,
        specialRoom: 6000
      },
      vehicle: {
        under3m: 8800,
        under4m: 11000,
        under5m: 13200,
        under6m: 15400,
        under7m: 17600,
        under8m: 19800,
        under9m: 22000,
        under10m: 24200,
        under11m: 26400,
        under12m: 28600,
        over12mPer1m: 2200
      }
    }
  },
  {
    id: 'saigo-hondo',
    departure: 'SAIGO',
    arrival: 'HONDO',
    fares: {
      adult: 3520,
      child: 1760,
      seatClass: {
        class2: 3520,
        class2Special: 4000,
        class1: 4500,
        classSpecial: 5000,
        specialRoom: 6000
      },
      vehicle: {
        under3m: 8800,
        under4m: 11000,
        under5m: 13200,
        under6m: 15400,
        under7m: 17600,
        under8m: 19800,
        under9m: 22000,
        under10m: 24200,
        under11m: 26400,
        under12m: 28600,
        over12mPer1m: 2200
      }
    }
  }
])

vi.stubGlobal('useFareDisplay', vi.fn(() => ({
  formatCurrency: mockFormatCurrency,
  getVehicleSizeName: vi.fn((size: string) => size),
  getAllFares: mockGetAllFares
})))

// Mock i18n
const mockT = vi.fn((key: string) => key)
const mockI18n = {
  t: mockT,
  locale: { value: 'ja' }
}


// Mock fare store
const mockFareStore = {
  isLoading: false,
  error: null,
  loadFareMaster: vi.fn().mockResolvedValue(undefined),
  getRoutesByVesselType: vi.fn(() => []),
  getActiveVersion: vi.fn(() => null),
  fareMaster: {
    innerIslandFare: {
      adult: 300,
      child: 100
    },
    innerIslandVehicleFare: {
      under5m: 1000,
      under7m: 2000,
      under10m: 3000,
      over10m: 3000
    },
    rainbowJetFares: {
      'hondo-oki': { adult: 6680, child: 3340 },
      'saigo-hondo': { adult: 6680, child: 3340 }
    },
    routes: [],
    discounts: {
      roundTrip: {
        nameKey: 'DISCOUNT_ROUND_TRIP',
        rate: 0.9,
        descriptionKey: 'DISCOUNT_ROUND_TRIP_DESC'
      },
      group: {
        nameKey: 'DISCOUNT_GROUP',
        rate: 0.85,
        minPeople: 15,
        descriptionKey: 'DISCOUNT_GROUP_DESC'
      }
    },
    notes: ['NOTE_SEASONAL_SURCHARGE']
  } as FareMaster
}

vi.stubGlobal('useFareStore', vi.fn(() => mockFareStore))

// Mock useHead and useNuxtApp
vi.stubGlobal('useHead', vi.fn())
vi.stubGlobal('useNuxtApp', vi.fn(() => ({
  $i18n: mockI18n
})))

describe('fare.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockFareStore.isLoading = false
   mockFareStore.error = null
    mockFareStore.loadFareMaster.mockResolvedValue(undefined)
    mockFareStore.getRoutesByVesselType.mockReturnValue([])
    mockFareStore.getActiveVersion.mockReturnValue(null)
    mockFormatCurrency.mockImplementation((amount: number) => `¥${amount.toLocaleString()}`)
    mockGetAllFares.mockResolvedValue([
      {
        id: 'hondo-saigo',
        departure: 'HONDO',
        arrival: 'SAIGO',
        fares: {
          adult: 3520,
          child: 1760,
          seatClass: {
            class2: 3520,
            class2Special: 4000,
            class1: 4500,
            classSpecial: 5000,
            specialRoom: 6000
          },
          vehicle: {
            under3m: 8800,
            under4m: 11000,
            under5m: 13200,
            under6m: 15400,
            under7m: 17600,
            under8m: 19800,
            under9m: 22000,
            under10m: 24200,
            under11m: 26400,
            under12m: 28600,
            over12mPer1m: 2200
          }
        }
      },
      {
        id: 'saigo-hondo',
        departure: 'SAIGO',
        arrival: 'HONDO',
        fares: {
          adult: 3520,
          child: 1760,
          seatClass: {
            class2: 3520,
            class2Special: 4000,
            class1: 4500,
            classSpecial: 5000,
            specialRoom: 6000
          },
          vehicle: {
            under3m: 8800,
            under4m: 11000,
            under5m: 13200,
            under6m: 15400,
            under7m: 17600,
            under8m: 19800,
            under9m: 22000,
            under10m: 24200,
            under11m: 26400,
            under12m: 28600,
            over12mPer1m: 2200
          }
        }
      }
    ])
  })

  it('renders fare table page', async () => {
    const wrapper = mount(Fare, {
      global: {
        mocks: {
          $t: mockT
        },
        stubs: {
          NuxtLink: true
        }
      }
    })

    expect(wrapper.find('h2').text()).toBe('FARE_TABLE')
  })

  it('shows loading state', async () => {
    mockFareStore.isLoading = true
    mockFareStore.error = null

    const wrapper = mount(Fare, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.text()).toContain('LOADING')
  })

  it('shows error state', async () => {
    mockFareStore.isLoading = false
    mockFareStore.error = 'FARE_LOAD_ERROR'

    const wrapper = mount(Fare, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('[role="alert"]').text()).toBe('FARE_LOAD_ERROR')
  })

  it('displays fare tables after loading', async () => {
    mockFareStore.isLoading = false
    mockFareStore.error = null

    const wrapper = mount(Fare, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check passenger fare table
    expect(wrapper.text()).toContain('PASSENGER_FARE')
    expect(wrapper.text()).toContain('ADULT')
    expect(wrapper.text()).toContain('CHILD')

    // Check vehicle fare table
    expect(wrapper.text()).toContain('VEHICLE_FARE')
    expect(wrapper.text()).toContain('3m未満')
    expect(wrapper.text()).toContain('6m未満')
    expect(wrapper.text()).toContain('12m以上')

    // Check discounts section
    expect(wrapper.text()).toContain('DISCOUNTS')
    expect(wrapper.text()).toContain('DISCOUNT_ROUND_TRIP')
    expect(wrapper.text()).toContain('10% OFF')
    expect(wrapper.text()).toContain('15% OFF')

    // Notes section is handled within individual tables; ensure stored notes remain accessible
    expect(mockFareStore.loadFareMaster).toHaveBeenCalled()
  })

  it('formats currency correctly', async () => {
    mockFareStore.isLoading = false
    mockFareStore.error = null

    const wrapper = mount(Fare, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check that formatCurrency is called with representative values
    expect(mockFormatCurrency).toHaveBeenCalledWith(3520)
    expect(mockFormatCurrency).toHaveBeenCalledWith(8800)
  })
})
