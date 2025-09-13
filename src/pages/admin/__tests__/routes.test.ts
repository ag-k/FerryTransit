import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RoutesAdminPage from '../routes.vue'
import { ref } from 'vue'

// Mocks
const mockGetStorageDownloadURL = vi.fn(async () => 'https://example.com/ferry-routes.json')

vi.mock('~/composables/useDataPublish', () => ({
  getJSONData: vi.fn(async () => ({
    metadata: {
      version: 1,
      lastFetchedAt: '2025-01-01T00:00:00.000Z',
      totalRoutes: 2,
      fetchedBy: 'tester'
    },
    routes: [
      {
        id: 'A_B',
        from: 'A',
        to: 'B',
        fromName: 'A港',
        toName: 'B港',
        path: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }],
        distance: 1000,
        duration: 600,
        source: 'manual',
        geodesic: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'C_D',
        from: 'C',
        to: 'D',
        fromName: 'C港',
        toName: 'D港',
        path: [{ lat: 2, lng: 2 }],
        distance: 2500,
        duration: 900,
        source: 'google_transit',
        geodesic: true,
        createdAt: '2025-01-02T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z'
      }
    ]
  })),
  uploadJSON: vi.fn(),
  getStorageDownloadURL: (...args: any[]) => mockGetStorageDownloadURL(...args)
}))

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null })
}))

vi.mock('~/composables/useAdminAuth', () => ({
  useAdminAuth: () => ({
    user: ref(null),
    getCurrentUser: vi.fn(async () => null)
  })
}))

vi.mock('@googlemaps/js-api-loader', () => ({
  Loader: class { async load() { /* noop for tests */ } }
}))

vi.mock('#app', () => ({
  useHead: vi.fn(),
  useI18n: () => ({ t: (k: string) => k, locale: ref('ja') }),
  useRuntimeConfig: () => ({ public: { googleMapsApiKey: '' } }),
  useNuxtApp: () => ({ $toast: { success: vi.fn(), error: vi.fn() } })
}))

describe('Admin Routes Page - 現在の航路詳細表示', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('現在の航路一覧が表示される', async () => {
    const wrapper = mount(RoutesAdminPage, {
      global: {
        stubs: {
          Icon: true,
          NuxtLink: { template: '<a><slot /></a>' }
        }
      }
    })

    // onMounted の非同期ロードを待機
    await nextTick()
    await new Promise(r => setTimeout(r, 0))
    await nextTick()

    // メタデータと一覧タイトルの表示
    expect(wrapper.text()).toContain('現在の航路データ')
    // 一覧ブロック
    expect(wrapper.text()).toContain('現在の航路一覧')
    // 航路ラベル（スロット描画）
    expect(wrapper.text()).toContain('A港 → B港')
    expect(wrapper.text()).toContain('C港 → D港')
  })

  it('詳細ボタンでモーダルに詳細が表示される', async () => {
    const wrapper = mount(RoutesAdminPage, {
      global: {
        stubs: {
          Icon: true,
          NuxtLink: { template: '<a><slot /></a>' }
        }
      }
    })

    // 非同期ロード待機
    await nextTick()
    await new Promise(r => setTimeout(r, 0))
    await nextTick()

    // 最初の「詳細」ボタンをクリック
    const detailButtons = wrapper.findAll('button')
    const detailBtn = detailButtons.find(b => b.text() === '詳細')
    expect(detailBtn).toBeTruthy()
    await detailBtn!.trigger('click')
    await nextTick()
    await new Promise(r => setTimeout(r, 0))
    await nextTick()

    // モーダルは Teleport で body 配下に描画されるため body を検査
    expect(document.body.textContent).toContain('A港 → B港 の詳細')
    // 主要項目（モーダル内）
    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('ルートID')
    expect(bodyText).toContain('取得元')
    expect(bodyText).toContain('経路点数')
  })

  it('Storageからダウンロードボタンでダウンロード処理が呼ばれる', async () => {
    const wrapper = mount(RoutesAdminPage, {
      global: {
        stubs: { Icon: true, NuxtLink: { template: '<a><slot /></a>' } }
      }
    })

    // fetch をモック
    const originalFetch = global.fetch
    global.fetch = vi.fn(async () => ({ ok: true, blob: async () => new Blob([JSON.stringify({})], { type: 'application/json' }) })) as any
    // URL API をモック
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob://dummy') as any
    URL.revokeObjectURL = vi.fn() as any

    const btn = wrapper.findAll('button').find(b => b.text().includes('Storageからダウンロード'))
    expect(btn).toBeTruthy()
    await btn!.trigger('click')

    expect(mockGetStorageDownloadURL).toHaveBeenCalledWith('routes/ferry-routes.json')

    // 後始末
    global.fetch = originalFetch as any
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })
})
