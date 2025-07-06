<template>
  <div class="history-manager">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold dark:text-white">{{ $t('history.title') }}</h1>
      <div class="flex space-x-2">
        <button
          v-if="historyStore.history.length > 0"
          @click="showClearConfirm = true"
          class="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors duration-200 flex items-center space-x-2"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>{{ $t('history.clearAll') }}</span>
        </button>
      </div>
    </div>

    <HistoryList />

    <!-- Clear Confirmation Dialog -->
    <div 
      v-if="showClearConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showClearConfirm = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
        <h3 class="text-lg font-medium mb-4 dark:text-white">{{ $t('history.clearConfirmTitle') }}</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">{{ $t('history.clearConfirmMessage') }}</p>
        <div class="flex space-x-3 justify-end">
          <button
            @click="showClearConfirm = false"
            class="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200"
          >
            {{ $t('CLOSE') }}
          </button>
          <button
            @click="handleClearAll"
            class="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
          >
            {{ $t('history.clearConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useHistoryStore } from '~/stores/history'
import HistoryList from './HistoryList.vue'

const historyStore = useHistoryStore()
const showClearConfirm = ref(false)

const handleClearAll = () => {
  historyStore.clearAll()
  showClearConfirm.value = false
}
</script>