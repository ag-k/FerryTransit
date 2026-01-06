<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <h2 class="hidden lg:block text-2xl font-semibold mb-6 dark:text-white">
      {{ isCalendarEnabled ? $t('CALENDAR') : $t('CALENDAR_UNAVAILABLE_TITLE') }}
    </h2>

    <div v-if="isCalendarEnabled">
      <!-- Month navigation -->
      <div class="flex items-center justify-between mb-6">
        <button
class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-100"
          @click="previousMonth">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        <h3 class="text-xl font-medium dark:text-white">
          {{ formatMonth(currentYear, currentMonth) }}
        </h3>

        <button
class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-100"
          @click="nextMonth">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('LOADING') }}...</p>
      </div>

      <!-- Error state -->
      <div
v-else-if="error"
        class="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded"
        role="alert">
        {{ $t(error) }}
      </div>

      <!-- Calendar -->
      <div v-else>
        <!-- Legend -->
        <div class="mb-4 flex flex-wrap gap-4 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded"></div>
            <span class="dark:text-gray-100">{{ $t('HOLIDAY') }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded">
            </div>
            <span class="dark:text-gray-100">{{ $t('SPECIAL_OPERATION') }}</span>
          </div>
        </div>

        <!-- Calendar grid -->
        <div class="border dark:border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full table-fixed">
            <colgroup>
              <col v-for="i in 7" :key="i" class="w-full" style="width: 14.285714%;">
            </colgroup>
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th
v-for="day in weekDays" :key="day"
                  class="border border-gray-300 dark:border-gray-600 px-2 py-3 text-center font-medium dark:text-gray-100"
                  :class="{ 'text-red-600 dark:text-red-400': day === weekDays[0] }">
                  {{ day }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(week, weekIndex) in calendarData" :key="weekIndex">
                <td
v-for="(day, dayIndex) in week" :key="dayIndex"
                  class="border border-gray-300 dark:border-gray-600 p-0 h-24 align-top relative"
                  :class="getCellClass(day)">
                  <div v-if="day" class="p-2 h-full overflow-hidden">
                    <div class="font-medium mb-1 dark:text-gray-100">{{ day.day }}</div>

                    <!-- Holiday name -->
                    <div v-if="day.holiday" class="text-xs text-red-600 dark:text-red-400 mb-1 leading-tight">
                      {{ $t(day.holiday.nameKey) }}
                    </div>

                    <!-- Special operation -->
                    <div v-if="day.specialOperation" class="text-xs text-blue-800 dark:text-blue-400 leading-tight">
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
          <h4 class="text-lg font-medium mb-4 dark:text-white">{{ $t('HOLIDAYS_THIS_MONTH') }}</h4>
          <div class="grid md:grid-cols-2 gap-4">
            <div
v-for="holiday in monthHolidays" :key="holiday.date"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-800">
              <div class="font-medium dark:text-white">{{ formatDate(holiday.date, 'long') }}</div>
              <div class="text-gray-600 dark:text-gray-400">{{ $t(holiday.nameKey) }}</div>
            </div>
          </div>
        </div>

        <!-- Special operations list -->
        <div v-if="monthSpecialOperations.length > 0" class="mt-8">
          <h4 class="text-lg font-medium mb-4 dark:text-white">{{ $t('SPECIAL_OPERATIONS_THIS_MONTH') }}</h4>
          <div class="space-y-2">
            <div
v-for="op in monthSpecialOperations" :key="op.date"
              class="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div class="font-medium dark:text-white">{{ formatDate(op.date, 'long') }}</div>
              <div class="text-blue-800 dark:text-blue-300">{{ $t(op.descriptionKey) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
v-else
      class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/60 p-8 text-center">
      <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
        {{ $t('CALENDAR_UNAVAILABLE_MESSAGE') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Holiday, SpecialOperation } from '@/types/holiday'

// Composables
const runtimeConfig = useRuntimeConfig()
const isCalendarEnabled = computed(() => runtimeConfig.public?.features?.calendar ?? false)
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
    classes.push('bg-red-50 dark:bg-red-900/10')
  }

  if (day.isHoliday) {
    classes.push('bg-red-100 dark:bg-red-900/20')
  }

  if (day.specialOperation) {
    classes.push('border-blue-400 dark:border-blue-500 border-2')
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
  if (!isCalendarEnabled.value) {
    return
  }

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

watch(isCalendarEnabled, enabled => {
  if (enabled) {
    updateCalendar()
  }
})

// Initialize
onMounted(() => {
  if (!isCalendarEnabled.value) {
    return
  }

  updateCalendar()
})

// Page metadata
const nuxtApp = useNuxtApp()
const pageTitle = computed(() => {
  const titleKey = isCalendarEnabled.value ? 'CALENDAR' : 'CALENDAR_UNAVAILABLE_TITLE'
  return `${nuxtApp.$i18n.t(titleKey)} - ${nuxtApp.$i18n.t('TITLE')}`
})

useHead(() => ({
  title: pageTitle.value
}))
</script>
