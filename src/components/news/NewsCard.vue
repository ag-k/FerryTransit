<template>
  <div 
    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-gray-700"
    :class="{ 'border-l-4 !border-l-blue-500': news.isPinned }"
  >
    <div class="flex items-start justify-between mb-2">
      <div class="flex items-center gap-2">
        <span
          :class="[
            'px-2 py-1 text-xs rounded-full',
            getCategoryClass(news.category)
          ]"
        >
          {{ getCategoryLabel(news.category) }}
        </span>
        <span
          v-if="news.priority === 'urgent'"
          class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        >
          {{ $t('news.urgent') }}
        </span>
        <span
          v-if="news.isPinned"
          class="text-blue-600 dark:text-blue-400"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        </span>
      </div>
      <time class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatDate(news.publishDate) }}
      </time>
    </div>

    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {{ getLocalizedTitle(news) }}
    </h3>

    <div class="prose prose-sm dark:prose-invert max-w-none">
      <p class="text-gray-700 dark:text-gray-300 line-clamp-3">
        {{ getLocalizedContent(news) }}
      </p>
    </div>

    <button
      v-if="!expanded && news.hasDetail"
      @click="$emit('expand', news.id)"
      class="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
    >
      {{ $t('news.readMore') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { News } from '~/types'
import { useNews } from '~/composables/useNews'

interface Props {
  news: News
  expanded?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  expand: [id: string]
}>()

const { $i18n } = useNuxtApp()
const { getCategoryLabel, formatDate } = useNews()

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
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>