<template>
  <div class="container mx-auto px-4 py-8">
    <h2 class="text-2xl font-semibold mb-6">{{ $t('TIMETABLE') }}</h2>
    
    <!-- 出発地・到着地選択 -->
    <ClientOnly>
      <TimetableForm
        :departure="departure"
        :arrival="arrival"
        :hondo-ports="hondoPorts"
        :dozen-ports="dozenPorts"
        :dogo-ports="dogoPorts"
        @update:departure="ferryStore.setDeparture"
        @update:arrival="ferryStore.setArrival"
        @reverse="reverseRoute"
      />
      <template #fallback>
        <!-- SSR時のフォールバック -->
        <div class="mb-4">
          <div class="grid md:grid-cols-12 gap-4">
            <div class="md:col-span-5">
              <label class="block text-sm font-bold mb-1">{{ $t('_FROM') }}</label>
              <select class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-100" disabled>
                <option value="">{{ $t('DEPARTURE') }}</option>
              </select>
            </div>
            <div class="md:col-span-2 text-center hidden md:block">
              <button type="button" class="px-3 py-1 text-sm border border-gray-300 rounded bg-gray-100" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
                </svg>
              </button>
            </div>
            <div class="md:col-span-5">
              <label class="block text-sm font-bold mb-1">{{ $t('_TO') }}</label>
              <select class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-100" disabled>
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
              <label class="text-sm font-medium text-gray-700 mr-3 w-16">{{ $t('DATE') }}</label>
              <input 
                type="date" 
                class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                :value="selectedDateString"
                :min="todayString"
                @change="handleDateChange"
              >
            </div>
          </div>
          <!-- Desktop: Label on top -->
          <div class="hidden md:block">
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('DATE') }}</label>
            <input 
              type="date" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label class="text-sm font-bold mr-2 min-w-[60px]">{{ $t('DATE') }}</label>
                <input 
                  type="date" 
                  class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-100"
                  disabled
                >
              </div>
            </div>
            <div class="hidden md:block">
              <label class="block text-sm font-bold mb-1">{{ $t('DATE') }}</label>
              <input 
                type="date" 
                class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-100"
                disabled
              >
            </div>
          </div>
        </div>
      </template>
    </ClientOnly>
    
    <!-- 時刻表 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
        <h3 class="text-base font-medium">{{ $t('TIMETABLE') }}</h3>
      </div>
      <ClientOnly>
        <div class="p-0">
          <div v-if="isLoading" class="text-center py-6">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="sr-only">Loading...</span>
          </div>
          
          <div v-else-if="error" class="mx-4 my-3 px-4 py-3 bg-red-100 border border-red-200 text-red-800 rounded" role="alert">
            {{ $t(error) }}
          </div>
          
          <div v-else-if="filteredTimetable.length === 0" class="text-center py-6 text-gray-500">
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
            <table class="w-full text-sm min-w-[400px]">
              <thead class="bg-gray-50 border-b">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-700">{{ $t('SHIP') }}</th>
                  <th class="px-4 py-3 text-right font-medium text-gray-700">
                    <a href="#" @click.prevent="showPortInfo(departure)" class="text-blue-600 hover:underline">
                      {{ $t(departure) }}
                    </a>
                  </th>
                  <th class="px-4 py-3 text-right font-medium text-gray-700">
                    <a href="#" @click.prevent="showPortInfo(arrival)" class="text-blue-600 hover:underline">
                      {{ $t(arrival) }}
                    </a>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="trip in sortedTimetable" 
                  :key="trip.tripId"
                  class="border-b hover:bg-gray-50"
                  :class="{ 'line-through opacity-60': tripStatus(trip) === 2 }"
                >
                  <td class="px-4 py-3">
                    <span v-if="tripStatus(trip) === 2" class="inline-block text-red-600 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                      </svg>
                    </span>
                    <span v-else-if="tripStatus(trip) === 3" class="inline-block text-yellow-600 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                      </svg>
                    </span>
                    <span v-else-if="tripStatus(trip) === 4" class="inline-block text-green-600 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
                      </svg>
                    </span>
                    <a href="#" @click.prevent="showShipInfo(trip.name)" class="text-blue-600 hover:underline font-medium">
                      {{ $t(trip.name) }}
                    </a>
                  </td>
                  <td class="px-4 py-3 font-mono text-right">
                    {{ formatTime(trip.departureTime) }}
                    <span v-if="departure === 'HONDO'" class="block text-gray-500 text-xs mt-0.5">
                      {{ $t(trip.departure) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-mono text-right">
                    {{ formatTime(trip.arrivalTime) }}
                    <span v-if="arrival === 'HONDO'" class="block text-gray-500 text-xs mt-0.5">
                      {{ $t(trip.arrival) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <template #fallback>
          <div class="p-0">
            <div class="text-center py-6 text-gray-500">
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
import { useFerryData } from '@/composables/useFerryData'

// Store and composables
const ferryStore = useFerryStore()
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
}

const reverseRoute = () => {
  const temp = departure.value
  ferryStore.setDeparture(arrival.value)
  ferryStore.setArrival(temp)
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
  
  // Port map embed codes
  const portMaps: Record<string, string> = {
    SHICHIRUI: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3225.123456!2d133.123456!3d35.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDA3JzI0LjAiTiAxMzPCsDA3JzI0LjAiRQ!5e0!3m2!1sja!2sjp!4v1234567890" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>',
    SAKAI: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3225.123456!2d133.123456!3d35.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDA3JzI0LjAiTiAxMzPCsDA3JzI0LjAiRQ!5e0!3m2!1sja!2sjp!4v1234567890" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>',
    SAIGO: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3225.123456!2d133.123456!3d36.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDA3JzI0LjAiTiAxMzPCsDA3JzI0LjAiRQ!5e0!3m2!1sja!2sjp!4v1234567890" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>',
    BEPPU: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3225.123456!2d133.123456!3d36.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDA3JzI0LjAiTiAxMzPCsDA3JzI0LjAiRQ!5e0!3m2!1sja!2sjp!4v1234567890" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>',
    HISHIURA: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3225.123456!2d133.123456!3d36.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDA3JzI0LjAiTiAxMzPCsDA3JzI0LjAiRQ!5e0!3m2!1sja!2sjp!4v1234567890" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>',
    KUNIGA: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3225.123456!2d133.123456!3d36.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDA3JzI0LjAiTiAxMzPCsDA3JzI0LjAiRQ!5e0!3m2!1sja!2sjp!4v1234567890" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
  }
  
  modalContent.value = portMaps[portName] || ''
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
}

// Initialize data on mount
onMounted(async () => {
  if (ferryStore.timetableData.length === 0) {
    await initializeData()
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('TIMETABLE')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>