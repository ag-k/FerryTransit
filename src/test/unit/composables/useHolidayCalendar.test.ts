import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useOfflineStore } from '@/stores/offline'
import type { HolidayMaster } from '@/types/holiday'
import { useHolidayCalendar } from '../../../composables/useHolidayCalendar'

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}))

vi.mock('~/utils/logger', () => ({
  createLogger: () => loggerMock
}))

const mockHolidayData: HolidayMaster = {
  holidays: [
    {
      date: '2025-01-01',
      nameKey: 'HOLIDAY_NEW_YEAR',
      type: 'national'
    },
    {
      date: '2025-05-05',
      nameKey: 'HOLIDAY_CHILDRENS_DAY',
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

const setI18nLocale = (locale: 'ja' | 'en') => {
  vi.stubGlobal('useI18n', () => ({
    locale: ref(locale),
    locales: ref([
      { code: 'ja', name: '日本語' },
      { code: 'en', name: 'English' }
    ]),
    t: (key: string) => key
  }))
}

const stubHolidayFetch = (data: HolidayMaster | null) => {
  const offlineStore = useOfflineStore()
  return vi.spyOn(offlineStore, 'fetchHolidayData').mockResolvedValue(data)
}

describe('useHolidayCalendar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setI18nLocale('ja')
  })

  it('loads holiday data from the offline store', async () => {
    const fetchHolidayData = stubHolidayFetch(mockHolidayData)
    const { loadHolidayData, holidayMaster, isLoading, error } = useHolidayCalendar()

    expect(holidayMaster.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()

    await loadHolidayData()

    expect(fetchHolidayData).toHaveBeenCalledTimes(1)
    expect(holidayMaster.value).toEqual(mockHolidayData)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('detects holidays and returns holiday details after data is loaded', async () => {
    stubHolidayFetch(mockHolidayData)
    const { loadHolidayData, isHoliday, getHoliday } = useHolidayCalendar()

    expect(isHoliday('2025-01-01')).toBe(false)
    expect(getHoliday('2025-01-01')).toBeUndefined()

    await loadHolidayData()

    expect(isHoliday('2025-01-01')).toBe(true)
    expect(isHoliday('2025-01-02')).toBe(false)
    expect(isHoliday(new Date('2025-05-05T00:00:00.000Z'))).toBe(true)

    const holiday = getHoliday('2025-01-01')
    expect(holiday).toEqual({
      date: '2025-01-01',
      nameKey: 'HOLIDAY_NEW_YEAR',
      type: 'national'
    })
  })

  it('returns special operation information for matching dates', async () => {
    stubHolidayFetch(mockHolidayData)
    const { loadHolidayData, getSpecialOperation } = useHolidayCalendar()

    expect(getSpecialOperation('2025-01-01')).toBeUndefined()

    await loadHolidayData()

    expect(getSpecialOperation('2025-01-01')).toEqual({
      date: '2025-01-01',
      operationType: 'reduced',
      descriptionKey: 'OPERATION_NEW_YEAR'
    })
    expect(getSpecialOperation('2025-01-02')).toBeUndefined()
  })

  it('formats day names using the active locale', () => {
    const japaneseCalendar = useHolidayCalendar()

    expect(japaneseCalendar.getDayOfWeek('2025-01-01')).toBe('水')
    expect(japaneseCalendar.getDayOfWeek(new Date('2025-01-05T00:00:00.000Z'))).toBe('日')

    setI18nLocale('en')
    const englishCalendar = useHolidayCalendar()

    expect(englishCalendar.getDayOfWeek('2025-01-01')).toBe('Wed')
    expect(englishCalendar.getDayOfWeek('2025-01-05')).toBe('Sun')
  })

  it('formats dates using localized short and long formats', () => {
    const { formatDate } = useHolidayCalendar()

    expect(formatDate('2025-01-01', 'short')).toContain('1月')
    expect(formatDate('2025-01-01', 'short')).toContain('1日')

    const longFormat = formatDate('2025-01-01', 'long')
    expect(longFormat).toContain('2025年')
    expect(longFormat).toContain('1月')
    expect(longFormat).toContain('1日')
    expect(longFormat).toContain('水曜日')

    setI18nLocale('en')
    expect(useHolidayCalendar().formatDate('2025-01-01', 'long')).toContain('Wednesday')
  })

  it('returns holidays for a requested month', async () => {
    stubHolidayFetch(mockHolidayData)
    const { loadHolidayData, getHolidaysByMonth } = useHolidayCalendar()

    expect(getHolidaysByMonth(2025, 1)).toEqual([])

    await loadHolidayData()

    expect(getHolidaysByMonth(2025, 1)).toEqual([mockHolidayData.holidays[0]])
    expect(getHolidaysByMonth(2025, 5)).toEqual([mockHolidayData.holidays[1]])
    expect(getHolidaysByMonth(2025, 6)).toEqual([])
  })

  it('generates month calendar data with holiday and special operation details', async () => {
    stubHolidayFetch(mockHolidayData)
    const { loadHolidayData, generateCalendarData } = useHolidayCalendar()

    await loadHolidayData()

    const calendar = generateCalendarData(2025, 1)
    const firstWeek = calendar[0]
    const lastWeek = calendar[4]

    expect(calendar).toHaveLength(5)
    expect(firstWeek).toBeDefined()
    expect(lastWeek).toBeDefined()

    if (!firstWeek || !lastWeek) {
      throw new Error('Expected January 2025 calendar to contain first and last weeks')
    }

    expect(firstWeek[0]).toBeNull()
    expect(firstWeek[1]).toBeNull()
    expect(firstWeek[2]).toBeNull()
    expect(firstWeek[3]).toMatchObject({
      day: 1,
      date: '2025-01-01',
      isHoliday: true,
      holiday: mockHolidayData.holidays[0],
      specialOperation: mockHolidayData.specialOperations[0],
      dayOfWeek: '水'
    })

    expect(lastWeek[5]).toMatchObject({
      day: 31,
      date: '2025-01-31',
      isHoliday: false,
      holiday: undefined,
      specialOperation: undefined,
      dayOfWeek: '金'
    })
    expect(lastWeek[6]).toBeNull()
  })

  it('sets an error when holiday data is unavailable', async () => {
    const fetchHolidayData = stubHolidayFetch(null)
    const { loadHolidayData, holidayMaster, error, isLoading } = useHolidayCalendar()

    await loadHolidayData()

    expect(fetchHolidayData).toHaveBeenCalledTimes(1)
    expect(holidayMaster.value).toBeNull()
    expect(error.value).toBe('HOLIDAY_LOAD_ERROR')
    expect(isLoading.value).toBe(false)
  })

  it('sets an error and logs when the offline store rejects', async () => {
    const offlineStore = useOfflineStore()
    const fetchError = new Error('Network error')
    vi.spyOn(offlineStore, 'fetchHolidayData').mockRejectedValue(fetchError)
    const { loadHolidayData, error, isLoading } = useHolidayCalendar()

    await loadHolidayData()

    expect(error.value).toBe('HOLIDAY_LOAD_ERROR')
    expect(isLoading.value).toBe(false)
    expect(loggerMock.error).toHaveBeenCalledWith('Failed to load holiday data', fetchError)
  })

  it('does not fetch holiday data again once loaded', async () => {
    const fetchHolidayData = stubHolidayFetch(mockHolidayData)
    const { loadHolidayData } = useHolidayCalendar()

    await loadHolidayData()
    await loadHolidayData()

    expect(fetchHolidayData).toHaveBeenCalledTimes(1)
  })
})
