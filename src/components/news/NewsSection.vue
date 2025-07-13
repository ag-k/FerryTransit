<template>
  <section class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">
        {{ $t('news.title') }}
      </h2>
      <NuxtLink
        to="/news"
        class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        {{ $t('news.viewAll') }}
      </NuxtLink>
    </div>

    <div v-if="isLoading" class="grid gap-4">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8 text-gray-500 dark:text-gray-400">
      {{ error }}
    </div>

    <div v-else-if="displayNews.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
      {{ $t('news.noNews') }}
    </div>

    <div v-else class="grid gap-4">
      <NewsCard
        v-for="news in displayNews"
        :key="news.id"
        :news="news"
        @expand="handleExpand"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useNews } from '~/composables/useNews'

interface Props {
  limit?: number
  showPinned?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  limit: 5,
  showPinned: true
})

const router = useRouter()
const { isLoading, error, pinnedNews, regularNews, fetchNews } = useNews()

// 表示するお知らせ
const displayNews = computed(() => {
  const news = []
  
  // 固定されたお知らせを先に追加
  if (props.showPinned && pinnedNews.value.length > 0) {
    news.push(...pinnedNews.value)
  }
  
  // 通常のお知らせを追加（固定されたお知らせの数を考慮）
  const regularCount = Math.max(0, props.limit - news.length)
  news.push(...regularNews.value.slice(0, regularCount))
  
  return news.slice(0, props.limit)
})

// お知らせを展開（詳細ページへ遷移）
const handleExpand = (newsId: string) => {
  router.push(`/news/${newsId}`)
}

// データの取得
onMounted(() => {
  fetchNews()
})
</script>