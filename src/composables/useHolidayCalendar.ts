import { readonly } from 'vue'
import type { Holiday, PeakSeason, SpecialOperation, HolidayMaster } from '@/types/holiday'
import { useOfflineStore } from '@/stores/offline'
import { createLogger } from '~/utils/logger'

export const useHolidayCalendar = () => {
  const { locale } = useI18n()
  const logger = createLogger('useHolidayCalendar')
  
  // 祝日データ
  const holidayMaster = ref<HolidayMaster | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 祝日データの読み込み
  const loadHolidayData = async () => {
    if (holidayMaster.value) return

    isLoading.value = true
    error.value = null

    try {
      // オフラインストアを使用
      const offlineStore = useOfflineStore()
      const data = await offlineStore.fetchHolidayData()
      
      if (data) {
        holidayMaster.value = data
      } else {
        error.value = 'HOLIDAY_LOAD_ERROR'
      }
    } catch (e) {
      logger.error('Failed to load holiday data', e)
      error.value = 'HOLIDAY_LOAD_ERROR'
    } finally {
      isLoading.value = false
    }
  }

  // 日付が祝日かどうか判定
  const isHoliday = (date: string | Date): boolean => {
    if (!holidayMaster.value) return false
    
    const dateStr = typeof date === 'string' 
      ? date 
      : date.toISOString().split('T')[0]
    
    return holidayMaster.value.holidays.some(h => h.date === dateStr)
  }

  // 祝日情報を取得
  const getHoliday = (date: string | Date): Holiday | undefined => {
    if (!holidayMaster.value) return undefined
    
    const dateStr = typeof date === 'string' 
      ? date 
      : date.toISOString().split('T')[0]
    
    return holidayMaster.value.holidays.find(h => h.date === dateStr)
  }

  // 繁忙期かどうか判定
  const isPeakSeason = (date: string | Date): boolean => {
    if (!holidayMaster.value) return false
    
    const dateStr = typeof date === 'string' 
      ? date 
      : date.toISOString().split('T')[0]
    
    return holidayMaster.value.peakSeasons.some(season => {
      return dateStr >= season.startDate && dateStr <= season.endDate
    })
  }

  // 繁忙期情報を取得
  const getPeakSeason = (date: string | Date): PeakSeason | undefined => {
    if (!holidayMaster.value) return undefined
    
    const dateStr = typeof date === 'string' 
      ? date 
      : date.toISOString().split('T')[0]
    
    return holidayMaster.value.peakSeasons.find(season => {
      return dateStr >= season.startDate && dateStr <= season.endDate
    })
  }

  // 特別運航情報を取得
  const getSpecialOperation = (date: string | Date): SpecialOperation | undefined => {
    if (!holidayMaster.value) return undefined
    
    const dateStr = typeof date === 'string' 
      ? date 
      : date.toISOString().split('T')[0]
    
    return holidayMaster.value.specialOperations.find(op => op.date === dateStr)
  }

  // 曜日を取得（日本語・英語対応）
  const getDayOfWeek = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const dayIndex = dateObj.getDay()
    
    const dayNames = {
      ja: ['日', '月', '火', '水', '木', '金', '土'],
      en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    }
    
    return dayNames[locale.value as 'ja' | 'en']?.[dayIndex] || dayNames.en[dayIndex]
  }

  // 日付のフォーマット（国際化対応）
  const formatDate = (date: string | Date, format: 'short' | 'long' = 'short'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (locale.value === 'ja') {
      const options = format === 'short'
        ? { month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
      return new Intl.DateTimeFormat('ja-JP', options).format(dateObj)
    }

    const options = format === 'short'
      ? { month: 'short', day: 'numeric' }
      : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return new Intl.DateTimeFormat('en-US', options).format(dateObj)
  }

  // 月の祝日一覧を取得
  const getHolidaysByMonth = (year: number, month: number): Holiday[] => {
    if (!holidayMaster.value) return []
    
    const monthStr = month.toString().padStart(2, '0')
    const yearMonthPrefix = `${year}-${monthStr}`
    
    return holidayMaster.value.holidays.filter(h => h.date.startsWith(yearMonthPrefix))
  }

  // カレンダー用のデータを生成
  const generateCalendarData = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    
    const calendar = []
    let week = []
    
    // 前月の日付で埋める
    for (let i = 0; i < startDayOfWeek; i++) {
      week.push(null)
    }
    
    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      const holiday = getHoliday(date)
      const peakSeason = getPeakSeason(date)
      const specialOperation = getSpecialOperation(date)
      
      week.push({
        day,
        date,
        isHoliday: !!holiday,
        holiday,
        isPeakSeason: !!peakSeason,
        peakSeason,
        specialOperation,
        dayOfWeek: getDayOfWeek(date)
      })
      
      if (week.length === 7) {
        calendar.push(week)
        week = []
      }
    }
    
    // 最後の週を埋める
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null)
      }
      calendar.push(week)
    }
    
    return calendar
  }

  return {
    holidayMaster: readonly(holidayMaster),
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadHolidayData,
    isHoliday,
    getHoliday,
    isPeakSeason,
    getPeakSeason,
    getSpecialOperation,
    getDayOfWeek,
    formatDate,
    getHolidaysByMonth,
    generateCalendarData
  }
}
