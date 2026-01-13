<template>
  <div class="container max-w-[1000px] mx-auto px-4 py-6 sm:py-8">
    <h2 class="hidden lg:block text-2xl font-semibold mb-6 dark:text-white">{{ $t('STATUS') }}</h2>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      <span class="sr-only">Loading...</span>
    </div>

    <!-- Status cards -->
    <div v-else class="grid md:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
      <!-- Ferry Status -->
      <div class="md:col-span-2">
        <div class="rounded-lg overflow-hidden shadow-sm" :class="getFerryCardContainerClass(shipStatus.ferry)">
          <div class="px-4 py-2.5 border-b flex items-center justify-between gap-3"
            :class="getFerryCardHeaderClass(shipStatus.ferry)">
            <h3 class="text-lg font-bold">{{ $t('OKI_KISEN_FERRY') }}</h3>
            <p v-if="ferryUpdatedAt" class="text-xs font-semibold text-white/90 whitespace-nowrap tabular-nums"
              :title="`${$t('LAST_UPDATE')}: ${formatDateTime(ferryUpdatedAt)}`">
              <span class="mr-1">{{ $t('UPDATED_SHORT') }}</span>
              {{ formatHeaderTimestamp(ferryUpdatedAt) }}
            </p>
          </div>
          <div class="p-3 sm:p-4">
            <div v-if="shipStatus.ferry" class="grid md:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
              <div>
                <div
                  class="rounded-lg border border-slate-200/70 bg-white/70 p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 h-full flex flex-col">
                  <div class="flex items-start justify-between gap-3">
                    <h6 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{
                      $t('OKI_KISEN_FERRY_FLEET_LABEL') }}</h6>
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                      :class="getOperationBadgeClass(shipStatus.ferry.ferryState)">
                      {{ shipStatus.ferry.ferryState }}
                    </span>
                  </div>

                  <div v-if="shipStatus.ferry.ferryComment"
                    class="mt-2 rounded-md border border-slate-200/70 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-950/30">
                    <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {{ shipStatus.ferry.ferryComment }}
                    </p>
                  </div>
                  <div class="mt-3">
                    <CancelRiskCard mode="ferry" :probability="ferryCancelProbability" />
                  </div>
                </div>
              </div>
              <div>
                <div
                  class="rounded-lg border border-slate-200/70 bg-white/70 p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 h-full flex flex-col">
                  <div class="flex items-start justify-between gap-3">
                    <h6 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ $t('RAINBOWJET') }}</h6>
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                      :class="getOperationBadgeClass(shipStatus.ferry.fastFerryState)">
                      {{ shipStatus.ferry.fastFerryState }}
                    </span>
                  </div>

                  <div v-if="shipStatus.ferry.fastFerryComment"
                    class="mt-2 rounded-md border border-slate-200/70 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-950/30">
                    <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {{ shipStatus.ferry.fastFerryComment }}
                    </p>
                  </div>
                  <div class="mt-3">
                    <CancelRiskCard mode="rainbowjet" :probability="rainbowjetCancelProbability"
                      :suspended="!hasRainbowJetTomorrow" />
                  </div>
                </div>
              </div>
              <div class="md:col-span-2">
                <div
                  class="rounded-lg border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-3 shadow-sm dark:border-slate-600 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-700">
                  <div class="mx-auto w-full max-w-[460px]">
                    <div class="flex items-start justify-between gap-2 md:items-center">
                      <p class="text-xs font-semibold tracking-[0.12em] text-sky-900/80 dark:text-sky-200">
                        {{ $t('WAVE_HEIGHT') }}
                      </p>
                      <div class="flex flex-wrap justify-end gap-x-3 gap-y-1 tabular-nums md:flex-nowrap md:gap-x-5">
                        <p class="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-100">
                          <span class="mr-1 text-slate-500 dark:text-slate-300">{{ $t('TODAY') }}</span>
                          {{ todayWaveParts.value }}<span v-if="todayWaveParts.unit"
                            class="ml-0.5 text-slate-600 dark:text-slate-200">{{ todayWaveParts.unit }}</span>
                        </p>
                        <p class="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-100">
                          <span class="mr-1 text-slate-500 dark:text-slate-300">{{ $t('TOMORROW') }}</span>
                          {{ tomorrowWaveParts.value }}<span v-if="tomorrowWaveParts.unit"
                            class="ml-0.5 text-slate-600 dark:text-slate-200">{{ tomorrowWaveParts.unit }}</span>
                        </p>
                      </div>
                    </div>
                    <div v-if="todayWaveParts.note || tomorrowWaveParts.note"
                      class="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-300">
                      <p v-if="todayWaveParts.note">{{ todayWaveParts.note }}</p>
                      <p v-if="tomorrowWaveParts.note">{{ tomorrowWaveParts.note }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <p class="text-gray-500 dark:text-gray-300">{{ $t('NO_STATUS_INFO') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="md:col-span-2">
        <p class="flex items-start gap-2 text-left text-xs leading-relaxed text-slate-500 dark:text-slate-300">
          <Icon name="heroicons:information-circle" class="mt-0.5 !h-4 !w-4 flex-shrink-0" />
          <span>{{ $t('cancelRisk.disclaimer') }}</span>
        </p>
      </div>

      <!-- 島前内航船（いそかぜ + フェリーどうぜん） -->
      <div class="md:col-span-2">
        <div class="rounded-lg overflow-hidden shadow-sm" :class="localShipsCardContainerClass">
          <div class="px-4 py-3 border-b flex items-center justify-between gap-3" :class="localShipsCardHeaderClass">
            <h3 class="text-lg font-bold">{{ $t('DOZEN_LOCAL_SHIPS') }}</h3>
            <p v-if="localShipsUpdatedAt" class="text-xs font-semibold whitespace-nowrap tabular-nums"
              :class="localShipsHeaderMetaTextClass"
              :title="`${$t('LAST_UPDATE')}: ${formatDateTime(localShipsUpdatedAt)}`">
              <span class="mr-1">{{ $t('UPDATED_SHORT') }}</span>
              {{ formatHeaderTimestamp(localShipsUpdatedAt) }}
            </p>
          </div>
          <div class="p-3 sm:p-4">
            <div class="grid md:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
              <!-- いそかぜ -->
              <div>
                <div
                  class="rounded-lg border border-slate-200/70 bg-white/70 p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                  <div v-if="shipStatus.isokaze">
                    <div class="flex items-start justify-between gap-3">
                      <h6 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ $t('ISOKAZE') }}</h6>
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                        :class="getLocalShipBadgeClass(shipStatus.isokaze?.status)">
                        {{ getStatusText(shipStatus.isokaze?.status, 'isokaze') }}
                      </span>
                    </div>

                    <div v-if="shipStatus.isokaze.summary"
                      class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30">
                      <p class="text-xs font-semibold text-slate-600 dark:text-slate-200">
                        {{ $t('SUMMARY') }}
                      </p>
                      <p class="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {{ shipStatus.isokaze.summary }}
                      </p>
                    </div>

                    <div v-if="shipStatus.isokaze.comment"
                      class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30">
                      <p class="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {{ shipStatus.isokaze.comment }}
                      </p>
                    </div>

                    <div v-if="shouldShowDetailBlock(shipStatus.isokaze, 'isokaze')"
                      class="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700"
                      data-test="isokaze-detail">
                      <div v-if="hasOperationInfo(shipStatus.isokaze)" class="space-y-2">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {{ $t('CANCELLED_FROM_SERVICE') }}
                        </h4>
                        <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                          <table class="min-w-full text-sm" data-test="isokaze-operation-table">
                            <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
                              <tr>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr class="border-t border-gray-200 dark:border-gray-700">
                                <td class="px-3 py-2 dark:text-gray-200">{{
                                  formatPortLabel(shipStatus.isokaze?.departure)
                                  }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{
                                  formatShipTime(getStartTimeValue(shipStatus.isokaze)) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(shipStatus.isokaze?.arrival)
                                  }}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div v-if="shouldShowReason(shipStatus.isokaze, 'isokaze')" class="text-sm dark:text-gray-300">
                        <strong class="text-gray-700 dark:text-gray-200">{{ $t('REASON') }}:</strong>
                        <span class="ml-1">{{ formatReason(shipStatus.isokaze.reason) }}</span>
                      </div>
                      <div v-if="getShipTrips(shipStatus.isokaze?.extraShips).length" class="space-y-2"
                        data-test="isokaze-extra-section">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ $t('EXTRA_SHIPS') }}</h4>
                        <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                          <table class="min-w-full text-sm" data-test="isokaze-extra-table">
                            <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
                              <tr>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(trip, index) in getShipTrips(shipStatus.isokaze?.extraShips)"
                                :key="`isokaze-extra-${index}`" class="border-t border-gray-200 dark:border-gray-700">
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(trip?.departure) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ getTripDepartureTime(trip) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatTripArrival(trip) }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div v-else-if="getShipTrips(shipStatus.isokaze?.lastShips).length" class="space-y-2"
                        data-test="isokaze-last-section">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ $t('LAST_SHIPS') }}</h4>
                        <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                          <table class="min-w-full text-sm" data-test="isokaze-last-table">
                            <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
                              <tr>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(trip, index) in getShipTrips(shipStatus.isokaze?.lastShips)"
                                :key="`isokaze-last-${index}`" class="border-t border-gray-200 dark:border-gray-700">
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(trip?.departure) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ getTripDepartureTime(trip) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatTripArrival(trip) }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <p class="text-gray-500 dark:text-gray-300">{{ $t('NO_STATUS_INFO') }}</p>
                  </div>
                </div>
              </div>

              <!-- フェリーどうぜん -->
              <div>
                <div
                  class="rounded-lg border border-slate-200/70 bg-white/70 p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                  <div v-if="shipStatus.dozen">
                    <div class="flex items-start justify-between gap-3">
                      <h6 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ $t('FERRY_DOZEN') }}</h6>
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                        :class="getLocalShipBadgeClass(shipStatus.dozen?.status)">
                        {{ getStatusText(shipStatus.dozen?.status, 'dozen') }}
                      </span>
                    </div>

                    <div v-if="shipStatus.dozen.summary"
                      class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30">
                      <p class="text-xs font-semibold text-slate-600 dark:text-slate-200">
                        {{ $t('SUMMARY') }}
                      </p>
                      <p class="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {{ shipStatus.dozen.summary }}
                      </p>
                    </div>

                    <div v-if="shipStatus.dozen.comment"
                      class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30">
                      <p class="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {{ shipStatus.dozen.comment }}
                      </p>
                    </div>

                    <div v-if="shouldShowDetailBlock(shipStatus.dozen, 'dozen')"
                      class="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700"
                      data-test="dozen-detail">
                      <div v-if="hasOperationInfo(shipStatus.dozen)" class="space-y-2">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {{ $t('CANCELLED_FROM_SERVICE') }}
                        </h4>
                        <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                          <table class="min-w-full text-sm" data-test="dozen-operation-table">
                            <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
                              <tr>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr class="border-t border-gray-200 dark:border-gray-700">
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(shipStatus.dozen?.departure)
                                  }}
                                </td>
                                <td class="px-3 py-2 dark:text-gray-200">{{
                                  formatShipTime(getStartTimeValue(shipStatus.dozen)) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(shipStatus.dozen?.arrival)
                                  }}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div v-if="shouldShowReason(shipStatus.dozen, 'dozen')" class="text-sm dark:text-gray-300">
                        <strong class="text-gray-700 dark:text-gray-200">{{ $t('REASON') }}:</strong>
                        <span class="ml-1">{{ formatReason(shipStatus.dozen.reason) }}</span>
                      </div>
                      <div v-if="getShipTrips(shipStatus.dozen?.extraShips).length" class="space-y-2"
                        data-test="dozen-extra-section">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ $t('EXTRA_SHIPS') }}</h4>
                        <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                          <table class="min-w-full text-sm" data-test="dozen-extra-table">
                            <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
                              <tr>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(trip, index) in getShipTrips(shipStatus.dozen?.extraShips)"
                                :key="`dozen-extra-${index}`" class="border-t border-gray-200 dark:border-gray-700">
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(trip?.departure) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ getTripDepartureTime(trip) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatTripArrival(trip) }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div v-else-if="getShipTrips(shipStatus.dozen?.lastShips).length" class="space-y-2"
                        data-test="dozen-last-section">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ $t('LAST_SHIPS') }}</h4>
                        <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                          <table class="min-w-full text-sm" data-test="dozen-last-table">
                            <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
                              <tr>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
                                <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(trip, index) in getShipTrips(shipStatus.dozen?.lastShips)"
                                :key="`dozen-last-${index}`" class="border-t border-gray-200 dark:border-gray-700">
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(trip?.departure) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ getTripDepartureTime(trip) }}</td>
                                <td class="px-3 py-2 dark:text-gray-200">{{ formatTripArrival(trip) }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <p class="text-gray-500 dark:text-gray-300">{{ $t('NO_STATUS_INFO') }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Refresh button -->
    <div class="text-center mt-8">
      <SecondaryButton :disabled="isLoading" @click="refreshStatus">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="mr-2"
          viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
          <path
            d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
        </svg>
        {{ $t('REFRESH') }}
      </SecondaryButton>
    </div>

    <!-- Last update time -->
    <div v-if="updatedAtForDisplay" class="text-center text-gray-500 dark:text-gray-300 mt-2">
      <small>{{ $t('LAST_UPDATE') }}: {{ formatDateTime(updatedAtForDisplay) }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFerryStore } from '@/stores/ferry'
import { useFerryData } from '@/composables/useFerryData'
import type { ShipStatus, FerryStatus } from '~/types'
import { splitWaveValue, parseWaveHeights } from '@/utils/wave'
import { predictCancelProbability } from '@/utils/cancelRisk'
import { addDaysJst, formatDateYmdJst, parseYmdAsJstMidnight, getTodayJstMidnight } from '@/utils/jstDate'
import SecondaryButton from '@/components/common/SecondaryButton.vue'
import CancelRiskCard from '@/components/CancelRiskCard.vue'

const ferryStore = process.client ? useFerryStore() : null
const { updateShipStatus } = useFerryData()
const { $i18n } = useNuxtApp()

// State
const isLoading = ref(false)

// Store data
const shipStatus = computed(() => ferryStore?.shipStatus || {})
const lastFetchTime = computed(() => ferryStore?.lastFetchTime || null)
const ferryUpdatedAt = computed(() => shipStatus.value?.ferry?.updated_at || null)
const pickLatestTimestamp = (values: Array<string | null | undefined>) => {
  let best: string | null = null
  let bestTime = -1
  for (const v of values) {
    if (!v) continue
    const t = Date.parse(v)
    if (Number.isNaN(t)) continue
    if (t > bestTime) {
      best = v
      bestTime = t
    }
  }
  return best
}

const localShipsUpdatedAt = computed(() => {
  return pickLatestTimestamp([
    shipStatus.value?.isokaze?.updated_at,
    shipStatus.value?.isokaze?.updated,
    shipStatus.value?.dozen?.updated_at,
    shipStatus.value?.dozen?.updated
  ])
})

const updatedAtForDisplay = computed(() => lastFetchTime.value || null)
const timetableData = computed(() => ferryStore?.timetableData || [])

// Methods
const getStatusClass = (status?: number | null) => {
  if (status === null || status === undefined) {
    return ''
  }
  switch (status) {
    case 0: return 'text-blue-700 dark:text-blue-300'
    case 1: return 'text-red-600 dark:text-red-300'
    case 2: return 'text-yellow-600 dark:text-yellow-300'
    case 3: return 'text-yellow-600 dark:text-yellow-300'
    case 4: return 'text-green-600 dark:text-green-300'
    case 5: return 'text-yellow-600 dark:text-yellow-300'
    default: return ''
  }
}

type ShipType = 'isokaze' | 'dozen'

const statusLabelKeyMap: Record<ShipType, Record<number, string>> = {
  isokaze: {
    0: 'NORMAL_SERVICE',
    1: 'FULLY_CANCELLED',
    2: 'PARTIALLY_CANCELLED',
    3: 'CHANGED',
    4: 'SERVICE_RESUMED'
  },
  dozen: {
    0: 'NORMAL_SERVICE',
    1: 'FULLY_CANCELLED',
    2: 'PARTIALLY_CANCELLED',
    3: 'KURI_CANCELLED',
    4: 'SERVICE_RESUMED',
    5: 'CHANGED'
  }
}

const getStatusText = (status?: number | null, shipType: ShipType = 'isokaze') => {
  if (status === null || status === undefined) {
    return $i18n.t('UNKNOWN')
  }
  const key = statusLabelKeyMap[shipType][status]
  return key ? $i18n.t(key) : $i18n.t('UNKNOWN')
}

const getLocalShipBadgeClass = (status?: number | null) => {
  if (status === null || status === undefined) {
    return 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-200 dark:ring-slate-700'
  }
  // 0: normal, 4: resumed
  if (status === 0 || status === 4) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
  }
  // 1: fully cancelled
  if (status === 1) {
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800'
  }
  // 2/3: partial/changed
  if (status === 2 || status === 3 || status === 5) {
    return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800'
  }
  // fallback: cobalt-ish
  return 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800'
}

type StatusVariant = 'default' | 'info' | 'danger' | 'warning' | 'success'

const variantRank: Record<StatusVariant, number> = {
  default: 0,
  info: 1,
  success: 2,
  warning: 3,
  danger: 4
}

const getLocalShipsVariant = (): StatusVariant => {
  const variants: StatusVariant[] = [
    getStatusVariant(shipStatus.value?.isokaze ?? null),
    getStatusVariant(shipStatus.value?.dozen ?? null)
  ]
  return variants.reduce((best, v) => (variantRank[v] > variantRank[best] ? v : best), 'default')
}

const localShipsVariant = computed<StatusVariant>(() => getLocalShipsVariant())
const localShipsCardContainerClass = computed(() => statusContainerClassMap[localShipsVariant.value])
const localShipsCardHeaderClass = computed(() => statusHeaderClassMap[localShipsVariant.value])

const localShipsHeaderMetaTextClass = computed(() => {
  // warning header uses dark text; others are white
  return localShipsVariant.value === 'warning' ? 'text-gray-900/90' : 'text-white/90'
})

const statusContainerClassMap: Record<StatusVariant, string> = {
  default: 'border border-gray-200 bg-white dark:bg-slate-800 dark:border-gray-700',
  info: 'border border-blue-200/70 bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:border-blue-500/40 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950/60',
  danger: 'border border-red-200 bg-red-50 dark:bg-red-900/40 dark:border-red-400',
  warning: 'border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/40 dark:border-yellow-400',
  success: 'border border-green-200 bg-green-50 dark:bg-green-900/40 dark:border-green-400'
}

const statusHeaderClassMap: Record<StatusVariant, string> = {
  default: 'border-gray-200 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 dark:from-slate-700 dark:to-slate-800 dark:border-gray-600 dark:text-white',
  info: 'border-blue-800 bg-gradient-to-r from-blue-700 to-blue-800 text-white dark:from-blue-900 dark:to-blue-950 dark:border-blue-700',
  danger: 'border-red-600 bg-gradient-to-r from-red-600 to-red-700 text-white dark:from-red-700 dark:to-red-800 dark:border-red-600',
  warning: 'border-yellow-400 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 dark:from-yellow-500 dark:to-yellow-600 dark:border-yellow-400 dark:text-gray-900',
  success: 'border-green-600 bg-gradient-to-r from-green-600 to-green-700 text-white dark:from-green-700 dark:to-green-800 dark:border-green-600'
}

const getStatusVariant = (ship?: ShipStatus | null): StatusVariant => {
  if (!ship) return 'default'
  switch (ship.status) {
    case 0: return 'info'
    case 1: return 'danger'
    case 2: return 'warning'
    case 3: return 'warning'
    case 4: return 'success'
    default: return 'default'
  }
}

const getStatusCardContainerClass = (ship?: ShipStatus | null) => statusContainerClassMap[getStatusVariant(ship)]

const getStatusCardHeaderClass = (ship?: ShipStatus | null) => statusHeaderClassMap[getStatusVariant(ship)]

const getFerrySeverity = (state?: string | null): number => {
  if (!state) return 0
  const normalized = state.trim().toLowerCase()
  if (!normalized) return 0
  if (normalized.includes('欠航') || normalized.includes('休航') || normalized.includes('cancel')) return 3
  if (normalized.includes('条件') || normalized.includes('conditional') || normalized.includes('変更')) return 2
  if (normalized.includes('定期') || normalized.includes('通常') || normalized.includes('平常') || normalized.includes('normal') || normalized.includes('operation')) return 1
  return 2
}

const getFerryVariant = (ferry?: FerryStatus | null): StatusVariant => {
  if (!ferry) return 'default'
  const severities = [
    getFerrySeverity(ferry.ferryState),
    getFerrySeverity(ferry.fastFerryState)
  ]
  const maxSeverity = Math.max(...severities)
  if (maxSeverity >= 3) return 'danger'
  if (maxSeverity === 2) return 'warning'
  if (maxSeverity === 1) return 'info'
  return 'default'
}

const getFerryCardContainerClass = (ferry?: FerryStatus | null) => statusContainerClassMap[getFerryVariant(ferry)]

const getFerryCardHeaderClass = (ferry?: FerryStatus | null) => statusHeaderClassMap[getFerryVariant(ferry)]

const getOperationClass = (state: string) => {
  // Check Japanese states
  if (state === '通常運航' || state === '平常運航') return 'text-green-600 dark:text-green-300'
  if (state === '欠航') return 'text-red-600 dark:text-red-300'
  if (state === '条件付き運航') return 'text-yellow-600 dark:text-yellow-300'

  // Check English states
  if (state === 'Normal Operation' || state === 'Normal Service') return 'text-green-600 dark:text-green-300'
  if (state === 'Cancelled' || state === 'Canceled') return 'text-red-600 dark:text-red-300'
  if (state === 'Conditional Operation') return 'text-yellow-600 dark:text-yellow-300'

  return ''
}

const getOperationBadgeClass = (state: string) => {
  // Japanese
  if (state === '通常運航' || state === '平常運航') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
  }
  if (state === '欠航') {
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800'
  }
  if (state === '条件付き運航') {
    return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800'
  }

  // English
  if (state === 'Normal Operation' || state === 'Normal Service') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
  }
  if (state === 'Cancelled' || state === 'Canceled') {
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800'
  }
  if (state === 'Conditional Operation') {
    return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800'
  }

  // Fallback: cobalt-ish accent
  return 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800'
}

