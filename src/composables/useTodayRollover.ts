import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { formatDateYmdJst, getTodayJstMidnight } from '@/utils/jstDate'

export const APP_RESUME_EVENT = 'ferrytransit:app-resume'

interface TodayRolloverOptions {
  selectedDate: Ref<Date>
  setSelectedDate: (date: Date) => void
}

export const useTodayRollover = ({ selectedDate, setSelectedDate }: TodayRolloverOptions) => {
  const today = ref(getTodayJstMidnight())
  const followToday = ref(formatDateYmdJst(selectedDate.value) === formatDateYmdJst(today.value))

  const syncToday = () => {
    const previousToday = formatDateYmdJst(today.value)
    const nextToday = getTodayJstMidnight()
    const nextTodayString = formatDateYmdJst(nextToday)
    if (previousToday === nextTodayString) return false

    const shouldFollow = followToday.value && formatDateYmdJst(selectedDate.value) === previousToday
    today.value = nextToday
    if (shouldFollow) setSelectedDate(nextToday)
    return true
  }

  const selectDate = (date: Date) => {
    followToday.value = formatDateYmdJst(date) === formatDateYmdJst(today.value)
    setSelectedDate(date)
  }

  const selectExplicitDate = (date: Date) => {
    followToday.value = false
    setSelectedDate(date)
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') syncToday()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', syncToday)
    window.addEventListener(APP_RESUME_EVENT, syncToday)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', syncToday)
    window.removeEventListener(APP_RESUME_EVENT, syncToday)
  })

  return { today, followToday, syncToday, selectDate, selectExplicitDate }
}
