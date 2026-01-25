<template>
  <div class="container mx-auto px-4 py-6 sm:py-8 max-w-[1000px]">
    <h2 class="hidden lg:block text-2xl font-semibold mb-6 dark:text-white">{{ $t('TIMETABLE') }}</h2>

    <!-- Current status alerts -->
    <StatusAlerts class="mb-6" />

    <!-- 出発地・到着地選択 -->
    <ClientOnly>
      <TransportModeFilter
        v-if="transportModeOptions.length > 1"
        v-model="selectedTransportMode"
        :options="transportModeOptions"
        class="mb-3"
      />
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
        <div class="flex items-end gap-3">
          <div class="w-full md:w-1/3">
            <!-- 乗換案内（/transit）と同じ DatePicker 表示に統一（時刻なし） -->
            <DatePicker :model-value="selectedDate" :min-date="today" margin="none" size="compact"
              @update:model-value="handleDateChange" />
          </div>
          <!-- 地図表示ボタン（地図が非表示の時だけ表示、右端に配置） -->
          <SecondaryButton v-if="!settingsStore.mapEnabled" size="sm" class="ml-auto" @click="toggleMapDisplay">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="mr-1.5"
              viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 8.75a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              <path
                d="M8 0a5.5 5.5 0 0 0-5.5 5.5c0 4.13 5.5 10.5 5.5 10.5s5.5-6.37 5.5-10.5A5.5 5.5 0 0 0 8 0zm0 14.09C6.28 11.74 3.5 7.98 3.5 5.5a4.5 4.5 0 0 1 9 0c0 2.48-2.78 6.24-4.5 8.59z" />
            </svg>
            {{ $t('MAP_SHOW') }}
          </SecondaryButton>
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
      <TimetableMap
        :selected-port="selectedMapPort"
        :selected-route="selectedMapRoute"
        :show-port-details="true"
        height="300px"
        @port-click="handleMapPortClick"
        @route-select="handleMapRouteSelect"
      />
    </ClientOnly>

    <!-- 時刻表 -->
    <Card class="overflow-hidden" padding="none">
      <div class="bg-gradient-to-r from-app-primary to-app-primary-2 text-white px-4 py-3 flex items-center justify-between border-b border-white/10">
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
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
            <span class="sr-only">Loading...</span>
          </div>

          <Alert
            v-else-if="error"
            :visible="true"
            type="danger"
            :dismissible="false"
            class="mx-4 my-3"
            :message="$t(error)"
          />

          <div v-else-if="filteredTimetableByMode.length === 0" class="text-center py-6 text-gray-500 dark:text-gray-300">
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
            <table class="w-full text-base sm:text-sm min-w-[360px] border-separate border-spacing-0">
              <thead class="bg-app-surface-2/70 border-b border-app-border/70">
                <tr>
                  <th class="px-3 sm:px-4 py-3 text-left font-medium text-app-muted">{{ $t('SHIP') }}
                  </th>
                  <th class="px-3 sm:px-4 py-3 text-right font-medium text-app-muted align-middle">
                    <a href="#"
                      class="text-app-primary font-semibold inline-flex flex-col items-center justify-center gap-1 py-1 -my-1 px-2 -mx-2 touch-manipulation text-center min-h-[40px] w-fit ml-auto group"
                      @click.prevent="showPortInfo(departure)">
                      <span class="leading-tight group-hover:underline">
                        {{ departureLabelParts.name }}
                      </span>
                      <PortBadges :badges="departureLabelParts.badges" class="flex flex-wrap justify-end gap-1" />
                    </a>
                  </th>
                  <th class="px-3 sm:px-4 py-3 text-right font-medium text-app-muted align-middle">
                    <a href="#"
                      class="text-app-primary font-semibold inline-flex flex-col items-center justify-center gap-1 py-1 -my-1 px-2 -mx-2 touch-manipulation text-center min-h-[40px] w-fit ml-auto group"
                      @click.prevent="showPortInfo(arrival)">
                      <span class="leading-tight group-hover:underline">
                        {{ arrivalLabelParts.name }}
                      </span>
                      <PortBadges :badges="arrivalLabelParts.badges" class="flex flex-wrap justify-end gap-1" />
                    </a>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-app-border/60">
                <tr v-for="trip in sortedTimetable" :key="trip.tripId"
                  class="hover:bg-app-surface-2/50 transition-colors duration-150"
                  :class="{ 'line-through opacity-60': tripStatus(trip) === 2 }">
                  <td class="px-3 sm:px-4 py-4 sm:py-3">
                    <div class="flex items-center gap-1 min-h-[20px]">
                      <button v-if="tripStatus(trip) === 2" type="button" data-test="cancel-status-icon"
                        class="inline-flex items-center text-red-600 dark:text-red-300" :title="$t('OPERATION_STATUS')"
                        aria-label="運航状況を見る" @click.stop="showOperationStatus(trip.name)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                          viewBox="0 0 16 16">
                          <path
                            d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z" />
                        </svg>
                      </button>
                      <button v-else-if="tripStatus(trip) === 3" type="button" data-test="warning-status-icon"
                        class="inline-flex items-center text-yellow-600 dark:text-yellow-300"
                        :title="$t('OPERATION_STATUS')"
                        aria-label="運航状況を見る"
                        @click.stop="showOperationStatus(trip.name)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                          viewBox="0 0 16 16">
                          <path
                            d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                        </svg>
                      </button>
                      <button v-else-if="tripStatus(trip) === 4" type="button" data-test="resumed-status-icon"
                        class="inline-flex items-center text-green-600 dark:text-green-300"
                        :title="$t('OPERATION_STATUS')"
                        aria-label="運航状況を見る"
                        @click.stop="showOperationStatus(trip.name)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                          viewBox="0 0 16 16">
                          <path
                            d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z" />
                        </svg>
                      </button>
                      <!-- 船種全体の運航状況に変更がある場合の注意マーク（便ごとのステータスが通常の場合のみ表示） -->
                      <button
                        v-else-if="getShipStatusAlert(trip.name)"
                        type="button"
                        data-test="ship-status-alert-icon"
                        class="inline-flex items-center"
                        :class="{
                          'text-red-600 dark:text-red-300': getShipStatusAlert(trip.name)?.severity === 'danger',
                          'text-yellow-600 dark:text-yellow-300': getShipStatusAlert(trip.name)?.severity === 'warning',
                          'text-green-600 dark:text-green-300': getShipStatusAlert(trip.name)?.severity === 'info'
                        }"
                        :title="$t('OPERATION_STATUS')"
                        aria-label="運航状況を見る"
                        @click.stop="showOperationStatus(trip.name)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                          viewBox="0 0 16 16">
                          <path
                            d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                        </svg>
                      </button>
                      <a href="#"
                        class="text-app-primary hover:underline font-medium inline-block py-1 -my-1 px-2 -mx-2 touch-manipulation"
                        @click.prevent="showShipInfo(trip.name)">
                        {{ $t(trip.name) }}
                      </a>
                    </div>
                    <p v-if="formatTripMeta(trip)" class="text-xs text-app-muted mt-1">
                      {{ formatTripMeta(trip) }}
                    </p>
                  </td>
                  <td class="px-3 sm:px-4 py-4 sm:py-3 font-mono tabular-nums text-right text-app-fg">
                    {{ formatTime(trip.departureTime) }}
                    <span v-if="trip.departureLabel"
                      class="block text-app-muted text-xs sm:text-xs mt-0.5">
                      {{ $t(trip.departureLabel) }}
                    </span>
                  </td>
                  <td class="px-3 sm:px-4 py-4 sm:py-3 font-mono tabular-nums text-right text-app-fg">
                    {{ formatTime(trip.arrivalTime) }}
                    <span v-if="trip.arrivalLabel"
                      class="block text-app-muted text-xs sm:text-xs mt-0.5">
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
        class="px-4 py-3 bg-app-surface-2/70 border-t border-app-border/70">
        <p class="text-xs text-app-muted text-center">
          {{ $t('TIMETABLE_LAST_UPDATE') }}: {{ formatDateTime(ferryStore.lastFetchTime) }}
        </p>
      </div>

      <!-- 乗換を含むルートを検索ボタン -->
      <div v-if="showTransferSearchButton"
        class="px-4 py-3 bg-app-surface-2/70 border-t border-app-border/70">
        <PrimaryButton type="button" data-test="transfer-search-button" block size="md" @click="navigateToTransit">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          {{ $t('SEARCH_WITH_TRANSFER') }}
        </PrimaryButton>
      </div>
    </Card>

    <!-- モーダル -->
    <ClientOnly>
      <CommonShipModal v-model:visible="modalVisible" :title="modalTitle" :type="modalType" :ship-id="modalShipId"
        :port-id="modalPortId" :port-zoom="modalPortZoom" :content="modalContent" />
      <OperationStatusModal
        v-model:visible="operationStatusModalVisible"
        :ship-name="operationStatusShipName"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, computed, watch, unref } from 'vue'
