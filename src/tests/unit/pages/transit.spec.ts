import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import Transit from '~/pages/transit.vue'

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

describe('Transit Page', () => {
  const createWrapper = () => {
    return mount(Transit, {
      global: {
        plugins: [createTestingPinia()],
        stubs: {
          PortSelector: true,
          DatePicker: true,
          CommonShipModal: true,
          FavoriteButton: true
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
})