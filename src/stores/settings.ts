import { defineStore } from 'pinia'

interface SystemSettings {
  // 通知設定
  notificationSound: boolean
  notificationVibration: boolean
  notificationEmail: boolean
  
  // パフォーマンス設定
  enableAnimations: boolean
  imageQuality: 'low' | 'medium' | 'high'
  reducedMotion: boolean
  
  // ネットワーク設定
  offlineMode: boolean
  dataSaver: boolean
  autoDownloadUpdates: boolean
  wifiOnlyDownloads: boolean
  
  // プライバシー設定
  analyticsEnabled: boolean
  crashReportingEnabled: boolean
  locationPermission: boolean
  
  // アクセシビリティ設定
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  highContrast: boolean
  screenReaderOptimization: boolean
  
  // キャッシュ設定
  cacheSize: number // MB
  autoClearCache: boolean
  cacheClearInterval: 'daily' | 'weekly' | 'monthly' | 'never'
}

interface SettingsState {
  mapEnabled: boolean
  mapShowRoutes: boolean
  mapAutoCenter: boolean
  theme: 'light' | 'dark' | 'system'
  language: 'ja' | 'en'
  notifications: boolean
  autoUpdate: boolean
  system: SystemSettings
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    mapEnabled: true,
    mapShowRoutes: true,
    mapAutoCenter: true,
    theme: 'system',
    language: 'ja',
    notifications: true,
    autoUpdate: true,
    system: {
      // 通知設定
      notificationSound: true,
      notificationVibration: true,
      notificationEmail: false,
      
      // パフォーマンス設定
      enableAnimations: true,
      imageQuality: 'high',
      reducedMotion: false,
      
      // ネットワーク設定
      offlineMode: false,
      dataSaver: false,
      autoDownloadUpdates: true,
      wifiOnlyDownloads: false,
      
      // プライバシー設定
      analyticsEnabled: true,
      crashReportingEnabled: true,
      locationPermission: false,
      
      // アクセシビリティ設定
      fontSize: 'medium',
      highContrast: false,
      screenReaderOptimization: false,
      
      // キャッシュ設定
      cacheSize: 100, // MB
      autoClearCache: false,
      cacheClearInterval: 'monthly'
    }
  }),

  getters: {
    isMapEnabled: (state) => state.mapEnabled,
    currentTheme: (state) => state.theme,
    currentLanguage: (state) => state.language,
    areNotificationsEnabled: (state) => state.notifications,
    isAutoUpdateEnabled: (state) => state.autoUpdate,
    systemSettings: (state) => state.system,
    isOfflineMode: (state) => state.system.offlineMode,
    isDataSaverEnabled: (state) => state.system.dataSaver,
    currentFontSize: (state) => state.system.fontSize,
    isHighContrastEnabled: (state) => state.system.highContrast
  },

  actions: {
    setMapEnabled(enabled: boolean) {
      this.mapEnabled = enabled
      this.saveToLocalStorage()
    },

    setMapShowRoutes(show: boolean) {
      this.mapShowRoutes = show
      this.saveToLocalStorage()
    },

    setMapAutoCenter(auto: boolean) {
      this.mapAutoCenter = auto
      this.saveToLocalStorage()
    },

    setTheme(theme: 'light' | 'dark' | 'system') {
      this.theme = theme
      this.saveToLocalStorage()
    },

    setLanguage(language: 'ja' | 'en') {
      this.language = language
      this.saveToLocalStorage()
    },

    setNotifications(enabled: boolean) {
      this.notifications = enabled
      this.saveToLocalStorage()
    },

    setAutoUpdate(enabled: boolean) {
      this.autoUpdate = enabled
      this.saveToLocalStorage()
    },

    updateSystemSettings(settings: Partial<SystemSettings>) {
      this.system = { ...this.system, ...settings }
      this.saveToLocalStorage()
    },

    setNotificationSound(enabled: boolean) {
      this.system.notificationSound = enabled
      this.saveToLocalStorage()
    },

    setNotificationVibration(enabled: boolean) {
      this.system.notificationVibration = enabled
      this.saveToLocalStorage()
    },

    setOfflineMode(enabled: boolean) {
      this.system.offlineMode = enabled
      this.saveToLocalStorage()
    },

    setDataSaver(enabled: boolean) {
      this.system.dataSaver = enabled
      this.saveToLocalStorage()
    },

    setFontSize(size: 'small' | 'medium' | 'large' | 'extra-large') {
      this.system.fontSize = size
      this.saveToLocalStorage()
    },

    setHighContrast(enabled: boolean) {
      this.system.highContrast = enabled
      this.saveToLocalStorage()
    },

    setAnalyticsEnabled(enabled: boolean) {
      this.system.analyticsEnabled = enabled
      this.saveToLocalStorage()
    },

    setCacheSettings(settings: { cacheSize?: number; autoClearCache?: boolean; cacheClearInterval?: 'daily' | 'weekly' | 'monthly' | 'never' }) {
      this.system = { ...this.system, ...settings }
      this.saveToLocalStorage()
    },

    clearCache() {
      // キャッシュクリアの実装
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name)
          })
        })
      }
      localStorage.removeItem('ferryTransitCache')
      sessionStorage.clear()
    },

    loadFromLocalStorage() {
      const saved = localStorage.getItem('ferryTransitSettings')
      if (saved) {
        try {
          const settings = JSON.parse(saved)
          this.$patch(settings)
        } catch (error) {
          // 保存データの破損時は初期設定を維持
          if (process.env.NODE_ENV !== 'production') {
            /* eslint-disable-next-line no-console */
            console.error('Failed to load settings from localStorage', error)
          }
        }
      }
    },

    saveToLocalStorage() {
      try {
        localStorage.setItem('ferryTransitSettings', JSON.stringify(this.$state))
      } catch (error) {
        // ストレージ書き込みが失敗してもアプリ動作を継続
      }
    },

    resetSettings() {
      this.$reset()
      this.saveToLocalStorage()
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'ferryTransitSettings',
        storage: localStorage
      }
    ]
  }
})
