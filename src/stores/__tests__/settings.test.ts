import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../settings'

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock as any

// caches API のモック
const cachesMock = {
  keys: vi.fn(() => Promise.resolve(['cache1', 'cache2'])),
  delete: vi.fn(() => Promise.resolve(true))
}
global.caches = cachesMock as any

// sessionStorage のモック
const sessionStorageMock = {
  clear: vi.fn()
}
global.sessionStorage = sessionStorageMock as any

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('初期状態が正しく設定される', () => {
    const store = useSettingsStore()

    expect(store.mapEnabled).toBe(true)
    expect(store.theme).toBe('system')
    expect(store.language).toBe('ja')
    expect(store.system.notificationSound).toBe(true)
    expect(store.system.fontSize).toBe('medium')
    expect(store.system.cacheSize).toBe(100)
  })

  describe('getters', () => {
    it('各getterが正しい値を返す', () => {
      const store = useSettingsStore()

      expect(store.isMapEnabled).toBe(true)
      expect(store.currentTheme).toBe('system')
      expect(store.currentLanguage).toBe('ja')
      expect(store.systemSettings).toBe(store.system)
      expect(store.isOfflineMode).toBe(false)
      expect(store.currentFontSize).toBe('medium')
    })
  })

  describe('actions', () => {
    it('setMapEnabled が動作する', () => {
      const store = useSettingsStore()
      
      store.setMapEnabled(false)
      expect(store.mapEnabled).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('setTheme が動作する', () => {
      const store = useSettingsStore()
      
      store.setTheme('dark')
      expect(store.theme).toBe('dark')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('updateSystemSettings が動作する', () => {
      const store = useSettingsStore()
      
      store.updateSystemSettings({
        notificationSound: false,
        fontSize: 'large'
      })
      
      expect(store.system.notificationSound).toBe(false)
      expect(store.system.fontSize).toBe('large')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('setNotificationSound が動作する', () => {
      const store = useSettingsStore()
      
      store.setNotificationSound(false)
      expect(store.system.notificationSound).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('setOfflineMode が動作する', () => {
      const store = useSettingsStore()
      
      store.setOfflineMode(true)
      expect(store.system.offlineMode).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('setFontSize が動作する', () => {
      const store = useSettingsStore()
      
      store.setFontSize('large')
      expect(store.system.fontSize).toBe('large')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('setCacheSettings が動作する', () => {
      const store = useSettingsStore()
      
      store.setCacheSettings({
        cacheSize: 200,
        autoClearCache: true
      })
      
      expect(store.system.cacheSize).toBe(200)
      expect(store.system.autoClearCache).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('clearCache が動作する', async () => {
      const store = useSettingsStore()
      
      await store.clearCache()
      
      expect(cachesMock.keys).toHaveBeenCalled()
      expect(cachesMock.delete).toHaveBeenCalledWith('cache1')
      expect(cachesMock.delete).toHaveBeenCalledWith('cache2')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ferryTransitCache')
      expect(sessionStorageMock.clear).toHaveBeenCalled()
    })

    it('loadFromLocalStorage が動作する', () => {
      const savedSettings = {
        mapEnabled: false,
        theme: 'dark',
        system: {
          fontSize: 'large'
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings))
      
      const store = useSettingsStore()
      store.loadFromLocalStorage()
      
      expect(store.mapEnabled).toBe(false)
      expect(store.theme).toBe('dark')
    })

    it('loadFromLocalStorage でエラーが発生した場合', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const store = useSettingsStore()
      store.loadFromLocalStorage()
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('resetSettings が動作する', () => {
      const store = useSettingsStore()
      
      store.setMapEnabled(false)
      store.setTheme('dark')
      
      store.resetSettings()
      
      expect(store.mapEnabled).toBe(true)
      expect(store.theme).toBe('system')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })
})