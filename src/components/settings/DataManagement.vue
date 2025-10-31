<template>
  <div class="data-management">
    <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
      {{ $t('settings.dataManagement') }}
    </h3>
    
    <div class="space-y-3">
      <!-- Clear Cache -->
      <button
        @click="clearCache"
        class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-left"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <svg
              class="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <div>
              <div class="font-medium dark:text-gray-100">{{ $t('settings.clearCache') }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.clearCacheDesc') }}</div>
            </div>
          </div>
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>

      
      <!-- Clear All Data -->
      <button
        @click="showClearDataConfirm = true"
        class="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 text-left"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <svg
              class="w-5 h-5 text-red-600 dark:text-red-400"
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
            <div>
              <div class="font-medium text-red-700 dark:text-red-300">{{ $t('settings.clearAllData') }}</div>
              <div class="text-sm text-red-600 dark:text-red-400">{{ $t('settings.clearAllDataDesc') }}</div>
            </div>
          </div>
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>
    </div>

    <!-- Clear Cache Confirmation Dialog -->
    <div 
      v-if="showClearCacheConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showClearCacheConfirm = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
        <h3 class="text-lg font-medium mb-4 dark:text-white">{{ $t('settings.clearCacheConfirmTitle') }}</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">{{ $t('settings.clearCacheConfirmMessage') }}</p>
        <div class="flex space-x-3 justify-end">
          <button
            @click="showClearCacheConfirm = false"
            class="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200"
          >
            {{ $t('CANCEL') }}
          </button>
          <button
            @click="confirmClearCache"
            class="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
          >
            {{ $t('settings.clearConfirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Clear Data Confirmation Dialog -->
    <div 
      v-if="showClearDataConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showClearDataConfirm = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
        <h3 class="text-lg font-medium mb-4 dark:text-white">{{ $t('settings.clearDataConfirmTitle') }}</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">{{ $t('settings.clearDataConfirmMessage') }}</p>
        <div class="flex space-x-3 justify-end">
          <button
            @click="showClearDataConfirm = false"
            class="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200"
          >
            {{ $t('CLOSE') }}
          </button>
          <button
            @click="clearAllData"
            class="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
          >
            {{ $t('settings.clearConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useOfflineStore } from '~/stores/offline'
import { useFavoriteStore } from '~/stores/favorite'
import { useHistoryStore } from '~/stores/history'
import { useToast } from '~/composables/useToast'
import { createLogger } from '~/utils/logger'

const logger = createLogger('DataManagement')
const offlineStore = process.client ? useOfflineStore() : null
const favoriteStore = process.client ? useFavoriteStore() : null
const historyStore = process.client ? useHistoryStore() : null
const { success, error } = useToast()

const showClearCacheConfirm = ref(false)
const showClearDataConfirm = ref(false)

const clearCache = () => {
  showClearCacheConfirm.value = true
}

const confirmClearCache = () => {
  try {
    if (offlineStore) {
      const result = offlineStore.clearOfflineData()
      if (result) {
        success('キャッシュをクリアしました')
      } else {
        error('キャッシュのクリアに失敗しました')
      }
    } else {
      error('キャッシュ機能が利用できません')
    }
  } catch (e) {
    logger.error('Failed to clear cache:', e)
    error('キャッシュのクリア中にエラーが発生しました')
  } finally {
    showClearCacheConfirm.value = false
  }
}

const clearAllData = () => {
  try {
    if (offlineStore) offlineStore.clearOfflineData()
    if (favoriteStore) favoriteStore.clearAll()
    if (historyStore) historyStore.clearAll()
    success('すべてのデータを削除しました')
  } catch (e) {
    logger.error('Failed to clear all data:', e)
    error('データの削除中にエラーが発生しました')
  } finally {
    showClearDataConfirm.value = false
  }
}
</script>