<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <h2 class="text-2xl font-semibold mb-6">{{ $t('CALENDAR') }}</h2>

    <!-- Month navigation -->
    <div class="flex items-center justify-between mb-6">
      <button
        class="p-2 rounded hover:bg-gray-100 transition-colors"
        @click="previousMonth"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>
      
      <h3 class="text-xl font-medium">
        {{ formatMonth(currentYear, currentMonth) }}
      </h3>
      
      <button
        class="p-2 rounded hover:bg-gray-100 transition-colors"
        @click="nextMonth"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">{{ $t('LOADING') }}...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
      {{ $t(error) }}
    </div>

    <!-- Calendar -->
    <div v-else>
      <!-- Legend -->
      <div class="mb-4 flex flex-wrap gap-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>{{ $t('HOLIDAY') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>{{ $t('PEAK_SEASON_NOTICE') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span>{{ $t('SPECIAL_OPERATION') }}</span>
        </div>
      </div>

      <!-- Calendar grid -->
      <div class="border rounded-lg overflow-hidden">
        <table class="w-full table-fixed">
          <colgroup>
            <col v-for="i in 7" :key="i" class="w-full" style="width: 14.285714%;">
          </colgroup>
          <thead>
            <tr class="bg-gray-100">
              <th v-for="day in weekDays" :key="day" 
                  class="border border-gray-300 px-2 py-3 text-center font-medium"
                  :class="{ 'text-red-600': day === weekDays[0] }">
                {{ day }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(week, weekIndex) in calendarData" :key="weekIndex">
              <td v-for="(day, dayIndex) in week" :key="dayIndex"
                  class="border border-gray-300 p-0 h-24 align-top relative"
                  :class="getCellClass(day)">
                <div v-if="day" class="p-2 h-full overflow-hidden">
                  <div class="font-medium mb-1">{{ day.day }}</div>
                  
                  <!-- Holiday name -->
                  <div v-if="day.holiday" class="text-xs text-red-600 mb-1 leading-tight">
                    {{ $t(day.holiday.nameKey) }}
                  </div>
                  
                  <!-- Peak season indicator -->
                  <div v-if="day.isPeakSeason" class="text-xs text-yellow-700 mb-1 leading-tight">
                    {{ $t(day.peakSeason.nameKey) }}
                  </div>
                  
                  <!-- Special operation -->
                  <div v-if="day.specialOperation" class="text-xs text-blue-700 leading-tight">
                    <span v-if="day.specialOperation.operationType === 'reduced'">
                      {{ $t('REDUCED_OPERATION') }}
                    </span>
                    <span v-else-if="day.specialOperation.operationType === 'extra'">
                      {{ $t('EXTRA_OPERATION') }}
                    </span>
                    <span v-else-if="day.specialOperation.operationType === 'cancelled'">
                      {{ $t('CANCELLED_OPERATION') }}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Month's holidays list -->
      <div v-if="monthHolidays.length > 0" class="mt-8">
        <h4 class="text-lg font-medium mb-4">{{ $t('HOLIDAYS_THIS_MONTH') }}</h4>
        <div class="grid md:grid-cols-2 gap-4">
          <div v-for="holiday in monthHolidays" :key="holiday.date" 
               class="border border-gray-200 rounded-lg p-4">
            <div class="font-medium">{{ formatDate(holiday.date, 'long') }}</div>
            <div class="text-gray-600">{{ $t(holiday.nameKey) }}</div>
          </div>
        </div>
      </div>

      <!-- Special operations list -->
      <div v-if="monthSpecialOperations.length > 0" class="mt-8">
        <h4 class="text-lg font-medium mb-4">{{ $t('SPECIAL_OPERATIONS_THIS_MONTH') }}</h4>
        <div class="space-y-2">
          <div v-for="op in monthSpecialOperations" :key="op.date" 
               class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="font-medium">{{ formatDate(op.date, 'long') }}</div>
            <div class="text-blue-700">{{ $t(op.descriptionKey) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Holiday, SpecialOperation } from '@/types/holiday'

// Composables
const { 
  loadHolidayData, 
  generateCalendarData, 
  getHolidaysByMonth,
  formatDate,
  isLoading,
  error,
  holidayMaster
} = useHolidayCalendar()
const { locale } = useI18n()

// State
const currentDate = new Date()
const currentYear = ref(currentDate.getFullYear())
const currentMonth = ref(currentDate.getMonth() + 1)
const calendarData = ref<any[][]>([])
const monthHolidays = ref<Holiday[]>([])
const monthSpecialOperations = ref<SpecialOperation[]>([])

// Week days
const weekDays = computed(() => {
  if (locale.value === 'ja') {
    return ['日', '月', '火', '水', '木', '金', '土']
  } else {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  }
})

// Format month name
const formatMonth = (year: number, month: number) => {
  const date = new Date(year, month - 1, 1)
  if (locale.value === 'ja') {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long'
    }).format(date)
  } else {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long'
    }).format(date)
  }
}

// Get cell class
const getCellClass = (day: any) => {
  if (!day) return ''
  
  const classes = []
  
  if (day.dayOfWeek === '日' || day.dayOfWeek === 'Sun') {
    classes.push('bg-red-50')
  }
  
  if (day.isHoliday) {
    classes.push('bg-red-100')
  }
  
  if (day.isPeakSeason) {
    classes.push('bg-yellow-50')
  }
  
  if (day.specialOperation) {
    classes.push('border-blue-400 border-2')
  }
  
  return classes.join(' ')
}

// Navigate to previous month
const previousMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  updateCalendar()
}

// Navigate to next month
const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  updateCalendar()
}

// Update calendar data
const updateCalendar = async () => {
  await loadHolidayData()
  calendarData.value = generateCalendarData(currentYear.value, currentMonth.value)
  monthHolidays.value = getHolidaysByMonth(currentYear.value, currentMonth.value)
  
  // Get special operations for this month
  const monthStr = currentMonth.value.toString().padStart(2, '0')
  const yearMonthPrefix = `${currentYear.value}-${monthStr}`
  
  if (holidayMaster.value) {
    monthSpecialOperations.value = holidayMaster.value.specialOperations.filter(
      op => op.date.startsWith(yearMonthPrefix)
    )
  }
}

// Initialize
onMounted(() => {
  updateCalendar()
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('CALENDAR')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>