const formatDateTime = (dateString: string | Date | null) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatHeaderTimestamp = (dateString: string | Date | null) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  // Compact for headers to avoid wrapping on mobile: MM/DD HH:MM (no year)
  const locale = $i18n.locale.value === 'en' ? 'en-US' : 'ja-JP'
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getStartTimeValue = (ship?: ShipStatus | null) => ship?.startTime || ship?.start_time || null

const formatShipTime = (value?: string | Date | null) => {
  if (!value) return '-'
  if (value instanceof Date) {
    return value.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }
  if (typeof value === 'string') {
    const timeMatch = value.match(/^(\d{1,2}:\d{2})/)
    if (timeMatch) {
      return timeMatch[1]
    }
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }
    return value
  }
  return String(value)
}

const hasOperationInfo = (ship?: ShipStatus | null) => {
  if (!ship) return false
  return Boolean(ship.departure || ship.arrival || getStartTimeValue(ship))
}

const getShipTrips = (trips: any[] | null | undefined) => (Array.isArray(trips) ? trips : [])

const shouldShowReason = (ship: ShipStatus | null | undefined, shipType: 'isokaze' | 'dozen') => {
  if (!ship?.reason) return false
  if (shipType === 'isokaze') {
    return ship.status === 1 || ship.status === 2
  }
  if (shipType === 'dozen') {
    return ship.status >= 1 && ship.status <= 3
  }
  return ship.status !== 0
}

