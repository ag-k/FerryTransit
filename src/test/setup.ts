import { config } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref, computed, reactive, watch, watchEffect, onMounted, onUnmounted } from 'vue'

// Global type declarations for test environment
declare global {
  var useI18n: any
  var useRouter: any
  var useRoute: any
  var useNuxtApp: any
  var useRuntimeConfig: any
  var $fetch: any
  var useHolidayCalendar: any
  var useHead: any
}

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

// Mock useHolidayCalendar globally
global.useHolidayCalendar = () => {
  const mockHolidayMaster = {
    holidays: [
      {
        date: '2025-01-01',
        nameKey: 'HOLIDAY_NEW_YEAR',
        type: 'national'
      },
      {
        date: '2025-01-13',
        nameKey: 'HOLIDAY_COMING_OF_AGE',
        type: 'national'
      }
    ],
    peakSeasons: [
      {
        startDate: '2024-12-28',
        endDate: '2025-01-05',
        nameKey: 'PEAK_NEW_YEAR',
        surchargeRate: 1.2
      }
    ],
    specialOperations: [
      {
        date: '2025-01-01',
        operationType: 'reduced',
        descriptionKey: 'OPERATION_NEW_YEAR'
      }
    ]
  }
  
  const mockCalendarData = [
    [null, null, null, { day: 1, date: '2025-01-01', isHoliday: true, holiday: mockHolidayMaster.holidays[0], isPeakSeason: true, peakSeason: mockHolidayMaster.peakSeasons[0], specialOperation: mockHolidayMaster.specialOperations[0], dayOfWeek: '水' }, { day: 2, date: '2025-01-02', isHoliday: false, holiday: null, isPeakSeason: true, peakSeason: mockHolidayMaster.peakSeasons[0], specialOperation: null, dayOfWeek: '木' }, { day: 3, date: '2025-01-03', isHoliday: false, holiday: null, isPeakSeason: true, peakSeason: mockHolidayMaster.peakSeasons[0], specialOperation: null, dayOfWeek: '金' }, { day: 4, date: '2025-01-04', isHoliday: false, holiday: null, isPeakSeason: true, peakSeason: mockHolidayMaster.peakSeasons[0], specialOperation: null, dayOfWeek: '土' }]
  ]
  
  return {
    loadHolidayData: vi.fn().mockResolvedValue(undefined),
    generateCalendarData: vi.fn().mockReturnValue(mockCalendarData),
    getHolidaysByMonth: vi.fn().mockReturnValue(mockHolidayMaster.holidays),
    formatDate: vi.fn((date: string, format: string) => {
      if (format === 'long') {
        return '2025年1月1日 水曜日'
      }
      return '1月1日'
    }),
    isHoliday: vi.fn((date: string) => {
      return mockHolidayMaster.holidays.some(h => h.date === date)
    }),
    getHoliday: vi.fn((date: string) => {
      return mockHolidayMaster.holidays.find(h => h.date === date)
    }),
    isPeakSeason: vi.fn((date: string) => {
      return mockHolidayMaster.peakSeasons.some(p => 
        date >= p.startDate && date <= p.endDate
      )
    }),
    getPeakSeason: vi.fn((date: string) => {
      return mockHolidayMaster.peakSeasons.find(p => 
        date >= p.startDate && date <= p.endDate
      )
    }),
    getSpecialOperations: vi.fn((date: string) => {
      return mockHolidayMaster.specialOperations.filter(o => o.date === date)
    }),
    isLoading: ref(false),
    error: ref(null),
    holidayMaster: ref(mockHolidayMaster)
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

global.useI18n = () => ({
  locale: ref('ja'),
  locales: ref([
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' }
  ]),
  t: (key: string) => key
})

global.useRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn()
})

global.useRoute = () => ({
  path: '/',
  params: {},
  query: {}
})

global.useHead = vi.fn()

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
global.$fetch = vi.fn()

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