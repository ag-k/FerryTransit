<template>
  <div class="container max-w-[1000px] mx-auto px-4 py-4">
    <h2 class="hidden lg:block text-2xl font-semibold mb-6 dark:text-white">{{ $t('TRANSIT') }}</h2>

    <!-- Current status alerts -->
    <StatusAlerts class="mb-6" />

    <!-- Search Form -->
    <div class="mb-6">
      <h3 class="sr-only">{{ $t('SEARCH_CONDITIONS') }}</h3>
      <!-- Port Selection -->
      <div class="mb-3">
          <!-- Mobile: TimetableForm と同じ（2つのセレクト + 右側に入替ボタン） -->
          <div class="md:hidden">
            <div class="flex items-start gap-2">
              <div class="flex-grow space-y-2">
                <div class="flex items-start gap-2">
                  <div class="flex-1">
                    <PortSelector
                      v-model="departure"
                      :label="$t('_FROM')"
                      :placeholder="$t('DEPARTURE')"
                      :disabled-ports="[arrival]"
                      margin="none"
                    />
                  </div>
                </div>

                <div class="flex items-start gap-2">
                  <div class="flex-1">
                    <PortSelector
                      v-model="arrival"
                      :label="$t('_TO')"
                      :placeholder="$t('ARRIVAL')"
                      :disabled-ports="[departure]"
                      margin="none"
                    />
                  </div>
                </div>
              </div>

              <div class="flex items-center self-center">
                <button
                  type="button"
                  class="p-3 text-base border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0 touch-manipulation"
                  title="出発地と到着地を入れ替え"
                  aria-label="Reverse route"
                  @click="reverseRoute"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor"
                    viewBox="0 0 16 16" aria-hidden="true">
                    <path fill-rule="evenodd"
                      d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Desktop: 従来どおり（横並び） -->
          <div class="hidden md:block">
            <div class="grid md:grid-cols-12 gap-4">
              <div class="md:col-span-5">
                <div class="flex items-start gap-2">
                  <div class="flex-1">
                    <PortSelector
                      v-model="departure"
                      :label="$t('_FROM')"
                      :placeholder="$t('DEPARTURE')"
                      :disabled-ports="[arrival]"
                      margin="none"
                    />
                  </div>
                </div>
              </div>

              <div class="md:col-span-2 flex justify-center mt-7">
                <button
                  type="button"
                  class="px-3 py-2 text-base border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0 touch-manipulation"
                  title="出発地と到着地を入れ替え"
                  aria-label="Reverse route"
                  @click="reverseRoute"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                    fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                    <path fill-rule="evenodd"
                      d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z" />
                  </svg>
                </button>
              </div>

              <div class="md:col-span-5">
                <div class="flex items-start gap-2">
                  <div class="flex-1">
                    <PortSelector
                      v-model="arrival"
                      :label="$t('_TO')"
                      :placeholder="$t('ARRIVAL')"
                      :disabled-ports="[departure]"
                      margin="none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      <!-- Date and Time Selection -->
      <div class="grid md:grid-cols-2 gap-3 mb-3">
        <!-- Date Selection -->
        <div>
          <DatePicker v-model="date" :min-date="today" margin="none" size="compact" />
        </div>

        <!-- Time Selection -->
        <div>
          <span class="sr-only">{{ $t('TIME') }}</span>
          <div class="flex">
            <select v-model="isArrivalMode"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              style="min-width: 140px"
              :aria-label="$t('TIME')"
            >
              <option :value="false">{{ $t('DEPARTURE_AFTER') }}</option>
              <option :value="true">{{ $t('ARRIVE_BY') }}</option>
            </select>
            <input :id="timeInputId" v-model="time" type="time"
              class="flex-1 px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
          </div>
        </div>
      </div>

      <!-- Search Button -->
      <div>
        <button type="button"
          class="w-full px-8 py-3 text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 active:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transform active:scale-95 transition-all duration-150 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center shadow-sm hover:shadow-md"
          :disabled="!canSearch || isSearching" @click="handleSearch">
          <span v-if="isSearching"
            class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {{ $t('SEARCH') }}
        </button>
      </div>
    </div>

    <!-- Search Results -->
    <div v-if="searchResults.length > 0">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
          {{ $t('SEARCH_RESULTS') }}
        </h3>
        <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ $t('SORT_ORDER') }}
          </span>
          <div class="flex flex-wrap gap-2" role="tablist" :aria-label="$t('SORT_ORDER')">
            <button v-for="option in sortOptions" :key="option.value" type="button" role="tab"
              :aria-selected="sortOption === option.value"
              class="px-3 py-2 text-sm font-medium rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center justify-center"
              :class="sortOption === option.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700'"
              @click="sortOption = option.value">
              {{ $t(option.labelKey) }}
            </button>
          </div>
        </div>
      </div>
      <!-- Route Panels -->
      <div v-for="(route, index) in displayedResults" :key="index" class="mb-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm ring-1 ring-blue-600 dark:ring-blue-500">
          <div
            class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 flex items-center justify-between rounded-t-lg border-b border-gray-200 dark:border-gray-700"
            data-testid="transit-result-header"
          >
            <h3 class="font-medium flex items-center gap-3 min-w-0">
              <span
                class="inline-flex items-center justify-center w-7 h-7 bg-blue-600 text-white dark:bg-blue-600 dark:text-white rounded-full font-bold text-sm">
                {{ index + 1 }}
              </span>

              <!-- 中央ブロック: (時刻 + 所要時間/料金) -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
                <!-- 1行目（モバイル）: 時刻 -->
                <span
                  class="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200 truncate"
                  data-testid="transit-header-times"
                >
                  {{ formatTime(route.departureTime) }}→{{ formatTime(route.arrivalTime) }}
                </span>

                <!-- 2行目（モバイル）: 所要時間/料金 -->
                <span class="text-sm text-gray-700 dark:text-gray-200 truncate" data-testid="transit-header-summary">
                  {{ calculateDuration(route.departureTime, route.arrivalTime) }} /
                  <span v-if="route.totalFare > 0">¥{{ route.totalFare.toLocaleString() }}</span>
                  <span v-else class="text-yellow-700 dark:text-yellow-300">{{ $t('FARE_UNAVAILABLE') }}</span>
                </span>
              </div>

              <!-- 右ブロック: バッジ（欠航/変更あり） -->
              <div class="flex items-center gap-2 shrink-0">
                <span
                  v-if="hasCancelledSegment(route)"
                  class="inline-flex items-center rounded-md bg-red-600/95 px-2 py-1 text-xs font-bold text-white ring-1 ring-white/25"
                  :title="$t('CANCELLED')"
                  data-testid="route-badge-cancelled"
                >
                  {{ $t('CANCELLED') }}
                </span>
                <span
                  v-if="hasChangedSegment(route)"
                  class="inline-flex items-center rounded-md bg-yellow-300 px-2 py-1 text-xs font-bold text-gray-900 ring-1 ring-black/10 dark:bg-yellow-400"
                  :title="$t('CHANGED')"
                  data-testid="route-badge-changed"
                >
                  {{ $t('CHANGED') }}
                </span>
              </div>
            </h3>
            <div class="flex items-center gap-2">
              <button
                class="text-gray-600 hover:text-blue-600 dark:text-gray-200 dark:hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-300 rounded p-1"
                :title="$t('SHOW_ON_MAP')" @click="showRouteMap(route)">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              <FavoriteButton :type="'route'" :route="{ departure: departure, arrival: arrival }"
                class="text-gray-600 hover:text-blue-600 dark:text-gray-200 dark:hover:text-yellow-300" />
            </div>
          </div>
          <div class="p-4">
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th class="text-left pb-2 font-medium w-1/4 dark:text-gray-100">{{ $t('TIME') }}</th>
                  <th class="text-left pb-2 font-medium dark:text-gray-100">{{ $t('ROUTE') }}</th>
                  <th class="text-left pb-2 font-medium w-1/4 dark:text-gray-100">{{ $t('FARE') }}</th>
                </tr>
              </thead>
              <tbody>
                <!-- Departure -->
                <tr class="bg-[#D8ECF3] dark:bg-blue-900/40">
                  <td class="py-2 pl-4 pr-4 text-left dark:text-gray-100">{{ formatTime(route.departureTime) }}</td>
                  <td class="py-2 pl-4">
                    <a href="#" class="text-blue-600 dark:text-blue-200 hover:underline"
                      @click.prevent="showPortInfo(route.segments[0].departure)">
                      {{ getPortDisplayName(route.segments[0].departure) }}
                    </a>
                  </td>
                  <td class="py-2"></td>
                </tr>

                <!-- Segments -->
                <template v-for="(segment, segIndex) in route.segments" :key="'seg-' + segIndex">
                  <!-- Ship Row -->
                  <tr class="bg-white dark:bg-gray-800">
                    <td class="py-2 pl-4 pr-4 text-right dark:text-gray-100">
                      {{ formatSegmentDuration(segment.departureTime, segment.arrivalTime) }}
                    </td>
                    <td class="py-2 pl-4" :style="getShipBorderStyle(segment.ship)">
                      <div class="flex items-center">
                        <span v-if="segment.status === 2" class="mr-2 text-red-600 dark:text-red-300">×</span>
                        <span v-else-if="segment.status === 3"
                          class="mr-2 text-yellow-600 dark:text-yellow-300">⚠</span>
                        <span v-else-if="segment.status === 4" class="mr-2 text-green-600 dark:text-green-300">+</span>
                        <a href="#" class="text-blue-600 dark:text-blue-200 hover:underline"
                          @click.prevent="showShipInfo(segment.ship)">
                          {{ $t(segment.ship) }}
                        </a>
                      </div>
                    </td>
                    <td class="py-2 dark:text-gray-100">
                    <span v-if="segment.fare > 0">¥{{ segment.fare.toLocaleString() }}</span>
                    <span v-else class="text-gray-500">{{ $t('FARE_UNAVAILABLE') }}</span>
                  </td>
                  </tr>

                  <!-- Transfer Port (if not last segment) -->
                  <tr v-if="segIndex < route.segments.length - 1" class="bg-[#D8ECF3] dark:bg-blue-900/40">
                    <td class="py-2 pl-4 pr-4 text-left dark:text-gray-100 whitespace-pre-line">
                      {{ formatTransferPortTimes(segment.arrivalTime, route.segments[segIndex + 1].departureTime) }}
                    </td>
                    <td class="py-2 pl-4">
                      <a href="#" class="text-blue-600 dark:text-blue-200 hover:underline"
                        @click.prevent="showPortInfo(segment.arrival)">
                        {{ getPortDisplayName(segment.arrival) }}
                      </a>
                      <span class="text-xs text-gray-600 dark:text-gray-400 ml-2">
                        ({{ $t('TRANSFER') }}) {{ formatTransferWaitTime(segment.arrivalTime, route.segments[segIndex +
                          1].departureTime) }}
                      </span>
                    </td>
                    <td class="py-2"></td>
                  </tr>
                </template>

                <!-- Arrival -->
                <tr class="bg-[#D8ECF3] dark:bg-blue-900/40">
                  <td class="py-2 pl-4 pr-4 text-left dark:text-gray-100">{{ formatTime(route.arrivalTime) }}</td>
                  <td class="py-2 pl-4">
                    <a href="#" class="text-blue-600 dark:text-blue-200 hover:underline"
                      @click.prevent="showPortInfo(route.segments[route.segments.length - 1].arrival)">
                      {{ getPortDisplayName(route.segments[route.segments.length - 1].arrival) }}
                    </a>
                  </td>
                  <td class="py-2 font-medium dark:text-gray-100">
                    <span v-if="route.totalFare > 0">{{ $t('TOTAL') }}: ¥{{ route.totalFare.toLocaleString() }}</span>
                    <span v-else class="text-gray-500">{{ $t('FARE_UNAVAILABLE') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Show More Button -->
      <div v-if="searchResults.length > displayLimit" class="mt-4">
        <button
          class="w-full py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transform active:scale-[0.98] transition-all duration-150 shadow-sm hover:shadow-md"
          @click="showMore">
          {{ $t('MORE_BUTTON') }}
        </button>
      </div>
    </div>

    <!-- No Results -->
    <div v-else-if="hasSearched && !isSearching"
      class="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-gray-700 text-blue-800 dark:text-blue-300 px-4 py-3 rounded">
      <div class="flex flex-col gap-3">
        <p class="font-medium">
          {{ $t('NO_ROUTES_FOUND') }}
        </p>
        <button
          type="button"
          class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-200 bg-white/90 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canSearch || isSearching"
          data-testid="transit-retry-search"
          @click="retrySearchWithAdjustedTime"
        >
          {{ retrySearchLabel }}
        </button>
      </div>
    </div>

    <!-- Route Details Modal -->
    <CommonShipModal v-model:visible="showDetailsModal" :title="$t('ROUTE_DETAILS')" type="custom">
      <div v-if="selectedRoute">
        <div v-for="(segment, index) in selectedRoute.segments" :key="index" class="mb-3">
          <div class="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
            <div class="p-4">
              <h6 class="text-sm text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white dark:bg-blue-700 rounded-full font-bold text-xs">
                  {{ index + 1 }}
                </span>
                <span>{{ $t('LEG') }}</span>
              </h6>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div class="md:col-span-2 dark:text-gray-300">
                  <strong>{{ formatTime(segment.departureTime) }}</strong><br>
                  {{ getPortDisplayName(segment.departure) }}
                </div>
                <div class="md:col-span-1 text-center">
                  <div class="mt-2 dark:text-gray-300">→</div>
                  <small class="text-gray-500 dark:text-gray-300">{{ $t(segment.ship) }}</small>
                </div>
                <div class="md:col-span-2 text-right dark:text-gray-300">
                  <strong>{{ formatTime(segment.arrivalTime) }}</strong><br>
                  {{ getPortDisplayName(segment.arrival) }}
                </div>
              </div>
              <div class="mt-2">
                <small class="text-gray-500 dark:text-gray-300">
                  {{ $t('FARE') }}: 
                  <span v-if="segment.fare > 0">¥{{ segment.fare.toLocaleString() }}</span>
                  <span v-else class="text-gray-500">{{ $t('FARE_UNAVAILABLE') }}</span>
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div class="dark:text-gray-300">
              <strong>{{ $t('TOTAL_DURATION') }}:</strong>
              {{ calculateDuration(selectedRoute.departureTime, selectedRoute.arrivalTime) }}
            </div>
            <div class="text-right dark:text-gray-300">
              <strong>{{ $t('TOTAL_FARE') }}:</strong>
              <span v-if="selectedRoute.totalFare > 0">¥{{ selectedRoute.totalFare.toLocaleString() }}</span>
              <span v-else class="text-gray-500">{{ $t('FARE_UNAVAILABLE') }}</span>
            </div>
          </div>
        </div>
      </div>
    </CommonShipModal>

    <!-- Ship Info Modal -->
    <CommonShipModal v-model:visible="showShipModal" :title="$t(modalShipId)" type="ship" :ship-id="modalShipId" />

    <!-- Port Info Modal -->
    <CommonShipModal v-model:visible="showPortModal" :title="getPortDisplayName(modalPortId)" type="port"
      :port-id="modalPortId" :port-zoom="modalPortZoom" />

    <!-- Route Map Modal -->
    <RouteMapModal v-model:visible="showMapModal" :route="selectedMapRoute" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, getCurrentInstance, markRaw } from 'vue'
import { useRouteSearch } from '@/composables/useRouteSearch'
import { useHistoryStore } from '@/stores/history'
import { useFerryStore } from '@/stores/ferry'
import PortSelector from '@/components/common/PortSelector.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import CommonShipModal from '@/components/common/ShipModal.vue'
import StatusAlerts from '@/components/common/StatusAlerts.vue'
import FavoriteButton from '@/components/favorites/FavoriteButton.vue'
import RouteMapModal from '@/components/map/RouteMapModal.vue'
import type { TransitRoute } from '@/types'
import { createLogger } from '~/utils/logger'

// Stores
const ferryStore = process.client ? useFerryStore() : null
const historyStore = process.client ? useHistoryStore() : null
const logger = createLogger('TransitPage')

// Search parameters - use refs for better reactivity
const departure = ref(ferryStore?.departure || '')
const arrival = ref(ferryStore?.arrival || '')
const date = ref(new Date())
const time = ref('')
const timeInputId = 'transit-time-input'
const isArrivalMode = ref(false)
const historySearchedAt = ref<Date | null>(null)

// Watch for changes in departure/arrival and update ferryStore
watch(departure, (newVal) => {
  if (ferryStore) {
    ferryStore.setDeparture(newVal)
  }
})

watch(arrival, (newVal) => {
  if (ferryStore) {
    ferryStore.setArrival(newVal)
  }
})

// Watch for changes in ferryStore and update local refs
watch(() => ferryStore?.departure, (newVal) => {
  if (newVal && departure.value !== newVal) {
    departure.value = newVal
  }
})

watch(() => ferryStore?.arrival, (newVal) => {
  if (newVal && arrival.value !== newVal) {
    arrival.value = newVal
  }
})

// State
const isSearching = ref(false)
const hasSearched = ref(false)
const searchResults = ref<TransitRoute[]>([])
const displayLimit = ref(5)
const showDetailsModal = ref(false)
const selectedRoute = ref<TransitRoute | null>(null)

type SortKey = 'recommended' | 'fast' | 'cheap' | 'easy'

const sortOptions: Array<{ value: SortKey; labelKey: string }> = [
  { value: 'recommended', labelKey: 'SORT_RECOMMENDED' },
  { value: 'fast', labelKey: 'SORT_FAST' },
  { value: 'cheap', labelKey: 'SORT_CHEAP' },
  { value: 'easy', labelKey: 'SORT_EASY' }
]

const sortOption = ref<SortKey>('recommended')

// Composables
const { searchRoutes, formatTime, calculateDuration, getPortDisplayName } = useRouteSearch()
const { t } = useI18n()

const hasCancelledSegment = (route: TransitRoute): boolean => {
  return Array.isArray(route?.segments) && route.segments.some(s => s.status === 2)
}

const hasChangedSegment = (route: TransitRoute): boolean => {
  return Array.isArray(route?.segments) && route.segments.some(s => s.status === 3)
}

const cloneRouteForState = (route: TransitRoute): TransitRoute => {
  const segments = Array.isArray(route.segments)
    ? route.segments.map(segment => markRaw({
      ...segment
    }))
    : []

  return markRaw({
    ...route,
    segments
  })
}

const normalizeTransitRoutes = (routes: TransitRoute[]): TransitRoute[] => {
  return routes.map(cloneRouteForState)
}

const setSearchResults = (routes: TransitRoute[] = []) => {
  searchResults.value = normalizeTransitRoutes(routes)
}

const setSelectedRoute = (route: TransitRoute | null) => {
  selectedRoute.value = route ? cloneRouteForState(route) : null
}

const instance = getCurrentInstance()
if (instance?.proxy) {
  Object.defineProperty(instance.proxy, 'searchResults', {
    get() {
      return searchResults.value
    },
    set(value: TransitRoute[] | null | undefined) {
      if (Array.isArray(value)) {
        setSearchResults(value)
      } else {
        setSearchResults([])
      }
    },
    configurable: true,
    enumerable: true
  })
  Object.defineProperty(instance.proxy, 'selectedRoute', {
    get() {
      return selectedRoute.value
    },
    set(value: TransitRoute | null | undefined) {
      setSelectedRoute(value ?? null)
    },
    configurable: true,
    enumerable: true
  })
}

// Constants
const today = new Date()
today.setHours(0, 0, 0, 0)

// Computed
const canSearch = computed(() => {
  return departure.value &&
    arrival.value &&
    departure.value !== arrival.value
})

const sortedResults = computed(() => {
  const routes = [...searchResults.value]
  if (routes.length <= 1) {
    return routes
  }

  // まず出発時刻順にソート（最適化のための準備）
  routes.sort((a, b) => {
    const departureDiff = a.departureTime.getTime() - b.departureTime.getTime()
    if (departureDiff !== 0) {
      return departureDiff
    }
    // 出発時刻が同じ場合は到着時刻の早い順
    return a.arrivalTime.getTime() - b.arrivalTime.getTime()
  })

  // 同じ出発時刻でより遅く到着する結果を除外
  const filteredRoutes: TransitRoute[] = []
  const departureTimeGroups = new Map<number, TransitRoute[]>()

  // 出発時刻ごとにグループ化
  for (const route of routes) {
    const departureTime = route.departureTime.getTime()
    if (!departureTimeGroups.has(departureTime)) {
      departureTimeGroups.set(departureTime, [])
    }
    departureTimeGroups.get(departureTime)!.push(route)
  }

  // 各グループから到着時刻が最も早いものだけを残す
  for (const [, groupRoutes] of departureTimeGroups) {
    // 到着時刻が最も早いものを選択
    const bestRoute = groupRoutes.reduce((best, current) => {
      return current.arrivalTime.getTime() < best.arrivalTime.getTime() ? current : best
    })
    filteredRoutes.push(bestRoute)
  }

  // ソートオプションに応じて並び替え
  const getDurationMinutes = (route: TransitRoute): number => {
    return (route.arrivalTime.getTime() - route.departureTime.getTime()) / (1000 * 60)
  }

  const compareByDepartureTime = (a: TransitRoute, b: TransitRoute): number => {
    const departureDiff = a.departureTime.getTime() - b.departureTime.getTime()
    if (departureDiff !== 0) {
      return departureDiff
    }
    // 出発時刻が同じ場合は到着時刻の早い順
    return a.arrivalTime.getTime() - b.arrivalTime.getTime()
  }

  const compareByDuration = (a: TransitRoute, b: TransitRoute): number => {
    const diff = getDurationMinutes(a) - getDurationMinutes(b)
    if (diff !== 0) {
      return diff
    }
    const fareDiff = a.totalFare - b.totalFare
    if (fareDiff !== 0) {
      return fareDiff
    }
    return compareByDepartureTime(a, b)
  }

  const compareByFare = (a: TransitRoute, b: TransitRoute): number => {
    const diff = a.totalFare - b.totalFare
    if (diff !== 0) {
      return diff
    }
    // 同じ金額の場合は時系列順（出発時刻順）
    return compareByDepartureTime(a, b)
  }

  const compareByTransfer = (a: TransitRoute, b: TransitRoute): number => {
    const diff = a.transferCount - b.transferCount
    if (diff !== 0) {
      return diff
    }
    // 同じ乗り換え回数の場合は時系列順（出発時刻順）
    return compareByDepartureTime(a, b)
  }

  if (sortOption.value === 'fast') {
    return filteredRoutes.sort(compareByDuration)
  }
  if (sortOption.value === 'cheap') {
    return filteredRoutes.sort(compareByFare)
  }
  if (sortOption.value === 'easy') {
    return filteredRoutes.sort(compareByTransfer)
  }

  // 時系列順（出発時刻順）でソート
  return filteredRoutes.sort(compareByDepartureTime)
})

const displayedResults = computed(() => {
  return sortedResults.value.slice(0, displayLimit.value)
})

const RETRY_TIME_SHIFT_MINUTES = 60

const retrySearchLabel = computed(() => {
  return isArrivalMode.value
    ? t('TRANSIT_RETRY_LATER', { minutes: RETRY_TIME_SHIFT_MINUTES })
    : t('TRANSIT_RETRY_EARLIER', { minutes: RETRY_TIME_SHIFT_MINUTES })
})

// Methods
function getCurrentTimeString(): string {
  const now = new Date()
  const hours = Math.floor(now.getHours() / 1) * 1
  const minutes = Math.floor(now.getMinutes() / 15) * 15
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function buildSearchDateTime(baseDate: Date, timeStr: string): Date {
  const dt = new Date(baseDate)
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  dt.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
  return dt
}

function formatHHMM(dt: Date): string {
  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function clampToMinDateTime(dt: Date): Date {
  // DatePicker の min-date は「今日」なので、今日より前に落ちる場合は今日の 00:00 に丸める
  const min = new Date(today)
  min.setHours(0, 0, 0, 0)
  if (dt.getTime() < min.getTime()) {
    return min
  }
  return dt
}

async function retrySearchWithAdjustedTime() {
  if (!canSearch.value || isSearching.value) return

  const deltaMinutes = isArrivalMode.value ? RETRY_TIME_SHIFT_MINUTES : -RETRY_TIME_SHIFT_MINUTES
  const current = buildSearchDateTime(date.value, time.value)
  const next = new Date(current.getTime() + deltaMinutes * 60 * 1000)
  const clamped = clampToMinDateTime(next)

  // date は日付のみを保持し、time は HH:MM で保持
  date.value = new Date(clamped.getFullYear(), clamped.getMonth(), clamped.getDate())
  time.value = formatHHMM(clamped)

  await handleSearch()
}

function reverseRoute() {
  const temp = departure.value
  departure.value = arrival.value
  arrival.value = temp
  // ferryStore will be updated via the watch handlers
}

function getShipBorderStyle(ship: string): string {
  const borderStyles: Record<string, string> = {
    'FERRY_OKI': 'border-left: double 10px #DA6272',
    'FERRY_SHIRASHIMA': 'border-left: double 10px #DA6272',
    'FERRY_KUNIGA': 'border-left: double 10px #DA6272',
    'FERRY_DOZEN': 'border-left: double 10px #F3C759',
    'ISOKAZE': 'border-left: double 10px #45A1CF',
    'RAINBOWJET': 'border-left: double 10px #40BFB0'
  }
  return borderStyles[ship] || 'border-left: double 10px #888888'
}

const formatTransferPortTimes = (arrivalTime: Date, nextDepartureTime: Date): string => {
  return `${formatTime(arrivalTime)}${t('TRANSFER_ARRIVAL_MARK')}
${formatTime(nextDepartureTime)}${t('TRANSFER_DEPARTURE_MARK')}`
}

const formatTransferWaitTime = (arrivalTime: Date, nextDepartureTime: Date): string => {
  const waitMillis = nextDepartureTime.getTime() - arrivalTime.getTime()
  if (waitMillis <= 0) {
    return t('TRANSFER_WAIT_TIME_SHORT')
  }
  const duration = calculateDuration(arrivalTime, nextDepartureTime)
  return t('TRANSFER_WAIT_TIME', { duration })
}

const formatSegmentDuration = (departureTime: Date, arrivalTime: Date): string => {
  const duration = calculateDuration(departureTime, arrivalTime)
  return duration
}

// Modal state
const showShipModal = ref(false)
const showPortModal = ref(false)
const modalShipId = ref('')
const modalPortId = ref('')
const showMapModal = ref(false)
const selectedMapRoute = ref<TransitRoute | null>(null)

const modalPortZoom = computed<number>(() => {
  const id = modalPortId.value
  if (!id) return 15
  return id === 'BEPPU' ? 17
    : id === 'HISHIURA' ? 18
    : id === 'KURI' ? 18
    : 15
})

function showShipInfo(shipName: string) {
  modalShipId.value = shipName
  showShipModal.value = true
}

function showPortInfo(portName: string) {
  modalPortId.value = portName
  showPortModal.value = true
}

async function handleSearch() {
  if (!canSearch.value) {
    logger.warn('Cannot search - missing required fields')
    return
  }

  logger.debug('Starting search', {
    departure: departure.value,
    arrival: arrival.value,
    date: date.value,
    time: time.value,
    isArrivalMode: isArrivalMode.value
  })
  isSearching.value = true
  hasSearched.value = true
  displayLimit.value = 5

  try {
    const results = await searchRoutes(
      departure.value,
      arrival.value,
      date.value,
      time.value,
      isArrivalMode.value
    )

    logger.debug('Search results', results)
    setSelectedRoute(null)
    setSearchResults(results)

    // Add to search history
    if (historyStore) {
      // Create a proper Date object for the time by combining date and time
      const searchDateTime = new Date(date.value)
      if (time.value) {
        const [hours, minutes] = time.value.split(':')
        searchDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      }

      // 検索履歴から再検索の場合は、元の検索日時を使用
      historyStore.addSearchHistory({
        type: 'route',
        departure: departure.value,
        arrival: arrival.value,
        date: date.value,
        time: searchDateTime,
        isArrivalMode: isArrivalMode.value
      }, historySearchedAt.value || undefined)
    }
  } catch (error) {
    logger.error('Search error', error)
    setSelectedRoute(null)
    setSearchResults([])
  } finally {
    isSearching.value = false
  }
}

function showMore() {
  displayLimit.value += 10
}

function showRouteMap(route: TransitRoute) {
  selectedMapRoute.value = route
  showMapModal.value = true
}

// 出発地または目的地が変更されたら、モーダルの地図上のルートを一旦クリア
watch([departure, arrival], async () => {
  // まずクリア
  selectedMapRoute.value = null
  if (showMapModal.value) {
    await nextTick()
  }
})

// Initialize from URL parameters
onMounted(() => {
  const route = useRoute()

  // URLパラメータから設定 (時刻より先に他のパラメータを設定)
  if (route.query.departure) {
    departure.value = route.query.departure as string
  }
  if (route.query.arrival) {
    arrival.value = route.query.arrival as string
  }
  if (route.query.date) {
    date.value = new Date(route.query.date as string)
  }
  if (route.query.time) {
    time.value = route.query.time as string
  } else {
    // URLパラメータに時刻がない場合のみ現在時刻を設定
    time.value = getCurrentTimeString()
  }
  if (route.query.isArrivalMode) {
    isArrivalMode.value = route.query.isArrivalMode === '1'
  }
  // 検索履歴から遷移してきた場合は、元の検索日時を保持
  if (route.query.searchedAt) {
    historySearchedAt.value = new Date(route.query.searchedAt as string)
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('TRANSIT')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>
