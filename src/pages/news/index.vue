<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
      {{ $t('news.title') }}
    </h1>
    <p class="page-description text-gray-600 dark:text-gray-400 mb-6">
      {{ $t('news.pageDescription') }}
    </p>

    <!-- カテゴリーフィルター -->
    <div class="category-filter mb-6 flex flex-wrap gap-2">
      <button
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium transition-colors',
          selectedCategory === null
            ? 'active bg-blue-700 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        ]"
        @click="selectedCategory = null"
      >
        {{ $t('news.allCategories') }}
      </button>
      <button
        v-for="category in categories"
        :key="category"
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium transition-colors',
          selectedCategory === category
            ? 'active bg-blue-700 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        ]"
        @click="selectedCategory = category"
      >
        {{ getCategoryLabel(category) }}
      </button>
    </div>

    <!-- ローディング -->
    <div v-if="isLoading" class="grid gap-4">
      <div v-for="i in 5" :key="i" class="animate-pulse">
        <div class="bg-gray-200 dark:bg-gray-700 rounded-lg h-40"></div>
      </div>
    </div>

    <!-- エラー -->
    <div v-else-if="error" class="py-8">
      <Alert :visible="true" type="danger" :dismissible="false" :message="error" />
    </div>

    <!-- お知らせなし -->
    <div v-else-if="filteredNews.length === 0" class="text-center py-16">
      <div class="text-gray-400 dark:text-gray-600 mb-4">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p class="text-gray-600 dark:text-gray-400">
        {{ selectedCategory ? $t('news.noNewsInCategory') : $t('news.noNews') }}
      </p>
    </div>

    <!-- お知らせ一覧 -->
    <div v-else>
      <TransitionGroup
        name="list"
        tag="div"
        class="news-grid grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <Card
          v-for="news in paginatedNews"
          :key="news.id"
          as="article"
          class="hover:shadow-md transition-shadow"
          padding="md"
          :class="{ 'border-l-4 !border-l-app-primary': news.isPinned }"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <Badge pill :class="getCategoryClass(news.category)">
                {{ getCategoryLabel(news.category) }}
              </Badge>
              <Badge v-if="news.priority === 'urgent'" pill variant="danger">
                {{ $t('news.urgent') }}
              </Badge>
              <span
                v-if="news.isPinned"
                class="text-blue-700 dark:text-blue-400"
                :title="$t('news.pinned')"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </span>
            </div>
            <time class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatDate(news.publishDate) }}
            </time>
          </div>

          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            {{ getLocalizedTitle(news) }}
          </h2>

          <div class="prose prose-sm dark:prose-invert max-w-none mb-4">
            <p class="text-gray-700 dark:text-gray-300">
              {{ getLocalizedContent(news) }}
            </p>
          </div>

          <NuxtLink
            v-if="news.hasDetail"
            :to="`/news/${news.id}`"
            class="inline-flex items-center text-blue-700 dark:text-blue-400 hover:underline"
          >
            {{ $t('news.readMore') }}
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </Card>
      </TransitionGroup>
    </div>

    <!-- ページネーション -->
    <div v-if="totalPages > 1" class="pagination mt-8 flex justify-center">
      <nav class="flex gap-2">
        <button
          :disabled="currentPage === 1"
          class="prev-button px-4 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="currentPage = Math.max(1, currentPage - 1)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          v-for="page in displayPages"
          :key="page"
          :class="[
            'px-4 py-2 rounded-md border transition-colors',
            currentPage === page
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          ]"
          @click="currentPage = page"
        >
          {{ page }}
        </button>
        
        <button
          :disabled="currentPage === totalPages"
          class="next-button px-4 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNews } from '~/composables/useNews'
import Alert from '@/components/common/Alert.vue'
import Badge from '@/components/common/Badge.vue'
import Card from '@/components/common/Card.vue'

const { $i18n } = useNuxtApp()
const { 
  isLoading, 
  error, 
  publishedNews, 
  fetchNews, 
  getCategoryLabel, 
  formatDate,
  getNewsByCategory 
} = useNews()

// カテゴリー一覧
const categories = ['announcement', 'maintenance', 'feature', 'campaign']

// 選択されたカテゴリー
const selectedCategory = ref<string | null>(null)

// ページネーション
const currentPage = ref(1)
const itemsPerPage = 10

// フィルターされたニュース
const filteredNews = computed(() => {
  if (selectedCategory.value) {
    return getNewsByCategory(selectedCategory.value)
  }
  return publishedNews.value
})

// ページネーション計算
const totalPages = computed(() => Math.ceil(filteredNews.value.length / itemsPerPage))
const paginatedNews = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredNews.value.slice(start, end)
})

// 表示するページ番号
const displayPages = computed(() => {
  const pages = []
  const maxDisplay = 5
  const halfDisplay = Math.floor(maxDisplay / 2)
  
  let start = Math.max(1, currentPage.value - halfDisplay)
  const end = Math.min(totalPages.value, start + maxDisplay - 1)
  
  if (end - start + 1 < maxDisplay) {
    start = Math.max(1, end - maxDisplay + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// カテゴリー変更時にページをリセット
watch(selectedCategory, () => {
  currentPage.value = 1
})

// ローカライズされたタイトルを取得
const getLocalizedTitle = (news: any) => {
  const locale = $i18n.locale.value
  if (locale === 'en' && news.titleEn) {
    return news.titleEn
  }
  return news.title
}

// ローカライズされたコンテンツを取得
const getLocalizedContent = (news: any) => {
  const locale = $i18n.locale.value
  if (locale === 'en' && news.contentEn) {
    return news.contentEn
  }
  return news.content
}

// カテゴリーのスタイルクラスを取得
const getCategoryClass = (category: string) => {
  switch (category) {
    case 'announcement':
      return 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200'
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

// データの取得
onMounted(() => {
  fetchNews()
})

// SEO設定
useHead({
  title: () => $i18n.t('news.pageTitle'),
  meta: [
    {
      name: 'description',
      content: () => $i18n.t('news.pageDescription')
    }
  ]
})
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
