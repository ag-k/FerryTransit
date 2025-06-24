<template>
  <div class="history-list">
    <div v-if="groupedHistory.length > 0" class="space-y-6">
      <div v-for="group in groupedHistory" :key="group.date">
        <h3 class="text-lg font-medium text-gray-700 mb-3">{{ group.displayDate }}</h3>
        <div class="space-y-3">
          <HistoryItem
            v-for="item in group.items"
            :key="item.id"
            :history="item"
            @search="handleSearch(item)"
            @remove="handleRemove(item.id)"
          />
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
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
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ $t('history.noHistory') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ $t('history.noHistoryHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '~/stores/history'
import { useI18n } from 'vue-i18n'
import HistoryItem from './HistoryItem.vue'
import type { SearchHistory } from '~/types/history'

const router = useRouter()
const historyStore = useHistoryStore()
const { locale } = useI18n()

// Group history by date
const groupedHistory = computed(() => {
  const groups: { date: string; displayDate: string; items: SearchHistory[] }[] = []
  const groupMap = new Map<string, SearchHistory[]>()

  // Group by date
  historyStore.history.forEach(item => {
    const date = new Date(item.createdAt).toDateString()
    if (!groupMap.has(date)) {
      groupMap.set(date, [])
    }
    groupMap.get(date)!.push(item)
  })

  // Convert to array with display dates
  groupMap.forEach((items, date) => {
    const dateObj = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let displayDate: string
    if (dateObj.toDateString() === today.toDateString()) {
      displayDate = locale.value === 'ja' ? '今日' : 'Today'
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      displayDate = locale.value === 'ja' ? '昨日' : 'Yesterday'
    } else {
      displayDate = new Intl.DateTimeFormat(locale.value, {
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }).format(dateObj)
    }

    groups.push({
      date,
      displayDate,
      items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    })
  })

  // Sort groups by date (newest first)
  return groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const handleSearch = (history: SearchHistory) => {
  router.push({
    path: '/transit',
    query: {
      departure: history.departure,
      arrival: history.arrival,
      date: history.searchDate,
      time: history.searchTime,
      isArrivalMode: history.isArrivalMode ? '1' : '0'
    }
  })
}

const handleRemove = (id: string) => {
  historyStore.removeHistory(id)
}
</script>