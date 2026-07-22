import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

import FavoriteRouteCard from '@/components/favorites/FavoriteRouteCard.vue'

const { mockLoadBusRouteLabelsForStops } = vi.hoisted(() => ({
  mockLoadBusRouteLabelsForStops: vi.fn()
}))

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
        if (key === 'AMA_TOWN_BUS') return '海士町路線バス'
        return key
      }
    })
  }
})

vi.mock('~/stores/ferry', () => ({
  useFerryStore: () => ({
    ports: [],
    getLocationLabel: (locationId: string) => ({
      BUS_AMA_100_01: '豊田',
      BUS_AMA_126_01: '隠岐汽船乗り場'
    }[locationId] ?? null),
    ensureBusStopsLoaded: vi.fn(() => Promise.resolve()),
    isStopLocation: (locationId: string) => locationId.startsWith('BUS_')
  })
}))

vi.mock('@/utils/gtfsBusTimetable', () => ({
  loadBusRouteLabelsForStops: mockLoadBusRouteLabelsForStops
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
    mockLoadBusRouteLabelsForStops.mockReset()
    mockLoadBusRouteLabelsForStops.mockResolvedValue([])
    // setup.ts でも設定されているが、明示的に固定
    // @ts-expect-error global useLocalePath
    global.useLocalePath = vi.fn(() => (path: string) => path)
  })

  it('削除ボタンに48px以上のタッチ領域を確保する', () => {
    const wrapper = mount(FavoriteRouteCard, {
      props: { departure: 'HONDO_SHICHIRUI', arrival: 'SAIGO' },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
          FavoriteButton: { template: '<button />' },
          ConfirmDialog: { template: '<div />', props: ['isOpen'] }
        },
        config: { globalProperties: { $t: (key: string) => key } }
      }
    })

    const removeButton = wrapper.get('button[aria-label="favorites.remove"]')
    expect(removeButton.classes()).toContain('min-h-12')
    expect(removeButton.classes()).toContain('min-w-12')
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

  it('車両条件を表示し、時刻表と乗換案内のqueryへ引き継ぐ', () => {
    const wrapper = mount(FavoriteRouteCard, {
      props: {
        departure: 'HONDO_SHICHIRUI',
        arrival: 'SAIGO',
        withCar: true,
        vehicleLengthMeters: 7
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

    expect(wrapper.get('[data-testid="favorite-vehicle-condition"]').text())
      .toBe('VIA_CAR / VEHICLE_SIZE_UNDER_7M')

    const links = wrapper.findAllComponents(NuxtLinkStub)
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect((link.props('to') as any).query).toEqual({
        departure: 'HONDO_SHICHIRUI',
        arrival: 'SAIGO',
        withCar: '1',
        vehicleLengthMeters: '7'
      })
    }
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

  it('バス停コードは停留所名で表示する', () => {
    const wrapper = mount(FavoriteRouteCard, {
      props: {
        departure: 'BUS_AMA_100_01',
        arrival: 'BUS_AMA_126_01'
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

    expect(wrapper.text()).toContain('豊田')
    expect(wrapper.text()).toContain('隠岐汽船乗り場')
    expect(wrapper.text()).not.toContain('BUS_AMA_100_01')
    expect(wrapper.text()).not.toContain('BUS_AMA_126_01')
  })

  it('バス停のお気に入りルートには小さく路線名を表示する', async () => {
    mockLoadBusRouteLabelsForStops.mockResolvedValue([
      {
        operatorId: 'AMA_TOWN',
        tripName: 'AMA_TOWN_BUS',
        routeName: '豊田線'
      }
    ])

    const wrapper = mount(FavoriteRouteCard, {
      props: {
        departure: 'BUS_AMA_100_01',
        arrival: 'BUS_AMA_126_01'
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

    await flushPromises()

    expect(mockLoadBusRouteLabelsForStops).toHaveBeenCalledWith('BUS_AMA_100_01', 'BUS_AMA_126_01')
    const detail = wrapper.get('[data-testid="favorite-route-detail"]')
    expect(detail.text()).toBe('海士町路線バス（豊田線）')
    expect(detail.classes()).toContain('text-xs')
  })
})
