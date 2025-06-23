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
            <PortSelector
              v-model="searchParams.departure"
              :label="$t('_FROM')"
              :placeholder="$t('DEPARTURE')"
              :disabled-ports="[searchParams.arrival]"
            />
          </div>
          
          <div class="md:col-span-2 flex items-end justify-center mb-4">
            <button 
              type="button" 
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              @click="reverseRoute"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
              </svg>
            </button>
          </div>
          
          <div class="md:col-span-5">
            <PortSelector
              v-model="searchParams.arrival"
              :label="$t('_TO')"
              :placeholder="$t('ARRIVAL')"
              :disabled-ports="[searchParams.departure]"
            />
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
            class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            :disabled="!canSearch || isSearching"
            @click="handleSearch"
          >
            <span v-if="isSearching" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            {{ $t('SEARCH') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Search Results -->
    <div v-if="searchResults.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="bg-gray-50 px-4 py-3 border-b">
        <h3 class="text-lg font-medium">{{ $t('SEARCH_RESULTS') }}</h3>
      </div>
      <div class="p-4">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left">{{ $t('DEPARTURE') }}</th>
                <th class="px-4 py-2 text-left">{{ $t('ROUTE') }}</th>
                <th class="px-4 py-2 text-left">{{ $t('ARRIVAL') }}</th>
                <th class="px-4 py-2 text-left">{{ $t('DURATION') }}</th>
                <th class="px-4 py-2 text-left">{{ $t('FARE') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(result, index) in displayedResults" 
                :key="index"
                @click="showRouteDetails(result)"
                class="border-b hover:bg-gray-50 cursor-pointer"
              >
                <td class="px-4 py-3">{{ formatTime(result.departureTime) }}</td>
                <td class="px-4 py-3">
                  <div v-for="(segment, idx) in result.segments" :key="idx">
                    <span v-if="idx > 0" class="text-gray-500">↓ </span>
                    <span :class="{ 'line-through': segment.status === 2 }">
                      {{ $t(segment.ship) }}
                    </span>
                    <span v-if="segment.status === 2" class="text-red-600 ml-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                      </svg>
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">{{ formatTime(result.arrivalTime) }}</td>
                <td class="px-4 py-3">{{ calculateDuration(result.departureTime, result.arrivalTime) }}</td>
                <td class="px-4 py-3">¥{{ result.totalFare.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-if="searchResults.length > displayLimit" class="text-center mt-4">
          <button 
            class="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors"
            @click="showMore"
          >
            {{ $t('SHOW_MORE') }}
          </button>
        </div>
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
  </div>
</template>

<script setup lang="ts">
import { useRouteSearch } from '@/composables/useRouteSearch'
import { useHistoryStore } from '@/stores/history'
import PortSelector from '@/components/common/PortSelector.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import type { TransitRoute } from '@/types'

// Search parameters
const searchParams = reactive({
  departure: '',
  arrival: '',
  date: new Date(),
  time: getCurrentTimeString(),
  isArrivalMode: false
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
const historyStore = useHistoryStore()

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