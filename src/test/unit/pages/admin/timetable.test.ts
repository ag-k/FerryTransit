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

vi.mock('firebase/firestore', () => ({
  orderBy: vi.fn((field: string, direction?: string) => ({ field, direction }))
}))

vi.mock('@/utils/gtfsBusTimetable', () => ({
  loadBusStopsIndex: vi.fn(() => Promise.resolve([]))
}))

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
    vi.stubGlobal('confirm', vi.fn())

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

  it('船・バス・航空を交通モードで絞り込める', async () => {
    mockGetCollection.mockResolvedValue([
      { id: 'ferry-1', trip_id: 'FERRY-001', mode: 'FERRY', name: 'FERRY_OKI', departure: 'SAIGO', arrival: 'HONDO_SHICHIRUI', departure_time: '08:30', arrival_time: '11:10', start_date: '2026-01-01', end_date: '2026-12-31', status: 0 },
      { id: 'bus-1', trip_id: 'BUS-001', mode: 'BUS', name: 'AMA_TOWN_BUS', departure: 'BUS_AMA_100_01', arrival: 'BUS_AMA_126_01', departure_time: '09:00', arrival_time: '09:20', start_date: '2026-01-01', end_date: '2026-12-31', status: 0 },
      { id: 'air-1', trip_id: 'AIR-001', mode: 'AIR', name: 'JAL_OKI_ITAMI', departure: 'AIRPORT_OKI', arrival: 'AIRPORT_ITAMI', departure_time: '15:05', arrival_time: '15:50', start_date: '2026-01-01', end_date: '2026-12-31', status: 0 }
    ])

    const wrapper = mountPage()
    await flushPromises()

    const modeFilter = wrapper.find('[data-test="timetable-filter-mode"]')
    for (const mode of ['FERRY', 'BUS', 'AIR']) {
      await modeFilter.setValue(mode)
      await flushPromises()
      const rows = wrapper.findAll('[data-test="timetable-row"]')
      expect(rows).toHaveLength(1)
      expect(rows[0].text()).toContain(mode === 'FERRY' ? 'フェリーおき' : mode === 'BUS' ? '海士町路線バス' : 'JAL 大阪（伊丹）線')
    }
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

  it('航空便の複数交通モード項目をフォームから登録できる', async () => {
    mockCreateDocument.mockResolvedValue('new-air-id')

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('[data-test="timetable-add"]').trigger('click')
    await flushPromises()

    const modal = wrapper.find('[data-test="form-modal-stub"]')
    await modal.find('[data-test="timetable-mode"]').setValue('AIR')
    await modal.find('[data-test="timetable-trip-id"]').setValue('JAL2332-2026')
    await modal.find('[data-test="timetable-name"]').setValue('JAL_OKI_ITAMI')
    await modal.find('[data-test="timetable-departure"]').setValue('AIRPORT_OKI')
    await modal.find('[data-test="timetable-arrival"]').setValue('AIRPORT_ITAMI')
    await modal.find('[data-test="timetable-departure-time"]').setValue('15:05')
    await modal.find('[data-test="timetable-arrival-time"]').setValue('15:50')
    await modal.find('[data-test="timetable-start-date"]').setValue('2026-07-01')
    await modal.find('[data-test="timetable-end-date"]').setValue('2026-08-31')
    await modal.find('[data-test="timetable-operator-id"]').setValue('JAL')
    await modal.find('[data-test="timetable-service-id"]').setValue('SVC_SUMMER')
    await modal.find('[data-test="timetable-vehicle-id"]').setValue('JAL2332')
    await modal.find('[data-test="timetable-price"]').setValue('18900')
    await modal.find('[data-test="timetable-added-dates"]').setValue('2026-07-20, 2026-07-21')
    await modal.find('[data-test="timetable-removed-dates"]').setValue('2026-08-10')
    await modal.find('[data-test="timetable-terminal"]').setValue('1')
    await modal.find('[data-test="timetable-gate"]').setValue('3')
    await modal.find('[data-test="timetable-platform"]').setValue('A')

    await modal.find('form').trigger('submit')
    await flushPromises()

    expect(mockCreateDocument).toHaveBeenCalledWith(
      'timetables',
      expect.objectContaining({
        trip_id: 'JAL2332-2026',
        mode: 'AIR',
        operator_id: 'JAL',
        service_id: 'SVC_SUMMER',
        vehicle_id: 'JAL2332',
        departure_type: 'AIRPORT',
        arrival_type: 'AIRPORT',
        active_days: [0, 1, 2, 3, 4, 5, 6],
        added_dates: '2026-07-20,2026-07-21',
        removed_dates: '2026-08-10',
        price: 18900,
        terminal: '1',
        gate: '3',
        platform: 'A'
      })
    )
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

  it('引用符付きCSVから航空便の曜日・例外日・運賃・搭乗情報を保持する', async () => {
    mockBatchWrite.mockResolvedValue(undefined)

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('[data-test="timetable-import"]').trigger('click')
    await flushPromises()

    const fileInput = wrapper.find('[data-test="timetable-file-input"]')
    const file = new File([
      'trip_id,mode,name,operator_id,service_id,vehicle_id,departure,arrival,departure_time,arrival_time,start_date,end_date,active_days,added_dates,removed_dates,price,terminal,gate,platform\n' +
      'JAL2332-2026,AIR,JAL_OKI_ITAMI,JAL,SVC_SUMMER,JAL2332,AIRPORT_OKI,AIRPORT_ITAMI,15:05,15:50,2026-07-01,2026-08-31,"1,3,5","2026-07-20,2026-07-21","2026-08-10,2026-08-11",18900,1,3,A'
    ], 'air-timetable.csv', { type: 'text/csv' })

    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false
    })
    await fileInput.trigger('change')
    await flushPromises()

    expect(mockBatchWrite).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'create',
        collection: 'timetables',
        data: expect.objectContaining({
          trip_id: 'JAL2332-2026',
          mode: 'AIR',
          operator_id: 'JAL',
          service_id: 'SVC_SUMMER',
          vehicle_id: 'JAL2332',
          departure_type: 'AIRPORT',
          arrival_type: 'AIRPORT',
          active_days: [1, 3, 5],
          added_dates: '2026-07-20,2026-07-21',
          removed_dates: '2026-08-10,2026-08-11',
          price: 18900,
          terminal: '1',
          gate: '3',
          platform: 'A'
        })
      })
    ])
  })

  it('JSONからバス便の事業者・サービス・路線・曜日・例外日・運賃を保持する', async () => {
    mockBatchWrite.mockResolvedValue(undefined)

    const wrapper = mountPage()
    await flushPromises()
    await wrapper.find('[data-test="timetable-import"]').trigger('click')
    await flushPromises()
    await wrapper.find('input[value="json"]').setValue(true)

    const fileInput = wrapper.find('[data-test="timetable-file-input"]')
    const file = new File([JSON.stringify([{
      trip_id: 'AMA-R8-001',
      mode: 'BUS',
      name: 'AMA_TOWN_BUS',
      operator_id: 'AMA_TOWN',
      service_id: 'WEEKDAY',
      vehicle_id: 'R8_AMA',
      departure: 'BUS_AMA_100_01',
      arrival: 'BUS_AMA_126_01',
      departure_time: '08:00',
      arrival_time: '08:20',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      active_days: [1, 2, 3, 4, 5],
      added_dates: ['2026-08-13'],
      removed_dates: ['2026-01-01'],
      fare: 200,
      route_name: '豊田線',
      platform: '1番のりば'
    }])], 'bus-timetable.json', { type: 'application/json' })

    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false
    })
    await fileInput.trigger('change')
    await flushPromises()

    expect(mockBatchWrite).toHaveBeenCalledWith([
      expect.objectContaining({
        data: expect.objectContaining({
          trip_id: 'AMA-R8-001',
          mode: 'BUS',
          operator_id: 'AMA_TOWN',
          service_id: 'WEEKDAY',
          vehicle_id: 'R8_AMA',
          departure_type: 'STOP',
          arrival_type: 'STOP',
          active_days: [1, 2, 3, 4, 5],
          added_dates: '2026-08-13',
          removed_dates: '2026-01-01',
          price: 200,
          via: '豊田線',
          platform: '1番のりば'
        })
      })
    ])
  })

  it('管理画面からは時刻表の公開プレビューだけを生成する', async () => {
    mockPublishData.mockResolvedValue('https://example.com/preview/timetable.json')

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('[data-test="timetable-publish"]').trigger('click')
    await flushPromises()

    expect(mockPublishData).toHaveBeenCalledWith('timetable', true)
    expect(mockToast.success).toHaveBeenCalledWith('時刻表プレビューを生成しました。本番データはコード管理パイプラインから公開してください')
  })
})
