<template>
  <div class="container mx-auto px-4 py-8 max-w-[1000px]">
    <h2 class="text-2xl font-semibold mb-6 dark:text-white">{{ $t('TIMETABLE') }}</h2>
    
    <!-- 出発地・到着地選択 -->
    <ClientOnly>
      <TimetableForm
        :departure="departure"
        :arrival="arrival"
        :hondo-ports="hondoPorts"
        :dozen-ports="dozenPorts"
        :dogo-ports="dogoPorts"
        @update:departure="handleDepartureChange"
        @update:arrival="handleArrivalChange"
        @reverse="reverseRoute"
      />
      <template #fallback>
        <!-- SSR時のフォールバック -->
        <div class="mb-4">
          <div class="grid md:grid-cols-12 gap-4">
            <div class="md:col-span-5">
              <label class="block text-sm font-bold mb-1 dark:text-white">{{ $t('_FROM') }}</label>
              <select class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-slate-700 dark:text-gray-200" disabled>
                <option value="">{{ $t('DEPARTURE') }}</option>
              </select>
            </div>
            <div class="md:col-span-2 text-center hidden md:block">
              <button type="button" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-slate-700 dark:text-gray-200" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
                </svg>
              </button>
            </div>
            <div class="md:col-span-5">
              <label class="block text-sm font-bold mb-1 dark:text-white">{{ $t('_TO') }}</label>
              <select class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-slate-700 dark:text-gray-200" disabled>
                <option value="">{{ $t('ARRIVAL') }}</option>
              </select>
            </div>
          </div>
        </div>
      </template>
    </ClientOnly>
    
    <!-- 日付選択 -->
    <ClientOnly>
      <div class="mb-4">
        <div class="w-full md:w-1/3">
          <!-- Mobile: Label on the left -->
          <div class="md:hidden">
            <div class="flex items-center">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-200 mr-3 w-16">{{ $t('DATE') }}</label>
              <input 
                type="date" 
                class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                :value="selectedDateString"
                :min="todayString"
                @change="handleDateChange"
              >
            </div>
          </div>
          <!-- Desktop: Label on top -->
          <div class="hidden md:block">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{{ $t('DATE') }}</label>
            <input 
              type="date" 
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              :value="selectedDateString"
              :min="todayString"
              @change="handleDateChange"
            >
          </div>
        </div>
      </div>
      <template #fallback>
        <div class="mb-4">
          <div class="w-full md:w-1/3">
            <div class="md:hidden">
              <div class="flex items-center">
                <label class="text-sm font-bold mr-2 min-w-[60px] dark:text-white">{{ $t('DATE') }}</label>
                <input 
                  type="date" 
                  class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-slate-700 dark:text-gray-200"
                  disabled
                >
              </div>
            </div>
            <div class="hidden md:block">
              <label class="block text-sm font-bold mb-1 dark:text-white">{{ $t('DATE') }}</label>
              <input 
                type="date" 
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-slate-700 dark:text-gray-200"
                disabled
              >
            </div>
          </div>
        </div>
      </template>
    </ClientOnly>
    
    <!-- 時刻表 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div class="bg-blue-600 dark:bg-blue-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <h3 class="text-lg font-medium">{{ $t('TIMETABLE') }}</h3>
        <FavoriteButton
          v-if="departure && arrival"
          :type="'route'"
          :route="{ departure, arrival }"
          class="text-white hover:text-yellow-300"
        />
      </div>
      <ClientOnly>
        <div class="p-0">
          <div v-if="isLoading" class="text-center py-6">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="sr-only">Loading...</span>
          </div>
          
          <div v-else-if="error" class="mx-4 my-3 px-4 py-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-gray-700 text-red-800 dark:text-red-400 rounded" role="alert">
            {{ $t(error) }}
          </div>
          
          <div v-else-if="filteredTimetable.length === 0" class="text-center py-6 text-gray-500 dark:text-gray-300">
            <small v-if="!departure && !arrival">
              出発地と目的地を選択してください
            </small>
            <small v-else-if="!departure">
              出発地を選択してください
            </small>
            <small v-else-if="!arrival">
              目的地を選択してください
            </small>
            <small v-else>
              該当する便はありません
            </small>
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="w-full text-base sm:text-sm min-w-[360px]">
              <thead class="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-600">
                <tr>
                  <th class="px-3 sm:px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-100">{{ $t('SHIP') }}</th>
                  <th class="px-3 sm:px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-100">
                    <a href="#" @click.prevent="showPortInfo(departure)" class="text-blue-600 dark:text-blue-200 hover:underline font-semibold inline-block py-1 -my-1 px-2 -mx-2 touch-manipulation">
                      {{ $t(departure) }}
                    </a>
                  </th>
                  <th class="px-3 sm:px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-100">
                    <a href="#" @click.prevent="showPortInfo(arrival)" class="text-blue-600 dark:text-blue-200 hover:underline font-semibold inline-block py-1 -my-1 px-2 -mx-2 touch-manipulation">
                      {{ $t(arrival) }}
                    </a>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="trip in sortedTimetable" 
                  :key="trip.tripId"
                  class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  :class="{ 'line-through opacity-60': tripStatus(trip) === 2 }"
                >
                  <td class="px-3 sm:px-4 py-4 sm:py-3">
                    <span v-if="tripStatus(trip) === 2" class="inline-block text-red-600 dark:text-red-300 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                      </svg>
                    </span>
                    <span v-else-if="tripStatus(trip) === 3" class="inline-block text-yellow-600 dark:text-yellow-300 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                      </svg>
                    </span>
                    <span v-else-if="tripStatus(trip) === 4" class="inline-block text-green-600 dark:text-green-300 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
                      </svg>
                    </span>
                    <a href="#" @click.prevent="showShipInfo(trip.name)" class="text-blue-600 dark:text-blue-200 hover:underline font-medium inline-block py-1 -my-1 px-2 -mx-2 touch-manipulation">
                      {{ $t(trip.name) }}
                    </a>
                  </td>
                  <td class="px-3 sm:px-4 py-4 sm:py-3 font-mono text-right text-gray-900 dark:text-gray-100">
                    {{ formatTime(trip.departureTime) }}
                    <span v-if="trip.departureLabel" class="block text-gray-500 dark:text-gray-400 text-xs sm:text-xs mt-0.5">
                      {{ $t(trip.departureLabel) }}
                    </span>
                  </td>
                  <td class="px-3 sm:px-4 py-4 sm:py-3 font-mono text-right text-gray-900 dark:text-gray-100">
                    {{ formatTime(trip.arrivalTime) }}
                    <span v-if="trip.arrivalLabel" class="block text-gray-500 dark:text-gray-400 text-xs sm:text-xs mt-0.5">
                      {{ $t(trip.arrivalLabel) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <template #fallback>
          <div class="p-0">
            <div class="text-center py-6 text-gray-500 dark:text-gray-300">
              <small>読み込み中...</small>
            </div>
          </div>
        </template>
      </ClientOnly>
    </div>
    
    <!-- モーダル -->
    <ClientOnly>
      <CommonShipModal
        v-model:visible="modalVisible"
        :title="modalTitle"
        :type="modalType"
        :ship-id="modalShipId"
        :content="modalContent"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useFerryStore } from '@/stores/ferry'
import { useHistoryStore } from '@/stores/history'
import { useFerryData } from '@/composables/useFerryData'
import FavoriteButton from '@/components/favorites/FavoriteButton.vue'

// Store and composables
const ferryStore = useFerryStore()
const historyStore = useHistoryStore()
const { 
  filteredTimetable,
  selectedDate,
  departure,
  arrival,
  isLoading,
  error,
  hondoPorts,
  dozenPorts,
  dogoPorts,
  initializeData
} = useFerryData()

// State
const modalVisible = ref(false)
const modalTitle = ref('')
const modalType = ref<'ship' | 'port'>('ship')
const modalShipId = ref('')
const modalContent = ref('')

// Computed properties
const selectedDateString = computed(() => {
  return selectedDate.value.toISOString().split('T')[0]
})

const todayString = computed(() => {
  // JSTで本日の日付を取得
  const now = new Date()
  const jstOffset = 9 * 60 // JST is UTC+9
  const jstTime = new Date(now.getTime() + (jstOffset - now.getTimezoneOffset()) * 60 * 1000)
  jstTime.setHours(0, 0, 0, 0)
  return jstTime.toISOString().split('T')[0]
})

const sortedTimetable = computed(() => {
  return [...filteredTimetable.value].sort((a, b) => {
    // 時刻を "H:mm" から "HH:mm" 形式に正規化
    const normalizeTime = (time: string): string => {
      const [hours, minutes] = time.split(':')
      return `${hours.padStart(2, '0')}:${minutes}`
    }
    
    const timeA = new Date(`2000-01-01T${normalizeTime(a.departureTime)}`).getTime()
    const timeB = new Date(`2000-01-01T${normalizeTime(b.departureTime)}`).getTime()
    return timeA - timeB
  })
})

// Methods
const handleDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newDate = new Date(target.value + 'T00:00:00')
  ferryStore.setSelectedDate(newDate)
  
  // Add to search history if route is selected
  if (departure.value && arrival.value) {
    historyStore.addSearchHistory({
      type: 'timetable',
      departure: departure.value,
      arrival: arrival.value,
      date: newDate
    })
  }
}

