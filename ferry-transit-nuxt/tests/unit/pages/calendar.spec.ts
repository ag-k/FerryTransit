import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Calendar from '@/pages/calendar.vue'
import type { HolidayMaster } from '@/types/holiday'

// Mock i18n
const mockT = vi.fn((key: string) => key)
const mockI18n = {
  t: mockT,
  locale: { value: 'ja' }
}

// Mock holiday data
const mockHolidayMaster: HolidayMaster = {
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

// Mock useHolidayCalendar composable
const mockCalendarData = [
  [null, null, null, { day: 1, date: '2025-01-01', isHoliday: true, holiday: mockHolidayMaster.holidays[0], isPeakSeason: true, peakSeason: mockHolidayMaster.peakSeasons[0], specialOperation: mockHolidayMaster.specialOperations[0], dayOfWeek: '水' }, { day: 2, date: '2025-01-02', isHoliday: false, holiday: null, isPeakSeason: true, peakSeason: mockHolidayMaster.peakSeasons[0], specialOperation: null, dayOfWeek: '木' }, { day: 3, date: '2025-01-03', isHoliday: false, holiday: null, isPeakSeason: true, peakSeason: mockHolidayMaster.peakSeasons[0], specialOperation: null, dayOfWeek: '金' }, { day: 4, date: '2025-01-04', isHoliday: false, holiday: null, isPeakSeason: true, peakSeason: mockHolidayMaster.peakSeasons[0], specialOperation: null, dayOfWeek: '土' }]
]

vi.stubGlobal('useHolidayCalendar', vi.fn(() => ({
  loadHolidayData: vi.fn().mockResolvedValue(undefined),
  generateCalendarData: vi.fn().mockReturnValue(mockCalendarData),
  getHolidaysByMonth: vi.fn().mockReturnValue(mockHolidayMaster.holidays),
  formatDate: vi.fn((date: string, format: string) => {
    if (format === 'long') {
      return '2025年1月1日 水曜日'
    }
    return '1月1日'
  }),
  isLoading: ref(false),
  error: ref(null),
  holidayMaster: ref(mockHolidayMaster)
})))

// Mock useI18n
vi.stubGlobal('useI18n', vi.fn(() => ({
  locale: ref('ja')
})))

// Mock useHead and useNuxtApp
vi.stubGlobal('useHead', vi.fn())
vi.stubGlobal('useNuxtApp', vi.fn(() => ({
  $i18n: mockI18n
})))

describe('calendar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders calendar page', async () => {
    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        },
        stubs: {
          NuxtLink: true
        }
      }
    })

    expect(wrapper.find('h2').text()).toBe('CALENDAR')
  })

  it('displays month navigation', async () => {
    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    await wrapper.vm.$nextTick()

    // Check month display
    const monthDisplay = wrapper.find('h3')
    expect(monthDisplay.exists()).toBe(true)
    
    // Check navigation buttons
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('shows loading state', async () => {
    const mockUseHolidayCalendar = vi.fn(() => ({
      loadHolidayData: vi.fn(),
      generateCalendarData: vi.fn(),
      getHolidaysByMonth: vi.fn(),
      formatDate: vi.fn(),
      isLoading: ref(true),
      error: ref(null),
      holidayMaster: ref(null)
    }))
    
    vi.stubGlobal('useHolidayCalendar', mockUseHolidayCalendar)

    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.text()).toContain('LOADING')
  })

  it('shows error state', async () => {
    const mockUseHolidayCalendar = vi.fn(() => ({
      loadHolidayData: vi.fn(),
      generateCalendarData: vi.fn(),
      getHolidaysByMonth: vi.fn(),
      formatDate: vi.fn(),
      isLoading: ref(false),
      error: ref('HOLIDAY_LOAD_ERROR'),
      holidayMaster: ref(null)
    }))
    
    vi.stubGlobal('useHolidayCalendar', mockUseHolidayCalendar)

    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('[role="alert"]').text()).toBe('HOLIDAY_LOAD_ERROR')
  })

  it('displays calendar grid', async () => {
    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check table structure
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.find('thead').exists()).toBe(true)
    expect(wrapper.find('tbody').exists()).toBe(true)
    
    // Check weekday headers
    const headers = wrapper.findAll('th')
    expect(headers.length).toBe(7)
    expect(headers[0].text()).toBe('日')
  })

  it('displays holidays and special operations', async () => {
    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check holiday display
    expect(wrapper.text()).toContain('HOLIDAY_NEW_YEAR')
    expect(wrapper.text()).toContain('PEAK_NEW_YEAR')
    expect(wrapper.text()).toContain('REDUCED_OPERATION')
  })

  it('displays legend', async () => {
    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check legend items
    expect(wrapper.text()).toContain('HOLIDAY')
    expect(wrapper.text()).toContain('PEAK_SEASON_NOTICE')
    expect(wrapper.text()).toContain('SPECIAL_OPERATION')
  })

  it('displays monthly summaries', async () => {
    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check holidays list
    expect(wrapper.text()).toContain('HOLIDAYS_THIS_MONTH')
    
    // Check special operations list
    expect(wrapper.text()).toContain('SPECIAL_OPERATIONS_THIS_MONTH')
  })

  it('navigates between months', async () => {
    const wrapper = mount(Calendar, {
      global: {
        mocks: {
          $t: mockT
        }
      }
    })

    await wrapper.vm.$nextTick()
    
    const buttons = wrapper.findAll('button')
    const prevButton = buttons[0]
    const nextButton = buttons[1]
    
    // Test navigation
    await prevButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    await nextButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Verify that calendar updates were called
    expect(useHolidayCalendar().generateCalendarData).toHaveBeenCalled()
  })
})