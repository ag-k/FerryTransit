<template>
  <div class="container mx-auto px-4 py-4 max-w-[1000px]">
    <h2 class="hidden lg:block text-2xl font-semibold mb-6 dark:text-white">{{ $t('TIMETABLE') }}</h2>

    <!-- Current status alerts -->
    <StatusAlerts class="mb-6" />

    <!-- 出発地・到着地選択 -->
    <ClientOnly>
      <TimetableForm :departure="departure" :arrival="arrival" :hondo-ports="hondoPorts" :dozen-ports="dozenPorts"
        :dogo-ports="dogoPorts" @update:departure="handleDepartureChange" @update:arrival="handleArrivalChange"
        @reverse="reverseRoute" />
      <template #fallback>
        <!-- SSR時のフォールバック -->
        <div class="mb-4">
          <div class="grid md:grid-cols-12 gap-4">
            <div class="md:col-span-5">
              <label class="block text-sm font-bold mb-1 dark:text-white">{{ $t('_FROM') }}</label>
              <select
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-slate-700 dark:text-gray-200"
                disabled>
                <option value="">{{ $t('DEPARTURE') }}</option>
              </select>
            </div>
            <div class="md:col-span-2 text-center hidden md:block">
              <button type="button"
                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-slate-700 dark:text-gray-200"
                disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fill-rule="evenodd"
                    d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z" />
                </svg>
              </button>
            </div>
            <div class="md:col-span-5">
              <label class="block text-sm font-bold mb-1 dark:text-white">{{ $t('_TO') }}</label>
              <select
                class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-slate-700 dark:text-gray-200"
                disabled>
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
          <!-- 乗換案内（/transit）と同じ DatePicker 表示に統一（時刻なし） -->
          <DatePicker :model-value="selectedDate" :min-date="today" margin="none" size="compact"
            @update:model-value="handleDateChange" />
        </div>
      </div>
      <template #fallback>
        <div class="mb-4">
          <div class="w-full md:w-1/3">
            <div class="flex">
              <input type="date"
                class="flex-1 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-100 dark:bg-slate-700 dark:text-gray-200"
                disabled>
              <button type="button"
                class="px-4 py-2 text-base border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-100 dark:bg-slate-700 dark:text-gray-200"
                disabled>
                {{ $t('TODAY') }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </ClientOnly>

    <!-- 地図表示 -->
    <ClientOnly>
      <div class="mb-6">
        <!-- 地図表示/非表示ボタン -->
        <div class="flex justify-end mb-2">
          <button
            class="flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="toggleMapDisplay">
            <svg v-if="settingsStore.mapEnabled" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              fill="currentColor" class="mr-1.5" viewBox="0 0 16 16">
              <path
                d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="mr-1.5"
              viewBox="0 0 16 16">
              <path
                d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z" />
            </svg>
            {{ settingsStore.mapEnabled ? $t('MAP_HIDE') : $t('MAP_SHOW') }}
          </button>
        </div>

        <!-- 地図コンポーネント -->
        <div v-if="settingsStore.mapEnabled">
          <FerryMap :selected-port="selectedMapPort" :selected-route="selectedMapRoute" :show-port-details="true"
            height="300px" @port-click="handleMapPortClick" @route-select="handleMapRouteSelect" />
        </div>
      </div>
    </ClientOnly>

    <!-- 時刻表 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div class="bg-blue-600 dark:bg-blue-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div class="flex flex-col min-w-0">
          <div class="flex items-baseline justify-between gap-3 min-w-0">
            <h3 data-test="timetable-date-title" class="text-lg font-medium leading-tight truncate tabular-nums">
              {{ headerDateLabel }}
            </h3>
          </div>
          <p data-test="timetable-summary" class="text-xs text-blue-100/90 leading-tight mt-0.5 truncate"
            :title="`${$t('DATE')}: ${selectedDateString} / ${$t('_FROM')}: ${departure ? $t(departure) : '-'} / ${$t('_TO')}: ${arrival ? $t(arrival) : '-'}`">
            <span>{{ departure ? $t(departure) : '-' }}</span>
            <span class="mx-1">→</span>
            <span>{{ arrival ? $t(arrival) : '-' }}</span>
          </p>
        </div>
        <FavoriteButton v-if="departure && arrival" :type="'route'" :route="{ departure, arrival }"
          class="text-white hover:text-yellow-300" />
      </div>
      <ClientOnly>
        <div class="p-0">
          <div v-if="isLoading" class="text-center py-6">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="sr-only">Loading...</span>
          </div>

          <div v-else-if="error"
            class="mx-4 my-3 px-4 py-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-gray-700 text-red-800 dark:text-red-400 rounded"
            role="alert">
            {{ $t(error) }}
          </div>

          <div v-else-if="filteredTimetable.length === 0" class="text-center py-6 text-gray-500 dark:text-gray-300">
            <small v-if="!departure && !arrival">
              {{ $t('SELECT_BOTH_PORTS') }}
            </small>
            <small v-else-if="!departure">
              {{ $t('SELECT_DEPARTURE') }}
            </small>
            <small v-else-if="!arrival">
              {{ $t('SELECT_ARRIVAL') }}
            </small>
            <small v-else>
              {{ $t('NO_MATCHING_TRIPS') }}
            </small>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-base sm:text-sm min-w-[360px]">
              <thead class="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-600">
                <tr>
                  <th class="px-3 sm:px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-100">{{ $t('SHIP') }}
                  </th>
                  <th class="px-3 sm:px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-100">
                    <a href="#"
                      class="text-blue-600 dark:text-blue-200 hover:underline font-semibold inline-block py-1 -my-1 px-2 -mx-2 touch-manipulation"
                      @click.prevent="showPortInfo(departure)">
                      {{ $t(departure) }}
                    </a>
                  </th>
                  <th class="px-3 sm:px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-100">
                    <a href="#"
                      class="text-blue-600 dark:text-blue-200 hover:underline font-semibold inline-block py-1 -my-1 px-2 -mx-2 touch-manipulation"
                      @click.prevent="showPortInfo(arrival)">
                      {{ $t(arrival) }}
                    </a>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="trip in sortedTimetable" :key="trip.tripId"
                  class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  :class="{ 'line-through opacity-60': tripStatus(trip) === 2 }">
                  <td class="px-3 sm:px-4 py-4 sm:py-3">
                    <div class="flex items-center gap-1 min-h-[20px]">
                      <button v-if="tripStatus(trip) === 2" type="button" data-test="cancel-status-icon"
                        class="inline-flex items-center text-red-600 dark:text-red-300" :title="$t('OPERATION_STATUS')"
                        aria-label="運航状況を見る" @click.stop="navigateToStatus">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                          viewBox="0 0 16 16">
                          <path
                            d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z" />
                        </svg>
                      </button>
                      <span v-else-if="tripStatus(trip) === 3"
                        class="inline-flex items-center text-yellow-600 dark:text-yellow-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                          viewBox="0 0 16 16">
                          <path
                            d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                        </svg>
                      </span>
                      <span v-else-if="tripStatus(trip) === 4"
                        class="inline-flex items-center text-green-600 dark:text-green-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                          viewBox="0 0 16 16">
                          <path
                            d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z" />
                        </svg>
                      </span>
                      <a href="#"
                        class="text-blue-600 dark:text-blue-200 hover:underline font-medium inline-block py-1 -my-1 px-2 -mx-2 touch-manipulation"
                        @click.prevent="showShipInfo(trip.name)">
                        {{ $t(trip.name) }}
                      </a>
                    </div>
                  </td>
                  <td class="px-3 sm:px-4 py-4 sm:py-3 font-mono text-right text-gray-900 dark:text-gray-100">
                    {{ formatTime(trip.departureTime) }}
                    <span v-if="trip.departureLabel"
                      class="block text-gray-500 dark:text-gray-400 text-xs sm:text-xs mt-0.5">
                      {{ $t(trip.departureLabel) }}
                    </span>
                  </td>
                  <td class="px-3 sm:px-4 py-4 sm:py-3 font-mono text-right text-gray-900 dark:text-gray-100">
                    {{ formatTime(trip.arrivalTime) }}
                    <span v-if="trip.arrivalLabel"
                      class="block text-gray-500 dark:text-gray-400 text-xs sm:text-xs mt-0.5">
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

      <!-- 時刻表最終更新日 -->
      <div v-if="ferryStore.lastFetchTime"
        class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 rounded-b-lg">
        <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
          {{ $t('TIMETABLE_LAST_UPDATE') }}: {{ formatDateTime(ferryStore.lastFetchTime) }}
        </p>
      </div>

      <!-- 乗換を含むルートを検索ボタン -->
      <div v-if="showTransferSearchButton"
        class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <button type="button" data-test="transfer-search-button"
          class="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transform active:scale-[0.98] transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          @click="navigateToTransit">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {{ $t('SEARCH_WITH_TRANSFER') }}
        </button>
      </div>
    </div>

    <!-- モーダル -->
    <ClientOnly>
      <CommonShipModal v-model:visible="modalVisible" :title="modalTitle" :type="modalType" :ship-id="modalShipId"
        :port-id="modalPortId" :port-zoom="modalPortZoom" :content="modalContent" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, computed, watch, unref } from 'vue'
