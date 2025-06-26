import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import Calendar from '@/pages/calendar.vue'

// Mock i18n
const mockT = vi.fn((key: string) => key)

describe('calendar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    // Restore original mock after each test
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
    // Create a custom mock for this test
    global.useHolidayCalendar = vi.fn(() => ({
      loadHolidayData: vi.fn().mockResolvedValue(undefined),
      generateCalendarData: vi.fn().mockReturnValue([]),
      getHolidaysByMonth: vi.fn().mockReturnValue([]),
      formatDate: vi.fn((date: string) => '2025年1月1日 水曜日'),
      isHoliday: vi.fn().mockReturnValue(false),
      getHoliday: vi.fn().mockReturnValue(null),
      isPeakSeason: vi.fn().mockReturnValue(false),
      getPeakSeason: vi.fn().mockReturnValue(null),
      getSpecialOperations: vi.fn().mockReturnValue([]),
      isLoading: ref(true),
      error: ref(null),
      holidayMaster: ref(null)
    }))

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
    // Create a custom mock for this test
    global.useHolidayCalendar = vi.fn(() => ({
      loadHolidayData: vi.fn().mockResolvedValue(undefined),
      generateCalendarData: vi.fn().mockReturnValue([]),
      getHolidaysByMonth: vi.fn().mockReturnValue([]),
      formatDate: vi.fn((date: string) => '2025年1月1日 水曜日'),
      isHoliday: vi.fn().mockReturnValue(false),
      getHoliday: vi.fn().mockReturnValue(null),
      isPeakSeason: vi.fn().mockReturnValue(false),
      getPeakSeason: vi.fn().mockReturnValue(null),
      getSpecialOperations: vi.fn().mockReturnValue([]),
      isLoading: ref(false),
      error: ref('HOLIDAY_LOAD_ERROR'),
      holidayMaster: ref(null)
    }))

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
    // Create a custom mock with special operations for current month
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    
    global.useHolidayCalendar = vi.fn(() => ({
      loadHolidayData: vi.fn().mockResolvedValue(undefined),
      generateCalendarData: vi.fn().mockReturnValue([
        [null, null, null, { day: 1, date: `${currentYear}-${currentMonth}-01`, isHoliday: true, holiday: { date: `${currentYear}-${currentMonth}-01`, nameKey: 'HOLIDAY_NEW_YEAR', type: 'national' }, isPeakSeason: false, peakSeason: null, specialOperation: null, dayOfWeek: '水' }]
      ]),
      getHolidaysByMonth: vi.fn().mockReturnValue([
        { date: `${currentYear}-${currentMonth}-01`, nameKey: 'HOLIDAY_NEW_YEAR', type: 'national' }
      ]),
      formatDate: vi.fn((date: string) => '2025年1月1日 水曜日'),
      isHoliday: vi.fn().mockReturnValue(false),
      getHoliday: vi.fn().mockReturnValue(null),
      isPeakSeason: vi.fn().mockReturnValue(false),
      getPeakSeason: vi.fn().mockReturnValue(null),
      getSpecialOperations: vi.fn().mockReturnValue([]),
      isLoading: ref(false),
      error: ref(null),
      holidayMaster: ref({
        holidays: [
          { date: `${currentYear}-${currentMonth}-01`, nameKey: 'HOLIDAY_NEW_YEAR', type: 'national' }
        ],
        peakSeasons: [],
        specialOperations: [
          { date: `${currentYear}-${currentMonth}-01`, operationType: 'reduced', descriptionKey: 'OPERATION_NEW_YEAR' }
        ]
      })
    }))

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
    // Create a spy for generateCalendarData
    const mockGenerateCalendarData = vi.fn().mockReturnValue([
      [null, null, null, { day: 1, date: '2025-01-01', isHoliday: true, holiday: { date: '2025-01-01', nameKey: 'HOLIDAY_NEW_YEAR', type: 'national' }, isPeakSeason: true, peakSeason: { startDate: '2024-12-28', endDate: '2025-01-05', nameKey: 'PEAK_NEW_YEAR', surchargeRate: 1.2 }, specialOperation: { date: '2025-01-01', operationType: 'reduced', descriptionKey: 'OPERATION_NEW_YEAR' }, dayOfWeek: '水' }]
    ])
    
    const mockLoadHolidayData = vi.fn().mockResolvedValue(undefined)
    
    global.useHolidayCalendar = vi.fn(() => ({
      loadHolidayData: mockLoadHolidayData,
      generateCalendarData: mockGenerateCalendarData,
      getHolidaysByMonth: vi.fn().mockReturnValue([]),
      formatDate: vi.fn((date: string) => '2025年1月1日 水曜日'),
      isHoliday: vi.fn().mockReturnValue(false),
      getHoliday: vi.fn().mockReturnValue(null),
      isPeakSeason: vi.fn().mockReturnValue(false),
      getPeakSeason: vi.fn().mockReturnValue(null),
      getSpecialOperations: vi.fn().mockReturnValue([]),
      isLoading: ref(false),
      error: ref(null),
      holidayMaster: ref({
        holidays: [],
        peakSeasons: [],
        specialOperations: []
      })
    }))

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
    
    // Clear initial calls
    mockGenerateCalendarData.mockClear()
    mockLoadHolidayData.mockClear()
    
    // Test navigation
    await prevButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Verify that calendar update was triggered
    expect(mockLoadHolidayData).toHaveBeenCalled()
    expect(mockGenerateCalendarData).toHaveBeenCalled()
    
    // Clear calls again
    mockGenerateCalendarData.mockClear()
    mockLoadHolidayData.mockClear()
    
    await nextButton.trigger('click')
    await wrapper.vm.$nextTick()
    
    // Verify that calendar update was triggered again
    expect(mockLoadHolidayData).toHaveBeenCalled()
    expect(mockGenerateCalendarData).toHaveBeenCalled()
  })
})