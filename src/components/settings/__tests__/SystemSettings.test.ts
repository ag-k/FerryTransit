import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SystemSettings from '../SystemSettings.vue'
import { useSettingsStore } from '~/stores/settings'

// Pinia mock
vi.mock('~/stores/settings', () => ({
  useSettingsStore: vi.fn()
}))

// Nuxt app mock
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.confirmClearCache': 'キャッシュをクリアしてもよろしいですか？',
        'settings.cacheCleared': 'キャッシュをクリアしました',
        'settings.confirmResetSettings': 'すべての設定を初期値に戻します。よろしいですか？',
        'settings.settingsReset': '設定をリセットしました'
      }
      return translations[key] || key
    }
  })
}))

// i18n設定
const i18n = createI18n({
  legacy: false,
  locale: 'ja',
  messages: {
    ja: {
      settings: {
        systemSettings: 'システム設定',
        notifications: '通知',
        notificationSound: '通知音',
        notificationSoundDesc: '通知時に音を鳴らします',
        performance: 'パフォーマンス',
        enableAnimations: 'アニメーション',
        enableAnimationsDesc: '画面遷移時のアニメーションを有効にします',
        imageQuality: '画像品質',
        imageQualityLow: '低',
        imageQualityMedium: '中',
        imageQualityHigh: '高',
        reducedMotion: '視差効果を減らす',
        reducedMotionDesc: '動きに敏感な方向けに動きを減らします',
        network: 'ネットワーク',
        offlineMode: 'オフラインモード',
        offlineModeDesc: 'ネットワーク接続なしでアプリを使用します',
        dataSaver: 'データセーバー',
        dataSaverDesc: 'データ通信量を削減します',
        privacy: 'プライバシー',
        analyticsEnabled: '使用状況の分析',
        analyticsEnabledDesc: 'アプリの改善のため匿名データを送信します',
        accessibility: 'アクセシビリティ',
        fontSize: '文字サイズ',
        fontSizeSmall: '小',
        fontSizeMedium: '中',
        fontSizeLarge: '大',
        fontSizeExtraLarge: '特大',
        highContrast: 'ハイコントラスト',
        highContrastDesc: '視認性を高めるため色のコントラストを強調します',
        cache: 'キャッシュ',
        cacheSize: 'キャッシュサイズ',
        autoClearCache: '自動クリア',
        autoClearCacheDesc: '定期的にキャッシュをクリアします',
        clearCacheNow: '今すぐキャッシュをクリア',
        confirmClearCache: 'キャッシュをクリアしてもよろしいですか？',
        cacheCleared: 'キャッシュをクリアしました',
        resetAllSettings: 'すべての設定をリセット',
        confirmResetSettings: 'すべての設定を初期値に戻します。よろしいですか？',
        settingsReset: '設定をリセットしました'
      }
    }
  }
})

// Mock store
const mockStore = {
  system: {
    notificationSound: true,
    notificationVibration: true,
    notificationEmail: false,
    enableAnimations: true,
    imageQuality: 'high',
    reducedMotion: false,
    offlineMode: false,
    dataSaver: false,
    autoDownloadUpdates: true,
    wifiOnlyDownloads: false,
    analyticsEnabled: true,
    crashReportingEnabled: true,
    locationPermission: false,
    fontSize: 'medium',
    highContrast: false,
    screenReaderOptimization: false,
    cacheSize: 100,
    autoClearCache: false,
    cacheClearInterval: 'monthly'
  },
  setNotificationSound: vi.fn(),
  setNotificationVibration: vi.fn(),
  setOfflineMode: vi.fn(),
  setDataSaver: vi.fn(),
  setFontSize: vi.fn(),
  setHighContrast: vi.fn(),
  setAnalyticsEnabled: vi.fn(),
  updateSystemSettings: vi.fn(),
  setCacheSettings: vi.fn(),
  clearCache: vi.fn(),
  resetSettings: vi.fn()
}

