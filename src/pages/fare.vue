<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <h2 class="text-2xl font-semibold mb-6 dark:text-white">{{ $t('FARE_TABLE') }}</h2>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('LOADING') }}...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded" role="alert">
      {{ $t(error) }}
    </div>

    <!-- Fare tables -->
    <div v-else>
      <!-- Tab navigation -->
      <div class="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
            ]"
            @click="activeTab = tab.id"
          >
            {{ $t(tab.nameKey) }}
          </button>
        </nav>
      </div>

      <p
        v-if="activeVersionLabel"
        class="mb-4 text-sm text-gray-600 dark:text-gray-400"
      >
        {{ activeVersionLabel }}
      </p>

      <!-- Oki Kisen Ferry -->
      <div v-show="activeTab === 'okiKisen'" class="mb-12">
        <h3 class="text-xl font-medium mb-4 dark:text-white">{{ $t('OKI_KISEN_FERRY') }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ $t('FERRY_OKI') }}, {{ $t('FERRY_SHIRASHIMA') }}, {{ $t('FERRY_KUNIGA') }}</p>
        
        <!-- Seat class fares -->
        <h4 class="text-lg font-medium mb-3 dark:text-white">{{ $t('SEAT_CLASS_FARE') }}</h4>
        <div class="overflow-x-auto mb-8">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100"></th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('HONDO_OKI') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('DOZEN_DOGO') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('BEPPU_HISHIURA') }}<br>({{ $t('DOZEN') }})</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('HISHIURA_KURI') }}<br>({{ $t('DOZEN') }})</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('KURI_BEPPU') }}<br>({{ $t('DOZEN') }})</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="seatClass in seatClasses" :key="seatClass.key" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium dark:text-gray-100">
                  {{ $t(seatClass.nameKey) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getSeatClassFare('hondo-oki', seatClass.key) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getSeatClassFare('dozen-dogo', seatClass.key) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getSeatClassFare('beppu-hishiura', seatClass.key) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getSeatClassFare('hishiura-kuri', seatClass.key) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getSeatClassFare('kuri-beppu', seatClass.key) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vehicle fares -->
        <h4 class="text-lg font-medium mb-3 dark:text-white">{{ $t('VEHICLE_FARE') }}</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100"></th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('HONDO_OKI') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('DOZEN_DOGO') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('BEPPU_HISHIURA') }}<br>({{ $t('DOZEN') }})</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('HISHIURA_KURI') }}<br>({{ $t('DOZEN') }})</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">{{ $t('KURI_BEPPU') }}<br>({{ $t('DOZEN') }})</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="size in vehicleSizeList" :key="size.key" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium dark:text-gray-100">
                  {{ size.label }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('hondo-oki', size.key) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('dozen-dogo', size.key) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('beppu-hishiura', size.key) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('hishiura-kuri', size.key) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('kuri-beppu', size.key) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INFANT_AGE_NOTE') }}</p>
          <p>{{ $t('VEHICLE_LENGTH_NOTE') }}</p>
        </div>
      </div>

      <!-- Naiko Sen (Ferry Dozen / Isokaze) -->
      <div v-show="activeTab === 'naikoSen'" class="mb-12">
        <h3 class="text-xl font-medium mb-4 dark:text-white">{{ $t('NAIKO_SEN') }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ $t('FERRY_DOZEN') }}, {{ $t('ISOKAZE') }}</p>
        
        <!-- Passenger fares -->
        <h4 class="text-lg font-medium mb-3 dark:text-white">{{ $t('PASSENGER_FARE') }}</h4>
        <div class="overflow-x-auto mb-8">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{ $t('INNER_ISLAND_ROUTE_COMMON') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{ $t('ADULT') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{ $t('CHILD') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ $t('ALL_INNER_ISLAND_ROUTES') }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandFare?.adult || 300) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandFare?.child || 100) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('INNER_ISLAND_CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INNER_ISLAND_INFANT_FREE_NOTE') }}</p>
          <p>{{ $t('INNER_ISLAND_INFANT_PAID_NOTE') }}</p>
        </div>
        
        <!-- Vehicle fares -->
        <h4 class="text-lg font-medium mb-3 dark:text-white">{{ $t('VEHICLE_FARE') }}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{{ $t('FERRY_DOZEN_VEHICLE_ONLY') }}</p>
        <div class="overflow-x-auto">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{ $t('VEHICLE_SIZE') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{ $t('FARE') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">{{ $t('VEHICLE_UNDER_5M') }}</td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandVehicleFare?.under5m || 1000) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">{{ $t('VEHICLE_5M_TO_7M') }}</td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandVehicleFare?.under7m || 2000) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">{{ $t('VEHICLE_7M_TO_10M') }}</td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandVehicleFare?.under10m || 3000) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">{{ $t('VEHICLE_OVER_10M') }}</td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandVehicleFare?.over10m || 3000) }} {{ $t('VEHICLE_10M_PLUS_CHARGE') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 text-center">
          <a 
            href="https://www.okikankou.com/fee_detail/" 
            target="_blank" 
            rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            {{ $t('INNER_ISLAND_FARE_DETAILS') }}
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </a>
        </div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('VEHICLE_LENGTH_NOTE') }}</p>
        </div>
      </div>

      <!-- Rainbow Jet -->
      <div v-show="activeTab === 'rainbowJet'" class="mb-12">
        <h3 class="text-xl font-medium mb-4 dark:text-white">{{ $t('RAINBOWJET') }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ $t('HIGH_SPEED_FERRY') }}</p>
        
        <!-- Passenger fares -->
        <h4 class="text-lg font-medium mb-3 dark:text-white">{{ $t('PASSENGER_FARE') }}</h4>
        <div class="overflow-x-auto mb-8">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{ $t('ROUTE') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{ $t('ADULT') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{ $t('CHILD') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="rainbowJetSpecialFares?.['hondo-oki']" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ $t('HONDO_OKI') }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(rainbowJetSpecialFares['hondo-oki'].adult) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(rainbowJetSpecialFares['hondo-oki'].child) }}
                </td>
              </tr>
              <tr v-if="rainbowJetSpecialFares?.['dozen-dogo']" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ $t('DOZEN_DOGO') }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(rainbowJetSpecialFares['dozen-dogo'].adult) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(rainbowJetSpecialFares['dozen-dogo'].child) }}
                </td>
              </tr>
              <tr v-if="rainbowJetSpecialFares?.['beppu-hishiura']" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ $t('BEPPU_HISHIURA') }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(rainbowJetSpecialFares['beppu-hishiura'].adult) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(rainbowJetSpecialFares['beppu-hishiura'].child) }}
                </td>
              </tr>
              <tr v-if="rainbowJetSpecialFares?.['hishiura-kuri']" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ $t('HISHIURA_KURI') }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ rainbowJetSpecialFares['hishiura-kuri'].adult ? formatCurrency(rainbowJetSpecialFares['hishiura-kuri'].adult) : '—' }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ rainbowJetSpecialFares['hishiura-kuri'].child ? formatCurrency(rainbowJetSpecialFares['hishiura-kuri'].child) : '—' }}
                </td>
              </tr>
              <tr v-if="rainbowJetSpecialFares?.['kuri-beppu']" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ $t('KURI_BEPPU') }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ rainbowJetSpecialFares['kuri-beppu'].adult ? formatCurrency(rainbowJetSpecialFares['kuri-beppu'].adult) : '—' }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ rainbowJetSpecialFares['kuri-beppu'].child ? formatCurrency(rainbowJetSpecialFares['kuri-beppu'].child) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INFANT_AGE_NOTE') }}</p>
          <p class="text-red-600 dark:text-red-400">{{ $t('RAINBOW_JET_NO_VEHICLE') }}</p>
        </div>
      </div>

      <!-- Discounts -->
      <div v-if="activeTab !== 'naikoSen'" class="mb-8">
        <h3 class="text-xl font-medium mb-4 dark:text-white">{{ $t('DISCOUNTS') }}</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div
