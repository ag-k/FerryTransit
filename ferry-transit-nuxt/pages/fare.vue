<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <h2 class="text-2xl font-semibold mb-6">{{ $t('FARE_TABLE') }}</h2>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">{{ $t('LOADING') }}...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
      {{ $t(error) }}
    </div>

    <!-- Fare tables -->
    <div v-else>
      <!-- Tab navigation -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
            ]"
          >
            {{ $t(tab.nameKey) }}
          </button>
        </nav>
      </div>

      <!-- Oki Kisen Ferry -->
      <div v-show="activeTab === 'okiKisen'" class="mb-12">
        <h3 class="text-xl font-medium mb-4">{{ $t('OKI_KISEN_FERRY') }}</h3>
        <p class="text-sm text-gray-600 mb-4">{{ $t('FERRY_OKI') }}, {{ $t('FERRY_SHIRASHIMA') }}, {{ $t('FERRY_KUNIGA') }}</p>
        
        <!-- Passenger fares -->
        <h4 class="text-lg font-medium mb-3">{{ $t('PASSENGER_FARE') }}</h4>
        <div class="overflow-x-auto mb-8">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-3 text-left">{{ $t('ROUTE') }}</th>
                <th class="border border-gray-300 px-4 py-3 text-right">{{ $t('ADULT') }}</th>
                <th class="border border-gray-300 px-4 py-3 text-right">{{ $t('CHILD') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="route in okiKisenFares" :key="route.id" class="hover:bg-gray-50">
                <td class="border border-gray-300 px-4 py-3">
                  {{ getRouteDisplayName(route) }}
                </td>
                <td class="border border-gray-300 px-4 py-3 text-right font-mono">
                  {{ formatCurrency(route.fares.adult) }}
                </td>
                <td class="border border-gray-300 px-4 py-3 text-right font-mono">
                  {{ formatCurrency(route.fares.child) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vehicle fares -->
        <h4 class="text-lg font-medium mb-3">{{ $t('VEHICLE_FARE') }}</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-3 text-left">{{ $t('ROUTE') }}</th>
                <th v-for="size in vehicleSizes" :key="size" 
                    class="border border-gray-300 px-3 sm:px-4 py-3 text-right text-xs sm:text-sm">
                  {{ getVehicleSizeName(size) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="route in okiKisenFares" :key="route.id" class="hover:bg-gray-50">
                <td class="border border-gray-300 px-4 py-3">
                  {{ getRouteDisplayName(route) }}
                </td>
                <td v-for="size in vehicleSizes" :key="size" 
                    class="border border-gray-300 px-3 sm:px-4 py-3 text-right font-mono text-sm">
                  {{ formatCurrency(route.fares.vehicle[size]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600">
          <p>{{ $t('CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INFANT_AGE_NOTE') }}</p>
          <p>{{ $t('VEHICLE_LENGTH_NOTE') }}</p>
        </div>
      </div>

      <!-- Naiko Sen (Ferry Dozen / Isokaze) -->
      <div v-show="activeTab === 'naikoSen'" class="mb-12">
        <h3 class="text-xl font-medium mb-4">{{ $t('NAIKO_SEN') }}</h3>
        <p class="text-sm text-gray-600 mb-4">{{ $t('FERRY_DOZEN') }}, {{ $t('ISOKAZE') }}</p>
        
        <!-- Passenger fares -->
        <h4 class="text-lg font-medium mb-3">{{ $t('PASSENGER_FARE') }}</h4>
        <div class="overflow-x-auto mb-8">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-3 text-left">{{ $t('ROUTE') }}</th>
                <th class="border border-gray-300 px-4 py-3 text-right">{{ $t('ADULT') }}</th>
                <th class="border border-gray-300 px-4 py-3 text-right">{{ $t('CHILD') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="route in naikoSenFares" :key="route.id" class="hover:bg-gray-50">
                <td class="border border-gray-300 px-4 py-3">
                  {{ getRouteDisplayName(route) }}
                </td>
                <td class="border border-gray-300 px-4 py-3 text-right font-mono">
                  {{ formatCurrency(route.fares.adult) }}
                </td>
                <td class="border border-gray-300 px-4 py-3 text-right font-mono">
                  {{ formatCurrency(route.fares.child) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600">
          <p>{{ $t('CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INFANT_AGE_NOTE') }}</p>
        </div>
      </div>

      <!-- Rainbow Jet -->
      <div v-show="activeTab === 'rainbowJet'" class="mb-12">
        <h3 class="text-xl font-medium mb-4">{{ $t('RAINBOWJET') }}</h3>
        <p class="text-sm text-gray-600 mb-4">{{ $t('HIGH_SPEED_FERRY') }}</p>
        
        <!-- Passenger fares -->
        <h4 class="text-lg font-medium mb-3">{{ $t('PASSENGER_FARE') }}</h4>
        <div class="overflow-x-auto mb-8">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-3 text-left">{{ $t('ROUTE') }}</th>
                <th class="border border-gray-300 px-4 py-3 text-right">{{ $t('ADULT') }}</th>
                <th class="border border-gray-300 px-4 py-3 text-right">{{ $t('CHILD') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="route in rainbowJetFares" :key="route.id" class="hover:bg-gray-50">
                <td class="border border-gray-300 px-4 py-3">
                  {{ getRouteDisplayName(route) }}
                </td>
                <td class="border border-gray-300 px-4 py-3 text-right font-mono">
                  {{ formatCurrency(6680) }}
                </td>
                <td class="border border-gray-300 px-4 py-3 text-right font-mono">
                  {{ formatCurrency(3340) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600">
          <p>{{ $t('CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INFANT_AGE_NOTE') }}</p>
          <p class="text-red-600">{{ $t('RAINBOW_JET_NO_VEHICLE') }}</p>
        </div>
      </div>

      <!-- Discounts -->
      <div class="mb-8">
        <h3 class="text-xl font-medium mb-4">{{ $t('DISCOUNTS') }}</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div v-for="(discount, key) in discounts" :key="key" 
               class="border border-gray-200 rounded-lg p-4">
            <h4 class="font-medium mb-2">{{ $t(discount.nameKey) }}</h4>
            <p class="text-gray-600">{{ $t(discount.descriptionKey) }}</p>
            <p class="mt-2 text-lg font-medium text-blue-600">
              {{ Math.round((1 - discount.rate) * 100) }}% OFF
            </p>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="bg-gray-100 rounded-lg p-4">
        <h4 class="font-medium mb-2">{{ $t('NOTES') }}</h4>
        <ul class="text-sm text-gray-700 space-y-1">
          <li v-for="note in notes" :key="note">• {{ $t(note) }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VehicleFare } from '@/types/fare'

// Composables
const { formatCurrency, getVehicleSizeName, getAllFares } = useFareDisplay()
const fareStore = useFareStore()

// State
const activeTab = ref('okiKisen')
const okiKisenFares = ref<any[]>([])
const naikoSenFares = ref<any[]>([])
const rainbowJetFares = ref<any[]>([])
const discounts = ref<any>({})
const notes = ref<string[]>([])

// Tab definitions
const tabs = [
  { id: 'okiKisen', nameKey: 'OKI_KISEN_FERRY' },
  { id: 'naikoSen', nameKey: 'NAIKO_SEN' },
  { id: 'rainbowJet', nameKey: 'RAINBOWJET' }
]

// Vehicle sizes
const vehicleSizes: (keyof VehicleFare)[] = ['under3m', 'under4m', 'under5m', 'under6m', 'over6m']

// Computed
const isLoading = computed(() => fareStore.isLoading)
const error = computed(() => fareStore.error)

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
  
  if (fareStore.fareMaster) {
    discounts.value = fareStore.fareMaster.discounts
    notes.value = fareStore.fareMaster.notes
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('FARE_TABLE')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>