import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppBottomNavigation from '@/components/AppBottomNavigation.vue'

describe('AppBottomNavigation', () => {
  beforeEach(() => {
    // default mocks (can be overridden per test)
    global.useRoute = vi.fn(() => ({
      path: '/',
      params: {},
      query: {}
    }))
    global.useLocalePath = vi.fn(() => (path: string) => path)
    global.useAndroidNavigation = vi.fn(() => ({
      isAndroid: ref(false),
      navigationBarHeight: ref(0)
    }))
  })

  it('renders all bottom navigation items', () => {
    const wrapper = mount(AppBottomNavigation, {
      global: {
        mocks: {
          $t: (key: string) => key
        }
      }
    })

    expect(wrapper.find('[aria-label="Global navigation"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bottom-nav-item-TIMETABLE"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bottom-nav-item-TRANSIT"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bottom-nav-item-STATUS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bottom-nav-item-SETTINGS"]').exists()).toBe(true)
  })

  it('sets aria-current on active item (supports locale-prefixed route)', () => {
    global.useRoute = vi.fn(() => ({
      path: '/en/transit',
      params: {},
      query: {}
    }))

    const wrapper = mount(AppBottomNavigation, {
      global: {
        mocks: {
          $t: (key: string) => key
        }
      }
    })

    const transit = wrapper.find('[data-testid="bottom-nav-item-TRANSIT"]')
    const timetable = wrapper.find('[data-testid="bottom-nav-item-TIMETABLE"]')
    expect(transit.attributes('aria-current')).toBe('page')
    expect(timetable.attributes('aria-current')).toBeUndefined()
  })
})
