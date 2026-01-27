<template>
  <div class="container max-w-[1000px] mx-auto px-4 py-6 sm:py-8">
    <h2 class="hidden lg:block text-2xl font-semibold mb-6 dark:text-white">{{ $t('TRANSIT') }}</h2>

    <!-- Current status alerts -->
    <StatusAlerts class="mb-6" />

    <!-- Search Form -->
    <div class="mb-6">
      <h3 class="sr-only">{{ $t('SEARCH_CONDITIONS') }}</h3>
      <!-- Port Selection -->
      <div class="mb-3">
          <TransportModeFilter
            v-if="transportModeOptions.length > 1"
            v-model="selectedTransportMode"
            :options="transportModeOptions"
            class="mb-3"
          />
          <!-- Mobile/PC: 添付デザインに合わせた独自UIに統一 -->
          <RouteEndpointsSelector
            :departure="departure"
            :arrival="arrival"
            @update:departure="departure = $event"
            @update:arrival="arrival = $event"
            @reverse="reverseRoute"
          />
        </div>

      <!-- Date and Time Selection -->
      <div class="grid md:grid-cols-2 gap-3 mb-3">
        <!-- Date Selection -->
        <div>
          <DatePicker v-model="date" :min-date="today" margin="none" size="compact" />
        </div>

        <!-- Time Selection -->
        <div>
          <span class="sr-only">{{ $t('TIME') }}</span>
          <div class="flex">
            <select
v-model="isArrivalMode"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              style="min-width: 140px"
              :aria-label="$t('TIME')"
            >
              <option :value="false">{{ $t('DEPARTURE_AFTER') }}</option>
              <option :value="true">{{ $t('ARRIVE_BY') }}</option>
            </select>
            <input
:id="timeInputId" v-model="time" type="time"
              class="flex-1 px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          </div>
        </div>
      </div>

      <!-- Search Button -->
      <div>
        <PrimaryButton type="button" block size="lg" :disabled="!canSearch || isSearching" @click="handleSearch">
          <span
v-if="isSearching"
            class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
          <svg
v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {{ $t('SEARCH') }}
        </PrimaryButton>
      </div>
    </div>

    <!-- Search Results -->
    <div v-if="filteredResults.length > 0">
      <div class="flex flex-row items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
          {{ $t('SEARCH_RESULTS') }}
        </h3>
        <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <span class="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ $t('SORT_ORDER') }}
          </span>
          <div class="w-full md:w-auto">
            <div class="md:hidden">
              <label class="sr-only" :for="sortSelectId">{{ $t('SORT_ORDER') }}</label>
              <select
                :id="sortSelectId"
                v-model="sortOption"
                class="w-full px-3 py-2 text-sm font-medium rounded-md border border-app-primary text-app-primary bg-white dark:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60"
              >
                <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                  {{ $t(option.labelKey) }}
                </option>
              </select>
            </div>
            <div class="hidden md:flex flex-wrap gap-2" role="tablist" :aria-label="$t('SORT_ORDER')">
              <button
