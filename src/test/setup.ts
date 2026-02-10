import { vi } from 'vitest'
import { ref, computed, reactive, readonly, onMounted, onUnmounted, watch, watchEffect, nextTick } from 'vue'

// Ensure Nuxt client flag is available during tests
if (typeof process !== 'undefined') {
  ;(process as any).client = true
  ;(process as any).server = false
}

// Vue Reactivity APIをグローバルに設定
global.ref = ref
global.computed = computed
global.reactive = reactive
global.readonly = readonly
global.onMounted = onMounted
global.onUnmounted = onUnmounted
global.watch = watch
global.watchEffect = watchEffect
global.nextTick = nextTick

// Nuxt auto-importsのモック
declare global {
  var definePageMeta: typeof vi.fn
  var useLocalePath: typeof vi.fn
  var useSwitchLocalePath: typeof vi.fn
  var navigateTo: typeof vi.fn
  var useRouter: typeof vi.fn
  var useRoute: typeof vi.fn
  var useI18n: typeof vi.fn
  var useNuxtApp: typeof vi.fn
  var useRuntimeConfig: typeof vi.fn
  var useState: typeof vi.fn
  var useFetch: typeof vi.fn
  var useAsyncData: typeof vi.fn
  var onMounted: typeof vi.fn
  var onUnmounted: typeof vi.fn
  var watch: typeof vi.fn
  var watchEffect: typeof vi.fn
  var nextTick: typeof vi.fn
  var useHead: typeof vi.fn
  var useHolidayCalendar: typeof vi.fn
  var useAuthStore: typeof vi.fn
  var useAdminFirestore: typeof vi.fn
  var useNews: typeof vi.fn
  var useFareDisplay: typeof vi.fn
  var useFareStore: typeof vi.fn
  var useAndroidNavigation: typeof vi.fn
}

// グローバル関数の定義
global.definePageMeta = vi.fn()
global.useLocalePath = vi.fn(() => (path: string) => path)
global.useSwitchLocalePath = vi.fn(() => (locale: string) => `/${locale}`)
global.navigateTo = vi.fn()
global.useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn()
}))
global.useRoute = vi.fn(() => ({
  path: '/',
  params: {},
  query: {}
}))
global.useI18n = vi.fn(() => ({
  locale: ref('ja'),
  locales: ref([
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' }
  ]),
  t: (key: string) => key
}))
const translate = (key: string) => {
  if (key === 'HOURS') {
    return '時間'
  }
  if (key === 'MINUTES') {
    return '分'
  }
  return key
}

global.useNuxtApp = vi.fn(() => ({
  $i18n: {
    locale: ref('ja'),
    t: translate
  },
  $t: translate
}))
global.useRuntimeConfig = vi.fn(() => ({
  public: {
    features: {
      calendar: false
    },
    firebase: {
      projectId: 'test-project',
      storageBucket: 'test-bucket'
    }
  }
}))
global.useState = vi.fn((key: string, init?: any) => {
  const state = ref(typeof init === 'function' ? init() : init)
  return state
})
global.useFetch = vi.fn()
global.useAsyncData = vi.fn()
global.useHead = vi.fn()
global.useHolidayCalendar = vi.fn(() => ({
  isLoading: ref(false),
  error: ref(null),
  currentMonth: ref(new Date()),
  holidays: ref([]),
  specialOperations: ref([]),
  calendarDays: ref([])
}))
global.useAuthStore = vi.fn(() => ({
  currentUser: ref(null),
  isAuthenticated: ref(false),
  isAdmin: ref(false),
  login: vi.fn(),
  logout: vi.fn(),
  setUser: vi.fn()
}))
global.useAdminFirestore = vi.fn(() => ({
  getCollection: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  batchWrite: vi.fn(),
  logAdminAction: vi.fn()
}))
global.useNews = vi.fn(() => ({
  news: ref([]),
  isLoading: ref(false),
  error: ref(null),
  publishedNews: computed(() => []),
  fetchNews: vi.fn(),
  getNewsById: vi.fn(),
  getCategoryLabel: vi.fn((category: string) => category),
  formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString('ja-JP'))
}))
global.useFareDisplay = vi.fn(() => ({
  formatCurrency: vi.fn((amount: number) => `¥${amount}`),
  getVehicleSizeName: vi.fn((size: string) => size),
  getFareTypeName: vi.fn((type: string) => type),
  getRouteFare: vi.fn(() => Promise.resolve(undefined)),
  getAllFares: vi.fn(() => Promise.resolve([]))
}))
global.useFareStore = vi.fn(() => ({
  fares: ref([]),
  isLoading: ref(false),
  error: ref(null),
  loadFareMaster: vi.fn(() => Promise.resolve()),
  getFareByRoute: vi.fn(),
  getRoutesByVesselType: vi.fn(() => [])
}))

global.useAndroidNavigation = vi.fn(() => ({
  isAndroid: ref(false),
  navigationBarHeight: ref(0)
}))

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}
global.localStorage = localStorageMock

// consoleのモック（エラーメッセージを抑制）
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn()
}
