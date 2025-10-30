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
        <div class="mb-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-xl font-medium dark:text-white">{{ $t('OKI_KISEN_FERRY') }}</h3>
            <p
              v-if="ferryVersionName"
              class="text-sm text-gray-600 dark:text-gray-400"
            >
              {{ $t('VERSION') }}: {{ ferryVersionName }}
            </p>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-1">
            {{ $t('FERRY_OKI') }}, {{ $t('FERRY_SHIRASHIMA') }}, {{ $t('FERRY_KUNIGA') }}
          </p>
        </div>

        <div class="md:hidden mb-8">
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              v-for="category in passengerCategories"
              :key="category.id"
              :class="[
                okiKisenPassengerActiveCategory === category.id
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors'
              ]"
              @click="okiKisenPassengerActiveCategory = category.id"
            >
              {{ translateLabel(category.labelKey, category.fallback) }}
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-base sm:text-sm border-collapse">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">
                  {{ translateLabel(
                    getPassengerCategoryLabelKey(okiKisenPassengerActiveCategory),
                    passengerCategoryMap[okiKisenPassengerActiveCategory]?.fallback
                  ) }}
                  </th>
                  <th
                    v-for="group in okiKisenRouteGroups"
                    :key="group.id"
                    class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100"
                  >
                    {{ translateLabel(group.labelKey) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium dark:text-gray-100">
                    {{ translateLabel(
                      getPassengerCategoryLabelKey(okiKisenPassengerActiveCategory),
                      passengerCategoryMap[okiKisenPassengerActiveCategory]?.fallback
                    ) }}
                  </td>
                  <td
                    v-for="group in okiKisenRouteGroups"
                    :key="group.id"
                    class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100"
                  >
                    {{ getOkiKisenPassengerFare(group.id, okiKisenPassengerActiveCategory) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="hidden md:block mb-8 overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">
                  {{ $t('PASSENGER_CATEGORY') }}
                </th>
                <th
                  v-for="group in okiKisenRouteGroups"
                  :key="`oki-kisen-desktop-header-${group.id}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100"
                >
                  {{ translateLabel(group.labelKey) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="category in passengerCategories"
                :key="`oki-kisen-desktop-passenger-${category.id}`"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium dark:text-gray-100">
                  {{ translateLabel(category.labelKey, category.fallback) }}
                </td>
                <td
                  v-for="group in okiKisenRouteGroups"
                  :key="`oki-kisen-desktop-passenger-${group.id}-${category.id}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100"
                >
                  {{ getOkiKisenPassengerFare(group.id, category.id) }}
                </td>
              </tr>
            </tbody>
            <tbody>
              <tr class="bg-gray-50 dark:bg-gray-800/70">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-gray-700 dark:text-gray-100">
                  {{ $t('SEAT_CLASS_FARE') }}
                </td>
                <td
                  v-for="group in okiKisenRouteGroups"
                  :key="`oki-kisen-desktop-seat-heading-${group.id}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300"
                >
                  {{ translateLabel(group.labelKey) }}
                </td>
              </tr>
              <tr
                v-for="seatClass in seatClasses"
                :key="`oki-kisen-desktop-seat-${seatClass.key}`"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium dark:text-gray-100">
                  {{ $t(seatClass.nameKey) }}
                </td>
                <td
                  v-for="group in okiKisenRouteGroups"
                  :key="`oki-kisen-desktop-seat-${group.id}-${seatClass.key}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100"
                >
                  {{ getSeatClassFare(group.id, seatClass.key) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Seat class fares -->
        <h4 class="text-lg font-medium mb-3 dark:text-white md:hidden">{{ $t('SEAT_CLASS_FARE') }}</h4>
        <div class="overflow-x-auto mb-8 md:hidden">
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
        <div class="mb-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-xl font-medium dark:text-white">{{ $t('NAIKO_SEN') }}</h3>
            <p
              v-if="localVersionName"
              class="text-sm text-gray-600 dark:text-gray-400"
            >
              {{ $t('VERSION') }}: {{ localVersionName }}
            </p>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-1">
            {{ $t('FERRY_DOZEN') }}, {{ $t('ISOKAZE') }}
          </p>
        </div>
        
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
        <div class="mb-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-xl font-medium dark:text-white">{{ $t('RAINBOWJET') }}</h3>
            <p
              v-if="highspeedVersionName"
              class="text-sm text-gray-600 dark:text-gray-400"
            >
              {{ $t('VERSION') }}: {{ highspeedVersionName }}
            </p>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-1">
            {{ $t('HIGH_SPEED_FERRY') }}
          </p>
        </div>
        
        <!-- Passenger fares -->
        <h4 class="text-lg font-medium mb-3 dark:text-white">{{ $t('PASSENGER_FARE') }}</h4>
        <div class="md:hidden">
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              v-for="category in passengerCategories"
              :key="category.id"
              :class="[
                rainbowJetPassengerActiveCategory === category.id
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors'
              ]"
              @click="rainbowJetPassengerActiveCategory = category.id"
            >
              {{ translateLabel(category.labelKey, category.fallback) }}
            </button>
          </div>
          <div class="overflow-x-auto mb-8">
            <table class="w-full text-base sm:text-sm border-collapse">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{ $t('ROUTE') }}</th>
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">
                    {{ translateLabel(
                      getPassengerCategoryLabelKey(rainbowJetPassengerActiveCategory),
                      passengerCategoryMap[rainbowJetPassengerActiveCategory]?.fallback
                    ) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="group in rainbowJetRouteGroups"
                  :key="group.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                    {{ translateLabel(group.labelKey) }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                    {{ getRainbowJetPassengerFare(group.id, rainbowJetPassengerActiveCategory) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="hidden md:block overflow-x-auto mb-8">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{ $t('ROUTE') }}</th>
                <th
                  v-for="category in passengerCategories"
                  :key="`rainbow-jet-header-${category.id}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100"
                >
                  {{ translateLabel(category.labelKey, category.fallback) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="group in rainbowJetRouteGroups"
                :key="`rainbow-jet-row-${group.id}`"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ translateLabel(group.labelKey) }}
                </td>
                <td
                  v-for="category in passengerCategories"
                  :key="`rainbow-jet-cell-${group.id}-${category.id}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100"
                >
                  {{ getRainbowJetPassengerFare(group.id, category.id) }}
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
            <h4 class="font-medium mb-2 dark:text-white">{{ translateLabel(discount.nameKey, discount.name) }}</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ translateLabel(discount.descriptionKey, discount.description) }}</p>
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
import { roundUpToTen } from '@/utils/currency'

// Composables
const { formatCurrency, getAllFares } = useFareDisplay()
const fareStore = process.client ? useFareStore() : null
const { t, te } = useI18n({ useScope: 'global' })

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

const passengerCategories = [
  { id: 'adult', labelKey: 'PASSENGER_CATEGORY_ADULT', fallback: '大人' },
  { id: 'child', labelKey: 'PASSENGER_CATEGORY_CHILD', fallback: '小人' },
  { id: 'disabledAdult', labelKey: 'PASSENGER_CATEGORY_DISABLED_ADULT', fallback: '障がい者（大人）' },
  { id: 'disabledChild', labelKey: 'PASSENGER_CATEGORY_DISABLED_CHILD', fallback: '障がい者（小人）' }
] as const

type PassengerCategoryId = typeof passengerCategories[number]['id']

const passengerCategoryMap = passengerCategories.reduce<Record<PassengerCategoryId, { id: PassengerCategoryId; labelKey: string; fallback: string }>>(
  (acc, category) => {
    acc[category.id] = category
    return acc
  },
  {} as Record<PassengerCategoryId, { id: PassengerCategoryId; labelKey: string; fallback: string }>
)

const okiKisenPassengerActiveCategory = ref<PassengerCategoryId>('adult')
const rainbowJetPassengerActiveCategory = ref<PassengerCategoryId>('adult')

const okiKisenRouteGroups = [
  {
    id: 'hondo-oki',
    labelKey: 'HONDO_OKI',
    routeIds: [
      'hondo-saigo',
      'saigo-hondo',
      'hondo-beppu',
      'beppu-hondo',
      'hondo-hishiura',
      'hishiura-hondo',
      'hondo-kuri',
      'kuri-hondo'
    ]
  },
  {
    id: 'dozen-dogo',
    labelKey: 'DOZEN_DOGO',
    routeIds: [
      'saigo-beppu',
      'beppu-saigo',
      'saigo-hishiura',
      'hishiura-saigo',
      'saigo-kuri',
      'kuri-saigo'
    ]
  },
  {
    id: 'beppu-hishiura',
    labelKey: 'BEPPU_HISHIURA',
    routeIds: ['beppu-hishiura', 'hishiura-beppu']
  },
  {
    id: 'hishiura-kuri',
    labelKey: 'HISHIURA_KURI',
    routeIds: ['hishiura-kuri', 'kuri-hishiura']
  },
  {
    id: 'kuri-beppu',
    labelKey: 'KURI_BEPPU',
    routeIds: ['kuri-beppu', 'beppu-kuri']
  }
] as const

const rainbowJetRouteGroups = [
  { id: 'hondo-oki', labelKey: 'HONDO_OKI' },
  { id: 'dozen-dogo', labelKey: 'DOZEN_DOGO' },
  { id: 'beppu-hishiura', labelKey: 'BEPPU_HISHIURA' }
] as const

const rainbowJetCanonicalMap: Record<string, string> = {
  'hondo-oki': 'hondo-oki',
  'rainbowjet-hondo-oki': 'hondo-oki',
  'rainbowjet-saigo-hondo': 'hondo-oki',
  'hondo-saigo': 'hondo-oki',
  'saigo-hondo': 'hondo-oki',
  'hondo-beppu': 'hondo-oki',
  'beppu-hondo': 'hondo-oki',
  'hondo-hishiura': 'hondo-oki',
  'hishiura-hondo': 'hondo-oki',
  'dozen-dogo': 'dozen-dogo',
  'rainbowjet-dozen-dogo': 'dozen-dogo',
  'rainbowjet-saigo-beppu': 'dozen-dogo',
  'saigo-beppu': 'dozen-dogo',
  'beppu-saigo': 'dozen-dogo',
  'saigo-hishiura': 'dozen-dogo',
  'hishiura-saigo': 'dozen-dogo',
  'saigo-kuri': 'dozen-dogo',
  'kuri-saigo': 'dozen-dogo',
  'beppu-hishiura': 'beppu-hishiura',
  'rainbowjet-beppu-hishiura': 'beppu-hishiura',
  'hishiura-beppu': 'beppu-hishiura',
  'hishiura-kuri': 'hishiura-kuri',
  'kuri-hishiura': 'hishiura-kuri',
  'rainbowjet-hishiura-kuri': 'hishiura-kuri',
  'rainbowjet-kuri-hishiura': 'hishiura-kuri',
  'kuri-beppu': 'kuri-beppu',
  'beppu-kuri': 'kuri-beppu',
  'rainbowjet-kuri-beppu': 'kuri-beppu',
  'rainbowjet-beppu-kuri': 'kuri-beppu'
}

const PASSENGER_DISCOUNT_RATE = 0.5

const LEGACY_ROUTE_NAME_MAP: Record<string, string> = {
  '本土七類 ⇔ 西郷': 'hondo-saigo',
  '西郷 ⇔ 本土七類': 'saigo-hondo',
  '本土七類 ⇔ 菱浦': 'hondo-hishiura',
  '菱浦 ⇔ 本土七類': 'hishiura-hondo',
  '本土七類 ⇔ 別府': 'hondo-beppu',
  '別府 ⇔ 本土七類': 'beppu-hondo',
  '本土七類 ⇔ 来居': 'hondo-kuri',
  '来居 ⇔ 本土七類': 'kuri-hondo',
  '西郷 ⇔ 菱浦': 'saigo-hishiura',
  '菱浦 ⇔ 西郷': 'hishiura-saigo',
  '西郷 ⇔ 別府': 'saigo-beppu',
  '別府 ⇔ 西郷': 'beppu-saigo',
  '菱浦 ⇔ 別府': 'hishiura-beppu',
  '別府 ⇔ 菱浦': 'beppu-hishiura',
  '菱浦 ⇔ 来居': 'hishiura-kuri',
  '来居 ⇔ 菱浦': 'kuri-hishiura',
  '来居 ⇔ 別府': 'kuri-beppu',
  '別府 ⇔ 来居': 'beppu-kuri'
}

// Tab definitions
const tabs = [
  { id: 'okiKisen', nameKey: 'OKI_KISEN_FERRY' },
  { id: 'rainbowJet', nameKey: 'RAINBOWJET' },
  { id: 'naikoSen', nameKey: 'NAIKO_SEN' }
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

const formatVersionName = (version: FareVersion | null): string | null => {
  if (!version) return null
  const trimmedName = typeof version.name === 'string' ? version.name.trim() : ''
  if (trimmedName) return trimmedName
  if (version.effectiveFrom && version.effectiveFrom !== '1970-01-01') {
    return version.effectiveFrom
  }
  return version.id ?? null
}

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

const ferryVersionName = computed(() => formatVersionName(ferryVersion.value))
const highspeedVersionName = computed(() => formatVersionName(highspeedVersion.value))
const localVersionName = computed(() => formatVersionName(localVersion.value))

const getPassengerCategoryLabelKey = (categoryId: PassengerCategoryId): string => {
  const entry = passengerCategoryMap[categoryId]
  return entry?.labelKey ?? 'PASSENGER_CATEGORY_ADULT'
}

const pickNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const calculateDiscountedFare = (base: number | null | undefined): number | null => {
  if (base === null || typeof base === 'undefined') return null
  const discounted = base * PASSENGER_DISCOUNT_RATE
  return roundUpToTen(discounted)
}

const normalizePassengerFares = (source: any): Record<PassengerCategoryId, number | null> => {
  if (!source) {
    return {
      adult: null,
      child: null,
      disabledAdult: null,
      disabledChild: null
    }
  }

  const fares = source.fares ?? source
  const disabled = fares.disabled ?? source.disabled ?? {}

  const adult = pickNumber(fares.adult ?? source.adult)
  const child = pickNumber(fares.child ?? source.child) ?? calculateDiscountedFare(adult)
  const disabledAdult = pickNumber(disabled.adult ?? source.disabledAdult) ?? calculateDiscountedFare(adult)
  const disabledChild =
    pickNumber(disabled.child ?? source.disabledChild) ??
    calculateDiscountedFare(disabledAdult ?? child)

  return {
    adult,
    child,
    disabledAdult,
    disabledChild
  }
}

const findOkiKisenRoute = (groupId: string): any | null => {
  const group = okiKisenRouteGroups.find(item => item.id === groupId)
  if (!group) return null

  const lookup = buildRouteLookup(okiKisenFares.value)
  for (const routeId of group.routeIds) {
    const route = findRouteById(lookup, routeId)
    if (route) return route
  }

  return null
}

const getOkiKisenPassengerFareValue = (groupId: string, categoryId: PassengerCategoryId): number | null => {
  const route = findOkiKisenRoute(groupId)
  if (!route) return null
  const fares = normalizePassengerFares(route)
  return fares[categoryId] ?? null
}

const getOkiKisenPassengerFare = (groupId: string, categoryId: PassengerCategoryId): string => {
  const value = getOkiKisenPassengerFareValue(groupId, categoryId)
  return value !== null ? formatCurrency(value) : '—'
}

const normalizeRouteId = (value: string | null | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (LEGACY_ROUTE_NAME_MAP[trimmed]) {
    return LEGACY_ROUTE_NAME_MAP[trimmed]
  }

  const lower = trimmed.toLowerCase()
  if (lower.startsWith('fare-')) {
    const parts = lower.split('-')
    if (parts.length >= 3) {
      return `${parts[parts.length - 2]}-${parts[parts.length - 1]}`
    }
  }

  return lower
}

const extractRouteIdentifiers = (route: any): string[] => {
  const candidates: string[] = []
  if (!route || typeof route !== 'object') {
    return candidates
  }

  const possibleKeys = ['id', 'route', 'routeId', 'routeName', 'displayName', 'categoryId']
  possibleKeys.forEach((key) => {
    const value = route[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      candidates.push(value)
    }
  })

  return candidates
}

const buildRouteLookup = (routes: any[]): Map<string, any> => {
  const lookup = new Map<string, any>()

  routes.forEach((route) => {
    const identifiers = extractRouteIdentifiers(route)
    identifiers.forEach((identifier) => {
      const normalized = normalizeRouteId(identifier)
      if (normalized && !lookup.has(normalized)) {
        lookup.set(normalized, route)
      }
    })
  })

  return lookup
}

const findRouteById = (lookup: Map<string, any>, routeId: string): any | null => {
  const normalizedId = normalizeRouteId(routeId)
  if (!normalizedId) return null
  return lookup.get(normalizedId) ?? null
}

const findRainbowJetFareSource = (groupId: string): any | null => {
  const lookup = buildRouteLookup(rainbowJetFares.value)
  for (const [routeKey, route] of lookup.entries()) {
    const canonical = rainbowJetCanonicalMap[routeKey] ?? rainbowJetCanonicalMap[normalizeRouteId(routeKey) ?? '']
    if (canonical === groupId) {
      return route
    }
  }

  const special = rainbowJetSpecialFares.value?.[groupId]
  if (special) {
    return special
  }

  return null
}

const getRainbowJetPassengerFareValue = (groupId: string, categoryId: PassengerCategoryId): number | null => {
  const source = findRainbowJetFareSource(groupId)
  if (!source) return null
  const fares = normalizePassengerFares(source)
  return fares[categoryId] ?? null
}

const getRainbowJetPassengerFare = (groupId: string, categoryId: PassengerCategoryId): string => {
  const value = getRainbowJetPassengerFareValue(groupId, categoryId)
  return value !== null ? formatCurrency(value) : '—'
}

const isLikelyTranslationKey = (value: string): boolean => /^[A-Z0-9_]+(_[A-Z0-9_]+)*$/.test(value)

const translateIfPossible = (value?: string | null): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }
  if (typeof te === 'function' && te(value)) {
    return t(value)
  }
  const translated = t(value)
  if (translated !== value || isLikelyTranslationKey(value)) {
    return translated
  }
  return value
}

const translateLabel = (labelKey?: string | null, fallback?: string | null): string => {
  const candidates = [labelKey, fallback]
  for (const candidate of candidates) {
    const translated = translateIfPossible(candidate)
    if (translated && translated.trim().length > 0) {
      return translated
    }
  }
  return ''
}

// Get seat class fare for a specific route
const getSeatClassFare = (routeType: string, seatClass: string) => {
  const route = findOkiKisenRoute(routeType)
  const fare = route?.fares?.seatClass?.[seatClass]
  return typeof fare === 'number' ? formatCurrency(fare) : '—'
}

// Get vehicle fare for a specific route
const getVehicleFare = (routeType: string, sizeKey: string) => {
  const route = findOkiKisenRoute(routeType)
  if (!route) return '—'

  const vehicle = route.fares?.vehicle
  if (!vehicle) return '—'

  const fare =
    sizeKey === 'over12m'
      ? vehicle.over12mPer1m
      : vehicle[sizeKey as keyof typeof vehicle]

  return typeof fare === 'number' ? formatCurrency(fare) : '—'
}

// Group fares by ship type
const groupFaresByShipType = (fares: any[]) => {
  const okiKisenRouteIds = [
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

  const naikoSenRouteIds = [
    'beppu-hishiura', 'hishiura-beppu',
    'beppu-kuri', 'kuri-beppu',
    'hishiura-kuri', 'kuri-hishiura'
  ]

  const rainbowJetRouteIds = ['hondo-saigo', 'saigo-hondo']

  const selectRoutes = (routeIds: string[], sourceRoutes: any[]): any[] => {
    const localLookup = buildRouteLookup(sourceRoutes)
    const selected: any[] = []
    routeIds.forEach((routeId) => {
      const route = findRouteById(localLookup, routeId)
      if (route && !selected.includes(route)) {
        selected.push(route)
      }
    })
    return selected
  }

  const ferryRoutes = fares.filter(route => route?.vesselType === 'ferry')
  const highspeedRoutes = fares.filter(route => route?.vesselType === 'highspeed')
  const localRoutes = fares.filter(route => route?.vesselType === 'local')

  const okiKisen = selectRoutes(okiKisenRouteIds, ferryRoutes.length ? ferryRoutes : fares)
  const naikoSen = selectRoutes(naikoSenRouteIds, localRoutes.length ? localRoutes : fares)

  const rainbowJet = highspeedRoutes.length
    ? highspeedRoutes
    : selectRoutes(rainbowJetRouteIds, fares)

  return {
    okiKisen,
    naikoSen,
    rainbowJet
  }
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
