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
const mockLocale = ref('ja')
const mockTranslations: Record<string, string> = {
  BEPPU: '別府港',
  HISHIURA: '菱浦港',
  VIA: '経由',
  EXTRA_SHIPS: '臨時便',
  LAST_SHIPS: '最終便',
  DEPARTURE: '出発',
  ARRIVAL: '到着',
  定期運航: 'in Operation',
  欠航: 'Canceled',
  運航に変更あり: 'Changed',
  休航: 'Suspended'
}

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
    mockLocale.value = 'ja'
    vi.stubGlobal('useNuxtApp', () => ({
      $i18n: {
        t: (key: string) => mockTranslations[key] ?? key,
        locale: mockLocale
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
    // コメントは詳細ブロックとは別セクションに表示される
    expect(wrapper.text()).toContain('最新情報に注意')

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

  it('翻訳キーの港名をローカライズして表示する', async () => {
    mockStore.shipStatus = {
      isokaze: createShipStatus({
        departure: 'BEPPU',
        arrival: 'HISHIURA',
        extraShips: [
          { departure: 'BEPPU', departure_time: '10:15', arrival: 'HISHIURA' }
        ],
        lastShips: []
      }),
      dozen: null,
      ferry: null
    }

    const wrapper = mountStatusPage()
    await flushPromises()

    const cardText = wrapper.find('[data-test="isokaze-detail"]').text()
    expect(cardText).toContain('別府港')
    expect(cardText).toContain('菱浦港')
  })

  it('フェリー本文にGoogle翻訳リンクを表示し、本文をURLに含める', async () => {
    const comment = '波浪の影響により午前便を欠航します。'
    mockLocale.value = 'en'
    mockStore.shipStatus = {
      isokaze: null,
      dozen: null,
      ferry: {
        ferryState: '定期運航',
        fastFerryState: '定期運航',
        ferryComment: comment,
        fastFerryComment: null
      }
    }

    const wrapper = mountStatusPage()
    await flushPromises()

    const link = wrapper.find('a[href*="translate.google.com"]')
    expect(link.exists()).toBe(true)
    const expectedQuery = new URLSearchParams({
      sl: 'ja',
      tl: 'en',
      text: comment,
      op: 'translate'
    }).toString()
    expect(link.attributes('href')).toBe(`https://translate.google.com/?${expectedQuery}`)
    expect(link.attributes('target')).toBe('_blank')
  })

  it('日本語ロケールではフェリー本文のGoogle翻訳リンクを表示しない', async () => {
    mockLocale.value = 'ja'
    mockStore.shipStatus = {
      isokaze: null,
      dozen: null,
      ferry: {
        ferryState: '定期運航',
        fastFerryState: '定期運航',
        ferryComment: '波浪の影響により午前便を欠航します。',
        fastFerryComment: null
      }
    }

    const wrapper = mountStatusPage()
    await flushPromises()

    expect(wrapper.find('a[href*="translate.google.com"]').exists()).toBe(false)
  })

  it('英語ロケールではフェリーバッジの既知ステータスのみ翻訳し、未知ステータスは原文表示する', async () => {
    mockLocale.value = 'en'
    mockStore.shipStatus = {
      isokaze: null,
      dozen: null,
      ferry: {
        ferryState: '定期運航',
        fastFerryState: '機関点検',
        ferryComment: null,
        fastFerryComment: null
      }
    }

    const wrapper = mountStatusPage()
    await flushPromises()

    expect(wrapper.text()).toContain('in Operation')
    expect(wrapper.text()).toContain('機関点検')
    expect(wrapper.text()).not.toContain('定期運航')
  })
})
