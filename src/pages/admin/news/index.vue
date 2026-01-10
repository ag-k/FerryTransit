<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">お知らせ管理</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        ユーザー向けのお知らせとニュースを管理します
      </p>
    </div>

    <!-- フィルターとアクション -->
    <div class="mb-4 space-y-4">
      <!-- フィルター（モバイル：縦並び、デスクトップ：横並び） -->
      <div class="flex flex-col sm:flex-row gap-3">
        <select
          v-model="filterCategory"
          class="w-full sm:w-auto rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
        >
          <option value="">すべてのカテゴリー</option>
          <option value="announcement">お知らせ</option>
          <option value="maintenance">メンテナンス</option>
          <option value="feature">新機能</option>
          <option value="campaign">キャンペーン</option>
        </select>
        <select
          v-model="filterStatus"
          class="w-full sm:w-auto rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
        >
          <option value="">すべての状態</option>
          <option value="draft">下書き</option>
          <option value="published">公開中</option>
          <option value="scheduled">予約投稿</option>
          <option value="archived">アーカイブ</option>
        </select>
      </div>
      
      <!-- アクションボタン（モバイル：縦並び＋フル幅、デスクトップ：横並び） -->
      <div class="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <SecondaryButton :disabled="isLoading" class="w-full sm:w-auto" @click="refreshData">
          <ArrowPathIcon class="h-5 w-5 inline mr-1" />
          更新
        </SecondaryButton>
        <PrimaryButton
          :disabled="isPublishing"
          class="w-full sm:w-auto"
          @click="publishNewsData"
        >
          <CloudArrowUpIcon class="h-5 w-5 inline mr-1" />
          {{ isPublishing ? '公開中...' : 'データ公開' }}
        </PrimaryButton>
        <PrimaryButton class="w-full sm:w-auto" @click="navigateTo('/admin/news/edit')">
          <PlusIcon class="h-5 w-5 inline mr-1" />
          新規作成
        </PrimaryButton>
      </div>
    </div>

    <!-- ローディング中 -->
    <Card v-if="isLoading" class="text-center" padding="md">
      <div class="inline-flex items-center">
        <svg class="animate-spin h-5 w-5 mr-3 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        データを読み込んでいます...
      </div>
    </Card>

    <!-- エラー表示 -->
    <Card v-else-if="loadError" class="text-center" padding="md">
      <Alert :visible="true" type="danger" :dismissible="false" :message="loadError" class="mb-4" />
      <PrimaryButton @click="refreshData">
        <ArrowPathIcon class="h-5 w-5 inline mr-1" />
        再試行
      </PrimaryButton>
    </Card>

    <!-- データなし -->
    <Card v-else-if="!isLoading && filteredNews.length === 0" class="text-center" padding="md">
      <MegaphoneIcon class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        {{ filterCategory || filterStatus ? 'フィルター条件に一致するお知らせがありません' : 'お知らせがまだ登録されていません' }}
      </p>
      <PrimaryButton v-if="!filterCategory && !filterStatus" @click="navigateTo('/admin/news/edit')">
        <PlusIcon class="h-5 w-5 inline mr-1" />
        最初のお知らせを作成
      </PrimaryButton>
    </Card>

    <!-- お知らせ一覧 -->
    <Card v-else padding="none" class="overflow-hidden">
      <DataTable
        :columns="columns"
        :data="filteredNews"
        :pagination="true"
        :page-size="10"
      >
        <template #cell-category="{ value }">
          <Badge pill :class="getCategoryClass(value)">
            {{ getCategoryLabel(value) }}
          </Badge>
        </template>
        <template #cell-status="{ value }">
          <Badge pill :class="getStatusClass(value)">
            {{ getStatusLabel(value) }}
          </Badge>
        </template>
        <template #cell-publishDate="{ value }">
          {{ formatDateTime(value) }}
        </template>
        <template #row-actions="{ row }">
          <div class="flex items-center gap-1">
            <button
              class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="プレビュー"
              @click="previewNews(row)"
            >
              <EyeIcon class="h-5 w-5" />
            </button>
            <button
              class="p-2 text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="編集"
              @click="editNews(row)"
            >
              <PencilIcon class="h-5 w-5" />
            </button>
            <button
              class="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="削除"
              @click="deleteNews(row)"
            >
              <TrashIcon class="h-5 w-5" />
            </button>
          </div>
        </template>
      </DataTable>
    </Card>


    <!-- プレビューモーダル -->
    <FormModal
      :open="showPreviewModal"
      title="お知らせプレビュー"
      :show-submit="false"
      size="lg"
      @close="showPreviewModal = false"
    >
      <div v-if="previewData" class="space-y-4">
        <div class="flex items-center justify-between">
          <Badge pill :class="getCategoryClass(previewData.category)">
            {{ getCategoryLabel(previewData.category) }}
          </Badge>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDateTime(previewData.publishDate) }}
          </span>
        </div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          {{ previewData.title }}
        </h3>
        <div class="prose dark:prose-invert max-w-none">
          <p class="whitespace-pre-wrap">{{ previewData.content }}</p>
        </div>
        <div v-if="previewData.titleEn || previewData.contentEn" class="pt-4 border-t dark:border-gray-700">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">英語版</h4>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ previewData.titleEn }}
          </h3>
          <div class="prose dark:prose-invert max-w-none">
            <p class="whitespace-pre-wrap">{{ previewData.contentEn }}</p>
          </div>
        </div>
      </div>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  MegaphoneIcon,
  CloudArrowUpIcon
} from '@heroicons/vue/24/outline'
import Alert from '@/components/common/Alert.vue'
import Badge from '@/components/common/Badge.vue'
import Card from '@/components/common/Card.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import SecondaryButton from '@/components/common/SecondaryButton.vue'
import { orderBy, Timestamp } from 'firebase/firestore'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { useDataPublish } from '~/composables/useDataPublish'
import DataTable from '~/components/admin/DataTable.vue'
import FormModal from '~/components/admin/FormModal.vue'
import type { News } from '~/types'
import { createLogger } from '~/utils/logger'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { getCollection, deleteDocument, batchWrite } = useAdminFirestore()
const { publishData } = useDataPublish()
const { $toast } = useNuxtApp()
const logger = createLogger('AdminNewsPage')

