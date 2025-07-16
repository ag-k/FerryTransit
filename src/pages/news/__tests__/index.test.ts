import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { ref, computed } from 'vue'
import NewsIndexPage from '../index.vue'
import NewsCard from '~/components/news/NewsCard.vue'
import type { News } from '~/types'
import { useNews } from '~/composables/useNews'

// useNewsのモック
const mockNews: News[] = [
  {
    id: '1',
    category: 'announcement',
    title: 'お知らせ1',
    content: '内容1',
    status: 'published',
    priority: 'high',
    publishDate: '2024-01-01T09:00:00Z',
    isPinned: true,
    hasDetail: true
  },
  {
    id: '2',
    category: 'maintenance',
    title: 'メンテナンス1',
    content: '内容2',
    status: 'published',
    priority: 'urgent',
    publishDate: '2024-01-02T09:00:00Z',
    isPinned: false,
    hasDetail: false
  },
  {
    id: '3',
    category: 'feature',
    title: '新機能1',
    content: '内容3',
    status: 'published',
    priority: 'medium',
    publishDate: '2024-01-03T09:00:00Z',
    isPinned: false,
    hasDetail: true
  },
  ...Array(15).fill(null).map((_, i) => ({
    id: `${i + 4}`,
    category: 'campaign' as const,
    title: `キャンペーン${i + 1}`,
    content: `内容${i + 4}`,
    status: 'published' as const,
    priority: 'low' as const,
    publishDate: `2024-01-${(i + 4).toString().padStart(2, '0')}T09:00:00Z`,
    isPinned: false,
    hasDetail: false
  }))
]

