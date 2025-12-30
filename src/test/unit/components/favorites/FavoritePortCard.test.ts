import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import FavoritePortCard from '@/components/favorites/FavoritePortCard.vue'

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
    ports: [],
    removeFavoritePort: vi.fn()
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

describe('FavoritePortCard', () => {
  beforeEach(() => {
    mockRouter.push.mockReset()
    // @ts-expect-error global useLocalePath
    global.useLocalePath = vi.fn(() => (path: string) => path)
  })

  it('「時刻表を見る」ボタンは / に遷移する（departureだけ付与）', async () => {
    const wrapper = mount(FavoritePortCard, {
      props: {
        portId: 'SAIGO',
        portCode: 'SAIGO'
      },
      global: {
        stubs: {
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

    const buttons = wrapper.findAll('button')
    const viewBtn = buttons.find(b => b.text().includes('favorites.viewTimetable'))
    expect(viewBtn, 'viewTimetable button should exist').toBeTruthy()

    await viewBtn!.trigger('click')

    expect(mockRouter.push).toHaveBeenCalledWith({
      path: '/',
      query: {
        departure: 'SAIGO'
      }
    })
  })

  it('HONDO（本土の総称）は i18n で日本語表示される', () => {
    const wrapper = mount(FavoritePortCard, {
      props: {
        portId: 'HONDO',
        portCode: 'HONDO'
      },
      global: {
        stubs: {
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

    expect(wrapper.text()).toContain('七類(松江市)または境港(境港市)')
  })
})
