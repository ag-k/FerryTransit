import { defineStore } from 'pinia'


interface SettingsState {
  mapEnabled: boolean
  mapShowRoutes: boolean
  mapAutoCenter: boolean
  theme: 'light' | 'dark' | 'system'
  language: 'ja' | 'en'
  notifications: boolean
  autoUpdate: boolean
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
  }),

  getters: {
    isMapEnabled: (state) => state.mapEnabled,
    currentTheme: (state) => state.theme,
    currentLanguage: (state) => state.language,
    areNotificationsEnabled: (state) => state.notifications,
    isAutoUpdateEnabled: (state) => state.autoUpdate,
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
