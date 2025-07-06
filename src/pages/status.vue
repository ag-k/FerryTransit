<template>
  <div class="container max-w-[1000px] mx-auto px-4 py-8">
    <h2 class="text-2xl font-semibold mb-6 dark:text-white">{{ $t('STATUS') }}</h2>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="sr-only">Loading...</span>
    </div>
    
    <!-- Status cards -->
    <div v-else class="grid md:grid-cols-2 gap-6">
      <!-- いそかぜ Status -->
      <div>
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-gray-700 h-full" :class="{ 'border-red-500 dark:border-red-400 border-2': shipStatus.isokaze?.hasAlert }">
          <div class="px-4 py-3 border-b dark:border-gray-700" :class="{ 'bg-red-600 dark:bg-red-700 text-white': shipStatus.isokaze?.hasAlert, 'dark:bg-slate-700': !shipStatus.isokaze?.hasAlert }">
            <h3 class="text-lg font-medium" :class="{ 'dark:text-white': !shipStatus.isokaze?.hasAlert }">{{ $t('ISOKAZE') }}</h3>
          </div>
          <div class="p-4">
            <div v-if="shipStatus.isokaze">
              <p class="mb-2 dark:text-gray-200">
                <strong>{{ $t('STATUS') }}:</strong>
                <span :class="getStatusClass(shipStatus.isokaze.status)">
                  {{ getStatusText(shipStatus.isokaze.status) }}
                </span>
              </p>
              <p v-if="shipStatus.isokaze.summary" class="mb-2 dark:text-gray-300">
                <strong>{{ $t('SUMMARY') }}:</strong> {{ shipStatus.isokaze.summary }}
              </p>
              <p v-if="shipStatus.isokaze.comment" class="mb-2 dark:text-gray-300">
                <strong>{{ $t('COMMENT') }}:</strong> {{ shipStatus.isokaze.comment }}
              </p>
              <p v-if="shipStatus.isokaze.reason" class="mb-2 dark:text-gray-300">
                <strong>{{ $t('REASON') }}:</strong> {{ shipStatus.isokaze.reason }}
              </p>
              <p v-if="shipStatus.isokaze.updated" class="text-gray-500 dark:text-gray-300 text-sm mt-3">
                {{ $t('LAST_UPDATE') }}: {{ formatDateTime(shipStatus.isokaze.updated) }}
              </p>
            </div>
            <div v-else>
              <p class="text-gray-500 dark:text-gray-300">{{ $t('NO_STATUS_INFO') }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- どうぜん Status -->
      <div>
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-gray-700 h-full" :class="{ 'border-red-500 dark:border-red-400 border-2': shipStatus.dozen?.hasAlert }">
          <div class="px-4 py-3 border-b dark:border-gray-700" :class="{ 'bg-red-600 dark:bg-red-700 text-white': shipStatus.dozen?.hasAlert, 'dark:bg-slate-700': !shipStatus.dozen?.hasAlert }">
            <h3 class="text-lg font-medium" :class="{ 'dark:text-white': !shipStatus.dozen?.hasAlert }">{{ $t('FERRY_DOZEN') }}</h3>
          </div>
          <div class="p-4">
            <div v-if="shipStatus.dozen">
              <p class="mb-2 dark:text-gray-200">
                <strong>{{ $t('STATUS') }}:</strong>
                <span :class="getStatusClass(shipStatus.dozen.status)">
                  {{ getStatusText(shipStatus.dozen.status) }}
                </span>
              </p>
              <p v-if="shipStatus.dozen.summary" class="mb-2 dark:text-gray-300">
                <strong>{{ $t('SUMMARY') }}:</strong> {{ shipStatus.dozen.summary }}
              </p>
              <p v-if="shipStatus.dozen.comment" class="mb-2 dark:text-gray-300">
                <strong>{{ $t('COMMENT') }}:</strong> {{ shipStatus.dozen.comment }}
              </p>
              <p v-if="shipStatus.dozen.updated" class="text-gray-500 dark:text-gray-300 text-sm mt-3">
                {{ $t('LAST_UPDATE') }}: {{ formatDateTime(shipStatus.dozen.updated) }}
              </p>
            </div>
            <div v-else>
              <p class="text-gray-500 dark:text-gray-300">{{ $t('NO_STATUS_INFO') }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ferry Status -->
      <div class="md:col-span-2">
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-gray-700" :class="{ 'border-red-500 dark:border-red-400 border-2': shipStatus.ferry?.hasAlert }">
          <div class="px-4 py-3 border-b dark:border-gray-700" :class="{ 'bg-red-600 dark:bg-red-700 text-white': shipStatus.ferry?.hasAlert, 'dark:bg-slate-700': !shipStatus.ferry?.hasAlert }">
            <h3 class="text-lg font-medium" :class="{ 'dark:text-white': !shipStatus.ferry?.hasAlert }">{{ $t('FERRY') }}</h3>
          </div>
          <div class="p-4">
            <div v-if="shipStatus.ferry" class="grid md:grid-cols-2 gap-6">
              <div>
                <h6 class="font-semibold mb-2 dark:text-white">{{ $t('FERRY') }}</h6>
                <p class="mb-2 dark:text-gray-300">
                  <strong>{{ $t('STATUS') }}:</strong>
                  <span :class="getOperationClass(shipStatus.ferry.ferryState)">
                    {{ shipStatus.ferry.ferryState }}
                  </span>
                </p>
                <p v-if="shipStatus.ferry.ferryComment" class="mb-2 dark:text-gray-300">
                  <strong>{{ $t('COMMENT') }}:</strong> {{ shipStatus.ferry.ferryComment }}
                </p>
              </div>
              <div>
                <h6 class="font-semibold mb-2 dark:text-white">{{ $t('RAINBOWJET') }}</h6>
                <p class="mb-2 dark:text-gray-300">
                  <strong>{{ $t('STATUS') }}:</strong>
                  <span :class="getOperationClass(shipStatus.ferry.fastFerryState)">
                    {{ shipStatus.ferry.fastFerryState }}
                  </span>
                </p>
                <p v-if="shipStatus.ferry.fastFerryComment" class="mb-2 dark:text-gray-300">
                  <strong>{{ $t('COMMENT') }}:</strong> {{ shipStatus.ferry.fastFerryComment }}
                </p>
              </div>
              <div class="md:col-span-2 mt-4">
                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <p class="mb-2 dark:text-gray-200">
                      <strong>{{ $t('TODAY_WAVE') }}:</strong> {{ shipStatus.ferry.todayWave || '-' }}
                    </p>
                  </div>
                  <div>
                    <p class="mb-2 dark:text-gray-200">
                      <strong>{{ $t('TOMORROW_WAVE') }}:</strong> {{ shipStatus.ferry.tomorrowWave || '-' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <p class="text-gray-500 dark:text-gray-300">{{ $t('NO_STATUS_INFO') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Refresh button -->
    <div class="text-center mt-8">
      <button 
        class="inline-flex items-center px-4 py-2 border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isLoading"
        @click="refreshStatus"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="mr-2" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
        </svg>
        {{ $t('REFRESH') }}
      </button>
    </div>
    
    <!-- Last update time -->
    <div v-if="lastFetchTime" class="text-center text-gray-500 dark:text-gray-300 mt-2">
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
    case 0: return 'text-green-600 dark:text-green-300'
    case 1: return 'text-red-600 dark:text-red-300'
    case 2: return 'text-yellow-600 dark:text-yellow-300'
    case 3: return 'text-blue-600 dark:text-blue-200'
    case 4: return 'text-purple-600 dark:text-purple-300'
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
  // Check Japanese states
  if (state === '通常運航' || state === '平常運航') return 'text-green-600 dark:text-green-300'
  if (state === '欠航') return 'text-red-600 dark:text-red-300'
  if (state === '条件付き運航') return 'text-yellow-600 dark:text-yellow-300'
  
  // Check English states
  if (state === 'Normal Operation' || state === 'Normal Service') return 'text-green-600 dark:text-green-300'
  if (state === 'Cancelled' || state === 'Canceled') return 'text-red-600 dark:text-red-300'
  if (state === 'Conditional Operation') return 'text-yellow-600 dark:text-yellow-300'
  
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