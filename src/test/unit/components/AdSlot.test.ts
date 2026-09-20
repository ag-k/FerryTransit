import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdSlot from '@/components/ads/AdSlot.vue'

const mountAdSlot = (props: Record<string, unknown> = {}) => mount(AdSlot, {
  props: {
    serviceId: 'oki-ferry-transit',
    slotId: 'oki-ferry-transit-common',
    islandId: 'common',
    ...props
  },
  global: {
    config: {
      globalProperties: {
        $t: (key: string) => key === 'ADVERTISEMENT' ? '広告' : key
      }
    }
  }
})

const jsonResponse = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
}))

describe('AdSlot', () => {
  beforeEach(() => {
    vi.mocked(global.useRuntimeConfig).mockReturnValue({
      public: { adDeliveryBaseUrl: 'https://ads.example.com' }
    } as ReturnType<typeof useRuntimeConfig>)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('テキスト広告を共通枠に表示する', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({
      id: 'text-ad',
      slotId: 'oki-ferry-transit-common',
      format: 'text',
      content: {
        advertiserName: 'テスト広告主',
        headline: '隠岐の旅をもっと楽しく',
        body: '配信確認用の広告です。',
        cta: '詳しく見る'
      },
      clickUrl: 'https://ads.example.com/api/ads/click?id=text-ad'
    })))

    const wrapper = mountAdSlot()
    await flushPromises()

    expect(wrapper.get('[data-test="ad-slot"]').attributes('data-ad-format')).toBe('text')
    expect(wrapper.text()).toContain('テスト広告主')
    expect(wrapper.text()).toContain('隠岐の旅をもっと楽しく')
    expect(wrapper.get('a').attributes('rel')).toContain('sponsored')
    expect(wrapper.emitted('resolved')).toEqual([['text-ad']])
  })

  it.each([
    ['banner', 'aspect-[4/1]'],
    ['image', 'aspect-[3/2]']
  ] as const)('%s広告を同じ枠で表示する', async (format, aspectClass) => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({
      id: `${format}-ad`,
      slotId: 'oki-ferry-transit-common',
      format,
      content: {
        assetUrl: `https://ads.example.com/${format}.png`,
        altText: `${format}広告の代替テキスト`,
        width: 1200,
        height: format === 'banner' ? 300 : 800
      },
      clickUrl: null
    })))

    const wrapper = mountAdSlot()
    await flushPromises()

    expect(wrapper.get('[data-test="ad-slot"]').attributes('data-ad-format')).toBe(format)
    expect(wrapper.get('img').attributes('alt')).toBe(`${format}広告の代替テキスト`)
    expect(wrapper.get('img').element.parentElement?.classList.contains(aspectClass)).toBe(true)
  })

  it('広告がない場合は枠を表示しない', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))))

    const wrapper = mountAdSlot()
    await flushPromises()

    expect(wrapper.find('[data-test="ad-slot"]').exists()).toBe(false)
    expect(wrapper.emitted('resolved')).toEqual([[null]])
  })

  it('不正な配信データは表示しない', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({
      id: 'unsafe-ad',
      slotId: 'oki-ferry-transit-common',
      format: 'banner',
      content: {
        assetUrl: 'javascript:alert(1)',
        altText: '不正な広告',
        width: 1200,
        height: 300
      },
      clickUrl: null
    })))

    const wrapper = mountAdSlot()
    await flushPromises()

    expect(wrapper.find('[data-test="ad-slot"]').exists()).toBe(false)
  })

  it('2枠目の抽選では1枠目の広告IDを除外する', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)

    mountAdSlot({
      slotId: 'oki-ferry-transit-common-secondary',
      excludeAdId: 'primary-ad'
    })
    await flushPromises()

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(requestUrl.searchParams.get('slotId')).toBe('oki-ferry-transit-common-secondary')
    expect(requestUrl.searchParams.get('excludeAdId')).toBe('primary-ad')
  })

  it.each([
    ['top-left', ['left-2', 'top-2']],
    ['top-right', ['right-2', 'top-2']],
    ['bottom-left', ['bottom-2', 'left-2']],
    ['bottom-right', ['bottom-2', 'right-2']]
  ] as const)('広告ラベルを%sに表示する', async (labelPosition, expectedClasses) => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({
      id: `ad-${labelPosition}`,
      slotId: 'oki-ferry-transit-common',
      format: 'image',
      content: {
        labelPosition,
        assetUrl: 'https://ads.example.com/image.png',
        altText: '画像広告',
        width: 1200,
        height: 800
      },
      clickUrl: null
    })))

    const wrapper = mountAdSlot()
    await flushPromises()

    const label = wrapper.get('[data-test="ad-slot"] span')
    for (const className of expectedClasses) expect(label.classes()).toContain(className)
  })

  it('位置未指定の既存広告は左上に表示する', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({
      id: 'legacy-ad',
      slotId: 'oki-ferry-transit-common',
      format: 'text',
      content: {
        advertiserName: 'テスト広告主',
        headline: '既存広告',
        body: '既存データです。',
        cta: '詳細'
      },
      clickUrl: null
    })))

    const wrapper = mountAdSlot()
    await flushPromises()

    expect(wrapper.get('[data-test="ad-slot"] span').classes()).toEqual(expect.arrayContaining(['left-2', 'top-2']))
  })

  it('テキスト広告のラベルは指定値にかかわらず左上に固定する', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({
      id: 'compact-text-ad',
      slotId: 'oki-ferry-transit-common',
      format: 'text',
      content: {
        labelPosition: 'bottom-right',
        advertiserName: 'テスト広告主',
        headline: 'コンパクトな広告',
        body: '高さを抑えて表示します。',
        cta: '詳細'
      },
      clickUrl: null
    })))

    const wrapper = mountAdSlot()
    await flushPromises()

    const label = wrapper.get('[data-test="ad-slot"] > * > span')
    expect(label.classes()).toEqual(expect.arrayContaining(['left-2', 'top-2']))
    expect(label.classes()).not.toEqual(expect.arrayContaining(['right-2', 'bottom-2']))
    expect(wrapper.get('h3').classes()).toContain('leading-tight')
  })
})