import { useHead, useI18n, useRoute, useRouter, useLocalePath } from '#imports'
import { useFerryStore } from '@/stores/ferry'
import { useHistoryStore } from '@/stores/history'
import { useSettingsStore } from '@/stores/settings'
import { useFerryData } from '@/composables/useFerryData'
import FavoriteButton from '@/components/favorites/FavoriteButton.vue'
import PortBadges from '@/components/common/PortBadges.vue'
import TimetableMap from '@/components/map/TimetableMap.vue'
import StatusAlerts from '@/components/common/StatusAlerts.vue'
import OperationStatusModal from '@/components/common/OperationStatusModal.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import Card from '@/components/common/Card.vue'
import Alert from '@/components/common/Alert.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import SecondaryButton from '@/components/common/SecondaryButton.vue'
import TransportModeFilter from '@/components/common/TransportModeFilter.vue'
import { formatDateYmdJst, getJstDateParts, getTodayJstMidnight } from '@/utils/jstDate'
import type { LocationType, TransportMode, Trip } from '@/types'

// Store and composables
const ferryStore = useFerryStore()
const historyStore = useHistoryStore()
const settingsStore = useSettingsStore()
const {
  filteredTimetable,
  timetableData,
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
const operationStatusModalVisible = ref(false)
const operationStatusShipName = ref('')

const today = getTodayJstMidnight()

// Computed properties
const selectedDateString = computed(() => {
  // JST基準で日付を取得（海外端末でも常にJST表示）
  return formatDateYmdJst(selectedDate.value)
})

const { locale, t } = useI18n()
const localePath = useLocalePath()
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

const getPortLabelParts = (port?: string, locationType?: LocationType) => {
  const label = port ? String(t(port)) : '-'
  const parenRegex = /[（(]([^）)]+)[）)]/g
  const badges: string[] = []

  let match = parenRegex.exec(label)
  while (match) {
    const value = match[1]?.trim()
    if (value) badges.push(value)
    match = parenRegex.exec(label)
  }

  const name = label.replace(parenRegex, '').replace(/\s+/g, ' ').trim()
  if (locationType) {
    const typeLabel = String(t(`LOCATION_TYPES.${locationType}`))
    if (typeLabel && typeLabel !== `LOCATION_TYPES.${locationType}`) {
      badges.push(typeLabel)
    }
  }

  return {
    name: name || label.trim(),
    badges
  }
}

