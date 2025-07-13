<template>
  <div class="admin-layout">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ isEditMode ? 'お知らせ編集' : 'お知らせ作成' }}
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ isEditMode ? 'お知らせの内容を編集します' : '新しいお知らせを作成します' }}
      </p>
    </div>

    <!-- フォーム -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <form @submit.prevent="saveNews" class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              カテゴリー <span class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.category"
              class="mt-1 w-full rounded-md border-[1px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
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
              class="mt-1 w-full rounded-md border-[1px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
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
            タイトル（日本語） <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.title"
            type="text"
            class="mt-1 w-full rounded-md border-[1px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
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
            class="mt-1 w-full rounded-md border-[1px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            本文（日本語） <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="formData.content"
            rows="6"
            class="mt-1 w-full rounded-md border-[1px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
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
            class="mt-1 w-full rounded-md border-[1px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
          ></textarea>
        </div>

        <div>
          <label class="flex items-center">
            <input
              v-model="formData.hasDetail"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            >
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              詳細ページを作成する
            </span>
          </label>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            チェックを外すと、タイトルと本文のみが表示されます
          </p>
        </div>

        <div v-if="formData.hasDetail">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            詳細内容（日本語）- Markdown形式
          </label>
          <div class="mt-1">
            <div class="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
              <div class="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
                <span class="text-sm text-gray-600 dark:text-gray-400">Markdown エディタ</span>
              </div>
              <textarea
                v-model="formData.detailContent"
                rows="10"
                class="w-full p-4 border-0 dark:bg-gray-800 dark:text-white font-mono text-sm focus:ring-0"
                placeholder="# 見出し&#10;## 小見出し&#10;- リスト項目&#10;**太字** *斜体*"
              ></textarea>
            </div>
          </div>
        </div>

        <div v-if="formData.hasDetail">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            詳細内容（英語）- Markdown形式
          </label>
          <div class="mt-1">
            <div class="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
              <div class="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
                <span class="text-sm text-gray-600 dark:text-gray-400">Markdown Editor</span>
              </div>
              <textarea
                v-model="formData.detailContentEn"
                rows="10"
                class="w-full p-4 border-0 dark:bg-gray-800 dark:text-white font-mono text-sm focus:ring-0"
                placeholder="# Heading&#10;## Subheading&#10;- List item&#10;**Bold** *Italic*"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              公開状態
            </label>
            <select
              v-model="formData.status"
              class="mt-1 w-full rounded-md border-[1px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
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
              v-model="publishDateString"
              type="datetime-local"
              class="mt-1 w-full rounded-md border-[1px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
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

        <div class="flex justify-between pt-6">
          <button
            type="button"
            @click="navigateTo('/admin/news')"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            キャンセル
          </button>
          <div class="space-x-2">
            <button
              v-if="formData.hasDetail"
              type="button"
              @click="previewNews"
              class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              :disabled="!formData.title || !formData.content"
            >
              <EyeIcon class="h-5 w-5 inline mr-1" />
              プレビュー
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              :disabled="isSaving"
            >
              <CheckIcon v-if="!isSaving" class="h-5 w-5 inline mr-1" />
              <ArrowPathIcon v-else class="h-5 w-5 inline mr-1 animate-spin" />
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- プレビューモーダル -->
    <FormModal
      :open="showPreviewModal"
      title="お知らせプレビュー"
      @close="showPreviewModal = false"
      :showSubmit="false"
      size="lg"
    >
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span
            :class="[
              'px-2 py-1 text-xs rounded-full',
              getCategoryClass(formData.category)
            ]"
          >
            {{ getCategoryLabel(formData.category) }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDateTime(formData.publishDate || new Date()) }}
          </span>
        </div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          {{ formData.title }}
        </h3>
        <div class="prose dark:prose-invert max-w-none">
          <p class="whitespace-pre-wrap">{{ formData.content }}</p>
        </div>
        <div v-if="formData.detailContent" class="pt-4 border-t dark:border-gray-700">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">詳細内容プレビュー</h4>
          <div class="prose dark:prose-invert max-w-none" v-html="markdownToHtml(formData.detailContent)"></div>
        </div>
      </div>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import {
  EyeIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import { Timestamp } from 'firebase/firestore'
import { marked } from 'marked'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { useAdminAuth } from '~/composables/useAdminAuth'
import FormModal from '~/components/admin/FormModal.vue'
import type { News } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const route = useRoute()
const { getDocument, createDocument, updateDocument } = useAdminFirestore()
const adminAuth = useAdminAuth()
const { $toast } = useNuxtApp()

const showPreviewModal = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)