import { useHead, useI18n, useRoute, useRouter } from '#imports'
import { useFerryStore } from '@/stores/ferry'
import { useHistoryStore } from '@/stores/history'
import { useSettingsStore } from '@/stores/settings'
import { useFerryData } from '@/composables/useFerryData'
import FavoriteButton from '@/components/favorites/FavoriteButton.vue'
import FerryMap from '@/components/map/FerryMap.vue'
import StatusAlerts from '@/components/common/StatusAlerts.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import { formatDateYmdJst, getJstDateParts, getTodayJstMidnight } from '@/utils/jstDate'

// Store and composables
const ferryStore = useFerryStore()
const historyStore = useHistoryStore()
const settingsStore = useSettingsStore()
const {
  filteredTimetable,
  getTripStatus,
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
const modalPortId = ref('')
const modalPortZoom = ref(15)
const modalContent = ref('')
const selectedMapPort = ref<string>('')
const selectedMapRoute = ref<{ from: string; to: string } | undefined>()

const today = getTodayJstMidnight()

// Computed properties
const selectedDateString = computed(() => {
  // JST基準で日付を取得（海外端末でも常にJST表示）
  return formatDateYmdJst(selectedDate.value)
})

const { locale, t } = useI18n()
const headerDateLabel = computed(() => {
  const { year, month, day } = getJstDateParts(selectedDate.value)
  // JSTの暦日を UTC の Date として組み立てて曜日を安定取得
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const weekdayJa = ['日', '月', '火', '水', '木', '金', '土'][weekdayIndex] ?? ''
  const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekdayIndex] ?? ''
  const isJa = String(locale.value || 'ja').startsWith('ja')
  const weekday = isJa ? weekdayJa : weekdayEn
  return `${selectedDateString.value}(${weekday})`
})

