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

export const $fetch = vi.fn()

// Mock useHolidayCalendar
export const useHolidayCalendar = vi.fn(() => {
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
    specialOperations: [
      {
        date: '2025-01-01',
        operationType: 'reduced',
        descriptionKey: 'OPERATION_NEW_YEAR'
      }
    ]
  }
  
  const mockCalendarData = [
    [null, null, null, { day: 1, date: '2025-01-01', isHoliday: true, holiday: mockHolidayMaster.holidays[0], specialOperation: mockHolidayMaster.specialOperations[0], dayOfWeek: '水' }, { day: 2, date: '2025-01-02', isHoliday: false, holiday: null, specialOperation: null, dayOfWeek: '木' }, { day: 3, date: '2025-01-03', isHoliday: false, holiday: null, specialOperation: null, dayOfWeek: '金' }, { day: 4, date: '2025-01-04', isHoliday: false, holiday: null, specialOperation: null, dayOfWeek: '土' }]
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
    getSpecialOperations: vi.fn((date: string) => {
      return mockHolidayMaster.specialOperations.filter(o => o.date === date)
    }),
    isLoading: ref(false),
    error: ref(null as string | null),
    holidayMaster: ref(mockHolidayMaster)
  }
})

// Re-export Vue reactivity functions
export { ref, computed, reactive, watch, watchEffect, onMounted, onUnmounted }