const handleDepartureChange = (value: string) => {
  ferryStore.setDeparture(value)
  
  // Add to search history if both ports are selected
  if (value && arrival.value) {
    historyStore.addSearchHistory({
      type: 'timetable',
      departure: value,
      arrival: arrival.value,
      date: selectedDate.value
    })
  }
}

const handleArrivalChange = (value: string) => {
  ferryStore.setArrival(value)
  
  // Add to search history if both ports are selected
  if (departure.value && value) {
    historyStore.addSearchHistory({
      type: 'timetable',
      departure: departure.value,
      arrival: value,
      date: selectedDate.value
    })
  }
}

const reverseRoute = () => {
  const temp = departure.value
  ferryStore.setDeparture(arrival.value)
  ferryStore.setArrival(temp)
  
  // Add to search history after reversing
  if (departure.value && arrival.value) {
    historyStore.addSearchHistory({
      type: 'timetable',
      departure: arrival.value,
      arrival: departure.value,
      date: selectedDate.value
    })
  }
}

const formatTime = (time: string) => {
  return time.substring(0, 5)
}

const tripStatus = (trip: any) => {
  const alerts = ferryStore.alerts || []
  const tripDate = selectedDate.value.toISOString().split('T')[0]
  
  // Check if this trip has any alerts
  const hasAlert = alerts.some(alert => {
    return alert.date === tripDate && 
           alert.shipName === trip.name &&
           alert.departureTime === trip.departureTime
  })
  
  if (hasAlert) {
    const alert = alerts.find(a => 
      a.date === tripDate && 
      a.shipName === trip.name &&
      a.departureTime === trip.departureTime
    )
    return alert?.status || 1
  }
  
  return 1 // Normal status
}

const showShipInfo = (shipName: string) => {
  modalTitle.value = useNuxtApp().$i18n.t(shipName)
  modalType.value = 'ship'
  modalShipId.value = shipName
  modalVisible.value = true
}

const showPortInfo = (portName: string) => {
  modalTitle.value = useNuxtApp().$i18n.t(portName)
  modalType.value = 'port'
  
  // Get port map from store
  modalContent.value = ferryStore.portMaps[portName] || ''
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
}

// Initialize data on mount
onMounted(async () => {
  const route = useRoute()
  
  // URLパラメータから設定
  if (route.query.departure) {
    ferryStore.setDeparture(route.query.departure as string)
  }
  if (route.query.arrival) {
    ferryStore.setArrival(route.query.arrival as string)
  }
  
  if (ferryStore.timetableData.length === 0) {
    await initializeData()
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('TIMETABLE')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>