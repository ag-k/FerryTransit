import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import NewsEditPage from '@/pages/admin/news/edit.vue'
import NewsIndexPage from '@/pages/admin/news/index.vue'

const getCollection = vi.fn().mockResolvedValue([])

vi.mock('@/composables/useAdminFirestore', () => ({
  useAdminFirestore: () => ({
    getCollection,
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    batchWrite: vi.fn()
  })
}))

vi.mock('@/composables/useDataPublish', () => ({
  useDataPublish: () => ({
    publishData: vi.fn()
  })
}))

vi.mock('@/composables/useAdminAuth', () => ({
  useAdminAuth: () => ({
    getCurrentUser: vi.fn().mockResolvedValue(null)
  })
}))

const globalOptions = {
  stubs: {
    FormModal: true,
    DataTable: true,
    Teleport: true
  }
}

describe('Admin news accessibility', () => {
  it('associates visible labels with the news edit controls', () => {
    const wrapper = mount(NewsEditPage, { global: globalOptions })

    const labelledControls = [
      ['news-category', 'カテゴリー'],
      ['news-priority', '優先度'],
      ['news-title-ja', 'タイトル（日本語）'],
      ['news-title-en', 'タイトル（英語）'],
      ['news-content-ja', '本文（日本語）'],
      ['news-content-en', '本文（英語）'],
      ['news-status', '公開状態'],
      ['news-publish-date', '公開日時']
    ]

    for (const [id, label] of labelledControls) {
      expect(wrapper.find(`#${id}`).exists()).toBe(true)
      expect(wrapper.find(`label[for="${id}"]`).text()).toContain(label)
    }
  })

  it('provides names for the news list filters', async () => {
    const wrapper = mount(NewsIndexPage, { global: globalOptions })
    await flushPromises()

    expect(wrapper.find('select[aria-label="カテゴリーで絞り込む"]').exists()).toBe(true)
    expect(wrapper.find('select[aria-label="公開状態で絞り込む"]').exists()).toBe(true)
  })
})
