<template>
  <div v-if="hasAlerts" class="mb-6">
    <div
      class="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-gray-700 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg">
      <h5 class="flex items-center text-lg font-semibold mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="mr-2"
          viewBox="0 0 16 16">
          <path
            d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
        </svg>
        {{ $t('OPERATION_ALERTS') }}
      </h5>
      <div v-if="shipStatus.isokaze?.hasAlert" class="mb-2">
        <strong>{{ $t('ISOKAZE') }}:</strong> {{ shipStatus.isokaze.summary || $t('CHECK_DETAILS') }}
      </div>
      <div v-if="shipStatus.dozen?.hasAlert" class="mb-2">
        <strong>{{ $t('FERRY_DOZEN') }}:</strong> {{ shipStatus.dozen.summary || $t('CHECK_DETAILS') }}
      </div>
      <div v-if="shipStatus.ferry?.hasAlert" class="mb-2">
        <strong>{{ $t('OKI_KISEN_FERRY') }}:</strong>
        <span v-if="shipStatus.ferry.ferryState !== '通常運航'">
          {{ $t('FERRY') }}: {{ shipStatus.ferry.ferryState }}
        </span>
        <span v-if="shipStatus.ferry.ferryState !== '通常運航' && shipStatus.ferry.fastFerryState !== '通常運航'"> / </span>
        <span v-if="shipStatus.ferry.fastFerryState !== '通常運航'">
          {{ $t('RAINBOWJET') }}: {{ shipStatus.ferry.fastFerryState }}
        </span>
      </div>
      <hr class="my-3 border-yellow-300 dark:border-gray-700">
      <NuxtLink :to="localePath('/status')"
        class="inline-block px-4 py-1 text-sm bg-yellow-600 dark:bg-yellow-700 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-colors">
        {{ $t('VIEW_DETAILS') }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useFerryStore } from '@/stores/ferry'
import { useFerryData } from '@/composables/useFerryData'

const localePath = useLocalePath()

// Initialize store only on client side
const ferryStore = process.client ? useFerryStore() : null
const { initializeData } = useFerryData()

// Store data
const shipStatus = computed(() => ferryStore?.shipStatus || {})

// Computed
const hasAlerts = computed(() => {
  const status = shipStatus.value
  return status.isokaze?.hasAlert ||
    status.dozen?.hasAlert ||
    status.ferry?.hasAlert
})

// Initialize data on mount
onMounted(async () => {
  if (ferryStore && ferryStore.timetableData.length === 0) {
    await initializeData()
  }
})
</script>
