import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useHolidayCalendar } from '@/composables/useHolidayCalendar'
import type { HolidayMaster } from '@/types/holiday'

// Mock data
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

// Mock i18n
vi.stubGlobal('useI18n', () => ({
  locale: ref('ja')
}))

// Mock $fetch
vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockHolidayData))

describe('useHolidayCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads holiday data', async () => {
    const { loadHolidayData, holidayMaster, isLoading, error } = useHolidayCalendar()
    
    expect(holidayMaster.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    
    await loadHolidayData()
    
    expect(holidayMaster.value).toEqual(mockHolidayData)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('detects holidays correctly', async () => {
    const { loadHolidayData, isHoliday, getHoliday } = useHolidayCalendar()
    
    await loadHolidayData()
    
    expect(isHoliday('2025-01-01')).toBe(true)
    expect(isHoliday('2025-01-02')).toBe(false)
    expect(isHoliday(new Date('2025-05-05'))).toBe(true)
    
    const holiday = getHoliday('2025-01-01')
    expect(holiday).toBeDefined()
    expect(holiday?.nameKey).toBe('HOLIDAY_NEW_YEAR')
  })

  it('detects peak seasons correctly', async () => {
    const { loadHolidayData, isPeakSeason, getPeakSeason } = useHolidayCalendar()
    
    await loadHolidayData()
    
    expect(isPeakSeason('2025-01-01')).toBe(true)
    expect(isPeakSeason('2024-12-28')).toBe(true)
    expect(isPeakSeason('2025-01-05')).toBe(true)
    expect(isPeakSeason('2025-01-06')).toBe(false)
    
    const peakSeason = getPeakSeason('2025-01-01')
    expect(peakSeason).toBeDefined()
    expect(peakSeason?.surchargeRate).toBe(1.2)
  })

  it('gets special operations correctly', async () => {
    const { loadHolidayData, getSpecialOperation } = useHolidayCalendar()
    
    await loadHolidayData()
    
    const operation = getSpecialOperation('2025-01-01')
    expect(operation).toBeDefined()
    expect(operation?.operationType).toBe('reduced')
    expect(operation?.descriptionKey).toBe('OPERATION_NEW_YEAR')
    
    expect(getSpecialOperation('2025-01-02')).toBeUndefined()
  })

  it('formats day of week correctly', () => {
    const { getDayOfWeek } = useHolidayCalendar()
    
    // 2025-01-01 is Wednesday
    expect(getDayOfWeek('2025-01-01')).toBe('水')
    expect(getDayOfWeek(new Date('2025-01-01'))).toBe('水')
  })

  it('formats dates correctly', () => {
    const { formatDate } = useHolidayCalendar()
    
    const date = '2025-01-01'
    
    // Japanese short format
    expect(formatDate(date, 'short')).toContain('1月')
    expect(formatDate(date, 'short')).toContain('1日')
    
    // Japanese long format
    const longFormat = formatDate(date, 'long')
    expect(longFormat).toContain('2025年')
    expect(longFormat).toContain('1月')
    expect(longFormat).toContain('1日')
    expect(longFormat).toContain('水曜日')
  })

  it('gets holidays by month', async () => {
    const { loadHolidayData, getHolidaysByMonth } = useHolidayCalendar()
    
    await loadHolidayData()
    
    const januaryHolidays = getHolidaysByMonth(2025, 1)
    expect(januaryHolidays).toHaveLength(1)
    expect(januaryHolidays[0].nameKey).toBe('HOLIDAY_NEW_YEAR')
    
    const mayHolidays = getHolidaysByMonth(2025, 5)
    expect(mayHolidays).toHaveLength(1)
    expect(mayHolidays[0].nameKey).toBe('HOLIDAY_CHILDRENS_DAY')
    
    const juneHolidays = getHolidaysByMonth(2025, 6)
    expect(juneHolidays).toHaveLength(0)
  })

  it('generates calendar data correctly', async () => {
    const { loadHolidayData, generateCalendarData } = useHolidayCalendar()
    
    await loadHolidayData()
    
    const calendar = generateCalendarData(2025, 1)
    
    // January 2025 starts on Wednesday (index 3)
    expect(calendar[0][0]).toBeNull() // Sunday
    expect(calendar[0][1]).toBeNull() // Monday
    expect(calendar[0][2]).toBeNull() // Tuesday
    expect(calendar[0][3]).not.toBeNull() // Wednesday (1st)
    expect(calendar[0][3]?.day).toBe(1)
    expect(calendar[0][3]?.isHoliday).toBe(true)
    expect(calendar[0][3]?.isPeakSeason).toBe(true)
    expect(calendar[0][3]?.specialOperation).toBeDefined()
    
    // Check last day (31st is Friday)
    const lastWeek = calendar[calendar.length - 1]
    const friday = lastWeek[5]
    expect(friday?.day).toBe(31)
    expect(friday?.isHoliday).toBe(false)
  })

  it('handles errors correctly', async () => {
    const { loadHolidayData, error, isLoading } = useHolidayCalendar()
    
    // Mock fetch error
    vi.mocked($fetch).mockRejectedValueOnce(new Error('Network error'))
    
    await loadHolidayData()
    
    expect(error.value).toBe('HOLIDAY_LOAD_ERROR')
    expect(isLoading.value).toBe(false)
  })

  it('caches holiday data', async () => {
    const { loadHolidayData } = useHolidayCalendar()
    
    await loadHolidayData()
    expect($fetch).toHaveBeenCalledTimes(1)
    
    // Second call should not fetch again
    await loadHolidayData()
    expect($fetch).toHaveBeenCalledTimes(1)
  })
})