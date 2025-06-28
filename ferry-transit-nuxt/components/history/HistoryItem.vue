<template>
  <div
    class="history-item bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center space-x-2 mb-2">
          <svg
            class="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-sm text-gray-600">{{ formatDateTime(history.searchedAt) }}</span>
        </div>

        <div class="flex items-center space-x-2 mb-2">
          <span class="text-lg font-semibold">{{ getPortName(history.departure) }}</span>
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
          <span class="text-lg font-semibold">{{ getPortName(history.arrival) }}</span>
        </div>

        <div class="text-sm text-gray-600">
          <span>{{ formatDate(history.date) }}</span>
          <span class="mx-2">·</span>
          <span>{{ history.isArrivalMode ? $t('ARRIVE_BY') : $t('DEPARTURE_AFTER') }}</span>
          <span class="font-medium">{{ formatTime(history.time) }}</span>
        </div>

        <div v-if="history.resultCount !== undefined" class="text-sm text-gray-500 mt-1">
          {{ $t('history.resultCount', { count: history.resultCount }) }}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-4">
        <button
          @click="$emit('search')"
          class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm"
        >
          {{ $t('history.searchAgain') }}
        </button>
        <button
          @click="$emit('remove')"
          class="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200 text-sm"
        >
          {{ $t('history.delete') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFerryStore } from '~/stores/ferry'
import { useI18n } from 'vue-i18n'
import type { SearchHistoryItem } from '~/types/history'

interface Props {
  history: SearchHistoryItem
}

const props = defineProps<Props>()
const emit = defineEmits<{
  search: []
  remove: []
}>()

const ferryStore = useFerryStore()
const { locale } = useI18n()

const getPortName = (portId?: string) => {
  if (!portId) return '-'
  const port = ferryStore.ports.find(p => p.PORT_ID === portId)
  return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : portId
}

const formatDateTime = (date: Date | string) => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) {
      return '-'
    }
    return new Intl.DateTimeFormat(locale.value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj)
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return '-'
  }
}

const formatDate = (date: Date | string) => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) {
      return '-'
    }
    return new Intl.DateTimeFormat(locale.value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(dateObj)
  } catch (error) {
    console.error('Error formatting date:', error)
    return '-'
  }
}

const formatTime = (time?: Date | string) => {
  if (!time) return '-'
  try {
    const timeObj = time instanceof Date ? time : new Date(time)
    if (isNaN(timeObj.getTime())) {
      return '-'
    }
    return timeObj.toTimeString().slice(0, 5)
  } catch (error) {
    console.error('Error formatting time:', error)
    return '-'
  }
}
</script>