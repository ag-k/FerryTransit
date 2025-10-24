<template>
  <div class="container max-w-[1000px] mx-auto px-4 py-8">
    <!-- Hero section -->
    <div class="text-center mb-8">
      <h1 class="text-4xl md:text-5xl font-light mb-4 dark:text-white">{{ $t('ABOUT_APP') }}</h1>
      <p class="text-xl text-gray-600 dark:text-gray-300">{{ $t('TITLE') }}</p>
    </div>

    <!-- Quick action cards -->
    <div class="grid md:grid-cols-3 gap-6 mb-12">
      <div
        class="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 transform hover:-translate-y-1">
        <div class="p-6 text-center">
          <div class="mb-4">
            <svg
xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor"
              class="text-blue-600 dark:text-blue-200 mx-auto" viewBox="0 0 16 16">
              <path
                d="M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857V3.857z" />
              <path
                d="M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            </svg>
          </div>
          <h5 class="text-xl font-semibold mb-2 dark:text-white">{{ $t('TIMETABLE') }}</h5>
          <p class="text-gray-600 dark:text-gray-300 mb-4">{{ $t('TIMETABLE_DESC') }}</p>
          <NuxtLink
:to="localePath('/timetable')"
            class="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors">
            {{ $t('VIEW_TIMETABLE') }}
          </NuxtLink>
        </div>
      </div>

      <div
        class="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 transform hover:-translate-y-1">
        <div class="p-6 text-center">
          <div class="mb-4">
            <svg
xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor"
              class="text-blue-600 dark:text-blue-200 mx-auto" viewBox="0 0 16 16">
              <path
fill-rule="evenodd"
                d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z" />
            </svg>
          </div>
          <h5 class="text-xl font-semibold mb-2 dark:text-white">{{ $t('TRANSIT') }}</h5>
          <p class="text-gray-600 dark:text-gray-300 mb-4">{{ $t('TRANSIT_DESC') }}</p>
          <NuxtLink
:to="localePath('/transit')"
            class="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors">
            {{ $t('SEARCH_ROUTES') }}
          </NuxtLink>
        </div>
      </div>

      <div
        class="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 transform hover:-translate-y-1">
        <div class="p-6 text-center">
          <div class="mb-4">
            <svg
xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor"
              class="text-blue-600 dark:text-blue-200 mx-auto" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path
                d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
          </div>
          <h5 class="text-xl font-semibold mb-2 dark:text-white">{{ $t('STATUS') }}</h5>
          <p class="text-gray-600 dark:text-gray-300 mb-4">{{ $t('STATUS_DESC') }}</p>
          <NuxtLink
:to="localePath('/status')"
            class="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors">
            {{ $t('CHECK_STATUS') }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- News section -->
    <NewsSection class="mb-8" />

    <!-- Current status alerts -->
    <div v-if="hasAlerts" class="mb-6">
      <div
        class="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-gray-700 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg">
        <h5 class="flex items-center text-lg font-semibold mb-2">
          <svg
xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="mr-2"
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
          <strong>{{ $t('FERRY') }}:</strong>
          <span v-if="shipStatus.ferry.ferryState !== '通常運航'">
            {{ $t('FERRY') }}: {{ shipStatus.ferry.ferryState }}
          </span>
          <span v-if="shipStatus.ferry.ferryState !== '通常運航' && shipStatus.ferry.fastFerryState !== '通常運航'"> / </span>
          <span v-if="shipStatus.ferry.fastFerryState !== '通常運航'">
            {{ $t('RAINBOWJET') }}: {{ shipStatus.ferry.fastFerryState }}
          </span>
        </div>
        <hr class="my-3 border-yellow-300 dark:border-gray-700">
        <NuxtLink
:to="localePath('/status')"
          class="inline-block px-4 py-1 text-sm bg-yellow-600 dark:bg-yellow-700 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-colors">
          {{ $t('VIEW_DETAILS') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Information section -->
    <div class="grid md:grid-cols-2 gap-6">
      <div>
        <h3 class="text-2xl font-semibold mb-4 dark:text-white">{{ $t('ABOUT_SERVICE') }}</h3>
        <p class="mb-4 dark:text-gray-200">{{ $t('ABOUT_SERVICE_DESC') }}</p>
        <ul class="list-disc list-inside space-y-2 dark:text-gray-200">
          <li>{{ $t('FEATURE_1') }}</li>
          <li>{{ $t('FEATURE_2') }}</li>
          <li>{{ $t('FEATURE_3') }}</li>
          <li>{{ $t('FEATURE_4') }}</li>
        </ul>
      </div>

      <div>
        <h3 class="text-2xl font-semibold mb-4 dark:text-white">{{ $t('CONTACT_INFO') }}</h3>
        <div class="space-y-2">
          <a
href="https://www.oki-kisen.co.jp/" target="_blank"
            class="block p-4 bg-white dark:bg-gray-900 text-gray-800 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <div class="flex justify-between items-start">
              <h6 class="font-semibold group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{{
                $t('OKI_KISEN_CORP') }}</h6>
              <svg
xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="text-gray-400 dark:text-gray-300" viewBox="0 0 16 16">
                <path
fill-rule="evenodd"
                  d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
                <path
fill-rule="evenodd"
                  d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
              </svg>
            </div>
            <p class="text-gray-600 dark:text-gray-300 text-sm mt-1">{{ $t('OKI_KISEN_DESC') }}</p>
          </a>
          <a
href="https://oki-douzen.com/" target="_blank"
            class="block p-4 bg-white dark:bg-gray-900 text-gray-800 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <div class="flex justify-between items-start">
              <h6 class="font-semibold group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{{
                $t('OKI_DOUZEN') }}</h6>
              <svg
xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="text-gray-400 dark:text-gray-300" viewBox="0 0 16 16">
                <path
fill-rule="evenodd"
                  d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
                <path
fill-rule="evenodd"
                  d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
              </svg>
            </div>
            <p class="text-gray-600 dark:text-gray-300 text-sm mt-1">{{ $t('OKI_DOUZEN_DESC') }}</p>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

// Page metadata
useHead({
  title: useNuxtApp().$i18n.t('TITLE')
})
</script>