v-for="(discount, key) in discounts" :key="key" 
               class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 dark:bg-gray-800">
            <h4 class="font-medium mb-2 dark:text-white">{{ $t(discount.nameKey) }}</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ $t(discount.descriptionKey) }}</p>
            <p class="mt-2 text-lg font-medium text-blue-600 dark:text-blue-400">
              {{ Math.round((1 - discount.rate) * 100) }}% OFF
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { FareVersion } from '@/types/fare'

// Composables
const { formatCurrency, getAllFares } = useFareDisplay()
const fareStore = process.client ? useFareStore() : null

// State
const activeTab = ref('okiKisen')
const okiKisenFares = ref<any[]>([])
const naikoSenFares = ref<any[]>([])
const rainbowJetFares = ref<any[]>([])
const discounts = ref<any>({})
const innerIslandFare = ref<any>(null)
const innerIslandVehicleFare = ref<any>(null)
const rainbowJetSpecialFares = ref<any>(null)

// Seat class definitions
const seatClasses = [
  { key: 'class2', nameKey: 'SEAT_CLASS_2' },
  { key: 'class2Special', nameKey: 'SEAT_CLASS_2_SPECIAL' },
  { key: 'class1', nameKey: 'SEAT_CLASS_1' },
  { key: 'classSpecial', nameKey: 'SEAT_CLASS_SPECIAL' },
  { key: 'specialRoom', nameKey: 'SEAT_CLASS_SPECIAL_ROOM' }
]

