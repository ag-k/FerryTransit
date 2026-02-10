<template>
  <div class="container mx-auto px-4 py-8 max-w-2xl">
    <h1 class="hidden lg:block text-2xl font-bold mb-6 dark:text-white">{{ $t('SETTINGS') }}</h1>

    <div class="space-y-6">
      <!-- Language Settings -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <LanguageSelector />
      </div>

      <!-- Theme Settings -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <ThemeSelector />
      </div>

      <!-- Map Settings -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <MapSettings />
      </div>

      <!-- Data Management -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <DataManagement />
      </div>


      <!-- App Information -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-medium mb-4 dark:text-white">{{ $t('APP_INFO') }}</h3>
        <dl class="space-y-3">
          <div>
            <dt class="text-sm text-gray-600 dark:text-gray-300">{{ $t('VERSION') }}</dt>
            <dd class="text-base font-medium dark:text-gray-100">
              {{ runtimeConfig.public.appVersion }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-gray-600 dark:text-gray-300">{{ $t('LAST_UPDATED') }}</dt>
            <dd class="text-base font-medium dark:text-gray-100">{{ new Date().toLocaleDateString() }}</dd>
          </div>
        </dl>
      </div>

      <!-- Links -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-medium mb-4 dark:text-white">{{ $t('LINKS') }}</h3>
        <div class="space-y-3">
          <a
            href="https://oki-digilab.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
          >
            <span class="text-blue-700 dark:text-blue-200">{{ $t('DEVELOPER_SITE') }}</span>
            <svg
              class="w-5 h-5 text-gray-400 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>

          <NuxtLink
            :to="localePath('/privacy')"
            class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
          >
            <span class="text-blue-700 dark:text-blue-200">{{ $t('PRIVACY_POLICY') }}</span>
            <svg
              class="w-5 h-5 text-gray-400 dark:text-gray-300"
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
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LanguageSelector from '~/components/settings/LanguageSelector.vue'
import ThemeSelector from '~/components/settings/ThemeSelector.vue'
import MapSettings from '~/components/settings/MapSettings.vue'
import DataManagement from '~/components/settings/DataManagement.vue'

const runtimeConfig = useRuntimeConfig()
const localePath = useLocalePath()

definePageMeta({
  title: 'SETTINGS'
})
</script>
