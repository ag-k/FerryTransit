import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AlertsPage from '@/pages/admin/alerts.vue'

// Mock composables
const mockGetCollection = vi.fn()
const mockCreateDocument = vi.fn()
const mockUpdateDocument = vi.fn()
const mockDeleteDocument = vi.fn()

vi.mock('@/composables/useAdminFirestore', () => ({
  useAdminFirestore: () => ({
    getCollection: mockGetCollection,
    createDocument: mockCreateDocument,
    updateDocument: mockUpdateDocument,
    deleteDocument: mockDeleteDocument
  })
}))

const mockPublishData = vi.fn()
vi.mock('@/composables/useDataPublish', () => ({
  useDataPublish: () => ({
    publishData: mockPublishData
  })
}))

// Mock Nuxt
const mockToast = {
  success: vi.fn(),
  error: vi.fn()
}

vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $toast: mockToast
  }),
  definePageMeta: vi.fn()
}))

describe('AlertsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // デフォルトのモックデータ
    mockGetCollection.mockResolvedValue([
      {
        id: '1',
        ship: 'フェリーおき',
        route: '西郷 → 本土七類',
        status: 2,
        summary: '欠航',
        comment: '悪天候のため',
        startDate: '2024-01-10T09:00:00',
        active: true,
        severity: 'high',
        affectedRoutes: ['西郷 → 本土七類']
      }
    ])
  })

  describe('運航状況サマリー', () => {
    it('各状態の件数を正しく表示する', async () => {
      mockGetCollection
        .mockResolvedValueOnce([
          { id: '1', status: 1, active: true },
          { id: '2', status: 2, active: true },
          { id: '3', status: 2, active: true }
        ])
        .mockResolvedValueOnce([])

      const wrapper = mount(AlertsPage)
      await flushPromises()

      const summaryCards = wrapper.findAll('.grid > div')
      expect(summaryCards[1].text()).toContain('1') // 遅延
      expect(summaryCards[2].text()).toContain('2') // 欠航
    })
  })

  describe('アラート管理', () => {
    it('アクティブなアラートを表示する', async () => {
      const wrapper = mount(AlertsPage)
      await flushPromises()

      const activeAlerts = wrapper.find('.active-alerts')
      expect(activeAlerts.text()).toContain('フェリーおき')
      expect(activeAlerts.text()).toContain('西郷 → 本土七類')
      expect(activeAlerts.text()).toContain('欠航')
    })

    it('新規アラートを作成できる', async () => {
      mockCreateDocument.mockResolvedValue('new-id')
      const wrapper = mount(AlertsPage)
      
      // 新規アラートボタンをクリック
      await wrapper.find('button[class*="new-alert"]').trigger('click')
      
      // フォームに入力
      const modal = wrapper.findComponent({ name: 'FormModal' })
      await modal.find('select[v-model="formData.ship"]').setValue('フェリーしらしま')
      await modal.find('input[v-model="formData.route"]').setValue('菱浦 → 西郷')
      await modal.find('select[v-model="formData.status"]').setValue('1')
      await modal.find('input[v-model="formData.summary"]').setValue('30分遅延')
      
      // 保存
      await modal.find('form').trigger('submit')
      await flushPromises()

      expect(mockCreateDocument).toHaveBeenCalledWith(
        'alerts',
        expect.objectContaining({
          ship: 'フェリーしらしま',
          route: '菱浦 → 西郷',
          status: 1,
          summary: '30分遅延',
          active: true,
          severity: 'medium'
        })
      )
    })

    it('アラートを編集できる', async () => {
      const wrapper = mount(AlertsPage)
      await flushPromises()

      // 編集ボタンをクリック
      const editButton = wrapper.find('button[aria-label*="edit"]')
      await editButton.trigger('click')
      
      // フォームが表示される
      const modal = wrapper.findComponent({ name: 'FormModal' })
      expect(modal.exists()).toBe(true)
      
      // 状態を変更
      await modal.find('select[v-model="formData.status"]').setValue('3')
      
      // 保存
      await modal.find('form').trigger('submit')
      await flushPromises()

      expect(mockUpdateDocument).toHaveBeenCalledWith(
        'alerts',
        '1',
        expect.objectContaining({
          status: 3
        })
      )
    })

    it('アラートを削除できる', async () => {
      window.confirm = vi.fn(() => true)
      const wrapper = mount(AlertsPage)
      await flushPromises()

      // 削除ボタンをクリック
      const deleteButton = wrapper.find('button[aria-label*="delete"]')
      await deleteButton.trigger('click')
      
      expect(window.confirm).toHaveBeenCalledWith(
        'フェリーおきの欠航を削除しますか？'
      )
      expect(mockDeleteDocument).toHaveBeenCalledWith('alerts', '1')
    })
  })

  describe('データ公開', () => {
    it('アラートデータを公開できる', async () => {
      mockPublishData.mockResolvedValue('https://storage.example.com/alerts.json')
      const wrapper = mount(AlertsPage)
      
      // 公開ボタンをクリック
      await wrapper.find('button[class*="publish"]').trigger('click')
      await flushPromises()

      expect(mockPublishData).toHaveBeenCalledWith('alerts')
    })
  })

  describe('アラート履歴', () => {
    it('過去のアラートを表示する', async () => {
      mockGetCollection
        .mockResolvedValueOnce([]) // アクティブなアラート
        .mockResolvedValueOnce([ // 履歴
          {
            id: '2',
            ship: 'レインボージェット',
            route: '西郷 → 菱浦',
            status: 2,
            summary: '欠航（終了）',
            startDate: '2024-01-01T09:00:00',
            endDate: '2024-01-01T18:00:00',
            active: false
          }
        ])

      const wrapper = mount(AlertsPage)
      await flushPromises()

      const historyTable = wrapper.findComponent({ name: 'DataTable' })
      expect(historyTable.props('data')).toHaveLength(1)
      expect(historyTable.props('data')[0].ship).toBe('レインボージェット')
    })
  })
})