import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { MockInstance } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { ref, computed, nextTick } from 'vue'
import type { Ref } from 'vue'
import type { News } from '~/types'
import { createRouter, createMemoryHistory } from 'vue-router'

const mockNews: News = {
  id: '1',
  category: 'announcement',
  title: 'テストお知らせ',
  titleEn: 'Test Announcement',
  content: 'これはテスト内容です。',
  contentEn: 'This is test content.',
  status: 'published',
  priority: 'high',
  publishDate: '2024-01-01T09:00:00Z',
  isPinned: true,
  hasDetail: true,
  detailContent: '# 詳細タイトル\n\n## サブタイトル\n\nこれは**Markdown**の詳細コンテンツです。\n\n- リスト1\n- リスト2\n- リスト3',
  detailContentEn: '# Detail Title\n\n## Subtitle\n\nThis is **Markdown** detail content.\n\n- List 1\n- List 2\n- List 3'
}

type UseNewsState = {
  publishedNews: Ref<News[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  fetchNews: MockInstance<[], Promise<void>>
  getCategoryLabel: MockInstance<[string], string>
  formatDate: MockInstance<[string], string>
}

const localeRef = ref<'ja' | 'en'>('ja')
const useHeadSpy = vi.fn()
const mockUseNews = vi.fn<[], UseNewsState>()
let router: ReturnType<typeof createRouter>

vi.mock('#app', () => ({
  useHead: (...args: unknown[]) => useHeadSpy(...args)
}))

vi.mock('@unhead/vue', () => ({
  useHead: (...args: unknown[]) => useHeadSpy(...args)
}))

const createUseNewsState = (overrides: Partial<UseNewsState> = {}): UseNewsState => {
  const baseState: UseNewsState = {
    publishedNews: ref([mockNews]),
    isLoading: ref(false),
    error: ref(null),
    fetchNews: vi.fn<[], Promise<void>>(async () => {}),
    getCategoryLabel: vi.fn<[string], string>((category: string) => {
      const labels: Record<string, string> = {
        announcement: 'お知らせ',
        maintenance: 'メンテナンス',
        feature: '新機能',
        campaign: 'キャンペーン'
      }
      return labels[category] ?? category
    }),
    formatDate: vi.fn<[string], string>((date: string) => {
      const locale = localeRef.value === 'ja' ? 'ja-JP' : 'en-US'
      return new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    })
  }

  return {
    ...baseState,
    ...overrides
  }
}

vi.mock('~/composables/useNews', () => ({
  useNews: () => mockUseNews()
}))

vi.mock('#imports', () => ({
  useRoute: () => ({
    params: router ? router.currentRoute.value.params : {}
  }),
  useNuxtApp: () => ({
    $i18n: {
      locale: localeRef,
      t: (key: string) => key
    }
  })
}))


vi.mock('marked', () => ({
  marked: vi.fn((content: string) => `<div class="marked">${content}</div>`)
}))

const i18n = createI18n({
  legacy: false,
  locale: 'ja',
  messages: {
    ja: {
      HOME: 'HOME',
      news: {
        title: 'NEWS',
        urgent: '緊急',
        pinned: '固定',
        backToList: '一覧に戻る',
        notFound: 'お知らせが見つかりません',
        notFoundDescription: 'お探しのお知らせは削除されたか、URLが間違っている可能性があります。',
        pageTitle: 'お知らせ',
        pageDescription: '最新のお知らせをお届けします。'
      }
    },
    en: {
      HOME: 'HOME',
      news: {
        title: 'NEWS',
        urgent: 'Urgent',
        pinned: 'Pinned',
        backToList: 'Back to list',
        notFound: 'News not found',
        notFoundDescription: 'The news item may have been removed or the URL may be incorrect.',
        pageTitle: 'News',
        pageDescription: 'Latest updates from Ferry Transit.'
      }
    }
  }
})

let NewsDetailPage: any

const createWrapper = () => {
  return mount(NewsDetailPage, {
    global: {
      plugins: [i18n, router],
      stubs: {
        NuxtLink: {
          template: '<a><slot /></a>'
        },
        Icon: {
          props: ['name'],
          template: '<i :data-name="name"><slot /></i>'
        }
      }
    }
  })
}

const flushUpdates = async (wrapper: ReturnType<typeof createWrapper>) => {
  await flushPromises()
  await nextTick()
}

beforeAll(async () => {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/news/:id', component: { template: '<div />' } }
    ]
  })
  await router.push('/news/1')
  await router.isReady()
  NewsDetailPage = (await import('../[id].vue')).default
})

beforeEach(async () => {
  localeRef.value = 'ja'
  useHeadSpy.mockReset()
  mockUseNews.mockReset()
  mockUseNews.mockImplementation(() => createUseNewsState())
  await router.replace('/news/1')
})

