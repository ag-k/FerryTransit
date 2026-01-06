<template>
  <div class="theme-selector">
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {{ $t('settings.theme') }}
    </label>
    <div class="space-y-2">
      <button
        v-for="theme in themes"
        :key="theme.value"
        @click="selectTheme(theme.value)"
        class="w-full text-left px-4 py-3 rounded-lg border transition-colors duration-200"
        :class="[
          uiStore?.theme === theme.value 
            ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 dark:border-blue-400 text-blue-800 dark:text-blue-200' 
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-100'
        ]"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <svg
              v-if="theme.value === 'light'"
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <svg
              v-else-if="theme.value === 'dark'"
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            <svg
              v-else
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>{{ theme.label }}</span>
          </div>
          <svg
            v-if="uiStore?.theme === theme.value"
            class="w-5 h-5 text-blue-700 dark:text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores/ui'

const { t } = useI18n()
const uiStore = process.client ? useUIStore() : null

const themes = computed(() => [
  { value: 'light', label: t('settings.themeLight') },
  { value: 'dark', label: t('settings.themeDark') },
  { value: 'system', label: t('settings.themeSystem') }
])

const selectTheme = (theme: 'light' | 'dark' | 'system') => {
  if (uiStore) {
    uiStore.setTheme(theme)
  }
}
</script>