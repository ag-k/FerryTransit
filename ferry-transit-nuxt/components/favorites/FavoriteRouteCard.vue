<template>
  <div
    class="favorite-route-card bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <svg
          class="w-5 h-5 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
        <span class="text-sm text-gray-600">{{ $t('favorites.route') }}</span>
      </div>
      <FavoriteButton :type="'route'" :route="{ departure, arrival }" />
    </div>

    <div class="flex items-center justify-between mb-2">
      <div class="flex-1">
        <div class="flex items-center space-x-2">
          <span class="text-lg font-semibold">{{ getDeparturePortName(departure) }}</span>
          <svg
            class="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span class="text-lg font-semibold">{{ getArrivalPortName(arrival) }}</span>
        </div>
      </div>
    </div>

    <div v-if="lastSearchDate" class="text-sm text-gray-500 mb-3">
      {{ $t('favorites.lastSearched') }}: {{ formatDate(lastSearchDate) }}
    </div>

    <div class="flex space-x-2">
      <button
        @click="searchRoute"
        class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
      >
        {{ $t('favorites.searchAgain') }}
      </button>
      <button
        @click="$emit('remove')"
        class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200 text-sm"
      >
        {{ $t('favorites.remove') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useFerryStore } from '~/stores/ferry'
import { useI18n } from 'vue-i18n'
import FavoriteButton from './FavoriteButton.vue'

interface Props {
  departure: string
  arrival: string
  lastSearchDate?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  remove: []
}>()

const router = useRouter()
const ferryStore = useFerryStore()
const { locale } = useI18n()

const getDeparturePortName = (portId: string) => {
  const port = ferryStore.ports.find(p => p.PORT_ID === portId)
  return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : portId
}

const getArrivalPortName = (portId: string) => {
  const port = ferryStore.ports.find(p => p.PORT_ID === portId)
  return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : portId
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const searchRoute = () => {
  router.push({
    path: '/transit',
    query: {
      departure: props.departure,
      arrival: props.arrival
    }
  })
}
</script>