// Tab definitions
const tabs = [
  { id: 'okiKisen', nameKey: 'OKI_KISEN_FERRY' },
  { id: 'naikoSen', nameKey: 'NAIKO_SEN' },
  { id: 'rainbowJet', nameKey: 'RAINBOWJET' }
]

// Vehicle sizes (for old format compatibility)
// Vehicle size list for new format
const vehicleSizeList = [
  { key: 'under3m', label: '3m未満' },
  { key: 'under4m', label: '4m未満' },
  { key: 'under5m', label: '5m未満' },
  { key: 'under6m', label: '6m未満' },
  { key: 'under7m', label: '7m未満' },
  { key: 'under8m', label: '8m未満' },
  { key: 'under9m', label: '9m未満' },
  { key: 'under10m', label: '10m未満' },
  { key: 'under11m', label: '11m未満' },
  { key: 'under12m', label: '12m未満' },
  { key: 'over12m', label: '12m以上\n1m増すごとに' }
]

// Computed
const isLoading = computed(() => fareStore?.isLoading ?? false)
const error = computed(() => fareStore?.error ?? null)

const ferryVersion = computed<FareVersion | null>(() =>
  fareStore ? fareStore.getActiveVersion('ferry') : null
)
const highspeedVersion = computed<FareVersion | null>(() =>
  fareStore ? fareStore.getActiveVersion('highspeed') : null
)
const localVersion = computed<FareVersion | null>(() =>
  fareStore ? fareStore.getActiveVersion('local') : null
)

const formatVersionLabel = (version: FareVersion | null): string => {
  if (!version) return ''
  const label = version.name || '現行版'
  if (version.effectiveFrom === '1970-01-01') {
    return label
  }
  return `${label}（適用開始日: ${version.effectiveFrom}）`
}

const activeVersionLabel = computed(() => {
  switch (activeTab.value) {
    case 'rainbowJet':
      return formatVersionLabel(highspeedVersion.value)
    case 'naikoSen':
      return formatVersionLabel(localVersion.value)
    default:
      return formatVersionLabel(ferryVersion.value)
  }
})

// Get seat class fare for a specific route
const getSeatClassFare = (routeType: string, seatClass: string) => {
  let fare = null
  
  if (routeType === 'hondo-oki') {
    // 本土〜隠岐（すべての本土路線は同一料金）
    const route = okiKisenFares.value.find(r => 
      r.id === 'hondo-saigo' || r.id === 'saigo-hondo' ||
      r.id === 'hondo-beppu' || r.id === 'beppu-hondo' ||
      r.id === 'hondo-hishiura' || r.id === 'hishiura-hondo' ||
      r.id === 'hondo-kuri' || r.id === 'kuri-hondo'
    )
    fare = route?.fares?.seatClass?.[seatClass]
  } else if (routeType === 'dozen-dogo') {
    // 島前〜島後（西郷〜別府/菱浦/来居）
    const route = okiKisenFares.value.find(r => 
      r.id === 'saigo-beppu' || r.id === 'beppu-saigo' || 
      r.id === 'saigo-hishiura' || r.id === 'hishiura-saigo' ||
      r.id === 'saigo-kuri' || r.id === 'kuri-saigo'
    )
    fare = route?.fares?.seatClass?.[seatClass]
  } else if (routeType === 'beppu-hishiura') {
    // 別府〜菱浦
    const route = okiKisenFares.value.find(r => r.id === 'beppu-hishiura' || r.id === 'hishiura-beppu')
    fare = route?.fares?.seatClass?.[seatClass]
  } else if (routeType === 'hishiura-kuri') {
    // 菱浦〜来居
    const route = okiKisenFares.value.find(r => r.id === 'hishiura-kuri' || r.id === 'kuri-hishiura')
    fare = route?.fares?.seatClass?.[seatClass]
  } else if (routeType === 'kuri-beppu') {
    // 来居〜別府
    const route = okiKisenFares.value.find(r => r.id === 'kuri-beppu' || r.id === 'beppu-kuri')
    fare = route?.fares?.seatClass?.[seatClass]
  }
  
  return fare ? formatCurrency(fare) : '—'
}

