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
      locale: vue.ref('ja')
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
})


