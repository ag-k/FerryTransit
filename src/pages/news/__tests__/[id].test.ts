import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { ref } from 'vue'
import NewsDetailPage from '../[id].vue'
import type { News } from '~/types'

// モックニュースデータ
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

// useNewsのモック
vi.mock('~/composables/useNews', () => ({
  useNews: vi.fn(() => ({
    publishedNews: ref([mockNews]),
    isLoading: ref(false),
    error: ref(null),
    fetchNews: vi.fn(() => Promise.resolve()),
    getCategoryLabel: vi.fn((category: string) => {
      const labels: Record<string, string> = {
        announcement: 'お知らせ',
        maintenance: 'メンテナンス',
        feature: '新機能',
        campaign: 'キャンペーン'
      }
      return labels[category] || category
    }),
    formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString('ja-JP'))
  }))
}))

// useRouteのモック
vi.mock('#app', () => ({
  useRoute: () => ({
    params: { id: '1' }
  }),
  useHead: vi.fn(),
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref('ja')
  })
}))

// marked のモック
vi.mock('marked', () => ({
  marked: vi.fn((content: string) => `<div class="marked">${content}</div>`)
}))

// i18nのモック
const i18n = createI18n({
  legacy: false,
  locale: 'ja',
  messages: {
    ja: {
      news: {
        category: {
          announcement: 'お知らせ',
          maintenance: 'メンテナンス',
          feature: '新機能',
          campaign: 'キャンペーン'
        }
      },
      error: {
        pageNotFound: 'ページが見つかりません',
        pageNotFoundDesc: 'お探しのページは移動または削除された可能性があります。',
        backToHome: 'ホームに戻る'
      }
    },
    en: {
      news: {
        category: {
          announcement: 'Announcement',
          maintenance: 'Maintenance',
          feature: 'New Feature',
          campaign: 'Campaign'
        }
      },
      error: {
        pageNotFound: 'Page not found',
        pageNotFoundDesc: 'The page you\'re looking for may have been moved or deleted.',
        backToHome: 'Back to home'
      }
    }
  }
})

