<template>
  <div class="container py-4">
    <h2 class="mb-4">{{ $t('TRANSIT') }}</h2>
    
    <!-- Search Form -->
    <div class="card mb-4">
      <div class="card-header">
        <h3 class="card-title h5 mb-0">{{ $t('SEARCH_CONDITIONS') }}</h3>
      </div>
      <div class="card-body">
        <!-- Port Selection -->
        <div class="row mb-3">
          <div class="col-md-5">
            <PortSelector
              v-model="searchParams.departure"
              :label="$t('_FROM')"
              :placeholder="$t('DEPARTURE')"
              :disabled-ports="[searchParams.arrival]"
            />
          </div>
          
          <div class="col-md-2 text-center d-flex align-items-end justify-content-center mb-3">
            <button 
              type="button" 
              class="btn btn-primary"
              @click="reverseRoute"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
              </svg>
            </button>
          </div>
          
          <div class="col-md-5">
            <PortSelector
              v-model="searchParams.arrival"
              :label="$t('_TO')"
              :placeholder="$t('ARRIVAL')"
              :disabled-ports="[searchParams.departure]"
            />
          </div>
        </div>
        
        <!-- Date Selection -->
        <div class="row mb-3">
          <div class="col-md-6">
            <DatePicker
              v-model="searchParams.date"
              :label="$t('DATE')"
              :min-date="today"
            />
          </div>
        </div>
        
        <!-- Time Selection -->
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label">{{ $t('TIME') }}</label>
            <div class="input-group">
              <select 
                v-model="searchParams.isArrivalMode"
                class="form-select"
                style="max-width: 140px"
              >
                <option :value="false">{{ $t('DEPARTURE_AFTER') }}</option>
                <option :value="true">{{ $t('ARRIVE_BY') }}</option>
              </select>
              <input 
                type="time"
                v-model="searchParams.time"
                class="form-control"
              >
            </div>
          </div>
        </div>
        
        <!-- Search Button -->
        <div class="row">
          <div class="col-12">
            <button 
              type="button"
              class="btn btn-primary"
              :disabled="!canSearch || isSearching"
              @click="handleSearch"
            >
              <span v-if="isSearching" class="spinner-border spinner-border-sm me-2"></span>
              {{ $t('SEARCH') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Search Results -->
    <div v-if="searchResults.length > 0" class="card">
      <div class="card-header">
        <h3 class="card-title h5 mb-0">{{ $t('SEARCH_RESULTS') }}</h3>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>{{ $t('DEPARTURE') }}</th>
                <th>{{ $t('ROUTE') }}</th>
                <th>{{ $t('ARRIVAL') }}</th>
                <th>{{ $t('DURATION') }}</th>
                <th>{{ $t('FARE') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(result, index) in displayedResults" 
                :key="index"
                @click="showRouteDetails(result)"
                style="cursor: pointer"
              >
                <td>{{ formatTime(result.departureTime) }}</td>
                <td>
                  <div v-for="(segment, idx) in result.segments" :key="idx">
                    <span v-if="idx > 0" class="text-muted">↓ </span>
                    <span :class="{ 'text-decoration-line-through': segment.status === 2 }">
                      {{ $t(segment.ship) }}
                    </span>
                    <span v-if="segment.status === 2" class="text-danger ms-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                      </svg>
                    </span>
                  </div>
                </td>
                <td>{{ formatTime(result.arrivalTime) }}</td>
                <td>{{ calculateDuration(result.departureTime, result.arrivalTime) }}</td>
                <td>¥{{ result.totalFare.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-if="searchResults.length > displayLimit" class="text-center mt-3">
          <button 
            class="btn btn-outline-primary"
            @click="showMore"
          >
            {{ $t('SHOW_MORE') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- No Results -->
    <div v-else-if="hasSearched && !isSearching" class="alert alert-info">
      {{ $t('NO_ROUTES_FOUND') }}
    </div>
    
    <!-- Route Details Modal -->
    <ShipModal
      v-model:visible="showDetailsModal"
      :title="$t('ROUTE_DETAILS')"
      type="custom"
    >
      <div v-if="selectedRoute">
        <div v-for="(segment, index) in selectedRoute.segments" :key="index" class="mb-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">
                {{ $t('LEG') }} {{ index + 1 }}
              </h6>
              <div class="row">
                <div class="col-5">
                  <strong>{{ formatTime(segment.departureTime) }}</strong><br>
                  {{ getPortDisplayName(segment.departure) }}
                </div>
                <div class="col-2 text-center">
                  <div class="mt-2">→</div>
                  <small class="text-muted">{{ $t(segment.ship) }}</small>
                </div>
                <div class="col-5 text-end">
                  <strong>{{ formatTime(segment.arrivalTime) }}</strong><br>
                  {{ getPortDisplayName(segment.arrival) }}
                </div>
              </div>
              <div class="mt-2">
                <small class="text-muted">
                  {{ $t('FARE') }}: ¥{{ segment.fare.toLocaleString() }}
                </small>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-3 p-3 bg-light rounded">
          <div class="row">
            <div class="col-6">
              <strong>{{ $t('TOTAL_DURATION') }}:</strong> 
              {{ calculateDuration(selectedRoute.departureTime, selectedRoute.arrivalTime) }}
            </div>
            <div class="col-6 text-end">
              <strong>{{ $t('TOTAL_FARE') }}:</strong> 
              ¥{{ selectedRoute.totalFare.toLocaleString() }}
            </div>
          </div>
        </div>
      </div>
    </ShipModal>
  </div>
</template>

<script setup lang="ts">
import { useRouteSearch } from '@/composables/useRouteSearch'
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
    searchResults.value = searchRoutes(
      searchParams.departure,
      searchParams.arrival,
      searchParams.date,
      searchParams.time,
      searchParams.isArrivalMode
    )
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

<style scoped>
.table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>