const showPreviewModal = ref(false)
const isLoading = ref(false)
const isPublishing = ref(false)
const loadError = ref<string | null>(null)

const filterCategory = ref('')
const filterStatus = ref('')

const previewData = ref<News | null>(null)
const newsList = ref<Array<News & { id: string }>>([])

const columns = [
  { key: 'title', label: 'タイトル', sortable: true },
  { key: 'category', label: 'カテゴリー', sortable: true },
  { key: 'status', label: '状態', sortable: true },
  { key: 'publishDate', label: '公開日時', sortable: true },
  { key: 'author', label: '作成者', sortable: true },
  { key: 'viewCount', label: '閲覧数', sortable: true }
]

const filteredNews = computed(() => {
  return newsList.value.filter(news => {
    if (filterCategory.value && news.category !== filterCategory.value) return false
    if (filterStatus.value && news.status !== filterStatus.value) return false
    return true
  })
})

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

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'announcement': return 'お知らせ'
    case 'maintenance': return 'メンテナンス'
    case 'feature': return '新機能'
    case 'campaign': return 'キャンペーン'
    default: return category
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    case 'published':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'archived':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return '下書き'
    case 'published': return '公開中'
    case 'scheduled': return '予約投稿'
    case 'archived': return 'アーカイブ'
    default: return status
  }
}

const formatDateTime = (date: Date | Timestamp) => {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleString('ja-JP')
  }
  return date.toLocaleString('ja-JP')
}

const previewNews = (news: News & { id: string }) => {
  previewData.value = news
  showPreviewModal.value = true
}

const editNews = (news: News & { id: string }) => {
  navigateTo(`/admin/news/edit?id=${news.id}`)
}

const deleteNews = async (news: News & { id: string }) => {
  if (!news.id) return
  
  if (confirm(`「${news.title}」を削除しますか？`)) {
    try {
      await deleteDocument('news', news.id)
      await refreshData()
      $toast.success('お知らせを削除しました')
    } catch (error) {
      logger.error('Failed to delete news', error)
      $toast.error('削除に失敗しました')
    }
  }
}


const refreshData = async () => {
  isLoading.value = true
  loadError.value = null
  try {
    const constraints = [orderBy('publishDate', 'desc')]
    const data = await getCollection<News & { id: string }>('news', constraints)
    newsList.value = data
    logger.debug('Fetched news data', data)
  } catch (error) {
    logger.error('Failed to fetch news', error)
    loadError.value = 'お知らせデータの取得に失敗しました。権限を確認してください。'
    $toast.error('データの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

// 公開状態の自動更新
const updateNewsStatus = async () => {
  const now = new Date()
  const updates: Array<{ id: string; data: Partial<News> }> = []

  for (const news of newsList.value) {
    // 予約投稿の公開処理
    if (news.status === 'scheduled' && news.publishDate instanceof Date && news.publishDate <= now) {
      updates.push({
        id: news.id,
        data: { status: 'published' }
      })
    }
  }

  if (updates.length > 0) {
    const operations = updates.map(update => ({
      type: 'update' as const,
      collection: 'news',
      id: update.id,
      data: update.data
    }))
    await batchWrite(operations)
    await refreshData()
  }
}

const publishNewsData = async () => {
  isPublishing.value = true
  try {
    await publishData('news')
    $toast.success('お知らせデータを公開しました')
    
    // 成功時のリアクション
    // 公開したデータの件数を取得
    const publishedCount = newsList.value.filter(n => n.status === 'published').length
    
    // 詳細メッセージを表示
    setTimeout(() => {
      $toast.info(`${publishedCount}件のお知らせを公開しました`)
    }, 500)
    
    // データを再読み込み
    setTimeout(() => {
      refreshData()
    }, 1000)
  } catch (error) {
    logger.error('Failed to publish news data', error)
    $toast.error('データの公開に失敗しました')
  } finally {
    isPublishing.value = false
  }
}

onMounted(() => {
  refreshData()
  // 1分ごとに予約投稿のチェック
  const interval = setInterval(updateNewsStatus, 60000)
  onUnmounted(() => clearInterval(interval))
})
</script>
