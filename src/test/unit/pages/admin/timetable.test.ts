import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TimetablePage from '@/pages/admin/timetable.vue'

const mockGetCollection = vi.fn()
const mockCreateDocument = vi.fn()
const mockUpdateDocument = vi.fn()
const mockDeleteDocument = vi.fn()
const mockBatchWrite = vi.fn()
const mockPublishData = vi.fn()

vi.mock('@/composables/useAdminFirestore', () => ({
  useAdminFirestore: () => ({
    getCollection: mockGetCollection,
    createDocument: mockCreateDocument,
    updateDocument: mockUpdateDocument,
    deleteDocument: mockDeleteDocument,
    batchWrite: mockBatchWrite
  })
}))

vi.mock('@/composables/useDataPublish', () => ({
  useDataPublish: () => ({
    publishData: mockPublishData
  })
}))

const mockToast = {
  success: vi.fn(),
  error: vi.fn()
}

const FormModalStub = {
  name: 'FormModal',
  props: ['open'],
  emits: ['close', 'submit'],
  template: `
    <div v-if="open" data-test="form-modal-stub">
      <form @submit.prevent="$emit('submit')">
        <slot />
      </form>
      <button type="button" data-test="close-modal" @click="$emit('close')">閉じる</button>
    </div>
  `
}

const DataTableStub = {
  name: 'DataTable',
  props: ['data', 'columns'],
  template: `
    <div>
      <table>
        <tbody>
          <tr v-for="row in data" :key="row.id" data-test="timetable-row">
            <td v-for="column in columns" :key="column.key">
              <slot :name="'cell-' + column.key" :value="row[column.key]" :row="row">
                {{ row[column.key] }}
              </slot>
            </td>
            <td>
              <slot name="row-actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

describe('TimetablePage', () => {
  const mountPage = () => mount(TimetablePage, {
    global: {
      stubs: {
        FormModal: FormModalStub,
        DataTable: DataTableStub
      }
    }
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    vi.stubGlobal('useNuxtApp', () => ({
      $toast: mockToast
    }))

    mockGetCollection.mockResolvedValue([
      {
        id: '1',
        tripId: '001',
        name: 'フェリーおき',
        departure: 'SAIGO',
        arrival: 'HONDO_SHICHIRUI',
        departureTime: '08:30',
        arrivalTime: '11:10',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        status: 0
      }
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('時刻表データを正しく表示する', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const rows = wrapper.findAll('[data-test="timetable-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('フェリーおき')
    expect(rows[0].text()).toContain('西郷') // Display shows Japanese port name, not ID
  })

  it('フィルタリング機能が動作する', async () => {
    mockGetCollection.mockResolvedValue([
      { id: '1', tripId: '001', name: 'フェリーおき', departure: 'SAIGO', arrival: 'HONDO_SHICHIRUI', departureTime: '08:30', arrivalTime: '11:10', startDate: '2024-01-01', endDate: '2024-03-31', status: 0 },
      { id: '2', tripId: '002', name: 'フェリーしらしま', departure: 'HISHIURA', arrival: 'SAIGO', departureTime: '10:00', arrivalTime: '12:30', startDate: '2024-01-01', endDate: '2024-03-31', status: 0 }
    ])

    const wrapper = mountPage()
    await flushPromises()

    const filter = wrapper.find('[data-test="timetable-filter-departure"]')
    await filter.setValue('SAIGO')
    await flushPromises()

    const rows = wrapper.findAll('[data-test="timetable-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('フェリーおき')
  })

  it('新規時刻表を追加できる', async () => {
    mockCreateDocument.mockResolvedValue('new-id')
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-test="timetable-add"]').trigger('click')
    await flushPromises()

    const modal = wrapper.find('[data-test="form-modal-stub"]')
    await modal.find('[data-test="timetable-name"]').setValue('FERRY_SHIRASHIMA') // Form uses ship ID, not name
    await modal.find('[data-test="timetable-departure"]').setValue('SAIGO')
    await modal.find('[data-test="timetable-arrival"]').setValue('HISHIURA')
    await modal.find('[data-test="timetable-departure-time"]').setValue('09:00')
    await modal.find('[data-test="timetable-arrival-time"]').setValue('11:30')
    await modal.find('[data-test="timetable-start-date"]').setValue('2024-04-01')
    await modal.find('[data-test="timetable-end-date"]').setValue('2024-04-30')
    await modal.find('[data-test="timetable-status"]').setValue('1')

    await modal.find('form').trigger('submit')
    await flushPromises()

    expect(mockCreateDocument).toHaveBeenCalledWith(
      'timetables',
      expect.objectContaining({
        name: 'FERRY_SHIRASHIMA', // Ship ID is stored, not Japanese name
        departure: 'SAIGO',
        arrival: 'HISHIURA',
        status: '1' // Status is stored as string from form select
      })
    )

    nowSpy.mockRestore()
  })

  it('時刻表を編集できる', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-test="timetable-edit"]').trigger('click')
    await flushPromises()

    const modal = wrapper.find('[data-test="form-modal-stub"]')
    await modal.find('[data-test="timetable-status"]').setValue('2')
    await modal.find('form').trigger('submit')
    await flushPromises()

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      'timetables',
      '1',
      expect.objectContaining({ status: '2' })
    )
  })

  it('時刻表を削除できる', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-test="timetable-delete"]').trigger('click')

    expect(confirmSpy).toHaveBeenCalledWith('フェリーおき の 西郷 → 本土七類 便を削除しますか？')
    expect(mockDeleteDocument).toHaveBeenCalledWith('timetables', '1')

    confirmSpy.mockRestore()
  })

  it('CSVファイルをインポートできる', async () => {
    mockBatchWrite.mockResolvedValue(undefined)

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-test="timetable-import"]').trigger('click')
    await flushPromises()

    const fileInput = wrapper.find('[data-test="timetable-file-input"]')
    const file = new File([
      '船舶名,出発港,到着港,出発時刻,到着時刻,開始日,終了日,状態\nフェリーおき,SAIGO,HONDO_SHICHIRUI,08:30,11:10,2024-01-01,2024-01-31,0'
    ], 'timetable.csv', { type: 'text/csv' })

    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false
    })

    await fileInput.trigger('change')
    await flushPromises()

    expect(mockBatchWrite).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith('1件のデータをインポートしました')
  })

  it('時刻表データを公開できる', async () => {
    mockPublishData.mockResolvedValue('https://example.com/timetable.json')

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-test="timetable-publish"]').trigger('click')
    await flushPromises()

    expect(mockPublishData).toHaveBeenCalledWith('timetable')
    expect(mockToast.success).toHaveBeenCalledWith('時刻表データを公開しました')
  })
})
