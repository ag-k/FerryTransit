<template>
  <div class="container max-w-[1000px] mx-auto px-4 py-8">
    <!-- Hero section -->
    <div class="text-center mb-8">
      <h1 class="hidden lg:block text-4xl md:text-5xl font-light mb-4 dark:text-white">{{ $t('ABOUT_APP') }}</h1>
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
              class="text-app-primary dark:text-app-primary-2 mx-auto" viewBox="0 0 16 16">
              <path
                d="M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857V3.857z" />
              <path
                d="M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            </svg>
          </div>
          <h5 class="text-xl font-semibold mb-2 dark:text-white">{{ $t('TIMETABLE') }}</h5>
          <p class="text-gray-600 dark:text-gray-300 mb-4">{{ $t('TIMETABLE_DESC') }}</p>
          <NuxtLink
:to="localePath('/')"
            class="inline-block px-6 py-2 font-semibold text-white rounded bg-app-primary hover:bg-app-primary-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg transition-all shadow-sm hover:shadow-md">
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
              class="text-app-primary dark:text-app-primary-2 mx-auto" viewBox="0 0 16 16">
              <path
fill-rule="evenodd"
                d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z" />
            </svg>
          </div>
          <h5 class="text-xl font-semibold mb-2 dark:text-white">{{ $t('TRANSIT') }}</h5>
          <p class="text-gray-600 dark:text-gray-300 mb-4">{{ $t('TRANSIT_DESC') }}</p>
          <NuxtLink
:to="localePath('/transit')"
            class="inline-block px-6 py-2 font-semibold text-white rounded bg-app-primary hover:bg-app-primary-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg transition-all shadow-sm hover:shadow-md">
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
              class="text-app-primary dark:text-app-primary-2 mx-auto" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path
                d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
          </div>
          <h5 class="text-xl font-semibold mb-2 dark:text-white">{{ $t('STATUS') }}</h5>
          <p class="text-gray-600 dark:text-gray-300 mb-4">{{ $t('STATUS_DESC') }}</p>
          <NuxtLink