const departureLabelParts = computed(() => getPortLabelParts(departure.value))
const arrivalLabelParts = computed(() => getPortLabelParts(arrival.value))

const todayString = computed(() => {
  // JST基準で本日の日付を取得（海外端末でも常にJST）
  return formatDateYmdJst(new Date())
})

const transportModeOrder: TransportMode[] = ['FERRY', 'BUS', 'AIR']
type TransportModeFilterValue = TransportMode | 'ALL'

const normalizeTransportMode = (mode?: TransportMode | string): TransportMode => {
  if (mode === 'BUS' || mode === 'AIR' || mode === 'FERRY') return mode
  return 'FERRY'
}

const availableTransportModes = computed(() => {
  const modes = new Set<TransportMode>()
  for (const trip of timetableData.value) {
    modes.add(normalizeTransportMode(trip.mode))
  }
  return transportModeOrder.filter(mode => modes.has(mode))
})

const transportModeOptions = computed(() => {
  if (availableTransportModes.value.length <= 1) return []
  return ['ALL', ...availableTransportModes.value]
})

const selectedTransportMode = ref<TransportModeFilterValue>('ALL')

watch(transportModeOptions, (options) => {
  if (!options.length) {
    selectedTransportMode.value = 'ALL'
    return
  }
  if (!options.includes(selectedTransportMode.value)) {
    selectedTransportMode.value = 'ALL'
  }
})

