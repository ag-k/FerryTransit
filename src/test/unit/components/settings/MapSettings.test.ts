import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MapSettings from '@/components/settings/MapSettings.vue'
import { useSettingsStore } from '@/stores/settings'

describe('MapSettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('useSettingsStore', useSettingsStore)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes the visual switch through a 48px touch target', () => {
    const wrapper = mount(MapSettings, {
      global: {
        mocks: {
          $t: (key: string) => key
        }
      }
    })

    const toggle = wrapper.get('[data-testid="map-settings-toggle"]')
    expect(toggle.classes()).toEqual(expect.arrayContaining(['h-12', 'w-12']))
    expect(toggle.attributes('role')).toBe('switch')
  })
})
