import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import AdminFarePage from '@/pages/admin/fare.vue'

const mockGetCollection = vi.fn()
const mockGetDocument = vi.fn()
const mockBatchWrite = vi.fn()
const mockCreateDocument = vi.fn()
const mockDeleteDocument = vi.fn()
const mockUpdateDocument = vi.fn()
const mockPublishData = vi.fn()
const mockGetJsonFile = vi.fn()
const mockGetFileMetadata = vi.fn()
const mockGetStorageDownloadURL = vi.fn()

vi.mock('firebase/firestore', () => ({
  orderBy: vi.fn((field: string, direction?: string) => ({ type: 'orderBy', field, direction })),
  where: vi.fn((field: string, operator: string, value: unknown) => ({ type: 'where', field, operator, value }))
}))

vi.mock('@/composables/useAdminFirestore', () => ({
  useAdminFirestore: () => ({
    getCollection: mockGetCollection,
    getDocument: mockGetDocument,
    batchWrite: mockBatchWrite,
    createDocument: mockCreateDocument,
    deleteDocument: mockDeleteDocument,
    updateDocument: mockUpdateDocument
  })
}))

vi.mock('@/composables/useDataPublish', () => ({
  useDataPublish: () => ({
    publishData: mockPublishData
  }),
  getStorageDownloadURL: (...args: unknown[]) => mockGetStorageDownloadURL(...args)
}))

vi.mock('@/composables/useFirebaseStorage', () => ({
  useFirebaseStorage: () => ({
    getJsonFile: mockGetJsonFile,
    getFileMetadata: mockGetFileMetadata
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
        <button type="submit" data-test="submit-modal">保存</button>
      </form>
    </div>
  `
}

const mountPage = () => mount(AdminFarePage, {
  global: {
    stubs: {
      FormModal: FormModalStub,
      ToggleSwitch: true
    }
  }
})

const clickButtonByText = async (wrapper: ReturnType<typeof mountPage>, text: string) => {
  const button = wrapper.findAll('button').find(item => item.text().includes(text))
  expect(button, `${text} button`).toBeTruthy()
  await button!.trigger('click')
  await nextTick()
}

describe('AdminFarePage highspeed fare editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useNuxtApp', () => ({ $toast: mockToast }))

    mockGetCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'fareVersions') {
        return Promise.resolve([
          {
            id: 'highspeed-version-2026',
            vesselType: 'highspeed',
            name: '2026年6月1日改定',
            effectiveFrom: '2026-06-01'
          }
        ])
      }
      return Promise.resolve([])
    })
    mockGetDocument.mockResolvedValue(null)
    mockBatchWrite.mockResolvedValue(undefined)
  })

  it('高速船料金が未作成でも区間と編集項目を表示して保存できる', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await clickButtonByText(wrapper, '高速船料金')

    expect(wrapper.text()).toContain('本土〜隠岐')
    expect(wrapper.text()).toContain('島前〜島後')
    expect(wrapper.text()).toContain('別府〜菱浦')
    expect(wrapper.text()).toContain('障がい者（大人）')
    expect(wrapper.text()).toContain('障がい者（小人）')

    await clickButtonByText(wrapper, '料金編集')
    await flushPromises()

    const modal = wrapper.find('[data-test="form-modal-stub"]')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('区間')
    expect(modal.text()).toContain('本土〜隠岐')
    expect(modal.text()).toContain('島前〜島後')
    expect(modal.text()).toContain('別府〜菱浦')
    expect(modal.findAll('input[type="number"]')).toHaveLength(12)
    expect(modal.findAll('input[type="number"]').map(input => input.attributes('id'))).toEqual([
      'highspeed-fare-0-adult',
      'highspeed-fare-0-child',
      'highspeed-fare-0-disabledAdult',
      'highspeed-fare-0-disabledChild',
      'highspeed-fare-1-adult',
      'highspeed-fare-1-child',
      'highspeed-fare-1-disabledAdult',
      'highspeed-fare-1-disabledChild',
      'highspeed-fare-2-adult',
      'highspeed-fare-2-child',
      'highspeed-fare-2-disabledAdult',
      'highspeed-fare-2-disabledChild'
    ])
    expect(modal.findAll('label').map(label => label.attributes('for'))).toEqual([
      'highspeed-fare-0-adult',
      'highspeed-fare-0-child',
      'highspeed-fare-0-disabledAdult',
      'highspeed-fare-0-disabledChild',
      'highspeed-fare-1-adult',
      'highspeed-fare-1-child',
      'highspeed-fare-1-disabledAdult',
      'highspeed-fare-1-disabledChild',
      'highspeed-fare-2-adult',
      'highspeed-fare-2-child',
      'highspeed-fare-2-disabledAdult',
      'highspeed-fare-2-disabledChild'
    ])

    await modal.find('[data-test="submit-modal"]').trigger('submit')
    await flushPromises()

    expect(mockBatchWrite).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'create',
        collection: 'fares',
        data: expect.objectContaining({
          route: 'hondo-oki',
          routeName: '本土〜隠岐',
          type: 'highspeed',
          versionId: 'highspeed-version-2026'
        })
      }),
      expect.objectContaining({
        type: 'create',
        collection: 'fares',
        data: expect.objectContaining({
          route: 'dozen-dogo',
          routeName: '島前〜島後',
          type: 'highspeed',
          versionId: 'highspeed-version-2026'
        })
      }),
      expect.objectContaining({
        type: 'create',
        collection: 'fares',
        data: expect.objectContaining({
          route: 'beppu-hishiura',
          routeName: '別府〜菱浦',
          type: 'highspeed',
          versionId: 'highspeed-version-2026'
        })
      })
    ])
  })
})

describe('AdminFarePage ferry fare editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useNuxtApp', () => ({ $toast: mockToast }))
    mockGetCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'fareVersions') {
        return Promise.resolve([{
          id: 'ferry-version-2026',
          vesselType: 'ferry',
          name: '2026年6月1日改定',
          effectiveFrom: '2026-06-01'
        }])
      }
      return Promise.resolve([])
    })
    mockGetDocument.mockResolvedValue(null)
    mockBatchWrite.mockResolvedValue(undefined)
  })

  it('2等運賃を大人運賃として保存し、小人運賃を10円単位で切り上げる', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await clickButtonByText(wrapper, '料金編集')

    const modal = wrapper.find('[data-test="form-modal-stub"]')
    const inputs = modal.findAll('input[type="number"]')
    expect(inputs).toHaveLength(80)
    await inputs[0]!.setValue('3870')
    await modal.find('[data-test="submit-modal"]').trigger('submit')
    await flushPromises()

    const operations = mockBatchWrite.mock.calls[0]?.[0]
    expect(operations[0].data).toMatchObject({
      adult: 3870,
      child: 1940,
      fares: {
        adult: 3870,
        child: 1940
      }
    })
  })
})