const todayString = computed(() => {
  // JST基準で本日の日付を取得（海外端末でも常にJST）
  return formatDateYmdJst(new Date())
})

const sortedTimetable = computed(() => {
  return [...filteredTimetable.value].sort((a, b) => {
    // 時刻を "H:mm" から "HH:mm" 形式に正規化
    const normalizeTime = (time: string | Date): string => {
      if (time instanceof Date) {
        const hh = String(time.getHours()).padStart(2, '0')
        const mm = String(time.getMinutes()).padStart(2, '0')
        return `${hh}:${mm}`
      }
      const raw = String(time ?? '')
      const [hours = '0', minutes = '0'] = raw.split(':')
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    const timeA = new Date(`2000-01-01T${normalizeTime(a.departureTime)}`).getTime()
    const timeB = new Date(`2000-01-01T${normalizeTime(b.departureTime)}`).getTime()
    return timeA - timeB
  })
})

// 島前3島間のルートかどうかを判定
const isDozenRoute = computed(() => {
  const dozenPorts = ['BEPPU', 'HISHIURA', 'KURI']
  return departure.value && arrival.value &&
    dozenPorts.includes(departure.value) &&
    dozenPorts.includes(arrival.value) &&
    departure.value !== arrival.value
})

// 乗換を含むルートを検索ボタンを表示するかどうか
const showTransferSearchButton = computed(() => {
  return departure.value && arrival.value && !isDozenRoute.value
})

// Methods
const handleDateChange = (newDate: Date) => {
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

const formatTime = (time: string | Date) => {
  if (time instanceof Date) {
    const hh = String(time.getHours()).padStart(2, '0')
    const mm = String(time.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }
  return String(time ?? '').substring(0, 5)
}

const formatDateTime = (date: Date | string | null | undefined) => {
  if (!date) return '-'
  const dateObj = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(dateObj.getTime())) return '-'
  return dateObj.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const tripStatus = (trip: any) => {
  // 当日(JST)以外は「運航状況（ライブ）」や alerts を結果に反映しない
  // （未来/過去日に今日の欠航情報が混ざるのを防ぐ）
  if (selectedDateString.value !== todayString.value) {
    return Number(trip?.status ?? 0) || 0
  }

  const alerts = (unref((ferryStore as any)?.alerts) ?? []) as any[]
  // JST基準で日付を取得（海外端末でも常にJST）
  const tripDate = formatDateYmdJst(selectedDate.value)

  // Check if this trip has any alerts
  const hasAlert = Array.isArray(alerts) && alerts.some(alert => {
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
    return alert?.status ?? getTripStatus(trip)
  }

  // アラートが無い場合は、時刻表データ/運航状況から判定（trip.status=2 も反映）
  return getTripStatus(trip)
}

const showShipInfo = (shipName: string) => {
  modalTitle.value = t(shipName)
  modalType.value = 'ship'
  modalShipId.value = shipName
  modalPortId.value = ''
  modalPortZoom.value = 15
  modalVisible.value = true
}

const showPortInfo = (portName: string) => {
  modalTitle.value = t(portName)
  modalType.value = 'port'
  modalShipId.value = ''
  modalPortId.value = portName
  // 港ごとに固定のズーム値を親で決定して渡す
  modalPortZoom.value =
    portName === 'BEPPU' ? 17
      : portName === 'HISHIURA' ? 18
        : portName === 'KURI' ? 18
          : 15
  // 旧 iframe は廃止。互換用に content は空にしておく
  modalContent.value = ''
  modalVisible.value = true
}

const handleMapPortClick = (port: any) => {
  // 地図上の港がクリックされたら、その港を出発地または到着地に設定
  if (!departure.value) {
    handleDepartureChange(port.id)
  } else if (!arrival.value && port.id !== departure.value) {
    handleArrivalChange(port.id)
  }
}

const handleMapRouteSelect = (route: { from: string; to: string }) => {
  // 地図上の航路が選択されたら、出発地と到着地を設定
  handleDepartureChange(route.from)
  handleArrivalChange(route.to)
}

// 地図表示の切り替え
const toggleMapDisplay = () => {
  // NOTE: テスト用の global 宣言や Pinia plugin の型拡張の影響で actions が型上見えない場合があるため any 経由で呼ぶ
  ; (settingsStore as any).setMapEnabled(!settingsStore.mapEnabled)
}

// 乗換案内画面に遷移
const navigateToTransit = () => {
  if (!departure.value || !arrival.value) {
    return
  }

  const router = useRouter()
  // ローカル時間で日付を取得（UTC変換によるずれを防ぐ）
  const year = selectedDate.value.getFullYear()
  const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0')
  const day = String(selectedDate.value.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  router.push({
    path: '/transit',
    query: {
      departure: departure.value,
      arrival: arrival.value,
      date: dateStr,
      time: '00:00'
    }
  })
}

// 運航状況ページに遷移
const navigateToStatus = () => {
  const router = useRouter()
  router.push({ path: '/status' })
}

// Watchers
watch([departure, arrival], async ([newDeparture, newArrival], [_oldDeparture, _oldArrival]) => {
  // 両方選択されている場合は、一旦ルートをクリアしてから再描画
  if (newDeparture && newArrival) {
    const current = selectedMapRoute.value
    const isDifferent = !current || current.from !== newDeparture || current.to !== newArrival
    if (isDifferent) {
      // まず既存のルートをクリア
      selectedMapRoute.value = undefined
      selectedMapPort.value = ''
      await nextTick()
    }
    // 新しいルートを描画
    selectedMapRoute.value = { from: newDeparture, to: newArrival }
    selectedMapPort.value = ''
    return
  }

  // 片方のみ選択時はルートをクリアし、選択中の港だけ強調
  if (newDeparture) {
    selectedMapRoute.value = undefined
    selectedMapPort.value = newDeparture
    return
  }
  if (newArrival) {
    selectedMapRoute.value = undefined
    selectedMapPort.value = newArrival
    return
  }

  // どちらも未選択
  selectedMapRoute.value = undefined
  selectedMapPort.value = ''
}, { immediate: true })

// Initialize data on mount
onMounted(async () => {
  const route = useRoute()

  // URLパラメータから設定
  if (route.query.departure && ferryStore) {
    ferryStore.setDeparture(route.query.departure as string)
  }
  if (route.query.arrival && ferryStore) {
    ferryStore.setArrival(route.query.arrival as string)
  }

  if (ferryStore && ferryStore.timetableData.length === 0) {
    await initializeData()
  }
})

// Page metadata
useHead({
  title: `${t('TIMETABLE')} - ${t('TITLE')}`
})
</script>