vi.mock('~/composables/useNews', () => ({
  useNews: vi.fn(() => ({
    news: ref(mockNews),
    publishedNews: computed(() => mockNews),
    isLoading: ref(false),
    error: ref(null),
    fetchNews: vi.fn(),
    getNewsByCategory: vi.fn((category: string) => 
      mockNews.filter(n => n.category === category)
    ),
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

// useHeadのモック
vi.mock('#app', () => ({
  useHead: vi.fn(),
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref('ja')
  })
}))

// 日付フォーマット関数のモック
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ja-JP')
}

// i18nのモック
const i18n = createI18n({
  legacy: false,
  locale: 'ja',
  messages: {
    ja: {
      news: {
        pageTitle: 'お知らせ一覧',
        pageDescription: '隠岐航路に関する最新のお知らせ',
        allCategories: 'すべてのカテゴリー',
        category: {
          announcement: 'お知らせ',
          maintenance: 'メンテナンス',
          feature: '新機能',
          campaign: 'キャンペーン'
        },
        noNews: '該当するお知らせはありません'
      }
    }
  }
})

describe('News Index Page', () => {
  const createWrapper = () => {
    return mount(NewsIndexPage, {
      global: {
        plugins: [i18n],
        components: {
          NewsCard
        },
        stubs: {
          Icon: true,
          NuxtLink: {
            template: '<a><slot /></a>'
          }
        },
        provide: {
          formatDate
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本表示', () => {
    it('ページタイトルが表示される', () => {
      const wrapper = createWrapper()
      
      expect(wrapper.find('h1').text()).toBe('お知らせ一覧')
    })

    it('ページ説明が表示される', () => {
      const wrapper = createWrapper()
      
      expect(wrapper.find('.page-description').text()).toBe('隠岐航路に関する最新のお知らせ')
    })

    it('ニュースカードが表示される', () => {
      const wrapper = createWrapper()
      
      const cards = wrapper.findAllComponents(NewsCard)
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  describe('カテゴリーフィルター', () => {
    it('カテゴリーフィルターボタンが表示される', () => {
      const wrapper = createWrapper()
      
      const filterButtons = wrapper.findAll('.category-filter button')
      expect(filterButtons).toHaveLength(5) // すべて + 4カテゴリー
    })

    it('すべてのカテゴリーボタンがデフォルトで選択されている', () => {
      const wrapper = createWrapper()
      
      const allButton = wrapper.find('.category-filter button.active')
      expect(allButton.text()).toBe('すべてのカテゴリー')
    })

    it('カテゴリーボタンをクリックするとフィルタリングされる', async () => {
      const wrapper = createWrapper()
      
      const announcementButton = wrapper.findAll('.category-filter button')[1]
      await announcementButton.trigger('click')
      
      expect(wrapper.vm.selectedCategory).toBe('announcement')
    })

    it('選択されたカテゴリーのニュースのみ表示される', async () => {
      const wrapper = createWrapper()
      
      // メンテナンスカテゴリーを選択
      const maintenanceButton = wrapper.findAll('.category-filter button')[2]
      await maintenanceButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      const displayedNews = wrapper.vm.filteredNews
      expect(displayedNews.every((n: News) => n.category === 'maintenance')).toBe(true)
    })
  })

  describe('ページネーション', () => {
    it('10件ずつ表示される', () => {
      const wrapper = createWrapper()
      
      const displayedCards = wrapper.findAllComponents(NewsCard)
      expect(displayedCards).toHaveLength(10)
    })

    it('ページネーションボタンが表示される', () => {
      const wrapper = createWrapper()
      
      const pagination = wrapper.find('.pagination')
      expect(pagination.exists()).toBe(true)
    })

    it('次のページボタンをクリックすると次のページが表示される', async () => {
      const wrapper = createWrapper()
      
      const nextButton = wrapper.find('.pagination .next-button')
      await nextButton.trigger('click')
      
      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('前のページボタンをクリックすると前のページが表示される', async () => {
      const wrapper = createWrapper()
      
      // まず2ページ目に移動
      wrapper.vm.currentPage = 2
      await wrapper.vm.$nextTick()
      
      const prevButton = wrapper.find('.pagination .prev-button')
      await prevButton.trigger('click')
      
      expect(wrapper.vm.currentPage).toBe(1)
    })

    it('最初のページでは前のページボタンが無効になる', () => {
      const wrapper = createWrapper()
      
      const prevButton = wrapper.find('.pagination .prev-button')
      expect(prevButton.attributes('disabled')).toBeDefined()
    })

    it('最後のページでは次のページボタンが無効になる', async () => {
      const wrapper = createWrapper()
      
      // 最後のページに移動
      wrapper.vm.currentPage = Math.ceil(mockNews.length / 10)
      await wrapper.vm.$nextTick()
      
      const nextButton = wrapper.find('.pagination .next-button')
      expect(nextButton.attributes('disabled')).toBeDefined()
    })

    it('カテゴリーフィルター変更時にページが1にリセットされる', async () => {
      const wrapper = createWrapper()
      
      // 2ページ目に移動
      wrapper.vm.currentPage = 2
      await wrapper.vm.$nextTick()
      
      // カテゴリーを変更
      const categoryButton = wrapper.findAll('.category-filter button')[1]
      await categoryButton.trigger('click')
      
      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  describe('空状態', () => {
    it('ニュースがない場合メッセージが表示される', async () => {
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref([]),
        publishedNews: computed(() => []),
        isLoading: ref(false),
        error: ref(null),
        fetchNews: vi.fn(),
        getNewsByCategory: vi.fn(() => []),
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
      } as any)

      const wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('該当するお知らせはありません')
    })

    it('フィルター適用後に該当なしの場合メッセージが表示される', async () => {
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref(mockNews),
        publishedNews: computed(() => mockNews),
        isLoading: ref(false),
        error: ref(null),
        fetchNews: vi.fn(),
        getNewsByCategory: vi.fn(() => []), // 空配列を返す
        getCategoryLabel: vi.fn((category: string) => `news.category.${category}`)
      } as any)

      const wrapper = createWrapper()
      
      // カテゴリーを選択
      const categoryButton = wrapper.findAll('.category-filter button')[1]
      await categoryButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('該当するお知らせはありません')
    })
  })

  describe('ローディング/エラー状態', () => {
    it('ローディング中は読み込み表示される', () => {
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref([]),
        publishedNews: computed(() => []),
        isLoading: ref(true),
        error: ref(null),
        fetchNews: vi.fn(),
        getNewsByCategory: vi.fn(() => []),
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
      } as any)

      const wrapper = createWrapper()
      
      expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    })

    it('エラー時はエラーメッセージが表示される', () => {
      vi.mocked(useNews).mockReturnValueOnce({
        news: ref([]),
        publishedNews: computed(() => []),
        isLoading: ref(false),
        error: ref('エラーが発生しました'),
        fetchNews: vi.fn(),
        getNewsByCategory: vi.fn(() => []),
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
      } as any)

      const wrapper = createWrapper()
      
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('エラーが発生しました')
    })
  })

  describe('レスポンシブデザイン', () => {
    it('モバイルビューでグリッドが1列になる', () => {
      const wrapper = createWrapper()
      
      const grid = wrapper.find('.news-grid')
      expect(grid.classes()).toContain('grid-cols-1')
      expect(grid.classes()).toContain('md:grid-cols-2')
      expect(grid.classes()).toContain('lg:grid-cols-3')
    })
  })
})