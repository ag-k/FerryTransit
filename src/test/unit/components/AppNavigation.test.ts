import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import AppNavigation from '@/components/AppNavigation.vue'
import { APP_RESUME_EVENT } from '@/composables/useTodayRollover'

const fetchNewsMock = vi.hoisted(() => vi.fn())
const publishedNewsMock = vi.hoisted(() => ({ value: [] as Array<Record<string, unknown>> }))

vi.mock('~/composables/useAndroidNavigation', () => ({
  useAndroidNavigation: () => ({
    isAndroid: ref(false)
  })
}))

vi.mock('~/composables/useNews', () => ({
  useNews: () => ({
    publishedNews: { value: publishedNewsMock.value },
    fetchNews: fetchNewsMock
  })
}))

describe('AppNavigation', () => {
  beforeEach(() => {
    fetchNewsMock.mockReset().mockResolvedValue(undefined)
    publishedNewsMock.value = []

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    })

    // make it "mobile"
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })

    global.useLocalePath = vi.fn(() => (path: string) => path)
    global.useRoute = vi.fn(() => ({
      path: '/',
      params: {},
      query: {}
    }))
  })

  it('announcements provide 48px touch targets', async () => {
    publishedNewsMock.value = [
      {
        id: 'news-1',
        title: { ja: '最新のお知らせ', en: 'Latest news' },
        publishDate: '2026-07-23T00:00:00+09:00'
      },
      {
        id: 'news-2',
        title: { ja: '過去のお知らせ', en: 'Older news' },
        publishDate: '2026-07-22T00:00:00+09:00'
      }
    ]

    const wrapper = mount(AppNavigation, {
      global: {
        stubs: {
          NuxtLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        },
        mocks: { $t: (key: string) => key }
      }
    })

    expect(wrapper.get('[data-testid="app-nav-latest-news-link"]').classes()).toContain('min-h-12')
    const expandButton = wrapper.get('[data-testid="app-nav-news-expand"]')
    expect(expandButton.classes()).toEqual(expect.arrayContaining(['min-h-12', 'min-w-12']))

    await expandButton.trigger('click')
    const olderLink = wrapper.findAll('a').find(link => link.text().includes('過去のお知らせ'))
    expect(olderLink?.classes()).toContain('min-h-12')
    const allNewsLink = wrapper.findAll('a').find(link => link.text().includes('news.viewAll'))
    expect(allNewsLink?.classes()).toContain('min-h-12')

    wrapper.unmount()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (document as Document & { visibilityState?: DocumentVisibilityState }).visibilityState
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
    expect(button.classes()).toEqual(expect.arrayContaining(['min-h-12', 'min-w-12']))
    expect(wrapper.find('[data-testid="app-home-link"]').classes()).toContain('min-h-12')

    await button.trigger('click')

    expect(wrapper.find('[data-testid="app-nav-icon-TIMETABLE"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-TRANSIT"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-STATUS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-FARE_TABLE"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-favorites.title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-history.title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-ABOUT_APP"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-icon-SETTINGS"]').exists()).toBe(true)

    // Language segmented selector (mobile)
    expect(wrapper.find('[data-testid="app-nav-language-segment"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-lang-ja"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-lang-en"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-nav-lang-ja"]').classes()).toContain('min-h-12')
    expect(wrapper.find('[data-testid="app-nav-lang-en"]').classes()).toContain('min-h-12')

    wrapper.unmount()
  })

  it('refreshes news on app resume and while the app remains visible', async () => {
    vi.useFakeTimers()
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
    await flushPromises()

    expect(fetchNewsMock).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event(APP_RESUME_EVENT))
    await flushPromises()
    expect(fetchNewsMock).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(60 * 1000)
    await flushPromises()
    expect(fetchNewsMock).toHaveBeenCalledTimes(3)

    wrapper.unmount()
    window.dispatchEvent(new Event(APP_RESUME_EVENT))
    vi.advanceTimersByTime(60 * 1000)
    await flushPromises()
    expect(fetchNewsMock).toHaveBeenCalledTimes(3)
  })

  it('refreshes news on focus, visibility recovery, and network recovery', async () => {
    vi.useFakeTimers()
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
    await flushPromises()

    expect(fetchNewsMock).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(fetchNewsMock).toHaveBeenCalledTimes(2)

    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(fetchNewsMock).toHaveBeenCalledTimes(3)

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true
    })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
    vi.advanceTimersByTime(60 * 1000)
    await flushPromises()
    expect(fetchNewsMock).toHaveBeenCalledTimes(3)

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(fetchNewsMock).toHaveBeenCalledTimes(4)

    wrapper.unmount()
  })

  it('shares an in-flight news request across simultaneous refresh events', async () => {
    let resolveFetch: (() => void) | undefined
    fetchNewsMock.mockImplementation(() => new Promise<void>((resolve) => {
      resolveFetch = resolve
    }))

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
    await Promise.resolve()

    expect(fetchNewsMock).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event(APP_RESUME_EVENT))
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('online'))
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(fetchNewsMock).toHaveBeenCalledTimes(1)

    resolveFetch?.()
    await flushPromises()

    window.dispatchEvent(new Event('focus'))
    await Promise.resolve()
    expect(fetchNewsMock).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })
})
