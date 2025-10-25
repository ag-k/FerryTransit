import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import StatusPage from '@/pages/status.vue'

const mockStore: any = {
  shipStatus: {},
  lastFetchTime: null,
  isDataStale: false
}

const mockUpdateShipStatus = vi.fn()

vi.mock('@/stores/ferry', () => ({
  useFerryStore: () => mockStore
}))

vi.mock('@/composables/useFerryData', () => ({
  useFerryData: () => ({
    updateShipStatus: mockUpdateShipStatus
  })
}))

const createShipStatus = (overrides: Record<string, any> = {}) => ({
  hasAlert: true,
  status: 2,
  summary: '一部欠航',
  reason: '悪天候',
  comment: 'ご注意ください',
  departure: '西郷',
  arrival: '本土七類',
  startTime: '12:30',
  extraShips: [],
  lastShips: [],
  updated: '2024-01-01T12:00:00',
  ...overrides
})

const mountStatusPage = () => mount(StatusPage, {
  global: {
    stubs: {
      NuxtLink: { template: '<a><slot /></a>' },
      Icon: { template: '<span />' }
    },
    config: {
      globalProperties: {
        $t: (key: string) => key
      }
    }
  }
})

describe('StatusPage', () => {
  const originalProcessClient = Object.getOwnPropertyDescriptor(process, 'client')

  beforeEach(() => {
    mockStore.isDataStale = false
    mockStore.lastFetchTime = null
    mockStore.shipStatus = {
      isokaze: null,
      dozen: null,
      ferry: null
    }
    mockUpdateShipStatus.mockReset()
    vi.unstubAllGlobals()
    vi.stubGlobal('useHead', vi.fn())
    const locale = ref('ja')
    vi.stubGlobal('useNuxtApp', () => ({
      $i18n: {
        t: (key: string) => key,
        locale
      }
    }))
    Object.defineProperty(process, 'client', {
      configurable: true,
      value: true
    })
  })

  afterEach(() => {
    if (originalProcessClient) {
      Object.defineProperty(process, 'client', originalProcessClient)
    } else {
      // @ts-expect-error delete helper prop
      delete process.client
    }
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('詳細情報を通常運航以外のいそかぜに表示する', async () => {
    mockStore.shipStatus = {
      isokaze: createShipStatus({
        extraShips: [
          { departure: '西郷', departure_time: '15:00', arrival: '本土七類' }
        ],
        lastShips: [],
        reason: '荒天のため',
        comment: '最新情報に注意'
      }),
      dozen: null,
      ferry: null
    }

    const wrapper = mountStatusPage()
    await flushPromises()

    const detailBlock = wrapper.find('[data-test="isokaze-detail"]')
    expect(detailBlock.exists()).toBe(true)
    expect(detailBlock.text()).toContain('荒天のため')
    expect(detailBlock.text()).toContain('最新情報に注意')

    const extraTable = wrapper.find('[data-test="isokaze-extra-table"]')
    expect(extraTable.exists()).toBe(true)
    expect(extraTable.text()).toContain('西郷')
    expect(extraTable.text()).toContain('15:00')
    expect(extraTable.text()).toContain('本土七類')
  })

  it('臨時便が無い場合は最終便情報を表示する', async () => {
    mockStore.shipStatus = {
      isokaze: null,
      dozen: createShipStatus({
        status: 3,
        extraShips: [],
        lastShips: [
          { departure: '菱浦', departure_time: '10:00', arrival: '西郷', via: '来居' }
        ]
      }),
      ferry: null
    }

    const wrapper = mountStatusPage()
    await flushPromises()

    const lastSection = wrapper.find('[data-test="dozen-last-section"]')
    expect(lastSection.exists()).toBe(true)
    expect(lastSection.text()).toContain('菱浦')
    expect(lastSection.text()).toContain('10:00')
    expect(lastSection.text()).toContain('西郷')
    expect(lastSection.text()).toContain('来居')

    const extraSection = wrapper.find('[data-test="dozen-extra-section"]')
    expect(extraSection.exists()).toBe(false)
  })

  it('通常運航の場合は詳細ブロックを表示しない', async () => {
    mockStore.shipStatus = {
      isokaze: createShipStatus({
        hasAlert: false,
        status: 0,
        summary: '通常運航',
        reason: null,
        comment: null,
        extraShips: [],
        lastShips: []
      }),
      dozen: null,
      ferry: null
    }

    const wrapper = mountStatusPage()
    await flushPromises()

    expect(wrapper.find('[data-test="isokaze-detail"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('通常運航')
  })
})
