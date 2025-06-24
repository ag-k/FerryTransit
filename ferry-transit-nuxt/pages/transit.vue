<template>
  <div class="container max-w-[1000px] mx-auto px-4 py-8">
    <h2 class="text-2xl font-semibold mb-6">{{ $t('TRANSIT') }}</h2>
    
    <!-- Search Form -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div class="bg-gray-50 px-4 py-3 border-b">
        <h3 class="text-lg font-medium">{{ $t('SEARCH_CONDITIONS') }}</h3>
      </div>
      <div class="p-4">
        <!-- Port Selection -->
        <div class="grid md:grid-cols-12 gap-4 mb-4">
          <div class="md:col-span-5">
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <PortSelector
                  v-model="searchParams.departure"
                  :label="$t('_FROM')"
                  :placeholder="$t('DEPARTURE')"
                  :disabled-ports="[searchParams.arrival]"
                />
              </div>
              <FavoriteButton
                v-if="searchParams.departure"
                :type="'port'"
                :port="searchParams.departure"
                class="mt-8"
              />
            </div>
          </div>
          
          <div class="md:col-span-2 flex items-end justify-center mb-4">
            <button 
              type="button" 
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md"
              @click="reverseRoute"
              aria-label="Reverse route"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
              </svg>
            </button>
          </div>
          
          <div class="md:col-span-5">
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <PortSelector
                  v-model="searchParams.arrival"
                  :label="$t('_TO')"
                  :placeholder="$t('ARRIVAL')"
                  :disabled-ports="[searchParams.departure]"
                />
              </div>
              <FavoriteButton
                v-if="searchParams.arrival"
                :type="'port'"
                :port="searchParams.arrival"
                class="mt-8"
              />
            </div>
          </div>
        </div>
        
        <!-- Date Selection -->
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <DatePicker
              v-model="searchParams.date"
              :label="$t('DATE')"
              :min-date="today"
            />
          </div>
        </div>
        
        <!-- Time Selection -->
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('TIME') }}</label>
            <div class="flex">
              <select 
                v-model="searchParams.isArrivalMode"
                class="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style="min-width: 140px"
              >
                <option :value="false">{{ $t('DEPARTURE_AFTER') }}</option>
                <option :value="true">{{ $t('ARRIVE_BY') }}</option>
              </select>
              <input 
                type="time"
                v-model="searchParams.time"
                class="flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
          </div>
        </div>
        
        <!-- Search Button -->
        <div>
          <button 
            type="button"
            class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform active:scale-95 transition-all duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none flex items-center shadow-sm hover:shadow-md"
            :disabled="!canSearch || isSearching"
            @click="handleSearch"
          >
            <span v-if="isSearching" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {{ $t('SEARCH') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Search Results -->
    <div v-if="searchResults.length > 0">
      <!-- Route Panels -->
      <div v-for="(route, index) in displayedResults" :key="index" class="mb-4">
        <div class="bg-white rounded-lg shadow-sm border border-blue-600">
          <div class="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
            <h3 class="font-medium">{{ $t('ROUTE') }}{{ index + 1 }}</h3>
            <FavoriteButton
              :type="'route'"
              :route="{ departure: searchParams.departure, arrival: searchParams.arrival }"
              class="text-white hover:text-yellow-300"
            />
          </div>
          <div class="p-4">
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th class="text-left pb-2 font-medium w-1/4">{{ $t('TIME') }}</th>
                  <th class="text-left pb-2 font-medium">{{ $t('ROUTE') }}</th>
                  <th class="text-left pb-2 font-medium w-1/4">{{ $t('FARE') }}</th>
                </tr>
              </thead>
              <tbody>
                <!-- Departure -->
                <tr style="background-color: #D8ECF3;">
                  <td class="py-2 text-right pr-4">{{ formatTime(route.departureTime) }}</td>
                  <td class="py-2 pl-4">
                    <a href="#" @click.prevent="showPortInfo(route.segments[0].departure)" class="text-blue-600 hover:underline">
                      {{ getPortDisplayName(route.segments[0].departure) }}
                    </a>
                  </td>
                  <td class="py-2"></td>
                </tr>
                
                <!-- Segments -->
                <template v-for="(segment, segIndex) in route.segments" :key="'seg-' + segIndex">
                  <!-- Ship Row -->
                  <tr class="bg-white">
                    <td class="py-2 text-right pr-4">↓</td>
                    <td class="py-2 pl-4" :style="getShipBorderStyle(segment.ship)">
                      <div class="flex items-center">
                        <span v-if="segment.status === 2" class="mr-2 text-red-600">×</span>
                        <span v-else-if="segment.status === 3" class="mr-2 text-yellow-600">⚠</span>
                        <span v-else-if="segment.status === 4" class="mr-2 text-green-600">+</span>
                        <a href="#" @click.prevent="showShipInfo(segment.ship)" class="text-blue-600 hover:underline">
                          {{ $t(segment.ship) }}
                        </a>
                      </div>
                    </td>
                    <td class="py-2">¥{{ segment.fare.toLocaleString() }}</td>
                  </tr>
                  
                  <!-- Transfer Port (if not last segment) -->
                  <tr v-if="segIndex < route.segments.length - 1" style="background-color: #D8ECF3;">
                    <td class="py-2 text-right pr-4">{{ formatTime(segment.arrivalTime) }}</td>
                    <td class="py-2 pl-4">
                      <a href="#" @click.prevent="showPortInfo(segment.arrival)" class="text-blue-600 hover:underline">
                        {{ getPortDisplayName(segment.arrival) }}
                      </a>
                      <span class="text-xs text-gray-600 ml-2">({{ $t('TRANSFER') }})</span>
                    </td>
                    <td class="py-2"></td>
                  </tr>
                </template>
                
                <!-- Arrival -->
                <tr style="background-color: #D8ECF3;">
                  <td class="py-2 text-right pr-4">{{ formatTime(route.arrivalTime) }}</td>
                  <td class="py-2 pl-4">
                    <a href="#" @click.prevent="showPortInfo(route.segments[route.segments.length - 1].arrival)" class="text-blue-600 hover:underline">
                      {{ getPortDisplayName(route.segments[route.segments.length - 1].arrival) }}
                    </a>
                  </td>
                  <td class="py-2 font-medium">
                    {{ $t('TOTAL') }}: ¥{{ route.totalFare.toLocaleString() }}
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
          @click="showMore"
          class="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform active:scale-[0.98] transition-all duration-150 shadow-sm hover:shadow-md"
        >
          {{ $t('MORE_BUTTON') }}
        </button>
      </div>
    </div>
    
    <!-- No Results -->
    <div v-else-if="hasSearched && !isSearching" class="bg-blue-100 border border-blue-200 text-blue-800 px-4 py-3 rounded">
      {{ $t('NO_ROUTES_FOUND') }}
    </div>
    
    <!-- Route Details Modal -->
    <CommonShipModal
      v-model:visible="showDetailsModal"
      :title="$t('ROUTE_DETAILS')"
      type="custom"
    >
      <div v-if="selectedRoute">
        <div v-for="(segment, index) in selectedRoute.segments" :key="index" class="mb-3">
          <div class="bg-white border rounded-lg">
            <div class="p-4">
              <h6 class="text-sm text-gray-600 mb-2">
                {{ $t('LEG') }} {{ index + 1 }}
              </h6>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div class="md:col-span-2">
                  <strong>{{ formatTime(segment.departureTime) }}</strong><br>
                  {{ getPortDisplayName(segment.departure) }}
                </div>
                <div class="md:col-span-1 text-center">
                  <div class="mt-2">→</div>
                  <small class="text-gray-500">{{ $t(segment.ship) }}</small>
                </div>
                <div class="md:col-span-2 text-right">
                  <strong>{{ formatTime(segment.arrivalTime) }}</strong><br>
                  {{ getPortDisplayName(segment.arrival) }}
                </div>
              </div>
              <div class="mt-2">
                <small class="text-gray-500">
                  {{ $t('FARE') }}: ¥{{ segment.fare.toLocaleString() }}
                </small>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-3 p-3 bg-gray-100 rounded">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <strong>{{ $t('TOTAL_DURATION') }}:</strong> 
              {{ calculateDuration(selectedRoute.departureTime, selectedRoute.arrivalTime) }}
            </div>
            <div class="text-right">
              <strong>{{ $t('TOTAL_FARE') }}:</strong> 
              ¥{{ selectedRoute.totalFare.toLocaleString() }}
            </div>
          </div>
        </div>
      </div>
    </CommonShipModal>
    
    <!-- Ship Info Modal -->
    <CommonShipModal
      v-model:visible="showShipModal"
      :title="$t(modalShipId)"
      type="ship"
      :ship-id="modalShipId"
    />
    
    <!-- Port Info Modal -->
    <CommonShipModal
      v-model:visible="showPortModal"
      :title="getPortDisplayName(modalPortId)"
      type="port"
      :port-id="modalPortId"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouteSearch } from '@/composables/useRouteSearch'
import { useHistoryStore } from '@/stores/history'
import { useFerryStore } from '@/stores/ferry'
import PortSelector from '@/components/common/PortSelector.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import CommonShipModal from '@/components/common/ShipModal.vue'
import FavoriteButton from '@/components/favorites/FavoriteButton.vue'
import type { TransitRoute } from '@/types'

// Stores
const ferryStore = useFerryStore()
const historyStore = useHistoryStore()

// Search parameters
const searchParams = reactive({
  departure: ferryStore.departure,
  arrival: ferryStore.arrival,
  date: new Date(),
  time: getCurrentTimeString(),
  isArrivalMode: false
})

// Watch for changes in searchParams and update ferryStore
watch(() => searchParams.departure, (newVal) => {
  ferryStore.setDeparture(newVal)
})

watch(() => searchParams.arrival, (newVal) => {
  ferryStore.setArrival(newVal)
})

// Watch for changes in ferryStore and update searchParams
watch(() => ferryStore.departure, (newVal) => {
  if (searchParams.departure !== newVal) {
    searchParams.departure = newVal
  }
})

watch(() => ferryStore.arrival, (newVal) => {
  if (searchParams.arrival !== newVal) {
    searchParams.arrival = newVal
  }
})

// State
const isSearching = ref(false)
const hasSearched = ref(false)
const searchResults = ref<TransitRoute[]>([])
const displayLimit = ref(5)
const showDetailsModal = ref(false)
const selectedRoute = ref<TransitRoute | null>(null)

// Composables
const { searchRoutes, formatTime, calculateDuration, getPortDisplayName } = useRouteSearch()

// Constants
const today = new Date()
today.setHours(0, 0, 0, 0)

// Computed
const canSearch = computed(() => {
  return searchParams.departure && 
         searchParams.arrival && 
         searchParams.departure !== searchParams.arrival
})

const displayedResults = computed(() => {
  return searchResults.value.slice(0, displayLimit.value)
})

// Methods
function getCurrentTimeString(): string {
  const now = new Date()
  const hours = Math.floor(now.getHours() / 1) * 1
  const minutes = Math.floor(now.getMinutes() / 15) * 15
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function reverseRoute() {
  const temp = searchParams.departure
  searchParams.departure = searchParams.arrival
  searchParams.arrival = temp
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

// Modal state
const showShipModal = ref(false)
const showPortModal = ref(false)
const modalShipId = ref('')
const modalPortId = ref('')

function showShipInfo(shipName: string) {
  modalShipId.value = shipName
  showShipModal.value = true
}

function showPortInfo(portName: string) {
  modalPortId.value = portName
  showPortModal.value = true
}

async function handleSearch() {
  if (!canSearch.value) return
  
  isSearching.value = true
  hasSearched.value = true
  displayLimit.value = 5
  
  try {
    searchResults.value = await searchRoutes(
      searchParams.departure,
      searchParams.arrival,
      searchParams.date,
      searchParams.time,
      searchParams.isArrivalMode
    )
    
    // Add to search history
    historyStore.addSearchHistory({
      type: 'route',
      departure: searchParams.departure,
      arrival: searchParams.arrival,
      date: searchParams.date,
      time: searchParams.time,
      isArrivalMode: searchParams.isArrivalMode
    })
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function showMore() {
  displayLimit.value += 10
}

function showRouteDetails(route: TransitRoute) {
  selectedRoute.value = route
  showDetailsModal.value = true
}

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('TRANSIT')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>