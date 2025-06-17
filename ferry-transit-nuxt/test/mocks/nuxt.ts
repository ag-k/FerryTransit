import { vi } from 'vitest'
import { ref, computed, reactive, watch, watchEffect, onMounted, onUnmounted } from 'vue'

export const defineNuxtPlugin = vi.fn((plugin) => plugin)

export const useNuxtApp = vi.fn(() => ({
  $i18n: {
    t: vi.fn((key: string) => key),
    locale: ref('ja'),
    locales: ref([
      { code: 'ja', name: '日本語' },
      { code: 'en', name: 'English' }
    ]),
    setLocale: vi.fn()
  }
}))

export const useRoute = vi.fn(() => ({
  path: '/',
  params: {},
  query: {}
}))

export const useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn()
}))

export const navigateTo = vi.fn()
export const useHead = vi.fn()
export const useSwitchLocalePath = vi.fn(() => vi.fn((locale: string) => `/${locale}`))

export const useI18n = vi.fn(() => ({
  locale: ref('ja'),
  locales: ref([
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' }
  ]),
  t: vi.fn((key: string) => key)
}))

export const defineEventHandler = vi.fn((handler) => handler)
export const createError = vi.fn((error) => error)
export const setHeaders = vi.fn()
export const definePageMeta = vi.fn()

// Re-export Vue reactivity functions
export { ref, computed, reactive, watch, watchEffect, onMounted, onUnmounted }