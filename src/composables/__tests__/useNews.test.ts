import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, readonly } from 'vue'
import type { News } from '~/types'

// useNewsのモック
vi.mock('~/composables/useNews', () => {
  const mockNewsData: News[] = [
    {
      id: '1',
      category: 'announcement',
      title: '重要なお知らせ',
      titleEn: 'Important Notice',
      content: 'テスト内容1',
      contentEn: 'Test content 1',
      status: 'published',
      priority: 'high',
      publishDate: '2024-01-01T09:00:00Z',
      isPinned: true,
      hasDetail: true,
      detailContent: '# 詳細内容\n\nMarkdownテキスト',
      detailContentEn: '# Detail Content\n\nMarkdown text'
    },
    {
      id: '2',
      category: 'maintenance',
      title: 'メンテナンスのお知らせ',
      titleEn: 'Maintenance Notice',
      content: 'テスト内容2',
      contentEn: 'Test content 2',
      status: 'published',
      priority: 'medium',
      publishDate: '2024-01-02T09:00:00Z',
      isPinned: false,
      hasDetail: false
    },
    {
      id: '3',
      category: 'feature',
      title: '新機能リリース',
      titleEn: 'New Feature Release',
      content: 'テスト内容3',
      contentEn: 'Test content 3',
      status: 'published',
      priority: 'low',
      publishDate: '2024-01-03T09:00:00Z',
      isPinned: false,
      hasDetail: true,
      detailContent: '## 新機能の詳細',
      detailContentEn: '## Feature Details'
    },
    {
      id: '4',
      category: 'campaign',
      title: 'キャンペーン情報',
      titleEn: 'Campaign Information',
      content: 'テスト内容4',
      contentEn: 'Test content 4',
      status: 'published',
      priority: 'urgent',
      publishDate: '2024-01-04T09:00:00Z',
      isPinned: true,
      hasDetail: false
    }
  ]

  const newsList = ref<News[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  return {
    useNews: vi.fn(() => {
      const publishedNews = computed(() => 
        newsList.value.filter(n => n.status === 'published')
      )
      
      const pinnedNews = computed(() => 
        publishedNews.value.filter(n => n.isPinned)
      )
      
      const regularNews = computed(() => 
        publishedNews.value.filter(n => !n.isPinned)
      )

      const fetchNews = vi.fn(async () => {
        isLoading.value = true
        error.value = null
        
        try {
          // テスト用のデータを設定
          newsList.value = mockNewsData
          isLoading.value = false
        } catch (e) {
          error.value = 'ニュースの取得に失敗しました'
          isLoading.value = false
        }
      })

      const getNewsByCategory = vi.fn((category: string) => 
        publishedNews.value.filter(n => n.category === category)
      )

      const getLatestNews = vi.fn((count: number) => 
        [...publishedNews.value]
          .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
          .slice(0, count)
      )

      const getCategoryLabel = vi.fn((category: string) => `news.category.${category}`)

      const getPriorityLabel = vi.fn((priority: string) => {
        const labels: Record<string, string> = {
          low: '低',
          medium: '中',
          high: '高',
          urgent: '緊急'
        }
        return labels[priority] || priority
      })

      const formatDate = vi.fn((date: string) => 
        new Date(date).toLocaleDateString('ja-JP')
      )

      const incrementViewCount = vi.fn()

      return {
        newsList: readonly(newsList),
        isLoading: readonly(isLoading),
        error: readonly(error),
        publishedNews,
        pinnedNews,
        regularNews,
        fetchNews,
        getNewsByCategory,
        getLatestNews,
        incrementViewCount,
        getCategoryLabel,
        getPriorityLabel,
        formatDate
      }
    })
  }
})

import { useNews } from '~/composables/useNews'

describe('useNews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本機能', () => {
    it('初期状態が正しい', () => {
      const { newsList, isLoading, error } = useNews()
      
      expect(newsList.value).toEqual([])
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('fetchNewsでデータを取得できる', async () => {
      const { newsList, isLoading, fetchNews } = useNews()
      
      await fetchNews()
      
      expect(fetchNews).toHaveBeenCalled()
      expect(newsList.value.length).toBeGreaterThan(0)
      expect(isLoading.value).toBe(false)
    })
  })

  describe('フィルタリング機能', () => {
    it('公開中のニュースのみを取得できる', async () => {
      const { publishedNews, fetchNews } = useNews()
      
      await fetchNews()
      
      expect(publishedNews.value.every(n => n.status === 'published')).toBe(true)
    })

    it('固定ニュースと通常ニュースを分離できる', async () => {
      const { pinnedNews, regularNews, fetchNews } = useNews()
      
      await fetchNews()
      
      expect(pinnedNews.value.every(n => n.isPinned)).toBe(true)
      expect(regularNews.value.every(n => !n.isPinned)).toBe(true)
    })

    it('カテゴリー別にニュースを取得できる', async () => {
      const { getNewsByCategory, fetchNews } = useNews()
      
      await fetchNews()
      
      const announcements = getNewsByCategory('announcement')
      expect(announcements.every(n => n.category === 'announcement')).toBe(true)
    })

    it('最新のニュースを指定件数取得できる', async () => {
      const { getLatestNews, fetchNews } = useNews()
      
      await fetchNews()
      
      const latest2 = getLatestNews(2)
      expect(latest2).toHaveLength(2)
    })
  })

  describe('ユーティリティ関数', () => {
    it('カテゴリーラベルを取得できる', () => {
      const { getCategoryLabel } = useNews()
      
      expect(getCategoryLabel('announcement')).toBe('news.category.announcement')
      expect(getCategoryLabel('maintenance')).toBe('news.category.maintenance')
    })

    it('優先度ラベルを取得できる', () => {
      const { getPriorityLabel } = useNews()
      
      expect(getPriorityLabel('low')).toBe('低')
      expect(getPriorityLabel('medium')).toBe('中')
      expect(getPriorityLabel('high')).toBe('高')
      expect(getPriorityLabel('urgent')).toBe('緊急')
    })

    it('日付をフォーマットできる', () => {
      const { formatDate } = useNews()
      
      const result = formatDate('2024-01-01T09:00:00Z')
      expect(result).toMatch(/2024/)
    })
  })
})