// Get vehicle fare for a specific route
const getVehicleFare = (routeType: string, sizeKey: string) => {
  let fare = null
  let route = null
  
  if (routeType === 'hondo-oki') {
    // 本土〜隠岐（すべての本土路線は同一料金）
    route = okiKisenFares.value.find(r => 
      r.id === 'hondo-saigo' || r.id === 'saigo-hondo' ||
      r.id === 'hondo-beppu' || r.id === 'beppu-hondo' ||
      r.id === 'hondo-hishiura' || r.id === 'hishiura-hondo' ||
      r.id === 'hondo-kuri' || r.id === 'kuri-hondo'
    )
  } else if (routeType === 'dozen-dogo') {
    // 島前〜島後（西郷〜別府/菱浦/来居）
    route = okiKisenFares.value.find(r => 
      r.id === 'saigo-beppu' || r.id === 'beppu-saigo' || 
      r.id === 'saigo-hishiura' || r.id === 'hishiura-saigo' ||
      r.id === 'saigo-kuri' || r.id === 'kuri-saigo'
    )
  } else if (routeType === 'beppu-hishiura') {
    // 別府〜菱浦
    route = okiKisenFares.value.find(r => r.id === 'beppu-hishiura' || r.id === 'hishiura-beppu')
  } else if (routeType === 'hishiura-kuri') {
    // 菱浦〜来居
    route = okiKisenFares.value.find(r => r.id === 'hishiura-kuri' || r.id === 'kuri-hishiura')
  } else if (routeType === 'kuri-beppu') {
    // 来居〜別府
    route = okiKisenFares.value.find(r => r.id === 'kuri-beppu' || r.id === 'beppu-kuri')
  }
  
  // For over12m, use over12mPer1m field
  if (sizeKey === 'over12m') {
    fare = route?.fares?.vehicle?.over12mPer1m
  } else {
    fare = route?.fares?.vehicle?.[sizeKey]
  }
  
  return fare ? formatCurrency(fare) : '—'
}

// Group fares by ship type
const groupFaresByShipType = (fares: any[]) => {
  // Define routes for each ship type
  const okiKisenRoutes = [
    'hondo-saigo', 'saigo-hondo',
    'hondo-beppu', 'beppu-hondo',
    'hondo-hishiura', 'hishiura-hondo',
    'hondo-kuri', 'kuri-hondo',
    'saigo-beppu', 'beppu-saigo',
    'saigo-hishiura', 'hishiura-saigo',
    'saigo-kuri', 'kuri-saigo',
    'beppu-hishiura', 'hishiura-beppu',
    'beppu-kuri', 'kuri-beppu',
    'hishiura-kuri', 'kuri-hishiura'
  ]
  const naikoSenRoutes = [
    'beppu-hishiura', 'hishiura-beppu', 
    'beppu-kuri', 'kuri-beppu', 
    'hishiura-kuri', 'kuri-hishiura'
  ]
  const rainbowJetRoutes = ['hondo-saigo', 'saigo-hondo']
  
  const okiKisen: any[] = []
  const naikoSen: any[] = []
  const rainbowJet: any[] = []
  
  // Group by ship type
  okiKisenRoutes.forEach(id => {
    const route = fares.find(f => f.id === id)
    if (route) okiKisen.push(route)
  })
  
  naikoSenRoutes.forEach(id => {
    const route = fares.find(f => f.id === id)
    if (route) naikoSen.push(route)
  })
  
  rainbowJetRoutes.forEach(id => {
    const route = fares.find(f => f.id === id)
    if (route) rainbowJet.push(route)
  })
  
  return { okiKisen, naikoSen, rainbowJet }
}

// Load fare data
onMounted(async () => {
  const fares = await getAllFares()
  const grouped = groupFaresByShipType(fares)
  
  okiKisenFares.value = grouped.okiKisen
  naikoSenFares.value = grouped.naikoSen
  rainbowJetFares.value = grouped.rainbowJet
  
  // Ensure fareStore is loaded
  if (fareStore) {
    await fareStore.loadFareMaster()
    
    if (fareStore.fareMaster) {
      discounts.value = fareStore.fareMaster.discounts
      innerIslandFare.value = fareStore.fareMaster.innerIslandFare
      innerIslandVehicleFare.value = fareStore.fareMaster.innerIslandVehicleFare
      rainbowJetSpecialFares.value = fareStore.fareMaster.rainbowJetFares
    }
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('FARE_TABLE')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>
