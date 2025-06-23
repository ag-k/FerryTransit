import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Fare from '@/pages/fare.vue'
import type { FareMaster } from '@/types/fare'

// Mock auto-imported composables
vi.stubGlobal('useFareDisplay', vi.fn(() => ({
  formatCurrency: vi.fn((amount: number) => `¥${amount.toLocaleString()}`),
  getVehicleSizeName: vi.fn((size: string) => {
    const names: Record<string, string> = {
      under3m: '3m未満',
      under4m: '3m以上4m未満',
      under5m: '4m以上5m未満',
      under6m: '5m以上6m未満',
      over6m: '6m以上'
    }
    return names[size] || size
  }),
  getAllFares: vi.fn().mockResolvedValue([
    {
      id: 'hondo-saigo',
      departure: 'HONDO',
      arrival: 'SAIGO',
      fares: {
        adult: 3520,
        child: 1760,
        vehicle: {
          under3m: 8800,
          under4m: 11000,
          under5m: 13200,
          under6m: 15400,
          over6m: 17600
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
        vehicle: {
          under3m: 8800,
          under4m: 11000,
          under5m: 13200,
          under6m: 15400,
          over6m: 17600
        }
      }
    }
  ])
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
  fareMaster: {
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
    expect(wrapper.text()).toContain('6m以上')

    // Check discounts section
    expect(wrapper.text()).toContain('DISCOUNTS')
    expect(wrapper.text()).toContain('DISCOUNT_ROUND_TRIP')
    expect(wrapper.text()).toContain('10% OFF')
    expect(wrapper.text()).toContain('15% OFF')

    // Check notes section
    expect(wrapper.text()).toContain('NOTES')
    expect(wrapper.text()).toContain('NOTE_SEASONAL_SURCHARGE')
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

    // Check that formatCurrency is called
    expect(wrapper.text()).toContain('¥3,520')
    expect(wrapper.text()).toContain('¥1,760')
  })
})