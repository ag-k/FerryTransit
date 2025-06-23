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
      <!-- Passenger fares -->
      <div class="mb-12">
        <h3 class="text-xl font-medium mb-4">{{ $t('PASSENGER_FARE') }}</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-3 text-left">{{ $t('ROUTE') }}</th>
                <th class="border border-gray-300 px-4 py-3 text-right">{{ $t('ADULT') }}</th>
                <th class="border border-gray-300 px-4 py-3 text-right">{{ $t('CHILD') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="route in passengerFares" :key="route.id" class="hover:bg-gray-50">
                <td class="border border-gray-300 px-4 py-3">
                  {{ $t(route.departure) }} → {{ $t(route.arrival) }}
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

      <!-- Vehicle fares -->
      <div class="mb-12">
        <h3 class="text-xl font-medium mb-4">{{ $t('VEHICLE_FARE') }}</h3>
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
              <tr v-for="route in vehicleFares" :key="route.id" class="hover:bg-gray-50">
                <td class="border border-gray-300 px-4 py-3">
                  {{ $t(route.departure) }} → {{ $t(route.arrival) }}
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
          <p>{{ $t('VEHICLE_LENGTH_NOTE') }}</p>
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
const passengerFares = ref<any[]>([])
const vehicleFares = ref<any[]>([])
const discounts = ref<any>({})
const notes = ref<string[]>([])

// Vehicle sizes
const vehicleSizes: (keyof VehicleFare)[] = ['under3m', 'under4m', 'under5m', 'under6m', 'over6m']

// Computed
const isLoading = computed(() => fareStore.isLoading)
const error = computed(() => fareStore.error)

// Group fares by route type
const groupFares = (fares: any[]) => {
  const mainlandToDogoRoutes = ['hondo-saigo', 'saigo-hondo']
  const dogoToDozenRoutes = ['saigo-beppu', 'beppu-saigo', 'saigo-hishiura', 'hishiura-saigo']
  const dozenInternalRoutes = ['beppu-hishiura', 'hishiura-beppu', 'beppu-kuri', 'kuri-beppu', 'hishiura-kuri', 'kuri-hishiura']

  const grouped: any[] = []
  
  // Add routes in specific order
  mainlandToDogoRoutes.forEach(id => {
    const route = fares.find(f => f.id === id)
    if (route) grouped.push(route)
  })
  
  dogoToDozenRoutes.forEach(id => {
    const route = fares.find(f => f.id === id)
    if (route) grouped.push(route)
  })
  
  dozenInternalRoutes.forEach(id => {
    const route = fares.find(f => f.id === id)
    if (route) grouped.push(route)
  })
  
  return grouped
}

// Load fare data
onMounted(async () => {
  const fares = await getAllFares()
  const grouped = groupFares(fares)
  passengerFares.value = grouped
  vehicleFares.value = grouped
  
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