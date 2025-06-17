<template>
  <div class="container py-4">
    <h2 class="mb-4">{{ $t('TIMETABLE') }}</h2>
    
    <!-- 出発地・到着地選択 -->
    <!-- スマホ：出発地/目的地を縦並びで右にボタン -->
    <div class="d-md-none mb-3">
      <div class="d-flex align-items-start gap-2">
        <div class="flex-grow-1">
          <label class="form-label fw-bold small mb-1">{{ $t('_FROM') }}</label>
          <select 
            class="form-select form-select-sm mb-2"
            :value="departure"
            @change="ferryStore.setDeparture($event.target.value)"
          >
            <option value="DEPARTURE" disabled>{{ $t('DEPARTURE') }}</option>
            <optgroup :label="$t('MAINLAND')">
              <option v-for="port in hondoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOZEN')">
              <option v-for="port in dozenPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOGO')">
              <option v-for="port in dogoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
          </select>
          
          <label class="form-label fw-bold small mb-1">{{ $t('_TO') }}</label>
          <select 
            class="form-select form-select-sm"
            :value="arrival"
            @change="ferryStore.setArrival($event.target.value)"
          >
            <option value="ARRIVAL" disabled>{{ $t('ARRIVAL') }}</option>
            <optgroup :label="$t('MAINLAND')">
              <option v-for="port in hondoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOZEN')">
              <option v-for="port in dozenPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOGO')">
              <option v-for="port in dogoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
          </select>
        </div>
        
        <div class="d-flex align-items-center" style="height: 100px;">
          <button 
            type="button" 
            class="btn btn-sm btn-outline-primary"
            @click="reverseRoute"
            title="出発地と到着地を入れ替え"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-down-up" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- PC：横並び -->
    <div class="d-none d-md-block mb-3">
      <div class="row align-items-end">
        <div class="col-md-5">
          <label class="form-label fw-bold small mb-1">{{ $t('_FROM') }}</label>
          <select 
            class="form-select form-select-sm"
            :value="departure"
            @change="ferryStore.setDeparture($event.target.value)"
          >
            <option value="DEPARTURE" disabled>{{ $t('DEPARTURE') }}</option>
            <optgroup :label="$t('MAINLAND')">
              <option v-for="port in hondoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOZEN')">
              <option v-for="port in dozenPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOGO')">
              <option v-for="port in dogoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
          </select>
        </div>
        
        <div class="col-md-2 text-center">
          <button 
            type="button" 
            class="btn btn-sm btn-outline-primary"
            @click="reverseRoute"
            title="出発地と到着地を入れ替え"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
            </svg>
          </button>
        </div>
        
        <div class="col-md-5">
          <label class="form-label fw-bold small mb-1">{{ $t('_TO') }}</label>
          <select 
            class="form-select form-select-sm"
            :value="arrival"
            @change="ferryStore.setArrival($event.target.value)"
          >
            <option value="ARRIVAL" disabled>{{ $t('ARRIVAL') }}</option>
            <optgroup :label="$t('MAINLAND')">
              <option v-for="port in hondoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOZEN')">
              <option v-for="port in dozenPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOGO')">
              <option v-for="port in dogoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>
    
    <!-- 日付選択 -->
    <div class="row mb-3">
      <div class="col-12 col-md-4">
        <label class="form-label fw-bold small mb-1">{{ $t('DATE') }}</label>
        <input 
          type="date" 
          class="form-control form-control-sm"
          :value="selectedDateString"
          :min="todayString"
          @change="handleDateChange"
        >
      </div>
    </div>
    
    <!-- 時刻表 -->
    <div class="card">
      <div class="card-header bg-primary text-white py-2">
        <h3 class="card-title h6 mb-0">{{ $t('TIMETABLE') }}</h3>
      </div>
      <div class="card-body p-0">
        <div v-if="isLoading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
        
        <div v-else-if="error" class="alert alert-danger alert-sm m-3" role="alert">
          {{ $t(error) }}
        </div>
        
        <div v-else-if="filteredTimetable.length === 0" class="text-center py-3 text-muted">
          <small v-if="departure === 'DEPARTURE' || arrival === 'ARRIVAL'">
            {{ $t('_FROM') }}と{{ $t('_TO') }}を選択してください
          </small>
          <small v-else>
            該当する便はありません
          </small>
        </div>
        
        <table v-else class="table table-hover table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th class="py-2">{{ $t('SHIP') }}</th>
              <th class="py-2">
                <a href="#" @click.prevent="showPortInfo(departure)" class="text-decoration-none">
                  {{ $t(departure) }}
                </a>
              </th>
              <th class="py-2">
                <a href="#" @click.prevent="showPortInfo(arrival)" class="text-decoration-none">
                  {{ $t(arrival) }}
                </a>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="trip in sortedTimetable" 
              :key="trip.tripId"
              :class="{ 'text-decoration-line-through': tripStatus(trip) === 2 }"
            >
              <td>
                <span v-if="tripStatus(trip) === 2" class="text-danger me-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                  </svg>
                </span>
                <span v-else-if="tripStatus(trip) === 3" class="text-warning me-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                  </svg>
                </span>
                <span v-else-if="tripStatus(trip) === 4" class="text-success me-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-circle-fill" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
                  </svg>
                </span>
                <a href="#" @click.prevent="showShipInfo(trip.name)">
                  {{ $t(trip.name) }}
                </a>
              </td>
              <td>
                {{ formatTime(trip.departureTime) }}
              </td>
              <td>
                {{ formatTime(trip.arrivalTime) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- モーダル -->
    <Teleport to="body">
      <div v-if="modalVisible" class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ modalTitle }}</h5>
              <button 
                type="button" 
                class="btn-close"
                @click="closeModal"
              ></button>
            </div>
            <div class="modal-body">
              <div v-if="modalType === 'port'" v-html="modalContent"></div>
              <img 
                v-else-if="modalType === 'ship'" 
                :src="`/images/${modalShipId}.jpg`"
                :alt="modalTitle"
                class="img-fluid"
              >
            </div>
          </div>
        </div>
      </div>
      <div v-if="modalVisible" class="modal-backdrop fade show"></div>
    </Teleport>
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
  reverseRoute,
  getTripStatus,
  getPortMap
} = useFerryData()