:to="localePath('/status')"
            class="inline-block px-6 py-2 font-semibold text-white rounded bg-app-primary hover:bg-app-primary-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg transition-all shadow-sm hover:shadow-md">
            {{ $t('CHECK_STATUS') }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- News section -->
    <NewsSection class="mb-8" />

    <!-- Current status alerts -->
    <StatusAlerts />

    <!-- Timetable validity -->
    <section class="mb-10">
      <div class="mb-4">
        <h2 class="text-2xl font-semibold mb-2 dark:text-white">{{ $t('TIMETABLE_VALIDITY_TITLE') }}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">{{ $t('TIMETABLE_VALIDITY_DESC') }}</p>
      </div>

      <div class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div class="overflow-x-auto">
          <table class="min-w-[760px] w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-600 dark:bg-slate-800 dark:text-gray-300">
              <tr>
                <th scope="col" class="px-4 py-3">{{ $t('TIMETABLE_VALIDITY_OPERATOR') }}</th>
                <th scope="col" class="px-4 py-3">{{ $t('TIMETABLE_VALIDITY_MODE') }}</th>
                <th scope="col" class="px-4 py-3">{{ $t('TRANSPORT_NAME') }}</th>
                <th scope="col" class="px-4 py-3 whitespace-nowrap">{{ $t('VALID_FROM') }}</th>
                <th scope="col" class="px-4 py-3 whitespace-nowrap">{{ $t('VALID_UNTIL') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-if="isValidityLoading && timetableValidityRows.length === 0">
                <td colspan="5" class="px-4 py-6 text-center text-gray-600 dark:text-gray-300">
                  {{ $t('TIMETABLE_VALIDITY_LOADING') }}
                </td>
              </tr>
              <tr v-else-if="timetableValidityRows.length === 0">
                <td colspan="5" class="px-4 py-6 text-center text-gray-600 dark:text-gray-300">
                  {{ $t('TIMETABLE_VALIDITY_EMPTY') }}
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="row in timetableValidityRows"
                  :key="row.key"
                  class="text-gray-800 dark:text-gray-100"
                  :class="{ 'border-t-4 border-gray-200 dark:border-gray-600': row.startsOperatorGroup }">
                  <td class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">{{ row.operatorLabel }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {{ formatModeLabel(row.mode) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-medium">{{ row.transportLabel }}</td>
                  <td class="px-4 py-3 whitespace-nowrap">{{ formatValidityDate(row.startDate) }}</td>
                  <td class="px-4 py-3 whitespace-nowrap font-semibold">{{ formatValidityDate(row.endDate) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>

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
              <h6 class="font-semibold group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">{{
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
 href="https://www.okikankou.com/" target="_blank"
            class="block p-4 bg-white dark:bg-gray-900 text-gray-800 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <div class="flex justify-between items-start">
              <h6 class="font-semibold group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">{{
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
          <a
href="https://oki-digilab.com/" target="_blank"
            class="block p-4 bg-white dark:bg-gray-900 text-gray-800 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <div class="flex justify-between items-start">
              <h6 class="font-semibold group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">{{
                $t('OKI_DIGILAB') }}</h6>
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
            <p class="text-gray-600 dark:text-gray-300 text-sm mt-1">{{ $t('OKI_DIGILAB_DESC') }}</p>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import NewsSection from '@/components/news/NewsSection.vue'
import StatusAlerts from '@/components/common/StatusAlerts.vue'
import { SHIP_DETAILS, type ShipId } from '@/data/ships'
import { useFerryStore } from '@/stores/ferry'
import type { TransportMode } from '@/types'
import {
  loadBusRouteValiditySummaries,
  type BusRouteValiditySummary
} from '@/utils/gtfsBusTimetable'
import {
  buildTransportTimetableValidityRows,
  normalizeTimetableValidityDate,
  type TimetableValidityRow,
  type TimetableValiditySource
} from '@/utils/timetableValidity'

const localePath = useLocalePath()
const { locale, t, te } = useI18n()
const ferryStore = useFerryStore()
const busValiditySummaries = ref<BusRouteValiditySummary[]>([])
const isValidityLoading = ref(false)
const TIMETABLE_VALIDITY_LOAD_TIMEOUT_MS = 8000

const normalizeMode = (mode?: TransportMode): TransportMode => mode || 'FERRY'

const translateKey = (key?: string | null): string => {
  if (!key) return t('UNKNOWN')
  return te(key) ? t(key) : key
}

const resolveTransportOperatorKey = (transportKey: string, operatorId?: string): string => {
  const shipOperatorKey = SHIP_DETAILS[transportKey as ShipId]?.operatorKey
  return shipOperatorKey || operatorId || 'UNKNOWN'
}

const OKI_KISEN_FERRY_GROUP = new Set(['FERRY_OKI', 'FERRY_KUNIGA', 'FERRY_SHIRASHIMA'])

const resolveTransportValidityKey = (transportKey: string): string => {
  if (OKI_KISEN_FERRY_GROUP.has(transportKey)) return 'OKI_KISEN_FERRY_GROUP'
  return transportKey
}

const resolveTransportValidityLabel = (transportKey: string): string => {
  if (OKI_KISEN_FERRY_GROUP.has(transportKey)) return translateKey('OKI_KISEN_FERRY_FLEET_LABEL')
  return translateKey(transportKey)
}

const timetableValidityRows = computed<TimetableValidityRow[]>(() => {
  const sources: TimetableValiditySource[] = []

  for (const trip of ferryStore.timetableData) {
    const mode = normalizeMode(trip.mode)
    const operatorKey = resolveTransportOperatorKey(trip.name, trip.operatorId)

    sources.push({
      mode,
      operatorKey,
      operatorLabel: translateKey(operatorKey),
      transportKey: resolveTransportValidityKey(trip.name),
      transportLabel: resolveTransportValidityLabel(trip.name),
      startDate: trip.startDate,
      endDate: trip.endDate
    })
  }

  for (const summary of busValiditySummaries.value) {
    sources.push({
      mode: 'BUS',
      operatorKey: summary.operatorId,
      operatorLabel: translateKey(summary.operatorId),
      transportKey: [summary.operatorId, summary.tripName].join('|'),
      transportLabel: translateKey(summary.tripName),
      startDate: summary.startDate,
      endDate: summary.endDate
    })
  }

  return buildTransportTimetableValidityRows(sources, locale.value)
})

const formatModeLabel = (mode: TransportMode): string => {
  return t(`TRANSPORT_MODES.${mode}`)
}

const formatValidityDate = (date: string): string => {
  const normalized = normalizeTimetableValidityDate(date)
  if (!normalized) return t('UNKNOWN')

  if (locale.value === 'ja') {
    const [year, month, day] = normalized.split('-')
    return `${Number(year)}年${Number(month)}月${Number(day)}日`
  }

  return normalized
}

const withValidityLoadTimeout = (promise: Promise<unknown>): Promise<unknown> => {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => {
      setTimeout(resolve, TIMETABLE_VALIDITY_LOAD_TIMEOUT_MS)
    })
  ])
}

onMounted(async () => {
  isValidityLoading.value = true

  try {
    const tasks: Promise<unknown>[] = [
      withValidityLoadTimeout(loadBusRouteValiditySummaries()
        .then((summaries) => {
          busValiditySummaries.value = summaries
        })
        .catch(() => {
          busValiditySummaries.value = []
        }))
    ]

    if (ferryStore.timetableData.length === 0) {
      tasks.push(withValidityLoadTimeout(ferryStore.fetchTimetable()))
    }

    await Promise.allSettled(tasks)
  } finally {
    isValidityLoading.value = false
  }
})

// Page metadata
useHead({
  title: useNuxtApp().$i18n.t('TITLE')
})
</script>
