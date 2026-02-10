<template>
  <div class="history-list">
    <div v-if="groupedHistory.length > 0" class="space-y-6">
      <div v-for="group in groupedHistory" :key="group.date">
        <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">{{ group.displayDate }}</h3>
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
        class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
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
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        {{ $t('history.noHistory') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
import type { SearchHistoryItem } from '~/types/history'
import { createLogger } from '~/utils/logger'

const router = useRouter()
const historyStore = process.client ? useHistoryStore() : null
const { locale } = useI18n()
const localePath = useLocalePath()
const logger = createLogger('HistoryList')

// Group history by date
const groupedHistory = computed(() => {
  const groups: { date: string; displayDate: string; items: SearchHistoryItem[] }[] = []
  const groupMap = new Map<string, SearchHistoryItem[]>()

  if (!historyStore) return groups

  // Group by date string (YYYY-MM-DD format for consistent sorting)
  historyStore.history.forEach(item => {
    try {
      // Use searchedAt instead of createdAt
      const dateObj = new Date(item.searchedAt)
      
      // Validate date
      if (isNaN(dateObj.getTime())) {
        logger.warn('Invalid date in search history', item)
        return
      }
      
      const dateKey = dateObj.toISOString().split('T')[0] // YYYY-MM-DD format
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, [])
      }
      groupMap.get(dateKey)!.push(item)
    } catch (error) {
      logger.error('Error processing history item', error, item)
    }
  })

  // Convert to array with display dates
  groupMap.forEach((items, dateKey) => {
    try {
      // Take the first item's searchedAt to get the actual date
      const firstItemDate = new Date(items[0].searchedAt)
      
      // Validate date
      if (isNaN(firstItemDate.getTime())) {
        logger.warn('Invalid date for group', dateKey)
        return
      }
      
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Reset time parts for comparison
      today.setHours(0, 0, 0, 0)
      yesterday.setHours(0, 0, 0, 0)
      const itemDate = new Date(firstItemDate)
      itemDate.setHours(0, 0, 0, 0)

      let displayDate: string
      if (itemDate.getTime() === today.getTime()) {
        displayDate = locale.value === 'ja' ? '今日' : 'Today'
      } else if (itemDate.getTime() === yesterday.getTime()) {
        displayDate = locale.value === 'ja' ? '昨日' : 'Yesterday'
      } else {
        displayDate = new Intl.DateTimeFormat(locale.value, {
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        }).format(firstItemDate)
      }

      groups.push({
        date: dateKey,
        displayDate,
        items: items.sort((a, b) => {
          const aTime = new Date(b.searchedAt).getTime()
          const bTime = new Date(a.searchedAt).getTime()
          return isNaN(aTime) || isNaN(bTime) ? 0 : aTime - bTime
        })
      })
    } catch (error) {
      logger.error('Error formatting group', error, dateKey)
    }
  })

  // Sort groups by date (newest first)
  return groups.sort((a, b) => b.date.localeCompare(a.date))
})

const handleSearch = (history: SearchHistoryItem) => {
  // 検索履歴から再検索する場合は、元の検索日時（searchedAt）を使用
  const searchedAtDate = new Date(history.searchedAt)

  router.push({
    path: localePath('/transit'),
    query: {
      departure: history.departure,
      arrival: history.arrival,
      date: history.date ? new Date(history.date).toISOString().split('T')[0] : undefined,
      time: history.time ? new Date(history.time).toTimeString().slice(0, 5) : undefined,
      isArrivalMode: history.isArrivalMode ? '1' : '0',
      // 検索履歴の日時を使用（ISO形式で渡す）
      searchedAt: searchedAtDate.toISOString()
    }
  })
}

const handleRemove = (id: string) => {
  if (historyStore) {
    historyStore.removeHistoryItem(id)
  }
}
</script>
