<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- ローディング -->
    <div v-if="isLoading" class="animate-pulse">
      <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
      <div class="space-y-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>

    <!-- エラー -->
    <div v-else-if="error || !newsItem" class="text-center py-16">
      <div class="text-red-600 dark:text-red-400 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t('news.notFound') }}
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        {{ error || $t('news.notFoundDescription') }}
      </p>
      <NuxtLink
        to="/news"
        class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {{ $t('news.backToList') }}
      </NuxtLink>
    </div>

    <!-- お知らせ詳細 -->
    <article v-else>
      <!-- パンくずリスト -->
      <nav class="mb-6">
        <ol class="flex items-center space-x-2 text-sm">
          <li>
            <NuxtLink
              to="/"
              class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {{ $t('HOME') }}
            </NuxtLink>
          </li>
          <li class="text-gray-400 dark:text-gray-600">/</li>
          <li>
            <NuxtLink
              to="/news"
              class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {{ $t('news.title') }}
            </NuxtLink>
          </li>
          <li class="text-gray-400 dark:text-gray-600">/</li>
          <li class="text-gray-700 dark:text-gray-300">
            {{ getLocalizedTitle(newsItem) }}
          </li>
        </ol>
      </nav>

      <!-- ヘッダー -->
      <header class="mb-8">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'px-2 py-1 text-xs rounded-full',
                getCategoryClass(newsItem.category)
              ]"
            >
              {{ getCategoryLabel(newsItem.category) }}
            </span>
            <span
              v-if="newsItem.priority === 'urgent'"
              class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            >
              {{ $t('news.urgent') }}
            </span>
            <span
              v-if="newsItem.isPinned"
              class="text-blue-600 dark:text-blue-400"
              :title="$t('news.pinned')"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            </span>
          </div>
          <time class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(newsItem.publishDate) }}
          </time>
        </div>

        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {{ getLocalizedTitle(newsItem) }}
        </h1>

        <!-- 概要 -->
        <div class="prose prose-lg dark:prose-invert max-w-none mb-8">
          <p class="text-gray-700 dark:text-gray-300">
            {{ getLocalizedContent(newsItem) }}
          </p>
        </div>
      </header>

      <!-- 詳細コンテンツ（Markdown） -->
      <div v-if="newsItem.hasDetail && getLocalizedDetailContent(newsItem)" class="prose prose-lg dark:prose-invert max-w-none">
        <div v-html="renderedContent"></div>
      </div>

      <!-- 戻るボタン -->
      <div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <NuxtLink
          to="/news"
          class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ $t('news.backToList') }}
        </NuxtLink>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import type { News } from '~/types'

const route = useRoute()
const { $i18n } = useNuxtApp()

// データ
const newsItem = ref<News | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// お知らせを取得
const fetchNewsItem = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    // Firebase Storageから全お知らせデータを取得
    const response = await $fetch<News[]>('https://storage.googleapis.com/oki-ferryguide.appspot.com/data/news.json')
    
    if (response && Array.isArray(response)) {
      // IDで該当のお知らせを検索
      const found = response.find(item => item.id === route.params.id)
      if (found) {
        newsItem.value = found
      } else {
        error.value = 'お知らせが見つかりませんでした'
      }
    }
  } catch (err) {
    console.error('Failed to fetch news item:', err)
    error.value = 'お知らせの取得に失敗しました'
  } finally {
    isLoading.value = false
  }
}

// ローカライズされたタイトルを取得
const getLocalizedTitle = (news: News) => {
  const locale = $i18n.locale.value
  if (locale === 'en' && news.titleEn) {
    return news.titleEn
  }
  return news.title
}

// ローカライズされたコンテンツを取得
const getLocalizedContent = (news: News) => {
  const locale = $i18n.locale.value
  if (locale === 'en' && news.contentEn) {
    return news.contentEn
  }
  return news.content
}

// ローカライズされた詳細コンテンツを取得
const getLocalizedDetailContent = (news: News) => {
  const locale = $i18n.locale.value
  if (locale === 'en' && news.detailContentEn) {
    return news.detailContentEn
  }
  return news.detailContent
}

// MarkdownをHTMLに変換
const renderedContent = computed(() => {
  if (!newsItem.value || !newsItem.value.hasDetail) return ''
  
  const content = getLocalizedDetailContent(newsItem.value)
  if (!content) return ''
  
  // Markdownをパース
  return marked(content, {
    gfm: true,
    breaks: true
  })
})

// カテゴリーのスタイルクラスを取得
const getCategoryClass = (category: string) => {
  switch (category) {
    case 'announcement':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'maintenance':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'feature':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'campaign':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

// カテゴリーのラベルを取得
const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    'announcement': $i18n.t('news.category.announcement'),
    'maintenance': $i18n.t('news.category.maintenance'),
    'feature': $i18n.t('news.category.feature'),
    'campaign': $i18n.t('news.category.campaign')
  }
  
  return labels[category] || category
}

// 日付のフォーマット
const formatDate = (date: string | Date) => {
  const locale = $i18n.locale.value
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return dateObj.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// データの取得
onMounted(() => {
  fetchNewsItem()
})

// SEO設定
useHead({
  title: () => newsItem.value ? getLocalizedTitle(newsItem.value) : $i18n.t('news.pageTitle'),
  meta: [
    {
      name: 'description',
      content: () => newsItem.value ? getLocalizedContent(newsItem.value) : $i18n.t('news.pageDescription')
    }
  ]
})
</script>

<style scoped>
/* Markdown内のスタイルを調整 */
:deep(.prose) {
  max-width: none;
}

:deep(.prose h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

:deep(.prose h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.prose h3) {
  font-size: 1.125rem;
  font-weight: 500;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

:deep(.prose ul) {
  list-style-type: disc;
  list-style-position: inside;
}

:deep(.prose ol) {
  list-style-type: decimal;
  list-style-position: inside;
}

:deep(.prose li) {
  margin-bottom: 0.25rem;
}

:deep(.prose a) {
  color: #2563eb;
  text-decoration: underline;
}

:deep(.prose a:hover) {
  text-decoration: underline;
}

:deep(.prose code) {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

:deep(.prose pre) {
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

:deep(.prose blockquote) {
  border-left-width: 4px;
  border-left-color: #d1d5db;
  padding-left: 1rem;
  font-style: italic;
}

/* ダークモード対応 */
:deep(.dark .prose a) {
  color: #60a5fa;
}

:deep(.dark .prose code) {
  background-color: #1f2937;
}

:deep(.dark .prose pre) {
  background-color: #1f2937;
}

:deep(.dark .prose blockquote) {
  border-left-color: #4b5563;
}
</style>