const shouldShowDetailBlock = (ship: ShipStatus | null | undefined, shipType: 'isokaze' | 'dozen') => {
  if (!ship || ship.status === 0) return false
  if (hasOperationInfo(ship)) return true
  if (shouldShowReason(ship, shipType)) return true
  if (ship.comment) return true
  if (getShipTrips(ship.extraShips).length > 0) return true
  if (!getShipTrips(ship.extraShips).length && getShipTrips(ship.lastShips).length > 0) return true
  return false
}

const formatPortLabel = (port?: string | null) => {
  if (!port) return '-'
  const translated = $i18n.t(port)
  return translated !== port ? translated : port
}

const formatTripArrival = (trip: any) => {
  if (!trip) return '-'
  const arrival = formatPortLabel(trip.arrival)
  const viaValue = formatPortLabel(trip.via)
  if (!trip.via || viaValue === '-') return arrival
  const viaLabel = $i18n.t('VIA')
  const isJapanese = $i18n.locale.value === 'ja'
  return isJapanese ? `${viaValue}${viaLabel}${arrival}` : `${arrival} ${viaLabel} ${viaValue}`
}

const formatReason = (reason?: string | null) => {
  if (!reason) return ''
  const translated = $i18n.t(reason)
  return translated !== reason ? translated : reason
}

