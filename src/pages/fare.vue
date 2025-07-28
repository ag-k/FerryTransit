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
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
            ]"
          >
            {{ $t(tab.nameKey) }}
          </button>
        </nav>
      </div>

      <!-- Oki Kisen Ferry -->
      <div v-show="activeTab === 'okiKisen'" class="mb-12">
        <h3 class="text-xl font-medium mb-4 dark:text-white">{{ $t('OKI_KISEN_FERRY') }}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ $t('FERRY_OKI') }}, {{ $t('FERRY_SHIRASHIMA') }}, {{ $t('FERRY_KUNIGA') }}</p>
        
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
              <tr v-for="route in okiKisenFares" :key="route.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ getRouteDisplayName(route) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(route.fares.adult) }}
                </td>
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(route.fares.child) }}
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
                <th class="border border-gray-300 px-4 py-3 text-left">{{ $t('ROUTE') }}</th>
                <th v-for="size in vehicleSizes" :key="size" 
                    class="border border-gray-300 dark:border-gray-600 px-3 sm:px-4 py-3 text-right text-xs sm:text-sm dark:text-gray-100">
                  {{ getVehicleSizeName(size) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="route in okiKisenFares" :key="route.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ getRouteDisplayName(route) }}
                </td>
                <td v-for="size in vehicleSizes" :key="size" 
                    class="border border-gray-300 dark:border-gray-600 px-3 sm:px-4 py-3 text-right font-mono text-sm dark:text-gray-100">
                  {{ formatCurrency(route.fares.vehicle[size]) }}
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
          <div v-for="(discount, key) in discounts" :key="key" 
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
import type { VehicleFare } from '@/types/fare'

// Composables
const { formatCurrency, getVehicleSizeName, getAllFares } = useFareDisplay()
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

// Tab definitions
const tabs = [
  { id: 'okiKisen', nameKey: 'OKI_KISEN_FERRY' },
  { id: 'naikoSen', nameKey: 'NAIKO_SEN' },
  { id: 'rainbowJet', nameKey: 'RAINBOWJET' }
]

// Vehicle sizes
const vehicleSizes: (keyof VehicleFare)[] = ['under3m', 'under4m', 'under5m', 'under6m', 'over6m']

// Computed
const isLoading = computed(() => fareStore?.isLoading ?? false)
const error = computed(() => fareStore?.error ?? null)

// Get route display name
const getRouteDisplayName = (route: any) => {
  const { $i18n } = useNuxtApp()
  return `${$i18n.t(route.departure)} → ${$i18n.t(route.arrival)}`
}

// Group fares by ship type
const groupFaresByShipType = (fares: any[]) => {
  // Define routes for each ship type
  const okiKisenRoutes = [
    'hondo-saigo', 'saigo-hondo',
    'hondo-beppu', 'beppu-hondo',
    'hondo-hishiura', 'hishiura-hondo',
    'hondo-kuri', 'kuri-hondo'
  ]
  const naikoSenRoutes = [
    'saigo-beppu', 'beppu-saigo', 
    'saigo-hishiura', 'hishiura-saigo',
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