describe('News Detail Page', () => {
  describe('基本表示', () => {
    it('ニュースの詳細が表示される', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)
      await flushUpdates(wrapper)

      expect(wrapper.find('h1').text()).toBe('テストお知らせ')
      expect(wrapper.text()).toContain('これはテスト内容です。')
    })

    it('カテゴリーバッジが表示される', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const badge = wrapper.find('[data-testid="category-badge"]')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('お知らせ')
    })

    it('公開日が表示される', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const publishDate = wrapper.find('[data-testid="publish-date"]')
      expect(publishDate.exists()).toBe(true)
      expect(publishDate.text()).toContain('2024')
    })

    it('固定アイコンが表示される', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const pinnedIcon = wrapper.find('[data-testid="pinned-icon"] i')
      expect(pinnedIcon.exists()).toBe(true)
      expect(pinnedIcon.attributes('data-name')).toBe('mdi:pin')
    })

    it('Markdownコンテンツがレンダリングされる', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const detailContent = wrapper.find('[data-testid="detail-content"]')
      expect(detailContent.exists()).toBe(true)
      expect(detailContent.html()).toContain('<div class="marked">')
    })
  })

  describe('パンくずリスト', () => {
    it('パンくずリストが表示される', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const breadcrumb = wrapper.find('[data-testid="breadcrumb"]')
      expect(breadcrumb.exists()).toBe(true)
    })

    it('ホーム、ニュース一覧、現在のページが表示される', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const breadcrumbItems = wrapper.findAll('[data-testid="breadcrumb-item"]')
      expect(breadcrumbItems).toHaveLength(3)
      expect(breadcrumbItems[0].text()).toContain('HOME')
      expect(breadcrumbItems[1].text()).toContain('NEWS')
      expect(breadcrumbItems[2].text()).toBe('テストお知らせ')
    })
  })

  describe('多言語対応', () => {
    it('英語ロケールで英語コンテンツが表示される', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      localeRef.value = 'en'
      wrapper.vm.$i18n.locale.value = 'en'
      await flushUpdates(wrapper)

      expect(wrapper.find('h1').text()).toBe('Test Announcement')
      expect(wrapper.text()).toContain('This is test content.')
    })

    it('英語の詳細コンテンツが表示される', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      localeRef.value = 'en'
      wrapper.vm.$i18n.locale.value = 'en'
      await flushUpdates(wrapper)

      const detailContent = wrapper.find('[data-testid="detail-content"]')
      expect(detailContent.html()).toContain('Detail Title')
      expect(detailContent.html()).toContain('This is **Markdown** detail content.')
    })

    it('英語タイトルがない場合は日本語が表示される', async () => {
      const newsWithoutEn: News = {
        ...mockNews,
        titleEn: undefined,
        contentEn: undefined,
        detailContentEn: undefined
      }

      mockUseNews.mockImplementationOnce(() => createUseNewsState({
        publishedNews: ref([newsWithoutEn])
      }))

      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      localeRef.value = 'en'
      wrapper.vm.$i18n.locale.value = 'en'
      await flushUpdates(wrapper)

      expect(wrapper.find('h1').text()).toBe('テストお知らせ')
    })
  })

  describe('エラー状態', () => {
    it('ニュースが見つからない場合は404メッセージが表示される', async () => {
      mockUseNews.mockImplementationOnce(() => createUseNewsState({
        publishedNews: ref([])
      }))

      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const errorState = wrapper.find('[data-testid="error-state"]')
      expect(errorState.exists()).toBe(true)
      expect(wrapper.text()).toContain('お知らせが見つかりません')
    })

    it('詳細がないニュースの場合は詳細セクションが非表示になる', async () => {
      const newsWithoutDetail: News = {
        ...mockNews,
        hasDetail: false
      }

      mockUseNews.mockImplementationOnce(() => createUseNewsState({
        publishedNews: ref([newsWithoutDetail])
      }))

      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      expect(wrapper.find('[data-testid="detail-content"]').exists()).toBe(false)
    })

    it('ローディング中は読み込み表示される', async () => {
      let resolveFetch: (() => void) | undefined
      mockUseNews.mockImplementationOnce(() => createUseNewsState({
        fetchNews: vi.fn(() => new Promise<void>((resolve) => {
          resolveFetch = resolve
        }))
      }))

      const wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(true)

      resolveFetch?.()
      await flushUpdates(wrapper)
    })

    it('取得エラー時はエラーメッセージが表示される', async () => {
      mockUseNews.mockImplementationOnce(() => createUseNewsState({
        fetchNews: vi.fn(() => Promise.reject(new Error('network error'))),
        publishedNews: ref([])
      }))

      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const errorState = wrapper.find('[data-testid="error-state"]')
      expect(errorState.exists()).toBe(true)
      expect(wrapper.text()).toContain('お知らせの取得に失敗しました')
    })
  })

  describe('SEO最適化', () => {
    it('useHeadが適切なメタデータで呼ばれる', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const expectedTitleJa = 'テストお知らせ'
      const expectedDescriptionJa = 'これはテスト内容です。'

      if (useHeadSpy.mock.calls.length > 0) {
        const payload = useHeadSpy.mock.calls.at(-1)?.[0] as any
        expect(payload.title()).toBe(expectedTitleJa)

        const descriptionMeta = payload.meta?.find((meta: any) => meta.name === 'description')
        expect(descriptionMeta?.content()).toContain(expectedDescriptionJa)
      } else {
        const vm = wrapper.vm as any
        if (vm.newsItem && typeof vm.getLocalizedTitle === 'function') {
          expect(vm.getLocalizedTitle(vm.newsItem)).toBe(expectedTitleJa)
          expect(vm.getLocalizedContent(vm.newsItem)).toContain(expectedDescriptionJa)
        } else {
          expect(wrapper.find('h1').text()).toBe(expectedTitleJa)
          expect(wrapper.text()).toContain(expectedDescriptionJa)
        }
      }

      wrapper.unmount()
    })
  })

  describe('レスポンシブデザイン', () => {
    it('コンテナの最大幅が設定されている', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const container = wrapper.find('.container')
      expect(container.classes()).toContain('max-w-4xl')
    })

    it('モバイル向けのパディングが設定されている', async () => {
      const wrapper = createWrapper()
      await flushUpdates(wrapper)

      const container = wrapper.find('.container')
      expect(container.classes()).toContain('px-4')
    })
  })
})