const filteredTimetableByMode = computed(() => {
  if (selectedTransportMode.value === 'ALL' || transportModeOptions.value.length === 0) {
    return filteredTimetable.value
  }
  return filteredTimetable.value.filter((trip) => normalizeTransportMode(trip.mode) === selectedTransportMode.value)
})

const sortedTimetable = computed(() => {
  return [...filteredTimetableByMode.value].sort((a, b) => {
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

const formatTripMeta = (trip: Trip) => {
  const parts = [
    trip.platform ? `${t('SEGMENT.PLATFORM')}: ${trip.platform}` : '',
    trip.terminal ? `${t('SEGMENT.TERMINAL')}: ${trip.terminal}` : '',
    trip.gate ? `${t('SEGMENT.GATE')}: ${trip.gate}` : ''
  ].filter(Boolean)
  return parts.join(' / ')
}

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

// 船種の運航状況に変更があるかチェック（当日のみ）
const getShipStatusAlert = (shipName: string): { hasAlert: boolean; severity: 'warning' | 'danger' | 'info' } | null => {
  // 当日以外は表示しない
  if (selectedDateString.value !== todayString.value) {
    return null
  }

  const status = ferryStore?.shipStatus
  if (!status) return null

  // いそかぜ
  if (shipName === 'ISOKAZE') {
    if (status.isokaze?.status && status.isokaze.status !== 0) {
      // status: 1=全便欠航, 2=部分欠航, 3=変更, 4=運航再開
      if (status.isokaze.status === 1) return { hasAlert: true, severity: 'danger' }
      if (status.isokaze.status === 4) return { hasAlert: true, severity: 'info' }
      return { hasAlert: true, severity: 'warning' }
    }
    return null
  }

  // フェリーどうぜん
  if (shipName === 'FERRY_DOZEN') {
    if (status.dozen?.status && status.dozen.status !== 0) {
      if (status.dozen.status === 1) return { hasAlert: true, severity: 'danger' }
      if (status.dozen.status === 4) return { hasAlert: true, severity: 'info' }
      return { hasAlert: true, severity: 'warning' }
    }
    return null
  }

  // 隠岐汽船フェリー（おき、しらしま、くにが）
  if (['FERRY_OKI', 'FERRY_SHIRASHIMA', 'FERRY_KUNIGA'].includes(shipName)) {
    const ferryState = status.ferry?.ferryState || status.ferry?.ferry_state
    if (ferryState && !['定期運航', '通常運航', '平常運航', 'Normal Operation', 'Normal Service'].includes(ferryState)) {
      if (ferryState.includes('欠航') || ferryState.includes('Cancelled') || ferryState.includes('Canceled')) {
        return { hasAlert: true, severity: 'danger' }
      }
      return { hasAlert: true, severity: 'warning' }
    }
    return null
  }

  // レインボージェット
  if (shipName === 'RAINBOWJET') {
    const fastFerryState = status.ferry?.fastFerryState || status.ferry?.fast_ferry_state
    if (fastFerryState && !['( in Operation )', '定期運航', '通常運航', '平常運航', 'Normal Operation', 'Normal Service'].includes(fastFerryState)) {
      if (fastFerryState.includes('欠航') || fastFerryState.includes('Cancelled') || fastFerryState.includes('Canceled')) {
        return { hasAlert: true, severity: 'danger' }
      }
      return { hasAlert: true, severity: 'warning' }
    }
    return null
  }

  return null
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
    path: localePath('/transit'),
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

// 運航状況モーダルを表示
const showOperationStatus = (shipName: string) => {
  operationStatusShipName.value = shipName
  operationStatusModalVisible.value = true
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
