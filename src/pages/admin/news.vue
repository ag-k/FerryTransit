<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">お知らせ管理</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        ユーザー向けのお知らせとニュースを管理します
      </p>
    </div>

    <!-- アクションボタン -->
    <div class="mb-4 flex justify-between items-center">
      <div class="flex space-x-4">
        <select
          v-model="filterCategory"
          class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">すべてのカテゴリー</option>
          <option value="announcement">お知らせ</option>
          <option value="maintenance">メンテナンス</option>
          <option value="feature">新機能</option>
          <option value="campaign">キャンペーン</option>
        </select>
        <select
          v-model="filterStatus"
          class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">すべての状態</option>
          <option value="draft">下書き</option>
          <option value="published">公開中</option>
          <option value="scheduled">予約投稿</option>
          <option value="archived">アーカイブ</option>
        </select>
      </div>
      <button
        @click="showAddModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        <PlusIcon class="h-5 w-5 inline mr-1" />
        新規作成
      </button>
    </div>

    <!-- お知らせ一覧 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <DataTable
        :columns="columns"
        :data="filteredNews"
        :pagination="true"
        :page-size="10"
      >
        <template #cell-category="{ value }">
          <span
            :class="[
              'px-2 py-1 text-xs rounded-full',
              getCategoryClass(value)
            ]"
          >
            {{ getCategoryLabel(value) }}
          </span>
        </template>
        <template #cell-status="{ value }">
          <span
            :class="[
              'px-2 py-1 text-xs rounded-full',
              getStatusClass(value)
            ]"
          >
            {{ getStatusLabel(value) }}
          </span>
        </template>
        <template #cell-publishDate="{ value }">
          {{ formatDateTime(value) }}
        </template>
        <template #row-actions="{ row }">
          <button
            @click="previewNews(row)"
            class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mr-3"
          >
            <EyeIcon class="h-5 w-5" />
          </button>
          <button
            @click="editNews(row)"
            class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
          >
            <PencilIcon class="h-5 w-5" />
          </button>
          <button
            @click="deleteNews(row)"
            class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          >
            <TrashIcon class="h-5 w-5" />
          </button>
        </template>
      </DataTable>
    </div>

    <!-- 追加/編集モーダル -->
    <FormModal
      :open="showAddModal || showEditModal"
      :title="showAddModal ? 'お知らせの作成' : 'お知らせの編集'"
      @close="closeModal"
      @submit="saveNews"
      :loading="isSaving"
      size="xl"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              カテゴリー
            </label>
            <select
              v-model="formData.category"
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              required
            >
              <option value="">選択してください</option>
              <option value="announcement">お知らせ</option>
              <option value="maintenance">メンテナンス</option>
              <option value="feature">新機能</option>
              <option value="campaign">キャンペーン</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              優先度
            </label>
            <select
              v-model="formData.priority"
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="urgent">緊急</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            タイトル（日本語）
          </label>
          <input
            v-model="formData.title"
            type="text"
            class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            required
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            タイトル（英語）
          </label>
          <input
            v-model="formData.titleEn"
            type="text"
            class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            本文（日本語）
          </label>
          <textarea
            v-model="formData.content"
            rows="6"
            class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            required
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            本文（英語）
          </label>
          <textarea
            v-model="formData.contentEn"
            rows="6"
            class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              公開状態
            </label>
            <select
              v-model="formData.status"
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="scheduled">予約投稿</option>
              <option value="archived">アーカイブ</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              公開日時
            </label>
            <input
              v-model="formData.publishDate"
              type="datetime-local"
              class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              :disabled="formData.status !== 'scheduled'"
            >
          </div>
        </div>

        <div>
          <label class="flex items-center">
            <input
              v-model="formData.isPinned"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600"
            >
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              重要なお知らせとして固定表示する
            </span>
          </label>
        </div>
      </div>
    </FormModal>

    <!-- プレビューモーダル -->
    <FormModal
      :open="showPreviewModal"
      title="お知らせプレビュー"
      @close="showPreviewModal = false"
      :showSubmit="false"
      size="lg"
    >
      <div v-if="previewData" class="space-y-4">
        <div class="flex items-center justify-between">
          <span
            :class="[
              'px-2 py-1 text-xs rounded-full',
              getCategoryClass(previewData.category)
            ]"
          >
            {{ getCategoryLabel(previewData.category) }}
          </span>
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
  TrashIcon
} from '@heroicons/vue/24/outline'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

interface News {
  id: string
  category: string
  title: string
  titleEn?: string
  content: string
  contentEn?: string
  status: string
  priority: string
  publishDate: Date
  isPinned: boolean
  author: string
  viewCount: number
}

const showAddModal = ref(false)
const showEditModal = ref(false)
const showPreviewModal = ref(false)
const isSaving = ref(false)

const filterCategory = ref('')
const filterStatus = ref('')

const formData = ref<Partial<News>>({
  category: '',
  title: '',
  titleEn: '',
  content: '',
  contentEn: '',
  status: 'draft',
  priority: 'medium',
  publishDate: new Date(),
  isPinned: false
})

const previewData = ref<News | null>(null)

// ダミーデータ
const newsList = ref<News[]>([
  {
    id: '1',
    category: 'announcement',
    title: '年末年始の運航スケジュールについて',
    titleEn: 'Year-end and New Year Service Schedule',
    content: '年末年始期間（12月28日〜1月5日）は特別ダイヤで運航いたします。',
    contentEn: 'Special schedule will be in effect during the year-end and New Year period (Dec 28 - Jan 5).',
    status: 'published',
    priority: 'high',
    publishDate: new Date('2024-01-10T09:00:00'),
    isPinned: true,
    author: 'admin@example.com',
    viewCount: 1234
  },
  {
    id: '2',
    category: 'maintenance',
    title: 'システムメンテナンスのお知らせ',
    titleEn: 'System Maintenance Notice',
    content: '1月20日（土）午前2時〜午前4時の間、システムメンテナンスを実施します。',
    contentEn: 'System maintenance will be performed on January 20 (Sat) from 2:00 AM to 4:00 AM.',
    status: 'scheduled',
    priority: 'medium',
    publishDate: new Date('2024-01-18T09:00:00'),
    isPinned: false,
    author: 'admin@example.com',
    viewCount: 456
  }
])

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

const formatDateTime = (date: Date) => {
  return date.toLocaleString('ja-JP')
}

const previewNews = (news: News) => {
  previewData.value = news
  showPreviewModal.value = true
}

const editNews = (news: News) => {
  formData.value = { ...news }
  showEditModal.value = true
}

const deleteNews = async (news: News) => {
  if (confirm(`「${news.title}」を削除しますか？`)) {
    // TODO: Firestoreから削除
    newsList.value = newsList.value.filter(n => n.id !== news.id)
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  formData.value = {
    category: '',
    title: '',
    titleEn: '',
    content: '',
    contentEn: '',
    status: 'draft',
    priority: 'medium',
    publishDate: new Date(),
    isPinned: false
  }
}

const saveNews = async () => {
  isSaving.value = true
  try {
    // TODO: Firestoreに保存
    console.log('Saving news:', formData.value)
    await new Promise(resolve => setTimeout(resolve, 1000))
    closeModal()
    // TODO: データを再取得
  } catch (error) {
    console.error('Failed to save news:', error)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  // TODO: Firestoreからお知らせデータを取得
  console.log('Loading news data...')
})
</script>