v-for="option in sortOptions" :key="option.value" type="button" role="tab"
                :aria-selected="sortOption === option.value"
                class="px-3 py-2 text-sm font-medium rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60 flex items-center justify-center"
                :class="sortOption === option.value
                  ? 'bg-app-primary text-white border-app-primary shadow-sm'
                  : 'border-app-primary text-app-primary bg-white dark:bg-gray-800 hover:bg-app-primary/10 dark:hover:bg-app-primary/20'"
                @click="sortOption = option.value">
                {{ $t(option.labelKey) }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Route Panels -->
      <div v-for="(route, index) in displayedResults" :key="index" class="mb-4">
        <Card class="overflow-hidden" padding="none">
          <div
            class="bg-app-surface text-app-fg px-4 py-2 flex items-center justify-between border-b border-app-border/70"
            data-testid="transit-result-header"
          >
            <h3 class="font-medium flex items-center gap-3 min-w-0">
              <span
                class="inline-flex items-center justify-center w-7 h-7 bg-app-primary text-white rounded-full font-bold text-sm">
                {{ index + 1 }}
              </span>

              <!-- 中央ブロック: (時刻 + 所要時間/料金) -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
                <!-- 1行目（モバイル）: 時刻 -->
                <span
                  class="text-sm font-semibold tabular-nums text-app-fg truncate"
                  data-testid="transit-header-times"
                >
                  {{ formatTime(route.departureTime) }}→{{ formatTime(route.arrivalTime) }}
                </span>

                <!-- 2行目（モバイル）: 所要時間/料金 -->
                <span class="text-sm text-app-fg truncate" data-testid="transit-header-summary">
                  {{ calculateDuration(route.departureTime, route.arrivalTime) }} /
                  <span v-if="route.totalFare > 0">¥{{ route.totalFare.toLocaleString() }}</span>
                  <span v-else class="text-yellow-700 dark:text-yellow-300">{{ $t('FARE_UNAVAILABLE') }}</span>
                </span>
              </div>

              <!-- 右ブロック: バッジ（欠航/変更あり） -->
              <div class="flex items-center gap-2 shrink-0">
                <Badge
                  v-if="hasCancelledSegment(route)"
                  variant="danger"
                  :title="$t('CANCELLED')"
                  data-testid="route-badge-cancelled"
                >
                  {{ $t('CANCELLED') }}
                </Badge>
                <Badge
                  v-if="hasChangedSegment(route)"
                  variant="warning"
                  :title="$t('CHANGED')"
                  data-testid="route-badge-changed"
                >
                  {{ $t('CHANGED') }}
                </Badge>
              </div>
            </h3>
            <div class="flex items-center gap-2">
              <button
                class="text-app-muted hover:text-app-primary focus:outline-none focus:ring-2 focus:ring-app-primary-2 rounded p-1"
                :title="$t('SHOW_ON_MAP')" @click="showRouteMap(route)">
                <svg
xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              <FavoriteButton
:type="'route'" :route="{ departure: departure, arrival: arrival }"
                class="text-app-muted hover:text-app-primary" />
            </div>
          </div>
          <div class="p-4">
            <table class="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th class="text-left pb-2 font-medium w-1/4 text-app-muted">{{ $t('TIME') }}</th>
                  <th class="text-left pb-2 font-medium text-app-muted">{{ $t('ROUTE') }}</th>
                  <th class="text-left pb-2 font-medium w-1/4 text-app-muted">{{ $t('FARE') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-app-border/60">
                <!-- Departure -->
                <tr class="bg-app-surface-2/60">
                  <td class="py-2 pl-4 pr-4 text-left text-app-fg">{{ formatTime(route.departureTime) }}</td>
                  <td class="py-2 pl-4">
                    <a
href="#" class="text-app-primary group inline-flex items-center gap-2 flex-wrap"
                      @click.prevent="showPortInfo(route.segments[0].departure)">
                      <span class="group-hover:underline inline-flex items-center gap-2">
                        <LocationTypeIcon :type="resolveLocationType(route.segments[0].departureType)" />
                        <span>{{ getPortLabelParts(route.segments[0].departure).name }}</span>
                      </span>
                      <PortBadges :badges="getPortLabelParts(route.segments[0].departure).badges" class="flex flex-wrap gap-1" />
                    </a>
                  </td>
                  <td class="py-2"></td>
                </tr>

                <!-- Segments -->
                <template v-for="(segment, segIndex) in route.segments" :key="'seg-' + segIndex">
                  <!-- Ship Row -->
                  <tr class="bg-app-surface">
                    <td class="py-2 pl-4 pr-4 text-right text-app-muted">
                      {{ formatSegmentDuration(segment.departureTime, segment.arrivalTime) }}
                    </td>
                    <td class="py-2 pl-4" :style="getShipBorderStyle(segment.ship)">
                      <div class="flex items-center">
                        <!-- 欠航アイコン -->
                        <button
v-if="segment.status === 2" type="button" data-test="cancel-status-icon"
                          class="mr-2 inline-flex items-center text-red-600 dark:text-red-300"
                          :title="$t('OPERATION_STATUS')"
                          aria-label="運航状況を見る"
                          @click.stop="showOperationStatus(segment.ship)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z" />
                          </svg>
                        </button>
                        <!-- 警告/変更アイコン -->
                        <button
v-else-if="segment.status === 3" type="button" data-test="warning-status-icon"
                          class="mr-2 inline-flex items-center text-yellow-600 dark:text-yellow-300"
                          :title="$t('OPERATION_STATUS')"
                          aria-label="運航状況を見る"
                          @click.stop="showOperationStatus(segment.ship)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                          </svg>
                        </button>
                        <!-- 運航再開アイコン -->
                        <button
v-else-if="segment.status === 4" type="button" data-test="resumed-status-icon"
                          class="mr-2 inline-flex items-center text-green-600 dark:text-green-300"
                          :title="$t('OPERATION_STATUS')"
                          aria-label="運航状況を見る"
                          @click.stop="showOperationStatus(segment.ship)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z" />
                          </svg>
                        </button>
                        <!-- 船種全体の運航状況に変更がある場合の注意マーク（便ごとのステータスが通常の場合のみ表示） -->
                        <button
                          v-else-if="getShipStatusAlert(segment.ship)"
                          type="button"
                          data-test="ship-status-alert-icon"
                          class="mr-2 inline-flex items-center"
                          :class="{
                            'text-red-600 dark:text-red-300': getShipStatusAlert(segment.ship)?.severity === 'danger',
                            'text-yellow-600 dark:text-yellow-300': getShipStatusAlert(segment.ship)?.severity === 'warning',
                            'text-green-600 dark:text-green-300': getShipStatusAlert(segment.ship)?.severity === 'info'
                          }"
                          :title="$t('OPERATION_STATUS')"
                          aria-label="運航状況を見る"
                          @click.stop="showOperationStatus(segment.ship)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                          </svg>
                        </button>
                        <div class="flex flex-col">
                          <div class="flex items-center gap-2 flex-wrap">
                            <a
href="#" class="text-app-primary hover:underline"
                              @click.prevent="showShipInfo(segment.ship)">
                              🚢 {{ $t(segment.ship) }}
                            </a>
                            <a
                              v-if="segment.ship === 'RAINBOWJET'"
                              :href="rainbowJetSeatAvailabilityUrl"
                              class="inline-flex items-center rounded border border-app-primary text-app-primary text-xs px-2 py-0.5 whitespace-nowrap hover:bg-app-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/60"
                              target="_blank"
                              rel="noopener noreferrer"
                              :aria-label="$t('CHECK_SEAT_AVAILABILITY')"
                            >
                              {{ $t('CHECK_SEAT_AVAILABILITY') }}
                            </a>
                          </div>
                          <span v-if="formatSegmentMeta(segment)" class="text-xs text-app-muted mt-0.5">
                            {{ formatSegmentMeta(segment) }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td class="py-2 text-app-fg">
                    <span v-if="segment.fare > 0">¥{{ segment.fare.toLocaleString() }}</span>
                    <span v-else class="text-app-muted">{{ $t('FARE_UNAVAILABLE') }}</span>
                  </td>
                  </tr>

                  <!-- Transfer Port (if not last segment) -->
                  <tr v-if="segIndex < route.segments.length - 1" class="bg-app-surface-2/60">
                    <td class="py-2 pl-4 pr-4 text-left text-app-fg whitespace-pre-line">
                      {{ formatTransferPortTimes(segment.arrivalTime, route.segments[segIndex + 1].departureTime) }}
                    </td>
                    <td class="py-2 pl-4">
                      <a
href="#" class="text-app-primary group inline-flex items-center gap-2 flex-wrap"
                        @click.prevent="showPortInfo(segment.arrival)">
                        <span class="group-hover:underline inline-flex items-center gap-2">
                          <LocationTypeIcon :type="resolveLocationType(segment.arrivalType)" />
                          <span>{{ getPortLabelParts(segment.arrival).name }}</span>
                        </span>
                        <PortBadges :badges="getPortLabelParts(segment.arrival).badges" class="flex flex-wrap gap-1" />
                      </a>
                      <span class="text-xs text-app-muted ml-2">
                        ({{ $t('TRANSFER') }}) {{ formatTransferWaitTime(segment.arrivalTime, route.segments[segIndex +
                          1].departureTime) }}
                      </span>
                    </td>
                    <td class="py-2"></td>
                  </tr>
                </template>

                <!-- Arrival -->
                <tr class="bg-app-surface-2/60">
                  <td class="py-2 pl-4 pr-4 text-left text-app-fg">{{ formatTime(route.arrivalTime) }}</td>
                  <td class="py-2 pl-4">
                    <a
href="#" class="text-app-primary group inline-flex items-center gap-2 flex-wrap"
                      @click.prevent="showPortInfo(route.segments[route.segments.length - 1].arrival)">
                      <span class="group-hover:underline inline-flex items-center gap-2">
                        <LocationTypeIcon :type="resolveLocationType(route.segments[route.segments.length - 1].arrivalType)" />
                        <span>{{ getPortLabelParts(route.segments[route.segments.length - 1].arrival).name }}</span>
                      </span>
                      <PortBadges :badges="getPortLabelParts(route.segments[route.segments.length - 1].arrival).badges" class="flex flex-wrap gap-1" />
                    </a>
                  </td>
                  <td class="py-2 font-medium text-app-fg">
                    <span v-if="route.totalFare > 0">{{ $t('TOTAL') }}: ¥{{ route.totalFare.toLocaleString() }}</span>
                    <span v-else class="text-app-muted">{{ $t('FARE_UNAVAILABLE') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <!-- Show More Button -->
      <div v-if="filteredResults.length > displayLimit" class="mt-4">
        <PrimaryButton block size="lg" @click="showMore">
          {{ $t('MORE_BUTTON') }}
        </PrimaryButton>
      </div>
    </div>

    <!-- No Results -->
    <div
v-else-if="hasSearched && !isSearching"
      class="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-gray-700 text-blue-900 dark:text-blue-300 px-4 py-3 rounded">
      <div class="flex flex-col gap-3">
        <p class="font-medium">
          {{ $t('NO_ROUTES_FOUND') }}
        </p>
        <button
          type="button"
          class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            border-blue-700 dark:border-blue-400 text-blue-800 dark:text-blue-200 bg-white/90 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canSearch || isSearching"
          data-testid="transit-retry-search"
          @click="retrySearchWithAdjustedTime"
        >
          {{ retrySearchLabel }}
        </button>
      </div>
    </div>

    <!-- Route Details Modal -->
    <CommonShipModal v-model:visible="showDetailsModal" :title="$t('ROUTE_DETAILS')" type="custom">
    <div v-if="selectedRoute">
      <div v-for="(segment, index) in selectedRoute.segments" :key="index" class="mb-3">
        <div class="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
          <div class="p-4">
              <h6 class="text-sm text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center w-5 h-5 bg-blue-700 text-white dark:bg-blue-800 rounded-full font-bold text-xs">
                  {{ index + 1 }}
                </span>
                <span>{{ $t('LEG') }}</span>
              </h6>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div class="md:col-span-2 dark:text-gray-300">
                  <strong>{{ formatTime(segment.departureTime) }}</strong><br>
                  <span class="inline-flex flex-col gap-1">
                    <span class="inline-flex items-center gap-2">
                      <LocationTypeIcon :type="resolveLocationType(segment.departureType)" />
                      <span>{{ getPortLabelParts(segment.departure).name }}</span>
                    </span>
                    <PortBadges :badges="getPortLabelParts(segment.departure).badges" class="flex flex-wrap gap-1" />
                  </span>
                </div>
                <div class="md:col-span-1 text-center">
                  <div class="mt-2 dark:text-gray-300">→</div>
                  <small class="text-gray-500 dark:text-gray-300">🚢 {{ $t(segment.ship) }}</small>
                  <small v-if="formatSegmentMeta(segment)" class="text-gray-500 dark:text-gray-300 block mt-1">
                    {{ formatSegmentMeta(segment) }}
                  </small>
                </div>
                <div class="md:col-span-2 text-right dark:text-gray-300">
                  <strong>{{ formatTime(segment.arrivalTime) }}</strong><br>
                  <span class="inline-flex flex-col gap-1 items-end">
                    <span class="inline-flex items-center gap-2">
                      <LocationTypeIcon :type="resolveLocationType(segment.arrivalType)" />
                      <span>{{ getPortLabelParts(segment.arrival).name }}</span>
                    </span>
                    <PortBadges :badges="getPortLabelParts(segment.arrival).badges" class="flex flex-wrap gap-1" />
                  </span>
                </div>
              </div>
              <div class="mt-2">
                <small class="text-gray-500 dark:text-gray-300">
                  {{ $t('FARE') }}: 
                  <span v-if="segment.fare > 0">¥{{ segment.fare.toLocaleString() }}</span>
                  <span v-else class="text-gray-500">{{ $t('FARE_UNAVAILABLE') }}</span>
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div class="dark:text-gray-300">
              <strong>{{ $t('TOTAL_DURATION') }}:</strong>
              {{ calculateDuration(selectedRoute.departureTime, selectedRoute.arrivalTime) }}
            </div>
            <div class="text-right dark:text-gray-300">
              <strong>{{ $t('TOTAL_FARE') }}:</strong>
              <span v-if="selectedRoute.totalFare > 0">¥{{ selectedRoute.totalFare.toLocaleString() }}</span>
              <span v-else class="text-gray-500">{{ $t('FARE_UNAVAILABLE') }}</span>
            </div>
          </div>
        </div>
      </div>
    </CommonShipModal>

    <!-- Ship Info Modal -->
    <CommonShipModal v-model:visible="showShipModal" :title="$t(modalShipId)" type="ship" :ship-id="modalShipId" />

    <!-- Port Info Modal -->
    <CommonShipModal
v-model:visible="showPortModal" :title="getPortDisplayName(modalPortId)" type="port"
      :port-id="modalPortId" :port-zoom="modalPortZoom" />

    <!-- Route Map Modal -->
    <RouteMapModal v-model:visible="showMapModal" :route="selectedMapRoute" />

    <!-- Operation Status Modal -->
    <OperationStatusModal
      v-model:visible="operationStatusModalVisible"
      :ship-name="operationStatusShipName"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, getCurrentInstance, markRaw } from 'vue'
import { useRouteSearch } from '@/composables/useRouteSearch'
import { useAnalytics } from '@/composables/useAnalytics'
import { useHistoryStore } from '@/stores/history'
import { useFerryStore } from '@/stores/ferry'
import RouteEndpointsSelector from '@/components/common/RouteEndpointsSelector.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import CommonShipModal from '@/components/common/ShipModal.vue'
import OperationStatusModal from '@/components/common/OperationStatusModal.vue'
import StatusAlerts from '@/components/common/StatusAlerts.vue'
import FavoriteButton from '@/components/favorites/FavoriteButton.vue'
import PortBadges from '@/components/common/PortBadges.vue'
import RouteMapModal from '@/components/map/RouteMapModal.vue'
import Card from '@/components/common/Card.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import Badge from '@/components/common/Badge.vue'
import TransportModeFilter from '@/components/common/TransportModeFilter.vue'
import LocationTypeIcon from '@/components/common/LocationTypeIcon.vue'
import type { LocationType, TransportMode, TransitRoute, TransitSegment } from '@/types'
import { createLogger } from '~/utils/logger'

// Stores
const ferryStore = process.client ? useFerryStore() : null
const historyStore = process.client ? useHistoryStore() : null
const logger = createLogger('TransitPage')

// Search parameters - use refs for better reactivity
const departure = ref(ferryStore?.departure || '')
const arrival = ref(ferryStore?.arrival || '')
const date = ref(new Date())
const time = ref('')
const timeInputId = 'transit-time-input'
const sortSelectId = 'transit-sort-select'
const isArrivalMode = ref(false)
const historySearchedAt = ref<Date | null>(null)

// Watch for changes in departure/arrival and update ferryStore
watch(departure, (newVal) => {
  if (ferryStore) {
    ferryStore.setDeparture(newVal)
  }
})

watch(arrival, (newVal) => {
  if (ferryStore) {
    ferryStore.setArrival(newVal)
  }
})

// Watch for changes in ferryStore and update local refs
watch(() => ferryStore?.departure, (newVal) => {
  if (newVal && departure.value !== newVal) {
    departure.value = newVal
  }
})

watch(() => ferryStore?.arrival, (newVal) => {
  if (newVal && arrival.value !== newVal) {
    arrival.value = newVal
  }
})

// State
const isSearching = ref(false)
const hasSearched = ref(false)
const searchResults = ref<TransitRoute[]>([])
const searchDateForResults = ref<Date | null>(null)
const displayLimit = ref(5)
const showDetailsModal = ref(false)
const selectedRoute = ref<TransitRoute | null>(null)

type SortKey = 'recommended' | 'fast' | 'cheap' | 'easy'

const sortOptions: Array<{ value: SortKey; labelKey: string }> = [
  { value: 'recommended', labelKey: 'SORT_RECOMMENDED' },
  { value: 'fast', labelKey: 'SORT_FAST' },
  { value: 'cheap', labelKey: 'SORT_CHEAP' },
  { value: 'easy', labelKey: 'SORT_EASY' }
]

const sortOption = ref<SortKey>('recommended')
const transportModeOrder: TransportMode[] = ['FERRY', 'BUS', 'AIR']
type TransportModeFilterValue = TransportMode | 'ALL'
const selectedTransportMode = ref<TransportModeFilterValue>('ALL')

// Composables
const { searchRoutes, formatTime, calculateDuration, getPortDisplayName } = useRouteSearch()
const { trackSearch } = useAnalytics()
const { t } = useI18n()

const getPortLabelParts = (portId?: string) => {
  if (!portId) {
    return { name: '-', badges: [] as string[] }
  }
  const translated = String(t(portId))
  const label = translated && translated !== portId ? translated : getPortDisplayName(portId) || portId
  const parenRegex = /[（(]([^）)]+)[）)]/g
  const badges: string[] = []

  let match = parenRegex.exec(label)
  while (match) {
    const value = match[1]?.trim()
    if (value) badges.push(value)
    match = parenRegex.exec(label)
  }

  const name = label.replace(parenRegex, '').replace(/\s+/g, ' ').trim()
  return {
    name: name || label.trim(),
    badges
  }
}

const resolveLocationType = (value?: LocationType) => value ?? 'PORT'

const formatSegmentMeta = (segment: TransitSegment) => {
  const parts = [
    segment.platform ? `${t('SEGMENT.PLATFORM')}: ${segment.platform}` : '',
    segment.terminal ? `${t('SEGMENT.TERMINAL')}: ${segment.terminal}` : '',
    segment.gate ? `${t('SEGMENT.GATE')}: ${segment.gate}` : ''
  ].filter(Boolean)
  return parts.join(' / ')
}

const hasCancelledSegment = (route: TransitRoute): boolean => {
  return Array.isArray(route?.segments) && route.segments.some(s => s.status === 2)
}

const hasChangedSegment = (route: TransitRoute): boolean => {
  return Array.isArray(route?.segments) && route.segments.some(s => s.status === 3)
}

const cloneRouteForState = (route: TransitRoute): TransitRoute => {
  const segments = Array.isArray(route.segments)
    ? route.segments.map(segment => markRaw({
      ...segment
    }))
    : []

  return markRaw({
    ...route,
    segments
  })
}

const normalizeTransitRoutes = (routes: TransitRoute[]): TransitRoute[] => {
  return routes.map(cloneRouteForState)
}

const setSearchResults = (routes: TransitRoute[] = []) => {
  searchResults.value = normalizeTransitRoutes(routes)
}

const setSelectedRoute = (route: TransitRoute | null) => {
  selectedRoute.value = route ? cloneRouteForState(route) : null
}

const instance = getCurrentInstance()
if (instance?.proxy) {
  Object.defineProperty(instance.proxy, 'searchResults', {
    get() {
      return searchResults.value
    },
    set(value: TransitRoute[] | null | undefined) {
      if (Array.isArray(value)) {
        setSearchResults(value)
      } else {
        setSearchResults([])
      }
    },
    configurable: true,
    enumerable: true
  })
  Object.defineProperty(instance.proxy, 'selectedRoute', {
    get() {
      return selectedRoute.value
    },
    set(value: TransitRoute | null | undefined) {
      setSelectedRoute(value ?? null)
    },
    configurable: true,
    enumerable: true
  })
}

// Constants
const today = new Date()
today.setHours(0, 0, 0, 0)

// Computed
const canSearch = computed(() => {
  return departure.value &&
    arrival.value &&
    departure.value !== arrival.value
})

const normalizeTransportMode = (mode?: TransportMode | string): TransportMode => {
  if (mode === 'BUS' || mode === 'AIR' || mode === 'FERRY') return mode
  return 'FERRY'
}

const availableTransportModes = computed(() => {
  const modes = new Set<TransportMode>()
  for (const route of searchResults.value) {
    for (const segment of route.segments) {
      modes.add(normalizeTransportMode(segment.mode))
    }
  }
  return transportModeOrder.filter(mode => modes.has(mode))
})

const transportModeOptions = computed(() => {
  if (availableTransportModes.value.length <= 1) return []
  return ['ALL', ...availableTransportModes.value]
})

watch(transportModeOptions, (options) => {
  if (!options.length) {
    selectedTransportMode.value = 'ALL'
    return
  }
  if (!options.includes(selectedTransportMode.value)) {
    selectedTransportMode.value = 'ALL'
  }
})

const filteredResults = computed(() => {
  if (selectedTransportMode.value === 'ALL' || transportModeOptions.value.length === 0) {
    return searchResults.value
  }
  return searchResults.value.filter(route =>
    route.segments.some(segment => normalizeTransportMode(segment.mode) === selectedTransportMode.value)
  )
})

watch(selectedTransportMode, () => {
  displayLimit.value = 5
})

const sortedResults = computed(() => {
  const routes = [...filteredResults.value]
  if (routes.length <= 1) {
    return routes
  }

  // まず出発時刻順にソート（最適化のための準備）
  routes.sort((a, b) => {
    const departureDiff = a.departureTime.getTime() - b.departureTime.getTime()
    if (departureDiff !== 0) {
      return departureDiff
    }
    // 出発時刻が同じ場合は到着時刻の早い順
    return a.arrivalTime.getTime() - b.arrivalTime.getTime()
  })

  // 同じ出発時刻でより遅く到着する結果を除外
  const filteredRoutes: TransitRoute[] = []
  const departureTimeGroups = new Map<number, TransitRoute[]>()

  // 出発時刻ごとにグループ化
  for (const route of routes) {
    const departureTime = route.departureTime.getTime()
    if (!departureTimeGroups.has(departureTime)) {
      departureTimeGroups.set(departureTime, [])
    }
    departureTimeGroups.get(departureTime)!.push(route)
  }

  // 各グループから到着時刻が最も早いものだけを残す
  for (const [, groupRoutes] of departureTimeGroups) {
    // 到着時刻が最も早いものを選択
    const bestRoute = groupRoutes.reduce((best, current) => {
      return current.arrivalTime.getTime() < best.arrivalTime.getTime() ? current : best
    })
    filteredRoutes.push(bestRoute)
  }

  // ソートオプションに応じて並び替え
  const getDurationMinutes = (route: TransitRoute): number => {
    return (route.arrivalTime.getTime() - route.departureTime.getTime()) / (1000 * 60)
  }

  const compareByDepartureTime = (a: TransitRoute, b: TransitRoute): number => {
    const departureDiff = a.departureTime.getTime() - b.departureTime.getTime()
    if (departureDiff !== 0) {
      return departureDiff
    }
    // 出発時刻が同じ場合は到着時刻の早い順
    return a.arrivalTime.getTime() - b.arrivalTime.getTime()
  }

  const compareByDuration = (a: TransitRoute, b: TransitRoute): number => {
    const diff = getDurationMinutes(a) - getDurationMinutes(b)
    if (diff !== 0) {
      return diff
    }
    const fareDiff = a.totalFare - b.totalFare
    if (fareDiff !== 0) {
      return fareDiff
    }
    return compareByDepartureTime(a, b)
  }

  const compareByFare = (a: TransitRoute, b: TransitRoute): number => {
    const diff = a.totalFare - b.totalFare
    if (diff !== 0) {
      return diff
    }
    // 同じ金額の場合は時系列順（出発時刻順）
    return compareByDepartureTime(a, b)
  }

  const compareByTransfer = (a: TransitRoute, b: TransitRoute): number => {
    const diff = a.transferCount - b.transferCount
    if (diff !== 0) {
      return diff
    }
    // 同じ乗り換え回数の場合は時系列順（出発時刻順）
    return compareByDepartureTime(a, b)
  }

  if (sortOption.value === 'fast') {
    return filteredRoutes.sort(compareByDuration)
  }
  if (sortOption.value === 'cheap') {
    return filteredRoutes.sort(compareByFare)
  }
  if (sortOption.value === 'easy') {
    return filteredRoutes.sort(compareByTransfer)
  }

  // 時系列順（出発時刻順）でソート
  return filteredRoutes.sort(compareByDepartureTime)
})

const displayedResults = computed(() => {
  return sortedResults.value.slice(0, displayLimit.value)
})

const RETRY_TIME_SHIFT_MINUTES = 60

const retrySearchLabel = computed(() => {
  return isArrivalMode.value
    ? t('TRANSIT_RETRY_LATER', { minutes: RETRY_TIME_SHIFT_MINUTES })
    : t('TRANSIT_RETRY_EARLIER', { minutes: RETRY_TIME_SHIFT_MINUTES })
})

const rainbowJetSeatAvailabilityUrl = computed(() => {
  const targetDate = searchDateForResults.value ?? date.value ?? new Date()
  return buildRainbowJetSeatAvailabilityUrl(targetDate)
})

// Methods
function getCurrentTimeString(): string {
  const now = new Date()
  const hours = Math.floor(now.getHours() / 1) * 1
  const minutes = Math.floor(now.getMinutes() / 15) * 15
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function formatRainbowJetSeatAvailabilityMonth(targetDate: Date): string {
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function buildRainbowJetSeatAvailabilityUrl(targetDate: Date): string {
  const month = formatRainbowJetSeatAvailabilityMonth(targetDate)
  return `https://www.oki-kisen.co.jp/kuuseki/kuuseki_rainbow/?time=${month}`
}

function buildSearchDateTime(baseDate: Date, timeStr: string): Date {
  const dt = new Date(baseDate)
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  dt.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
  return dt
}

function formatHHMM(dt: Date): string {
  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function clampToMinDateTime(dt: Date): Date {
  // DatePicker の min-date は「今日」なので、今日より前に落ちる場合は今日の 00:00 に丸める
  const min = new Date(today)
  min.setHours(0, 0, 0, 0)
  if (dt.getTime() < min.getTime()) {
    return min
  }
  return dt
}

async function retrySearchWithAdjustedTime() {
  if (!canSearch.value || isSearching.value) return

  const deltaMinutes = isArrivalMode.value ? RETRY_TIME_SHIFT_MINUTES : -RETRY_TIME_SHIFT_MINUTES
  const current = buildSearchDateTime(date.value, time.value)
  const next = new Date(current.getTime() + deltaMinutes * 60 * 1000)
  const clamped = clampToMinDateTime(next)

  // date は日付のみを保持し、time は HH:MM で保持
  date.value = new Date(clamped.getFullYear(), clamped.getMonth(), clamped.getDate())
  time.value = formatHHMM(clamped)

  await handleSearch()
}

function reverseRoute() {
  const temp = departure.value
  departure.value = arrival.value
  arrival.value = temp
  // ferryStore will be updated via the watch handlers
}

function getShipBorderStyle(ship: string): string {
  const borderStyles: Record<string, string> = {
    'FERRY_OKI': 'border-left: double 10px #DA6272',
    'FERRY_SHIRASHIMA': 'border-left: double 10px #DA6272',
    'FERRY_KUNIGA': 'border-left: double 10px #DA6272',
    'FERRY_DOZEN': 'border-left: double 10px #F3C759',
    'ISOKAZE': 'border-left: double 10px #45A1CF',
    'RAINBOWJET': 'border-left: double 10px #40BFB0'
  }
  return borderStyles[ship] || 'border-left: double 10px #888888'
}

const formatTransferPortTimes = (arrivalTime: Date, nextDepartureTime: Date): string => {
  return `${formatTime(arrivalTime)}${t('TRANSFER_ARRIVAL_MARK')}
${formatTime(nextDepartureTime)}${t('TRANSFER_DEPARTURE_MARK')}`
}

const formatTransferWaitTime = (arrivalTime: Date, nextDepartureTime: Date): string => {
  const waitMillis = nextDepartureTime.getTime() - arrivalTime.getTime()
  if (waitMillis <= 0) {
    return t('TRANSFER_WAIT_TIME_SHORT')
  }
  const duration = calculateDuration(arrivalTime, nextDepartureTime)
  return t('TRANSFER_WAIT_TIME', { duration })
}

const formatSegmentDuration = (departureTime: Date, arrivalTime: Date): string => {
  const duration = calculateDuration(departureTime, arrivalTime)
  return duration
}

// Modal state
const showShipModal = ref(false)
const showPortModal = ref(false)
const modalShipId = ref('')
const modalPortId = ref('')
const showMapModal = ref(false)
const selectedMapRoute = ref<TransitRoute | null>(null)
const operationStatusModalVisible = ref(false)
const operationStatusShipName = ref('')

const modalPortZoom = computed<number>(() => {
  const id = modalPortId.value
  if (!id) return 15
  return id === 'BEPPU' ? 17
    : id === 'HISHIURA' ? 18
    : id === 'KURI' ? 18
    : 15
})

// 船種の運航状況に変更があるかチェック（当日のみ）
const getShipStatusAlert = (shipName: string): { hasAlert: boolean; severity: 'warning' | 'danger' | 'info' } | null => {
  // 当日以外は表示しない
  const todayStr = new Date().toISOString().slice(0, 10)
  const dateStr = date.value.toISOString().slice(0, 10)
  if (dateStr !== todayStr) {
    return null
  }

  const status = ferryStore?.shipStatus
  if (!status) return null

  // いそかぜ
  if (shipName === 'ISOKAZE') {
    if (status.isokaze?.status && status.isokaze.status !== 0) {
      // status: 1=全便欠航, 2=部分欠航, 3=変更, 4=運航再開
      if (status.isokaze.status === 1) return { hasAlert: true, severity: 'danger' }
      if (status.isokaze.status === 4) return { hasAlert: true, severity: 'info' }
      return { hasAlert: true, severity: 'warning' }
    }
    return null
  }

  // フェリーどうぜん
  if (shipName === 'FERRY_DOZEN') {
    if (status.dozen?.status && status.dozen.status !== 0) {
      if (status.dozen.status === 1) return { hasAlert: true, severity: 'danger' }
      if (status.dozen.status === 4) return { hasAlert: true, severity: 'info' }
      return { hasAlert: true, severity: 'warning' }
    }
    return null
  }

  // 隠岐汽船フェリー（おき、しらしま、くにが）
  if (['FERRY_OKI', 'FERRY_SHIRASHIMA', 'FERRY_KUNIGA'].includes(shipName)) {
    const ferryState = status.ferry?.ferryState || status.ferry?.ferry_state
    if (ferryState && !['定期運航', '通常運航', '平常運航', 'Normal Operation', 'Normal Service'].includes(ferryState)) {
      if (ferryState.includes('欠航') || ferryState.includes('Cancelled') || ferryState.includes('Canceled')) {
        return { hasAlert: true, severity: 'danger' }
      }
      return { hasAlert: true, severity: 'warning' }
    }
    return null
  }

  // レインボージェット
  if (shipName === 'RAINBOWJET') {
    const fastFerryState = status.ferry?.fastFerryState || status.ferry?.fast_ferry_state
    if (fastFerryState && !['( in Operation )', '定期運航', '通常運航', '平常運航', 'Normal Operation', 'Normal Service'].includes(fastFerryState)) {
      if (fastFerryState.includes('欠航') || fastFerryState.includes('Cancelled') || fastFerryState.includes('Canceled')) {
        return { hasAlert: true, severity: 'danger' }
      }
      return { hasAlert: true, severity: 'warning' }
    }
    return null
  }

  return null
}

// 運航状況モーダルを表示
function showOperationStatus(shipName: string) {
  operationStatusShipName.value = shipName
  operationStatusModalVisible.value = true
}

function showShipInfo(shipName: string) {
  modalShipId.value = shipName
  showShipModal.value = true
}

function showPortInfo(portName: string) {
  modalPortId.value = portName
  showPortModal.value = true
}

async function handleSearch() {
  if (!canSearch.value) {
    logger.warn('Cannot search - missing required fields')
    return
  }

  logger.debug('Starting search', {
    departure: departure.value,
    arrival: arrival.value,
    date: date.value,
    time: time.value,
    isArrivalMode: isArrivalMode.value
  })
  isSearching.value = true
  hasSearched.value = true
  displayLimit.value = 5
  searchDateForResults.value = new Date(date.value)

  try {
    const results = await searchRoutes(
      departure.value,
      arrival.value,
      date.value,
      time.value,
      isArrivalMode.value
    )

    logger.debug('Search results', results)
    setSelectedRoute(null)
    setSearchResults(results)

    // アナリティクスに検索を記録
    const searchDateTime = new Date(date.value)
    if (time.value) {
      const [hours, minutes] = time.value.split(':')
      searchDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    }
    trackSearch({
      depId: departure.value,
      arrId: arrival.value,
      datetime: searchDateTime.toISOString()
    })

    // Add to search history
    if (historyStore) {
      // Create a proper Date object for the time by combining date and time
      const searchDateTime = new Date(date.value)
      if (time.value) {
        const [hours, minutes] = time.value.split(':')
        searchDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      }

      // 検索履歴から再検索の場合は、元の検索日時を使用
      historyStore.addSearchHistory({
        type: 'route',
        departure: departure.value,
        arrival: arrival.value,
        date: date.value,
        time: searchDateTime,
        isArrivalMode: isArrivalMode.value
      }, historySearchedAt.value || undefined)
    }
  } catch (error) {
    logger.error('Search error', error)
    setSelectedRoute(null)
    setSearchResults([])
  } finally {
    isSearching.value = false
  }
}

function showMore() {
  displayLimit.value += 10
}

function showRouteMap(route: TransitRoute) {
  selectedMapRoute.value = route
  showMapModal.value = true
}

// 出発地または目的地が変更されたら、モーダルの地図上のルートを一旦クリア
watch([departure, arrival], async () => {
  // まずクリア
  selectedMapRoute.value = null
  if (showMapModal.value) {
    await nextTick()
  }
})

// Initialize from URL parameters
onMounted(() => {
  const route = useRoute()

  // URLパラメータから設定 (時刻より先に他のパラメータを設定)
  if (route.query.departure) {
    departure.value = route.query.departure as string
  }
  if (route.query.arrival) {
    arrival.value = route.query.arrival as string
  }
  if (route.query.date) {
    date.value = new Date(route.query.date as string)
  }
  if (route.query.time) {
    time.value = route.query.time as string
  } else {
    // URLパラメータに時刻がない場合のみ現在時刻を設定
    time.value = getCurrentTimeString()
  }
  if (route.query.isArrivalMode) {
    isArrivalMode.value = route.query.isArrivalMode === '1'
  }
  // 検索履歴から遷移してきた場合は、元の検索日時を保持
  if (route.query.searchedAt) {
    historySearchedAt.value = new Date(route.query.searchedAt as string)
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('TRANSIT')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>