const getTripDepartureTime = (trip: any) => formatShipTime(trip?.departure_time || trip?.departureTime)

const todayWaveParts = computed(() => splitWaveValue(shipStatus.value?.ferry?.todayWave ?? null))
const tomorrowWaveParts = computed(() => splitWaveValue(shipStatus.value?.ferry?.tomorrowWave ?? null))
const tomorrowWaveHeights = computed(() => parseWaveHeights(shipStatus.value?.ferry?.tomorrowWave ?? null))
const ferryCancelProbability = computed(() => {
  const { m1, m2 } = tomorrowWaveHeights.value
  if (m1 === null || m2 === null) return null
  return predictCancelProbability(m1, m2, 'ferry')
})
const rainbowjetCancelProbability = computed(() => {
  const { m1, m2 } = tomorrowWaveHeights.value
  if (m1 === null || m2 === null) return null
  return predictCancelProbability(m1, m2, 'rainbowjet')
})
const hasRainbowJetTomorrow = computed(() => {
  if (!timetableData.value.length) return true

  const tomorrow = addDaysJst(getTodayJstMidnight(), 1)
  const targetYmd = formatDateYmdJst(tomorrow)
  const targetDate = parseYmdAsJstMidnight(targetYmd)

  const normalizeYmd = (value: string): string => value.replace(/\//g, '-').slice(0, 10)
  const isActiveOn = (trip: { startDate: string; endDate: string }) => {
    const startYmd = normalizeYmd(trip.startDate)
    const endYmd = normalizeYmd(trip.endDate)
    const startDate = parseYmdAsJstMidnight(startYmd)
    const endExclusive = addDaysJst(parseYmdAsJstMidnight(endYmd), 1)
    return targetDate >= startDate && targetDate < endExclusive
  }

  return timetableData.value.some((trip) => trip.name === 'RAINBOWJET' && isActiveOn(trip))
})

const refreshStatus = async () => {
  isLoading.value = true
  try {
    await updateShipStatus()
  } finally {
    isLoading.value = false
  }
}

// Fetch status on mount if data is stale
onMounted(async () => {
  if (ferryStore && ferryStore.isDataStale) {
    await refreshStatus()
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('STATUS')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>
