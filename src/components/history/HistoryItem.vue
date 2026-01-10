<template>
  <div
    class="history-item bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center space-x-2 mb-2">
          <svg
            class="w-5 h-5 text-gray-400 dark:text-gray-500"
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
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ formatDateTime(history.searchedAt) }}</span>
        </div>

        <div class="flex items-center space-x-2 mb-2">
          <div class="space-y-1">
            <div
              v-for="(line, index) in getPortLabelLines(history.departure)"
              :key="`departure-${index}`"
              class="flex items-center gap-2"
            >
              <span class="text-lg font-semibold dark:text-white">{{ line.name }}</span>
              <PortBadges :badges="line.municipality ? [line.municipality] : []" />
            </div>
          </div>
          <svg
            class="w-4 h-4 text-gray-400 dark:text-gray-500 self-center"
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
          <div class="space-y-1">
            <div
              v-for="(line, index) in getPortLabelLines(history.arrival)"
              :key="`arrival-${index}`"
              class="flex items-center gap-2"
            >
              <span class="text-lg font-semibold dark:text-white">{{ line.name }}</span>
              <PortBadges :badges="line.municipality ? [line.municipality] : []" />
            </div>
          </div>
        </div>

        <div class="text-sm text-gray-600 dark:text-gray-400">
          <span>{{ formatDate(history.date) }}</span>
          <span v-if="history.type === 'route' && history.time" class="mx-2">·</span>
          <span v-if="history.type === 'route' && history.time">{{ history.isArrivalMode ? $t('ARRIVE_BY') : $t('DEPARTURE_AFTER') }}</span>
          <span v-if="history.type === 'route' && history.time" class="font-medium dark:text-gray-300">{{ formatTime(history.time) }}</span>
        </div>

        <div v-if="history.resultCount !== undefined" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ $t('history.resultCount', { count: history.resultCount }) }}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-4">
        <button
          class="inline-flex items-center justify-center gap-2 font-medium rounded-lg shadow-sm ring-1 ring-black/5 dark:ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white bg-app-primary hover:bg-app-primary-2 disabled:hover:bg-app-primary px-3 py-1.5 text-sm"
          @click="$emit('search')"
        >
          {{ $t('history.searchAgain') }}
        </button>
        <button
          class="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200 text-sm"
          @click="$emit('remove')"
        >
          {{ $t('history.delete') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useFerryStore } from '~/stores/ferry'
import type { SearchHistoryItem } from '~/types/history'
import { createLogger } from '~/utils/logger'
import PortBadges from '@/components/common/PortBadges.vue'

interface Props {
  history: SearchHistoryItem
}

const props = defineProps<Props>()
const emit = defineEmits<{
  search: []
  remove: []
}>()

const ferryStore = useFerryStore()
const { locale, t } = useI18n()
const logger = createLogger('HistoryItem')

type PortLabelLine = {
  name: string
  municipality?: string
}

const getPortLabel = (portId?: string) => {
  if (!portId) return '-'

  if (portId === 'HONDO') {
    return t('HONDO')
  }

  const translated = String(t(portId))
  if (translated && translated !== portId) {
    return translated
  }

  const port = ferryStore.ports.find(p => p.PORT_ID === portId)
  return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : portId
}

const parsePortLabel = (label: string): PortLabelLine[] => {
  const parts = label
    .split(/(?:\s*または\s*|\s*および\s*|\s+or\s+|\s+and\s+)/i)
    .map(part => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return []
  return parts.map((part) => {
    const match = part.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    if (match) {
      return { name: match[1], municipality: match[2] }
    }
    return { name: part }
  })
}

const getPortLabelLines = (portId?: string) => {
  const label = getPortLabel(portId)
  const lines = parsePortLabel(label)
  return lines.length > 0 ? lines : [{ name: label || '-' }]
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
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    }).format(dateObj)
  } catch (error) {
    logger.error('Error formatting datetime', error)
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
      weekday: 'short',
      timeZone: 'Asia/Tokyo'
    }).format(dateObj)
  } catch (error) {
    logger.error('Error formatting date', error)
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
    // JSTで時刻を表示
    return new Intl.DateTimeFormat(locale.value, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    }).format(timeObj)
  } catch (error) {
    logger.error('Error formatting time', error)
    return '-'
  }
}
</script>
