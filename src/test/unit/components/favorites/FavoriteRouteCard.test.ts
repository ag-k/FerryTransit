import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

import FavoriteRouteCard from '@/components/favorites/FavoriteRouteCard.vue'

const mockRouter = {
  push: vi.fn()
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}))

vi.mock('vue-i18n', async () => {
  const vue = await import('vue')
  return {
    useI18n: () => ({
      locale: vue.ref('ja'),
      t: (key: string) => {
        if (key === 'HONDO') return '七類(松江市)または境港(境港市)'
        if (key === 'SAIGO') return '西郷(隠岐の島町)'
        return key
      }
    })
  }
})

vi.mock('~/stores/ferry', () => ({
  useFerryStore: () => ({
    ports: []
  })
}))

vi.mock('~/stores/favorite', () => ({
  useFavoriteStore: () => ({
    routes: [],
    removeFavoriteRoute: vi.fn()
  })
}))

vi.mock('~/utils/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  })
}))

const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: {
    to: { type: [String, Object], required: true }
  },
  template: '<a><slot /></a>'
})

describe('FavoriteRouteCard', () => {
  beforeEach(() => {
    mockRouter.push.mockReset()
    // setup.ts でも設定されているが、明示的に固定
    // @ts-expect-error global useLocalePath
    global.useLocalePath = vi.fn(() => (path: string) => path)
  })

  it('「時刻表」リンクは / に遷移する（queryはdeparture/arrivalを維持）', () => {
    const wrapper = mount(FavoriteRouteCard, {
      props: {
        departure: 'HONDO_SHICHIRUI',
        arrival: 'SAIGO'
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
          FavoriteButton: { template: '<button />' },
          ConfirmDialog: { template: '<div />', props: ['isOpen'] }
        },
        config: {
          globalProperties: {
            $t: (key: string) => key
          }
        }
      }
    })

    const links = wrapper.findAllComponents(NuxtLinkStub)
    expect(links.length).toBeGreaterThanOrEqual(2)

    const timetableTo = links[0]!.props('to') as any
    expect(timetableTo.path).toBe('/')
    expect(timetableTo.query).toEqual({
      departure: 'HONDO_SHICHIRUI',
      arrival: 'SAIGO'
    })
  })

  it('港IDが ports データに無い場合でも i18n 表示にフォールバックする（HONDO）', () => {
    const wrapper = mount(FavoriteRouteCard, {
      props: {
        departure: 'HONDO',
        arrival: 'SAIGO'
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
          FavoriteButton: { template: '<button />' },
          ConfirmDialog: { template: '<div />', props: ['isOpen'] }
        },
        config: {
          globalProperties: {
            $t: (key: string) => key
          }
        }
      }
    })

    expect(wrapper.text()).toContain('七類')
    expect(wrapper.text()).toContain('松江市')
    expect(wrapper.text()).toContain('境港')
    expect(wrapper.text()).toContain('境港市')
    expect(wrapper.text()).toContain('西郷')
    expect(wrapper.text()).toContain('隠岐の島町')
  })
})
