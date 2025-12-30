import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AppNavigation from '@/components/AppNavigation.vue'

vi.mock('~/composables/useAndroidNavigation', () => ({
  useAndroidNavigation: () => ({
    isAndroid: ref(false)
  })
}))

vi.mock('~/composables/useNews', () => ({
  useNews: () => ({
    publishedNews: ref([]),
    fetchNews: vi.fn().mockResolvedValue(undefined)
  })
}))

describe('AppNavigation', () => {
  beforeEach(() => {
    // make it "mobile"
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })

    global.useLocalePath = vi.fn(() => (path: string) => path)
    global.useRoute = vi.fn(() => ({
      path: '/',
      params: {},
      query: {}
    }))
  })

  it('shows icons in the overlay menu items when opened on mobile', async () => {
    const wrapper = mount(AppNavigation, {
      global: {
        stubs: {
          NuxtLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    })

    const button = wrapper.find('button[aria-controls="navbarNav"]')
    expect(button.exists()).toBe(true)

    await button.trigger('click')

    expect(wrapper.find('[data-testid="app-nav-icon-TIMETABLE"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-TRANSIT"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-STATUS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-FARE_TABLE"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-favorites.title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-history.title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-ABOUT_APP"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-SETTINGS"]').exists()).toBe(true)
  })
})
