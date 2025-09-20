import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import Calendar from '@/pages/calendar.vue'

const mockT = vi.fn((key: string) => key)

const mockRuntimeConfig = (calendarEnabled: boolean) => {
  global.useRuntimeConfig = vi.fn(() => ({
    public: {
      features: {
        calendar: calendarEnabled
      },
      firebase: {
        projectId: 'test-project',
        storageBucket: 'test-bucket'
      }
    }
  }))
}

const setupDefaultHolidayComposable = () => {
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
    [
      null,
      null,
      null,
      {
        day: 1,
        date: '2025-01-01',
        isHoliday: true,
        holiday: mockHolidayMaster.holidays[0],
        isPeakSeason: true,
        peakSeason: mockHolidayMaster.peakSeasons[0],
        specialOperation: mockHolidayMaster.specialOperations[0],
        dayOfWeek: '水'
      },
      {
        day: 2,
        date: '2025-01-02',
        isHoliday: false,
        holiday: null,
        isPeakSeason: true,
        peakSeason: mockHolidayMaster.peakSeasons[0],
        specialOperation: null,
        dayOfWeek: '木'
      },
      {
        day: 3,
        date: '2025-01-03',
        isHoliday: false,
        holiday: null,
        isPeakSeason: true,
        peakSeason: mockHolidayMaster.peakSeasons[0],
        specialOperation: null,
        dayOfWeek: '金'
      },
      {
        day: 4,
        date: '2025-01-04',
        isHoliday: false,
        holiday: null,
        isPeakSeason: true,
        peakSeason: mockHolidayMaster.peakSeasons[0],
        specialOperation: null,
        dayOfWeek: '土'
      }
    ]
  ]

  global.useHolidayCalendar = vi.fn(() => ({
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
      return mockHolidayMaster.peakSeasons.some(p => date >= p.startDate && date <= p.endDate)
    }),
    getPeakSeason: vi.fn((date: string) => {
      return mockHolidayMaster.peakSeasons.find(p => date >= p.startDate && date <= p.endDate)
    }),
    getSpecialOperations: vi.fn((date: string) => {
      return mockHolidayMaster.specialOperations.filter(o => o.date === date)
    }),
    isLoading: ref(false),
    error: ref(null),
    holidayMaster: ref(mockHolidayMaster)
  }))
}

describe('calendar.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRuntimeConfig(false)
    setupDefaultHolidayComposable()
  })

  describe('calendar feature disabled', () => {
    it('renders unavailable message instead of calendar', () => {
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

      expect(wrapper.find('h2').text()).toBe('CALENDAR_UNAVAILABLE_TITLE')
      expect(wrapper.text()).toContain('CALENDAR_UNAVAILABLE_MESSAGE')
      expect(wrapper.find('table').exists()).toBe(false)
    })

    it('does not attempt to load calendar data', () => {
      const loadHolidayData = vi.fn().mockResolvedValue(undefined)
      global.useHolidayCalendar = vi.fn(() => ({
        loadHolidayData,
        generateCalendarData: vi.fn(),
        getHolidaysByMonth: vi.fn(),
        formatDate: vi.fn(),
        isHoliday: vi.fn(),
        getHoliday: vi.fn(),
        isPeakSeason: vi.fn(),
        getPeakSeason: vi.fn(),
        getSpecialOperations: vi.fn(),
        isLoading: ref(false),
        error: ref(null),
        holidayMaster: ref(null)
      }))

      mount(Calendar, {
        global: {
          mocks: {
            $t: mockT
          }
        }
      })

      expect(loadHolidayData).not.toHaveBeenCalled()
    })
  })

  describe('calendar feature enabled', () => {
    beforeEach(() => {
      mockRuntimeConfig(true)
      setupDefaultHolidayComposable()
    })

    it('renders calendar page', () => {
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

      const monthDisplay = wrapper.find('h3')
      expect(monthDisplay.exists()).toBe(true)

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('shows loading state', () => {
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

    it('shows error state', () => {
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

      expect(wrapper.find('table').exists()).toBe(true)
      expect(wrapper.find('thead').exists()).toBe(true)
      expect(wrapper.find('tbody').exists()).toBe(true)

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

      expect(wrapper.text()).toContain('HOLIDAY')
      expect(wrapper.text()).toContain('PEAK_SEASON_NOTICE')
      expect(wrapper.text()).toContain('SPECIAL_OPERATION')
    })

    it('displays monthly summaries', async () => {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0')

      global.useHolidayCalendar = vi.fn(() => ({
        loadHolidayData: vi.fn().mockResolvedValue(undefined),
        generateCalendarData: vi.fn().mockReturnValue([
          [
            null,
            null,
            null,
            {
              day: 1,
              date: `${currentYear}-${currentMonth}-01`,
              isHoliday: true,
              holiday: { date: `${currentYear}-${currentMonth}-01`, nameKey: 'HOLIDAY_NEW_YEAR', type: 'national' },
              isPeakSeason: false,
              peakSeason: null,
              specialOperation: null,
              dayOfWeek: '水'
            }
          ]
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

      expect(wrapper.text()).toContain('HOLIDAYS_THIS_MONTH')
      expect(wrapper.text()).toContain('SPECIAL_OPERATIONS_THIS_MONTH')
    })

    it('navigates between months', async () => {
      const mockGenerateCalendarData = vi.fn().mockReturnValue([
        [
          null,
          null,
          null,
          {
            day: 1,
            date: '2025-01-01',
            isHoliday: true,
            holiday: { date: '2025-01-01', nameKey: 'HOLIDAY_NEW_YEAR', type: 'national' },
            isPeakSeason: true,
            peakSeason: { startDate: '2024-12-28', endDate: '2025-01-05', nameKey: 'PEAK_NEW_YEAR', surchargeRate: 1.2 },
            specialOperation: { date: '2025-01-01', operationType: 'reduced', descriptionKey: 'OPERATION_NEW_YEAR' },
            dayOfWeek: '水'
          }
        ]
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

      mockGenerateCalendarData.mockClear()
      mockLoadHolidayData.mockClear()

      await prevButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockLoadHolidayData).toHaveBeenCalled()
      expect(mockGenerateCalendarData).toHaveBeenCalled()

      mockGenerateCalendarData.mockClear()
      mockLoadHolidayData.mockClear()

      await nextButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockLoadHolidayData).toHaveBeenCalled()
      expect(mockGenerateCalendarData).toHaveBeenCalled()
    })
  })
})