describe('SystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSettingsStore as any).mockReturnValue(mockStore)
    
    // window.confirm と window.alert のモック
    global.confirm = vi.fn(() => true)
    global.alert = vi.fn()
    
    // window.location.reload のモック
    delete (window as any).location
    window.location = { reload: vi.fn() } as any
  })

  it('コンポーネントが正しくレンダリングされる', () => {
    const wrapper = mount(SystemSettings, {
      global: {
        plugins: [i18n]
      }
    })

    // コンポーネントが存在することを確認
    expect(wrapper.exists()).toBe(true)
    // セクションが存在することを確認
    expect(wrapper.findAll('h3').length).toBeGreaterThan(0)
  })

  it('通知設定のトグルが動作する', async () => {
    const wrapper = mount(SystemSettings, {
      global: {
        plugins: [i18n]
      }
    })

    const toggles = wrapper.findAllComponents({ name: 'ToggleSwitch' })
    const notificationSoundToggle = toggles[0]
    
    await notificationSoundToggle.vm.$emit('update:checked', false)
    
    expect(mockStore.setNotificationSound).toHaveBeenCalledWith(false)
  })

  it('フォントサイズの変更が動作する', async () => {
    const wrapper = mount(SystemSettings, {
      global: {
        plugins: [i18n]
      }
    })

    const selects = wrapper.findAll('select')
    // フォントサイズのセレクトボックスを探す（2番目のselect）
    const fontSizeSelect = selects[1]
    await fontSizeSelect.setValue('large')
    
    expect(mockStore.setFontSize).toHaveBeenCalledWith('large')
  })

  it('キャッシュサイズの変更が動作する', async () => {
    const wrapper = mount(SystemSettings, {
      global: {
        plugins: [i18n]
      }
    })

    const cacheSlider = wrapper.find('input[type="range"]')
    await cacheSlider.setValue(200)
    
    expect(mockStore.setCacheSettings).toHaveBeenCalledWith({ cacheSize: '200' })
  })

  it('キャッシュクリアの確認ダイアログが表示される', async () => {
    const wrapper = mount(SystemSettings, {
      global: {
        plugins: [i18n]
      }
    })

    // キャッシュクリアボタンは最初の赤いボタン
    const redButtons = wrapper.findAll('button.bg-red-600')
    expect(redButtons.length).toBeGreaterThan(0)
    const clearCacheButton = redButtons[0]
    
    await clearCacheButton.trigger('click')
    
    expect(global.confirm).toHaveBeenCalledWith('settings.confirmClearCache')
    expect(mockStore.clearCache).toHaveBeenCalled()
    expect(global.alert).toHaveBeenCalledWith('settings.cacheCleared')
  })

  it('設定リセットの確認ダイアログが表示される', async () => {
    const wrapper = mount(SystemSettings, {
      global: {
        plugins: [i18n]
      }
    })

    // リセットボタンは赤い枠線のボタン
    const resetButtons = wrapper.findAll('button.border-red-600')
    expect(resetButtons.length).toBeGreaterThan(0)
    const resetButton = resetButtons[0]
    
    await resetButton.trigger('click')
    
    expect(global.confirm).toHaveBeenCalledWith('settings.confirmResetSettings')
    expect(mockStore.resetSettings).toHaveBeenCalled()
    expect(global.alert).toHaveBeenCalledWith('settings.settingsReset')
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('キャンセル時はキャッシュクリアが実行されない', async () => {
    global.confirm = vi.fn(() => false)
    
    const wrapper = mount(SystemSettings, {
      global: {
        plugins: [i18n]
      }
    })

    // キャッシュクリアボタンは最初の赤いボタン
    const redButtons = wrapper.findAll('button.bg-red-600')
    expect(redButtons.length).toBeGreaterThan(0)
    const clearCacheButton = redButtons[0]
    
    await clearCacheButton.trigger('click')
    
    expect(global.confirm).toHaveBeenCalled()
    expect(mockStore.clearCache).not.toHaveBeenCalled()
  })
})