// Modal state
const modalVisible = ref(false)
const modalType = ref<'port' | 'ship'>('port')
const modalTitle = ref('')
const modalContent = ref('')
const modalShipId = ref('')

// Computed
const selectedDateString = computed(() => {
  return selectedDate.value.toISOString().split('T')[0]
})

const todayString = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const sortedTimetable = computed(() => {
  return [...filteredTimetable.value].sort((a, b) => {
    // Convert time strings to comparable format
    const timeA = typeof a.departureTime === 'string' ? a.departureTime : a.departureTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
    const timeB = typeof b.departureTime === 'string' ? b.departureTime : b.departureTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
    
    // Compare times as strings (works for HH:mm format)
    return timeA.localeCompare(timeB)
  })
})

// Methods
const handleDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  ferryStore.setSelectedDate(new Date(target.value + 'T00:00:00'))
}

const formatTime = (time: Date | string) => {
  // If already a time string like "9:00", return as is
  if (typeof time === 'string') {
    // Check if it's already in HH:mm format
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      return time
    }
    // Try to parse as date string
    const date = new Date(time)
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    }
    return time // Return as is if can't parse
  }
  
  // Handle Date objects
  return time.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}

const tripStatus = (trip: any) => {
  return getTripStatus(trip)
}

const showPortInfo = (portId: string) => {
  const mapHtml = getPortMap(portId)
  if (mapHtml) {
    modalType.value = 'port'
    modalTitle.value = useNuxtApp().$i18n.t(portId)
    modalContent.value = mapHtml
    modalVisible.value = true
  }
}

const showShipInfo = (shipId: string) => {
  modalType.value = 'ship'
  modalTitle.value = useNuxtApp().$i18n.t(shipId)
  modalShipId.value = shipId
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
}

// ページメタデータ
useHead({
  title: `${useNuxtApp().$i18n.t('TIMETABLE')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>