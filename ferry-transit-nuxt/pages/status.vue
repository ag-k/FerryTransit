<template>
  <div class="container py-4">
    <h2 class="mb-4">{{ $t('STATUS') }}</h2>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    
    <!-- Status cards -->
    <div v-else class="row">
      <!-- いそかぜ Status -->
      <div class="col-md-6 mb-4">
        <div class="card h-100" :class="{ 'border-danger': shipStatus.isokaze?.hasAlert }">
          <div class="card-header" :class="{ 'bg-danger text-white': shipStatus.isokaze?.hasAlert }">
            <h3 class="card-title h5 mb-0">{{ $t('ISOKAZE') }}</h3>
          </div>
          <div class="card-body">
            <div v-if="shipStatus.isokaze">
              <p class="mb-2">
                <strong>{{ $t('STATUS') }}:</strong>
                <span :class="getStatusClass(shipStatus.isokaze.status)">
                  {{ getStatusText(shipStatus.isokaze.status) }}
                </span>
              </p>
              <p v-if="shipStatus.isokaze.summary" class="mb-2">
                <strong>{{ $t('SUMMARY') }}:</strong> {{ shipStatus.isokaze.summary }}
              </p>
              <p v-if="shipStatus.isokaze.comment" class="mb-2">
                <strong>{{ $t('COMMENT') }}:</strong> {{ shipStatus.isokaze.comment }}
              </p>
              <p v-if="shipStatus.isokaze.reason" class="mb-2">
                <strong>{{ $t('REASON') }}:</strong> {{ shipStatus.isokaze.reason }}
              </p>
              <p v-if="shipStatus.isokaze.updated" class="text-muted small mb-0">
                {{ $t('LAST_UPDATE') }}: {{ formatDateTime(shipStatus.isokaze.updated) }}
              </p>
            </div>
            <div v-else>
              <p class="text-muted mb-0">{{ $t('NO_STATUS_INFO') }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- どうぜん Status -->
      <div class="col-md-6 mb-4">
        <div class="card h-100" :class="{ 'border-danger': shipStatus.dozen?.hasAlert }">
          <div class="card-header" :class="{ 'bg-danger text-white': shipStatus.dozen?.hasAlert }">
            <h3 class="card-title h5 mb-0">{{ $t('FERRY_DOZEN') }}</h3>
          </div>
          <div class="card-body">
            <div v-if="shipStatus.dozen">
              <p class="mb-2">
                <strong>{{ $t('STATUS') }}:</strong>
                <span :class="getStatusClass(shipStatus.dozen.status)">
                  {{ getStatusText(shipStatus.dozen.status) }}
                </span>
              </p>
              <p v-if="shipStatus.dozen.summary" class="mb-2">
                <strong>{{ $t('SUMMARY') }}:</strong> {{ shipStatus.dozen.summary }}
              </p>
              <p v-if="shipStatus.dozen.comment" class="mb-2">
                <strong>{{ $t('COMMENT') }}:</strong> {{ shipStatus.dozen.comment }}
              </p>
              <p v-if="shipStatus.dozen.updated" class="text-muted small mb-0">
                {{ $t('LAST_UPDATE') }}: {{ formatDateTime(shipStatus.dozen.updated) }}
              </p>
            </div>
            <div v-else>
              <p class="text-muted mb-0">{{ $t('NO_STATUS_INFO') }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ferry Status -->
      <div class="col-12 mb-4">
        <div class="card" :class="{ 'border-danger': shipStatus.ferry?.hasAlert }">
          <div class="card-header" :class="{ 'bg-danger text-white': shipStatus.ferry?.hasAlert }">
            <h3 class="card-title h5 mb-0">{{ $t('FERRY') }}</h3>
          </div>
          <div class="card-body">
            <div v-if="shipStatus.ferry" class="row">
              <div class="col-md-6">
                <h6>{{ $t('FERRY') }}</h6>
                <p class="mb-2">
                  <strong>{{ $t('STATUS') }}:</strong>
                  <span :class="getOperationClass(shipStatus.ferry.ferryState)">
                    {{ shipStatus.ferry.ferryState }}
                  </span>
                </p>
                <p v-if="shipStatus.ferry.ferryComment" class="mb-2">
                  <strong>{{ $t('COMMENT') }}:</strong> {{ shipStatus.ferry.ferryComment }}
                </p>
              </div>
              <div class="col-md-6">
                <h6>{{ $t('RAINBOWJET') }}</h6>
                <p class="mb-2">
                  <strong>{{ $t('STATUS') }}:</strong>
                  <span :class="getOperationClass(shipStatus.ferry.fastFerryState)">
                    {{ shipStatus.ferry.fastFerryState }}
                  </span>
                </p>
                <p v-if="shipStatus.ferry.fastFerryComment" class="mb-2">
                  <strong>{{ $t('COMMENT') }}:</strong> {{ shipStatus.ferry.fastFerryComment }}
                </p>
              </div>
              <div class="col-12 mt-3">
                <div class="row">
                  <div class="col-md-6">
                    <p class="mb-2">
                      <strong>{{ $t('TODAY_WAVE') }}:</strong> {{ shipStatus.ferry.todayWave || '-' }}
                    </p>
                  </div>
                  <div class="col-md-6">
                    <p class="mb-2">
                      <strong>{{ $t('TOMORROW_WAVE') }}:</strong> {{ shipStatus.ferry.tomorrowWave || '-' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <p class="text-muted mb-0">{{ $t('NO_STATUS_INFO') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Refresh button -->
    <div class="text-center mt-4">
      <button 
        class="btn btn-outline-primary"
        :disabled="isLoading"
        @click="refreshStatus"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise me-2" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
        </svg>
        {{ $t('REFRESH') }}
      </button>
    </div>
    
    <!-- Last update time -->
    <div v-if="lastFetchTime" class="text-center text-muted mt-2">
      <small>{{ $t('LAST_UPDATE') }}: {{ formatDateTime(lastFetchTime) }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFerryStore } from '@/stores/ferry'
import { useFerryData } from '@/composables/useFerryData'

const ferryStore = useFerryStore()
const { updateShipStatus } = useFerryData()

// State
const isLoading = ref(false)

// Store data
const shipStatus = computed(() => ferryStore.shipStatus)
const lastFetchTime = computed(() => ferryStore.lastFetchTime)

// Methods
const getStatusClass = (status: number) => {
  switch (status) {
    case 0: return 'text-success'
    case 1: return 'text-danger'
    case 2: return 'text-warning'
    case 3: return 'text-info'
    case 4: return 'text-primary'
    default: return ''
  }
}

const getStatusText = (status: number) => {
  const { $i18n } = useNuxtApp()
  switch (status) {
    case 0: return $i18n.t('NORMAL_OPERATION')
    case 1: return $i18n.t('CANCELLED')
    case 2: return $i18n.t('PARTIAL_CANCEL')
    case 3: return $i18n.t('SCHEDULE_CHANGE')
    case 4: return $i18n.t('EXTRA_SHIP')
    default: return $i18n.t('UNKNOWN')
  }
}

const getOperationClass = (state: string) => {
  if (state === '通常運航' || state === '平常運航') return 'text-success'
  if (state === '欠航') return 'text-danger'
  if (state === '条件付き運航') return 'text-warning'
  return ''
}

const formatDateTime = (dateString: string | Date | null) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const refreshStatus = async () => {
  isLoading.value = true
  try {
    await updateShipStatus()
  } finally {
    isLoading.value = false
  }
}

// Fetch status on mount if data is stale
onMounted(async () => {
  if (ferryStore.isDataStale) {
    await refreshStatus()
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('STATUS')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>

<style scoped>
.card {
  transition: border-color 0.3s;
}

.card.border-danger {
  border-width: 2px;
}
</style>