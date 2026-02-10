import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useGoogleMaps } from '@/composables/useGoogleMaps'

describe('useGoogleMaps', () => {
  it('locale=en のとき Google Maps script に language=en が付与される', async () => {
    ;(global.useRuntimeConfig as any) = vi.fn(() => ({
      public: { googleMapsApiKey: 'test-api-key' }
    }))
    ;(global.useI18n as any) = vi.fn(() => ({ locale: ref('en') }))

    // 既存の script や google をクリア
    document.head.innerHTML = ''
    try {
      delete (window as any).google
    } catch {
      ;(window as any).google = undefined
    }

    // happy-dom は script のネットワークロードが無効で自動的に onerror になるため、
    // script 要素の代わりに通常要素を返してロード処理を発火させないようにする。
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      if (String(tagName).toLowerCase() === 'script') {
        return originalCreateElement('div') as any
      }
      return originalCreateElement(tagName)
    })

    const { loadGoogleMaps } = useGoogleMaps()
    const promise = loadGoogleMaps()

    const el = document.head.firstElementChild as any
    expect(el).toBeTruthy()
    expect(String(el.src)).toContain('maps.googleapis.com/maps/api/js')
    expect(String(el.src)).toContain('language=en')
    expect(String(el.src)).toContain('region=JP')

    // 読み込み完了を擬似的に発火
    el.onload?.(new Event('load'))
    await promise

    createElementSpy.mockRestore()
  })
})
