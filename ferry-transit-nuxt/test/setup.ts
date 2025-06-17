import { config } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref, computed, reactive, watch, watchEffect, onMounted, onUnmounted } from 'vue'

// Make Vue reactivity functions global
global.ref = ref
global.computed = computed
global.reactive = reactive
global.watch = watch
global.watchEffect = watchEffect
global.onMounted = onMounted
global.onUnmounted = onUnmounted

// Mock i18n
config.global.mocks = {
  $t: (key: string) => key,
  $i18n: {
    t: (key: string) => key,
    locale: ref('ja')
  }
}

// Make composables global
global.useNuxtApp = () => ({
  $i18n: {
    t: (key: string) => key,
    locale: ref('ja'),
    locales: ref([
      { code: 'ja', name: '日本語' },
      { code: 'en', name: 'English' }
    ])
  }
})

global.useRuntimeConfig = () => ({
  public: {
    apiBase: 'https://test.com',
    shipStatusApi: 'https://ship.test.com',
    googleMapsApiKey: 'test-key'
  }
})

// Mock Nuxt auto-imports
vi.mock('#app', () => ({
  defineNuxtPlugin: vi.fn((plugin) => plugin),
  useNuxtApp: vi.fn(() => ({
    $i18n: {
      t: vi.fn((key: string) => key),
      locale: ref('ja'),
      locales: ref([
        { code: 'ja', name: '日本語' },
        { code: 'en', name: 'English' }
      ])
    }
  })),
  useRoute: vi.fn(() => ({
    path: '/',
    params: {},
    query: {}
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  })),
  navigateTo: vi.fn(),
  useHead: vi.fn(),
  useSwitchLocalePath: vi.fn(() => vi.fn((locale: string) => `/${locale}`)),
  useI18n: vi.fn(() => ({
    locale: ref('ja'),
    locales: ref([
      { code: 'ja', name: '日本語' },
      { code: 'en', name: 'English' }
    ]),
    t: vi.fn((key: string) => key)
  })),
  defineEventHandler: vi.fn((handler) => handler),
  createError: vi.fn((error) => error),
  setHeaders: vi.fn(),
  ref: vi.fn((value) => ({ value })),
  computed: vi.fn((fn) => ({ value: fn() })),
  reactive: vi.fn((obj) => obj),
  watch: vi.fn(),
  watchEffect: vi.fn(),
  onMounted: vi.fn(),
  onUnmounted: vi.fn(),
  definePageMeta: vi.fn()
}))

// Global test utilities
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock as any

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})