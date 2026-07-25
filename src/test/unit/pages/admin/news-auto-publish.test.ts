import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { Timestamp } from 'firebase/firestore'
import NewsEditPage from '@/pages/admin/news/edit.vue'
import NewsIndexPage from '@/pages/admin/news/index.vue'

const mocks = vi.hoisted(() => ({
  getCollection: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  batchWrite: vi.fn(),
  publishData: vi.fn(),
  getCurrentUser: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn()
}))

vi.mock('~/composables/useAdminFirestore', () => ({
  useAdminFirestore: () => ({
    getCollection: mocks.getCollection,
    getDocument: mocks.getDocument,
    createDocument: mocks.createDocument,
    updateDocument: mocks.updateDocument,
    deleteDocument: mocks.deleteDocument,
    batchWrite: mocks.batchWrite
  })
}))

vi.mock('~/composables/useDataPublish', () => ({
  useDataPublish: () => ({
    publishData: mocks.publishData
  })
}))

vi.mock('~/composables/useAdminAuth', () => ({
  useAdminAuth: () => ({
    getCurrentUser: mocks.getCurrentUser
  })
}))

vi.mock('~/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  })
}))

const globalOptions = {
  stubs: {
    DataTable: true,
    FormModal: true,
    Teleport: true
  }
}

const scheduledNews = (publishDate: Timestamp) => ({
  id: 'scheduled-news',
  category: 'announcement' as const,
  title: '予約投稿テスト',
  content: '予約時刻を過ぎたら公開されます。',
  status: 'scheduled' as const,
  priority: 'medium' as const,
  publishDate,
  isPinned: false
})

describe('Admin news auto publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'))

    mocks.getCollection.mockResolvedValue([])
    mocks.getDocument.mockResolvedValue(null)
    mocks.createDocument.mockResolvedValue('created-news')
    mocks.updateDocument.mockResolvedValue(undefined)
    mocks.deleteDocument.mockResolvedValue(undefined)
    mocks.batchWrite.mockResolvedValue(undefined)
    mocks.publishData.mockResolvedValue('https://storage.example.test/news.json')
    mocks.getCurrentUser.mockResolvedValue({ email: 'admin@example.com' })

    vi.mocked(useRoute).mockReturnValue({ path: '/admin/news', params: {}, query: {} })
    vi.mocked(useNuxtApp).mockReturnValue({
      $toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
        info: mocks.toastInfo
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Firestore Timestampの予約時刻を過ぎたニュースを公開してJSONを再公開する', async () => {
    mocks.getCollection.mockResolvedValue([
      scheduledNews(Timestamp.fromDate(new Date('2026-07-15T11:59:00.000Z')))
    ])

    const wrapper = mount(NewsIndexPage, { global: globalOptions })
    await flushPromises()

    await vi.advanceTimersByTimeAsync(60_000)
    await flushPromises()

    expect(mocks.batchWrite).toHaveBeenCalledWith([
      {
        type: 'update',
        collection: 'news',
        id: 'scheduled-news',
        data: { status: 'published' }
      }
    ])
    expect(mocks.publishData).toHaveBeenCalledWith('news')
    expect(mocks.toastSuccess).toHaveBeenCalledWith('予約投稿のお知らせデータを公開しました')

    wrapper.unmount()
  })

  it('予約時刻前のTimestampは公開しない', async () => {
    mocks.getCollection.mockResolvedValue([
      scheduledNews(Timestamp.fromDate(new Date('2026-07-15T12:01:01.000Z')))
    ])

    const wrapper = mount(NewsIndexPage, { global: globalOptions })
    await flushPromises()

    await vi.advanceTimersByTimeAsync(60_000)
    await flushPromises()

    expect(mocks.batchWrite).not.toHaveBeenCalled()
    expect(mocks.publishData).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('保存成功後の公開失敗を区別して通知する', async () => {
    mocks.publishData.mockRejectedValue(new Error('storage unavailable'))

    const wrapper = mount(NewsEditPage, { global: globalOptions })
    await wrapper.find('#news-title-ja').setValue('公開失敗テスト')
    await wrapper.find('#news-content-ja').setValue('保存は成功し、公開だけが失敗します。')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.createDocument).toHaveBeenCalledTimes(1)
    expect(mocks.toastSuccess).toHaveBeenCalledWith('お知らせを作成しました')
    expect(mocks.toastError).toHaveBeenCalledWith('保存しましたが、データ公開に失敗しました')
    expect(mocks.toastError).not.toHaveBeenCalledWith('保存に失敗しました')
    expect(navigateTo).toHaveBeenCalledWith('/admin/news')

    wrapper.unmount()
  })
})