describe('News Detail Page', () => {
  const createWrapper = () => {
    return mount(NewsDetailPage, {
      global: {
        plugins: [i18n],
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>'
          },
          Icon: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本表示', () => {
    it('ニュースの詳細が表示される', () => {
      const wrapper = createWrapper()
      
      expect(wrapper.find('h1').text()).toBe('テストお知らせ')
      expect(wrapper.text()).toContain('これはテスト内容です。')
    })

    it('カテゴリーバッジが表示される', () => {
      const wrapper = createWrapper()
      
      const badge = wrapper.find('.category-badge')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('お知らせ')
    })

    it('公開日が表示される', () => {
      const wrapper = createWrapper()
      
      const publishDate = wrapper.find('.publish-date')
      expect(publishDate.exists()).toBe(true)
      expect(publishDate.text()).toMatch(/2024年1月1日/)
    })

    it('固定アイコンが表示される', () => {
      const wrapper = createWrapper()
      
      const pinnedIcon = wrapper.find('[name="mdi:pin"]')
      expect(pinnedIcon.exists()).toBe(true)
    })

    it('Markdownコンテンツがレンダリングされる', () => {
      const wrapper = createWrapper()
      
      const detailContent = wrapper.find('.detail-content')
      expect(detailContent.exists()).toBe(true)
      expect(detailContent.html()).toContain('<div class="marked">')
    })
  })

  describe('パンくずリスト', () => {
    it('パンくずリストが表示される', () => {
      const wrapper = createWrapper()
      
      const breadcrumb = wrapper.find('.breadcrumb')
      expect(breadcrumb.exists()).toBe(true)
    })

    it('ホーム、ニュース一覧、現在のページが表示される', () => {
      const wrapper = createWrapper()
      
      const breadcrumbItems = wrapper.findAll('.breadcrumb-item')
      expect(breadcrumbItems).toHaveLength(3)
      expect(breadcrumbItems[0].text()).toContain('HOME')
      expect(breadcrumbItems[1].text()).toContain('NEWS')
      expect(breadcrumbItems[2].text()).toBe('テストお知らせ')
    })
  })

  describe('多言語対応', () => {
    it('英語ロケールで英語コンテンツが表示される', async () => {
      const wrapper = createWrapper()
      
      // ロケールを英語に変更
      wrapper.vm.$i18n.locale.value = 'en'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('h1').text()).toBe('Test Announcement')
      expect(wrapper.text()).toContain('This is test content.')
    })

    it('英語の詳細コンテンツが表示される', async () => {
      const wrapper = createWrapper()
      
      wrapper.vm.$i18n.locale.value = 'en'
      await wrapper.vm.$nextTick()
      
      const detailContent = wrapper.vm.displayDetailContent
      expect(detailContent).toContain('Detail Title')
      expect(detailContent).toContain('This is **Markdown** detail content.')
    })

    it('英語タイトルがない場合は日本語が表示される', async () => {
      const newsWithoutEn = { ...mockNews, titleEn: undefined, contentEn: undefined, detailContentEn: undefined }
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref([newsWithoutEn]),
        loading: ref(false),
        error: ref(null),
        getNewsById: vi.fn(() => newsWithoutEn),
        getCategoryLabel: vi.fn((category: string) => `news.category.${category}`)
      } as any)

      const wrapper = createWrapper()
      
      wrapper.vm.$i18n.locale.value = 'en'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('h1').text()).toBe('テストお知らせ')
    })
  })

  describe('エラー状態', () => {
    it('ニュースが見つからない場合404エラーが表示される', () => {
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref([]),
        loading: ref(false),
        error: ref(null),
        getNewsById: vi.fn(() => undefined),
        getCategoryLabel: vi.fn((category: string) => `news.category.${category}`)
      } as any)

      const wrapper = createWrapper()
      
      expect(wrapper.find('.error-404').exists()).toBe(true)
      expect(wrapper.text()).toContain('ページが見つかりません')
    })

    it('詳細がないニュースの場合404エラーが表示される', () => {
      const newsWithoutDetail = { ...mockNews, hasDetail: false }
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref([newsWithoutDetail]),
        loading: ref(false),
        error: ref(null),
        getNewsById: vi.fn(() => newsWithoutDetail),
        getCategoryLabel: vi.fn((category: string) => `news.category.${category}`)
      } as any)

      const wrapper = createWrapper()
      
      expect(wrapper.find('.error-404').exists()).toBe(true)
    })

    it('ローディング中は読み込み表示される', () => {
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref([]),
        loading: ref(true),
        error: ref(null),
        getNewsById: vi.fn(() => undefined),
        getCategoryLabel: vi.fn((category: string) => `news.category.${category}`)
      } as any)

      const wrapper = createWrapper()
      
      expect(wrapper.find('.loading').exists()).toBe(true)
    })

    it('エラー時はエラーメッセージが表示される', () => {
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref([]),
        loading: ref(false),
        error: ref('エラーが発生しました'),
        getNewsById: vi.fn(() => undefined),
        getCategoryLabel: vi.fn((category: string) => `news.category.${category}`)
      } as any)

      const wrapper = createWrapper()
      
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('エラーが発生しました')
    })
  })

  describe('SEO最適化', () => {
    it('useHeadが適切なメタデータで呼ばれる', () => {
      const useHead = vi.fn()
      vi.mocked(useHead)
      
      const wrapper = createWrapper()
      
      expect(useHead).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.any(String),
        meta: expect.arrayContaining([
          expect.objectContaining({ name: 'description' }),
          expect.objectContaining({ property: 'og:title' }),
          expect.objectContaining({ property: 'og:description' }),
          expect.objectContaining({ property: 'og:type' })
        ])
      }))
    })
  })

  describe('レスポンシブデザイン', () => {
    it('コンテナの最大幅が設定されている', () => {
      const wrapper = createWrapper()
      
      const container = wrapper.find('.container')
      expect(container.classes()).toContain('max-w-4xl')
    })

    it('モバイルでも適切なパディングが設定されている', () => {
      const wrapper = createWrapper()
      
      const content = wrapper.find('.news-detail')
      expect(content.classes()).toContain('px-4')
      expect(content.classes()).toContain('lg:px-0')
    })
  })
})