const newsId = computed(() => route.query.id as string | undefined)
const isEditMode = computed(() => !!newsId.value)

const formData = ref<Partial<News>>({
  category: 'announcement',
  title: '',
  titleEn: '',
  content: '',
  contentEn: '',
  hasDetail: false,
  detailContent: '',
  detailContentEn: '',
  status: 'draft',
  priority: 'medium',
  publishDate: new Date(),
  isPinned: false
})

const publishDateString = ref('')

const getCategoryClass = (category: string | undefined) => {
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

const getCategoryLabel = (category: string | undefined) => {
  switch (category) {
    case 'announcement': return 'お知らせ'
    case 'maintenance': return 'メンテナンス'
    case 'feature': return '新機能'
    case 'campaign': return 'キャンペーン'
    default: return category || ''
  }
}

const formatDateTime = (date: Date | Timestamp) => {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleString('ja-JP')
  }
  return date.toLocaleString('ja-JP')
}

const formatDateTimeLocal = (date: Date | string) => {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const markdownToHtml = (markdown: string) => {
  return marked(markdown)
}

const previewNews = () => {
  showPreviewModal.value = true
}

const saveNews = async () => {
  isSaving.value = true
  try {
    const publishDate = publishDateString.value ? new Date(publishDateString.value) : new Date()
    const currentUser = await adminAuth.getCurrentUser()
    
    const newsData: Partial<News> = {
      category: formData.value.category as 'announcement' | 'maintenance' | 'feature' | 'campaign',
      title: formData.value.title || '',
      titleEn: formData.value.titleEn,
      content: formData.value.content || '',
      contentEn: formData.value.contentEn,
      status: formData.value.status as 'draft' | 'published' | 'scheduled' | 'archived',
      publishDate,
      isPinned: formData.value.isPinned || false,
      author: currentUser?.email || '',
      viewCount: formData.value.viewCount || 0,
      hasDetail: formData.value.hasDetail || false,
      detailContent: formData.value.detailContent,
      detailContentEn: formData.value.detailContentEn
    }

    if (isEditMode.value && newsId.value) {
      await updateDocument('news', newsId.value, newsData)
      $toast.success('お知らせを更新しました')
    } else {
      await createDocument('news', newsData)
      $toast.success('お知らせを作成しました')
    }
    
    await navigateTo('/admin/news')
  } catch (error) {
    console.error('Failed to save news:', error)
    $toast.error('保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

const loadNews = async () => {
  if (!isEditMode.value || !newsId.value) return

  isLoading.value = true
  try {
    const news = await getDocument<News & { id: string }>('news', newsId.value)
    if (news) {
      formData.value = { ...news }
      if (news.publishDate) {
        publishDateString.value = formatDateTimeLocal(
          news.publishDate instanceof Timestamp ? news.publishDate.toDate() : news.publishDate
        )
      }
    } else {
      $toast.error('お知らせが見つかりません')
      await navigateTo('/admin/news')
    }
  } catch (error) {
    console.error('Failed to load news:', error)
    $toast.error('データの取得に失敗しました')
    await navigateTo('/admin/news')
  } finally {
    isLoading.value = false
  }
}

// 初期化
onMounted(() => {
  if (!isEditMode.value) {
    publishDateString.value = formatDateTimeLocal(new Date())
  }
  loadNews()
})
</script>