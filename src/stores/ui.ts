import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', () => {
  // State
  const activeTab = ref(0)
  const isLoading = ref(false)
  const alerts = ref<Array<{ type: string; msg: string }>>([])
  const warningAlerts = ref<Array<{ type: string; msg: string }>>([])
  const dangerAlerts = ref<Array<{ type: string; msg: string }>>([])
  
  // Modal states
  const modalVisible = ref(false)
  const modalContent = ref<{ title: string; content: string } | null>(null)
  
  // Dropdown states
  const dropdownStates = ref({
    tableDepartureIsOpen: false,
    tableArrivalIsOpen: false,
    departureIsOpen: false,
    arrivalIsOpen: false
  })

  // Search mode
  const searchMode = ref<'departureTime' | 'arrivalTime'>('departureTime')
  
  // Theme state
  const theme = ref<'light' | 'dark' | 'system'>('system')
  const prefersDark = ref(false)
  
  // Initialize theme
  const initializeTheme = () => {
    // クライアントサイドでのみ実行
    if (process.client) {
      // LocalStorageから設定を読み込む
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
      if (savedTheme) {
        theme.value = savedTheme
      }
      
      // システムのダークモード設定を監視
      if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
        prefersDark.value = darkModeQuery.matches
        
        darkModeQuery.addEventListener('change', (e) => {
          prefersDark.value = e.matches
          applyTheme()
        })
      }
      
      applyTheme()
    }
  }
  
  // テーマを適用
  const applyTheme = () => {
    // クライアントサイドでのみ実行
    if (process.client) {
      const root = document.documentElement
      const isDark = theme.value === 'dark' || (theme.value === 'system' && prefersDark.value)
      
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }
  
  // テーマを設定
  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    theme.value = newTheme
    if (process.client) {
      localStorage.setItem('theme', newTheme)
    }
    applyTheme()
  }
  
  // 現在の実効テーマを取得
  const currentTheme = computed(() => {
    if (theme.value === 'system') {
      return prefersDark.value ? 'dark' : 'light'
    }
    return theme.value
  })
  
  // Actions
  const setActiveTab = (tabIndex: number) => {
    activeTab.value = tabIndex
  }

  const addAlert = (type: 'info' | 'warning' | 'danger', message: string) => {
    const alert = { type, msg: message }
    
    switch (type) {
      case 'warning':
        warningAlerts.value.push(alert)
        break
      case 'danger':
        dangerAlerts.value.push(alert)
        break
      default:
        alerts.value.push(alert)
    }
  }

  const closeAlert = (index: number, type: 'info' | 'warning' | 'danger' = 'info') => {
    switch (type) {
      case 'warning':
        warningAlerts.value.splice(index, 1)
        break
      case 'danger':
        dangerAlerts.value.splice(index, 1)
        break
      default:
        alerts.value.splice(index, 1)
    }
  }

  const clearAllAlerts = () => {
    alerts.value = []
    warningAlerts.value = []
    dangerAlerts.value = []
  }

  const showModal = (title: string, content: string) => {
    modalContent.value = { title, content }
    modalVisible.value = true
  }

  const hideModal = () => {
    modalVisible.value = false
    modalContent.value = null
  }

  const toggleDropdown = (dropdownName: keyof typeof dropdownStates.value) => {
    dropdownStates.value[dropdownName] = !dropdownStates.value[dropdownName]
  }

  const closeAllDropdowns = () => {
    Object.keys(dropdownStates.value).forEach(key => {
      dropdownStates.value[key as keyof typeof dropdownStates.value] = false
    })
  }

  const setSearchMode = (mode: 'departureTime' | 'arrivalTime') => {
    searchMode.value = mode
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  return {
    // State
    activeTab,
    isLoading,
    alerts,
    warningAlerts,
    dangerAlerts,
    modalVisible,
    modalContent,
    dropdownStates,
    searchMode,
    theme,
    currentTheme,
    
    // Actions
    setActiveTab,
    addAlert,
    closeAlert,
    clearAllAlerts,
    showModal,
    hideModal,
    toggleDropdown,
    closeAllDropdowns,
    setSearchMode,
    setLoading,
    initializeTheme,
    setTheme
  }
})