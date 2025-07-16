import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TimetablePage from '@/pages/admin/timetable.vue'

// Mock composables
const mockGetCollection = vi.fn()
const mockCreateDocument = vi.fn()
const mockUpdateDocument = vi.fn()
const mockDeleteDocument = vi.fn()
const mockBatchWrite = vi.fn()

vi.mock('@/composables/useAdminFirestore', () => ({
  useAdminFirestore: () => ({
    getCollection: mockGetCollection,
    createDocument: mockCreateDocument,
    updateDocument: mockUpdateDocument,
    deleteDocument: mockDeleteDocument,
    batchWrite: mockBatchWrite
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
  })
}))


// Mock file input
global.FileReader = vi.fn(() => ({
  readAsText: vi.fn(function(this: any) {
    setTimeout(() => {
      this.onload({ target: { result: 'tripId,name,departure,arrival,departureTime,arrivalTime,price\n001,フェリーおき,西郷,本土七類,08:30,11:10,3350' } })
    }, 0)
  })
})) as any

describe('TimetablePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // デフォルトのモックデータ
    mockGetCollection.mockResolvedValue([
      {
        id: '1',
        tripId: '001',
        name: 'フェリーおき',
        departure: '西郷',
        arrival: '本土七類',
        departureTime: '08:30',
        arrivalTime: '11:10',
        price: 3350
      }
    ])
  })

  describe('データ表示', () => {
    it('時刻表データを正しく表示する', async () => {
      const wrapper = mount(TimetablePage)
      await flushPromises()

      expect(mockGetCollection).toHaveBeenCalledWith(
        'timetables',
        expect.any(Array)
      )
      
      const tableRows = wrapper.findAll('tbody tr')
      expect(tableRows).toHaveLength(1)
      expect(tableRows[0].text()).toContain('フェリーおき')
      expect(tableRows[0].text()).toContain('西郷')
      expect(tableRows[0].text()).toContain('本土七類')
    })

    it('フィルタリング機能が動作する', async () => {
      const wrapper = mount(TimetablePage)
      await flushPromises()

      // 港でフィルタ
      const portSelect = wrapper.find('select[class*="port-filter"]')
      await portSelect.setValue('西郷')

      // フィルタ結果を確認
      const visibleRows = wrapper.findAll('tbody tr').filter(row => 
        row.isVisible()
      )
      expect(visibleRows.every(row => row.text().includes('西郷'))).toBe(true)
    })
  })

  describe('CRUD操作', () => {
    it('新規時刻表を追加できる', async () => {
      mockCreateDocument.mockResolvedValue('new-id')
      const wrapper = mount(TimetablePage)
      
      // 追加ボタンをクリック
      await wrapper.find('button[class*="add-button"]').trigger('click')
      
      // フォームに入力
      const modal = wrapper.findComponent({ name: 'FormModal' })
      await modal.find('input[v-model="formData.tripId"]').setValue('002')
      await modal.find('input[v-model="formData.name"]').setValue('フェリーしらしま')
      
      // 保存
      await modal.find('form').trigger('submit')
      await flushPromises()

      expect(mockCreateDocument).toHaveBeenCalledWith(
        'timetables',
        expect.objectContaining({
          tripId: '002',
          name: 'フェリーしらしま'
        })
      )
    })

    it('時刻表を編集できる', async () => {
      const wrapper = mount(TimetablePage)
      await flushPromises()

      // 編集ボタンをクリック
      await wrapper.find('button[class*="edit-button"]').trigger('click')
      
      // 編集フォームが表示される
      const modal = wrapper.findComponent({ name: 'FormModal' })
      expect(modal.exists()).toBe(true)
      
      // 保存
      await modal.find('form').trigger('submit')
      await flushPromises()

      expect(mockUpdateDocument).toHaveBeenCalled()
    })

    it('時刻表を削除できる', async () => {
      window.confirm = vi.fn(() => true)
      const wrapper = mount(TimetablePage)
      await flushPromises()

      // 削除ボタンをクリック
      await wrapper.find('button[class*="delete-button"]').trigger('click')
      
      expect(window.confirm).toHaveBeenCalledWith(
        '001 フェリーおきを削除しますか？'
      )
      expect(mockDeleteDocument).toHaveBeenCalledWith('timetables', '1')
    })
  })

  describe('CSVインポート', () => {
    it('CSVファイルをインポートできる', async () => {
      mockBatchWrite.mockResolvedValue(undefined)
      const wrapper = mount(TimetablePage)
      
      // ファイル選択をシミュレート
      const fileInput = wrapper.find('input[type="file"]')
      const file = new File(['content'], 'timetable.csv', { type: 'text/csv' })
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })
      
      await fileInput.trigger('change')
      await flushPromises()

      expect(mockBatchWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'create',
            collection: 'timetables'
          })
        ])
      )
    })
  })

  describe('データ公開', () => {
    it('時刻表データを公開できる', async () => {
      mockPublishData.mockResolvedValue('https://storage.example.com/timetable.json')
      const wrapper = mount(TimetablePage)
      
      // 公開ボタンをクリック
      await wrapper.find('button[class*="publish-button"]').trigger('click')
      await flushPromises()

      expect(mockPublishData).toHaveBeenCalledWith('timetable')
    })
  })
})