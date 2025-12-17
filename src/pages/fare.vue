<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <h2 class="hidden lg:block text-2xl font-semibold mb-6 dark:text-white">{{ $t('FARE_TABLE') }}</h2>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('LOADING') }}...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error"
      class="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded"
      role="alert">
      {{ $t(error) }}
    </div>

    <!-- Fare tables -->
    <div v-else>
      <!-- Tab navigation -->
      <div class="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex overflow-x-auto scrollbar-hide" aria-label="Tabs"
          style="scrollbar-width: none; -ms-overflow-style: none;">
          <button v-for="tab in tabs" :key="tab.id" :class="[
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0 mx-4 first:ml-0 last:mr-0'
          ]" style="-webkit-user-select: none;" @click="activeTab = tab.id">
            {{ $t(tab.nameKey) }}
          </button>
        </nav>
      </div>

      <p v-if="activeVersionLabel" class="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {{ activeVersionLabel }}
      </p>

      <!-- Oki Kisen Ferry -->
      <div v-show="activeTab === 'okiKisen'" class="mb-12">
        <div class="mb-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-xl font-medium dark:text-white">{{ $t('OKI_KISEN_FERRY') }}</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-1">
            {{ $t('FERRY_OKI') }}, {{ $t('FERRY_SHIRASHIMA') }}, {{ $t('FERRY_KUNIGA') }}
          </p>
        </div>

        <h4
          class="text-2xl font-bold mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          {{ $t('PASSENGER_FARE') }}</h4>
        <div class="mb-8">
          <div class="flex flex-col gap-3 md:items-center md:justify-between">
            <nav class="flex flex-wrap gap-2" aria-label="Passenger categories" role="tablist">
              <button v-for="category in passengerCategories" :key="category.id" :class="[
                okiKisenPassengerActiveCategory === category.id
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors'
              ]" type="button" role="tab" :aria-selected="okiKisenPassengerActiveCategory === category.id"
                @click="okiKisenPassengerActiveCategory = category.id">
                {{ translateLabel(category.labelKey, category.fallback) }}
              </button>
            </nav>
            <nav class="flex flex-wrap gap-2 md:hidden" aria-label="Seat classes" role="tablist">
              <button v-for="seatClass in seatClasses" :key="`seat-class-tab-${seatClass.key}`" :class="[
                okiKisenActiveSeatClass === seatClass.key
                  ? 'bg-blue-50 text-blue-700 border border-blue-500 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700'
                  : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors'
              ]" type="button" role="tab" :aria-selected="okiKisenActiveSeatClass === seatClass.key"
                @click="okiKisenActiveSeatClass = seatClass.key">
                {{ $t(seatClass.nameKey) }}
              </button>
            </nav>
          </div>
        </div>

        <!-- Seat class fares -->
        <div class="md:hidden mb-8">
          <div class="overflow-x-auto">
            <table class="w-full text-base sm:text-sm border-collapse">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">
                    {{ $t('ROUTE') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">
                    {{ activeSeatClass ? $t(activeSeatClass.nameKey) : '' }} /
                    {{ translateLabel(
                      getPassengerCategoryLabelKey(okiKisenPassengerActiveCategory),
                      passengerCategoryMap[okiKisenPassengerActiveCategory]?.fallback
                    ) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="group in okiKisenRouteGroups" :key="`mobile-seat-class-${group.id}`"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium dark:text-gray-100">
                    {{ translateLabel(group.labelKey) }}
                  </td>
                  <td
                    class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                    {{ getSeatClassFareForCategory(group.id, okiKisenActiveSeatClass, okiKisenPassengerActiveCategory)
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p class="hidden md:block text-sm text-gray-600 dark:text-gray-400 mb-2">
          {{ translateLabel(
            getPassengerCategoryLabelKey(okiKisenPassengerActiveCategory),
            passengerCategoryMap[okiKisenPassengerActiveCategory]?.fallback
          ) }} {{ $t('FARE') }}
        </p>
        <div class="hidden md:block overflow-x-auto mb-8">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th scope="col"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">
                  {{ $t('ROUTE') }}
                </th>
                <th v-for="seatClass in seatClasses" :key="`seat-class-header-${seatClass.key}`" scope="col"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">
                  {{ $t(seatClass.nameKey) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in okiKisenRouteGroups" :key="`seat-class-row-${group.id}`"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <th scope="row"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-medium dark:text-gray-100">
                  {{ translateLabel(group.labelKey) }}
                </th>
                <td v-for="seatClass in seatClasses" :key="`seat-class-cell-${group.id}-${seatClass.key}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getSeatClassFareForCategory(group.id, seatClass.key, okiKisenPassengerActiveCategory) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INFANT_AGE_NOTE') }}</p>
        </div>
        <div class="mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('NON_2ND_CLASS_RESERVATION_REQUIRED') }}</p>
          <p>{{ $t('INTERMEDIATE_STOP_INVALIDATES_TICKET') }}</p>
        </div>

        <!-- Disability discount information -->
        <div
          v-if="okiKisenPassengerActiveCategory === 'disabledAdult' || okiKisenPassengerActiveCategory === 'disabledChild'"
          class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h5 class="font-semibold text-blue-900 dark:text-blue-100 mb-3">{{ $t('DISABILITY_DISCOUNT_TITLE') }}</h5>
          <div class="text-sm text-blue-800 dark:text-blue-200 space-y-3">
            <div>
              <p class="font-medium mb-2">{{ $t('DISABILITY_DISCOUNT_CONDITIONS_TITLE') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_CERTIFICATE_REQUIRED') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_CAREGIVER_CONDITION') }}</p>
              <p>{{ $t('DISABILITY_VISUAL_IMPAIRED_CAREGIVER') }}</p>
            </div>
            <div>
              <p class="font-medium mb-2">{{ $t('DISABILITY_DISCOUNT_CONTENT_TITLE') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_TYPE_1_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_VISUAL_IMPAIRED_INTERPRETER_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_TYPE_2_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_BOARDING_PROCEDURE_NOTE') }}</p>
              <p>{{ $t('DISABILITY_FARE_ROUNDING_NOTE') }}</p>
            </div>
          </div>
        </div>
        <!-- Vehicle fares -->
        <h4
          class="text-2xl font-bold mt-12 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          {{ $t('VEHICLE_FARE') }}</h4>
        <div class="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-200">{{ $t('VEHICLE_DRIVER_TICKET_INCLUDED') }}</p>
        </div>
        <div class="md:hidden mb-8">
          <nav class="flex flex-wrap gap-2 mb-3" aria-label="Vehicle routes" role="tablist">
            <button v-for="group in okiKisenRouteGroups" :key="`vehicle-route-tab-${group.id}`" :class="[
              okiKisenVehicleActiveRoute === group.id
                ? 'bg-blue-50 text-blue-700 border border-blue-500 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700'
                : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors'
            ]" type="button" role="tab" :aria-selected="okiKisenVehicleActiveRoute === group.id"
              @click="okiKisenVehicleActiveRoute = group.id">
              {{ translateLabel(group.labelKey) }}
            </button>
          </nav>
          <div class="overflow-x-auto">
            <table class="w-full text-base sm:text-sm border-collapse">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">
                    {{ $t('VEHICLE_SIZE') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">
                    {{ translateLabel(activeVehicleRoute?.labelKey) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="size in vehicleSizeList" :key="`vehicle-mobile-${size.key}`"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium dark:text-gray-100">
                    {{ size.label }}
                  </td>
                  <td
                    class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                    {{ getVehicleFare(okiKisenVehicleActiveRoute, size.key) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100"></th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">
                  {{ $t('HONDO_OKI') }}
                </th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">
                  {{ $t('DOZEN_DOGO') }}
                </th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">
                  {{ $t('BEPPU_HISHIURA') }}<br>({{ $t('DOZEN') }})
                </th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">
                  {{ $t('HISHIURA_KURI') }}<br>({{ $t('DOZEN') }})
                </th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">
                  {{ $t('KURI_BEPPU') }}<br>({{ $t('DOZEN') }})
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="size in vehicleSizeList" :key="size.key" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium dark:text-gray-100">
                  {{ size.label }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('hondo-oki', size.key) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('dozen-dogo', size.key) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('beppu-hishiura', size.key) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('hishiura-kuri', size.key) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-mono dark:text-gray-100">
                  {{ getVehicleFare('kuri-beppu', size.key) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('VEHICLE_LENGTH_NOTE') }}</p>
        </div>

        <!-- Vehicle fare notes -->
        <div class="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <!-- Desktop: always visible title -->
          <div class="hidden md:block p-4 bg-gray-50 dark:bg-gray-800/50">
            <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ $t('VEHICLE_OPERATION_NOTES_TITLE') }}
            </h5>
          </div>

          <!-- Mobile accordion header -->
          <button @click="toggleVehicleNotes"
            class="md:hidden w-full p-4 bg-gray-50 dark:bg-gray-800/50 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            <h5 class="font-semibold text-gray-900 dark:text-gray-100">{{ $t('VEHICLE_OPERATION_NOTES_TITLE') }}</h5>
            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200"
              :class="{ 'rotate-180': showVehicleNotes }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          <!-- Content - Desktop always visible, Mobile collapsible -->
          <div class="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700"
            :class="{ 'hidden md:block': !showVehicleNotes, 'block': showVehicleNotes }">
            <div class="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <ul class="list-disc list-inside space-y-2">
                <li>{{ $t('VEHICLE_NOTE_CONNECTED_VEHICLES') }}</li>
                <li>{{ $t('VEHICLE_NOTE_WIDTH_SURCHARGE') }}</li>
                <li>{{ $t('VEHICLE_NOTE_CATERPILLAR_VEHICLES') }}</li>
                <li>{{ $t('VEHICLE_NOTE_SPECIAL_LOADING') }}</li>
                <li>{{ $t('VEHICLE_NOTE_SPECIAL_FEES') }}</li>
                <li>{{ $t('VEHICLE_NOTE_ROUND_TRIP_DISCOUNT') }}</li>
                <li>{{ $t('VEHICLE_NOTE_LIMITATIONS') }}</li>
                <li>{{ $t('VEHICLE_NOTE_SPECIAL_VEHICLES') }}</li>
                <li>{{ $t('VEHICLE_NOTE_LOADING_PROCEDURE') }}</li>
                <li>{{ $t('VEHICLE_NOTE_ROUNDING') }}</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="mt-4 text-center">
          <a href="https://www.oki-kisen.co.jp/fare/" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
            {{ $t('FARE_DETAILS') }}
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </a>
        </div>
      </div>

      <!-- Naiko Sen (Ferry Dozen / Isokaze) -->
      <div v-show="activeTab === 'naikoSen'" class="mb-12">
        <div class="mb-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-xl font-medium dark:text-white">{{ $t('NAIKO_SEN') }}</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-1">
            {{ $t('FERRY_DOZEN') }}, {{ $t('ISOKAZE') }}
          </p>
        </div>

        <!-- Passenger fares -->
        <h4
          class="text-2xl font-bold mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          {{ $t('PASSENGER_FARE') }}</h4>
        <div class="md:hidden">
          <div class="flex flex-wrap gap-2 mb-3">
            <button v-for="category in passengerCategories" :key="category.id" :class="[
              naikoSenPassengerActiveCategory === category.id
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors'
            ]" @click="naikoSenPassengerActiveCategory = category.id">
              {{ translateLabel(category.labelKey, category.fallback) }}
            </button>
          </div>
          <div class="overflow-x-auto mb-8">
            <table class="w-full text-base sm:text-sm border-collapse">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{
                    $t('INNER_ISLAND_ROUTE_COMMON') }}</th>
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">
                    {{ translateLabel(
                      getPassengerCategoryLabelKey(naikoSenPassengerActiveCategory),
                      passengerCategoryMap[naikoSenPassengerActiveCategory]?.fallback
                    ) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                    {{ $t('ALL_INNER_ISLAND_ROUTES') }}
                  </td>
                  <td
                    class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                    {{ getNaikoSenPassengerFare(naikoSenPassengerActiveCategory) }}
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
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{
                  $t('INNER_ISLAND_ROUTE_COMMON') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{
                  $t('ADULT') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{
                  $t('CHILD') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{
                  $t('PASSENGER_CATEGORY_DISABLED_ADULT') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{
                  $t('PASSENGER_CATEGORY_DISABLED_CHILD') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ $t('ALL_INNER_ISLAND_ROUTES') }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandFare?.adult || 300) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandFare?.child || 100) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(150) }}
                </td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(50) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('INNER_ISLAND_CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INNER_ISLAND_INFANT_FREE_NOTE') }}</p>
          <p>{{ $t('INNER_ISLAND_INFANT_PAID_NOTE') }}</p>
          <p>{{ $t('DISABILITY_FARE_APPLIES_TO_PERSON_AND_CAREGIVER') }}</p>
        </div>

        <!-- Vehicle fares -->
        <h4
          class="text-2xl font-bold mt-12 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          {{ $t('LOCAL_FERRY_VEHICLE_FARE') }}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{{ $t('FERRY_DOZEN_VEHICLE_ONLY') }}</p>
        <div class="overflow-x-auto">
          <table class="w-full text-base sm:text-sm border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-800">
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{
                  $t('VEHICLE_SIZE') }}</th>
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">{{
                  $t('FARE') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">{{
                  $t('VEHICLE_UNDER_5M') }}</td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandVehicleFare?.under5m || 1000) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">{{
                  $t('VEHICLE_5M_TO_7M') }}</td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandVehicleFare?.under7m || 2000) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">{{
                  $t('VEHICLE_7M_TO_10M') }}</td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandVehicleFare?.under10m || 3000) }}
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">{{
                  $t('VEHICLE_OVER_10M') }}</td>
                <td
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ formatCurrency(innerIslandVehicleFare?.over10m || 3000) }} {{ $t('VEHICLE_10M_PLUS_CHARGE') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('VEHICLE_LENGTH_NOTE') }}</p>
        </div>
        <div class="mt-4 text-center">
          <a href="https://www.okikankou.com/fee_detail/" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
            {{ $t('INNER_ISLAND_FARE_DETAILS') }}
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </a>
        </div>
      </div>

      <!-- Rainbow Jet -->
      <div v-show="activeTab === 'rainbowJet'" class="mb-12">
        <div class="mb-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-xl font-medium dark:text-white">{{ $t('RAINBOWJET') }}</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-1">
            {{ $t('HIGH_SPEED_FERRY') }}
          </p>
        </div>

        <!-- Passenger fares -->
        <h4
          class="text-2xl font-bold mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          {{ $t('PASSENGER_FARE') }}</h4>
        <div class="md:hidden">
          <div class="flex flex-wrap gap-2 mb-3">
            <button v-for="category in passengerCategories" :key="category.id" :class="[
              rainbowJetPassengerActiveCategory === category.id
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors'
            ]" @click="rainbowJetPassengerActiveCategory = category.id">
              {{ translateLabel(category.labelKey, category.fallback) }}
            </button>
          </div>
          <div class="overflow-x-auto mb-8">
            <table class="w-full text-base sm:text-sm border-collapse">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{
                    $t('ROUTE') }}</th>
                  <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right dark:text-gray-100">
                    {{ translateLabel(
                      getPassengerCategoryLabelKey(rainbowJetPassengerActiveCategory),
                      passengerCategoryMap[rainbowJetPassengerActiveCategory]?.fallback
                    ) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="group in rainbowJetRouteGroups" :key="group.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                    {{ translateLabel(group.labelKey) }}
                  </td>
                  <td
                    class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
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
                <th class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left dark:text-gray-100">{{
                  $t('ROUTE') }}</th>
                <th v-for="category in passengerCategories" :key="`rainbow-jet-header-${category.id}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center dark:text-gray-100">
                  {{ translateLabel(category.labelKey, category.fallback) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in rainbowJetRouteGroups" :key="`rainbow-jet-row-${group.id}`"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="border border-gray-300 dark:border-gray-600 px-4 py-3 dark:text-gray-100">
                  {{ translateLabel(group.labelKey) }}
                </td>
                <td v-for="category in passengerCategories" :key="`rainbow-jet-cell-${group.id}-${category.id}`"
                  class="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-mono dark:text-gray-100">
                  {{ getRainbowJetPassengerFare(group.id, category.id) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>{{ $t('CHILD_AGE_NOTE') }}</p>
          <p>{{ $t('INFANT_AGE_NOTE') }}</p>
          <p>{{ $t('RAINBOW_JET_ALL_SEATS_RESERVATION') }}</p>
          <p>{{ $t('INTERMEDIATE_STOP_INVALIDATES_TICKET') }}</p>
          <p class="text-red-600 dark:text-red-400">{{ $t('RAINBOW_JET_NO_VEHICLE') }}</p>
        </div>

        <!-- Disability discount information -->
        <div
          v-if="rainbowJetPassengerActiveCategory === 'disabledAdult' || rainbowJetPassengerActiveCategory === 'disabledChild'"
          class="md:hidden mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h5 class="font-semibold text-blue-900 dark:text-blue-100 mb-3">{{ $t('DISABILITY_DISCOUNT_TITLE') }}</h5>
          <div class="text-sm text-blue-800 dark:text-blue-200 space-y-3">
            <div>
              <p class="font-medium mb-2">{{ $t('DISABILITY_DISCOUNT_CONDITIONS_TITLE') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_CERTIFICATE_REQUIRED') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_CAREGIVER_CONDITION') }}</p>
              <p>{{ $t('DISABILITY_VISUAL_IMPAIRED_CAREGIVER') }}</p>
            </div>
            <div>
              <p class="font-medium mb-2">{{ $t('DISABILITY_DISCOUNT_CONTENT_TITLE') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_TYPE_1_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_VISUAL_IMPAIRED_INTERPRETER_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_TYPE_2_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_BOARDING_PROCEDURE_NOTE') }}</p>
              <p>{{ $t('DISABILITY_FARE_ROUNDING_NOTE') }}</p>
            </div>
          </div>
        </div>

        <!-- Disability discount information (desktop always visible) -->
        <div
          class="hidden md:block mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h5 class="font-semibold text-blue-900 dark:text-blue-100 mb-3">{{ $t('DISABILITY_DISCOUNT_TITLE') }}</h5>
          <div class="text-sm text-blue-800 dark:text-blue-200 space-y-3">
            <div>
              <p class="font-medium mb-2">{{ $t('DISABILITY_DISCOUNT_CONDITIONS_TITLE') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_CERTIFICATE_REQUIRED') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_CAREGIVER_CONDITION') }}</p>
              <p>{{ $t('DISABILITY_VISUAL_IMPAIRED_CAREGIVER') }}</p>
            </div>
            <div>
              <p class="font-medium mb-2">{{ $t('DISABILITY_DISCOUNT_CONTENT_TITLE') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_TYPE_1_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_VISUAL_IMPAIRED_INTERPRETER_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_TYPE_2_DISCOUNT') }}</p>
              <p class="mb-2">{{ $t('DISABILITY_BOARDING_PROCEDURE_NOTE') }}</p>
              <p>{{ $t('DISABILITY_FARE_ROUNDING_NOTE') }}</p>
            </div>
          </div>
        </div>
        <div class="mt-4 text-center">
          <a href="https://www.oki-kisen.co.jp/fare/" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
            {{ $t('FARE_DETAILS') }}
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </a>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { FareVersion } from '@/types/fare'
import { roundUpToTen } from '@/utils/currency'
import { mapHighspeedToCanonicalRoute, normalizeRouteId } from '@/utils/fareRoutes'

// Composables
const { formatCurrency, getAllFares } = useFareDisplay()
const fareStore = process.client ? useFareStore() : null
const { t, te } = useI18n({ useScope: 'global' })

// State
const activeTab = ref('okiKisen')
const okiKisenFares = ref<any[]>([])
const naikoSenFares = ref<any[]>([])
const rainbowJetFares = ref<any[]>([])
const innerIslandFare = ref<any>(null)
const innerIslandVehicleFare = ref<any>(null)
const showVehicleNotes = ref(false)

// Seat class definitions
const seatClasses = [
  { key: 'class2', nameKey: 'SEAT_CLASS_2' },
  { key: 'class2Special', nameKey: 'SEAT_CLASS_2_SPECIAL' },
  { key: 'class1', nameKey: 'SEAT_CLASS_1' },
  { key: 'classSpecial', nameKey: 'SEAT_CLASS_SPECIAL' },
  { key: 'specialRoom', nameKey: 'SEAT_CLASS_SPECIAL_ROOM' }
] as const

type SeatClassKey = typeof seatClasses[number]['key']

const okiKisenActiveSeatClass = ref<SeatClassKey>(seatClasses[0].key)
const activeSeatClass = computed(() => seatClasses.find(item => item.key === okiKisenActiveSeatClass.value) ?? seatClasses[0])

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
const naikoSenPassengerActiveCategory = ref<PassengerCategoryId>('adult')

const okiKisenRouteGroups = [
  {
    id: 'hondo-oki',
    labelKey: 'HONDO_OKI',
    routeIds: [
      'hondo_shichirui-saigo',
      'saigo-hondo_shichirui',
      'hondo_shichirui-beppu',
      'beppu-hondo_shichirui',
      'hondo_shichirui-hishiura',
      'hishiura-hondo_shichirui',
      'hondo_shichirui-kuri',
      'kuri-hondo_shichirui'
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

type RouteGroupId = typeof okiKisenRouteGroups[number]['id']

const okiKisenVehicleActiveRoute = ref<RouteGroupId>(okiKisenRouteGroups[0].id)

const activeVehicleRoute = computed(() =>
  okiKisenRouteGroups.find(group => group.id === okiKisenVehicleActiveRoute.value) ?? okiKisenRouteGroups[0]
)

const rainbowJetRouteGroups = [
  { id: 'hondo-oki', labelKey: 'HONDO_OKI' },
  { id: 'dozen-dogo', labelKey: 'DOZEN_DOGO' },
  { id: 'beppu-hishiura', labelKey: 'BEPPU_HISHIURA' }
] as const

const PASSENGER_DISCOUNT_RATE = 0.5

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

const formatVersionLabel = (version: FareVersion | null): string => {
  if (!version) return ''
  const label = version.name || '現行版'
  if (version.effectiveFrom === '1970-01-01') {
    return label
  }
  return `${label}`
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

  const adult = pickNumber(fares.adult ?? source.adult)
  const child = calculateDiscountedFare(adult)
  const disabledAdult = calculateDiscountedFare(adult)
  const disabledChild = calculateDiscountedFare(disabledAdult ?? child)

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
    const normalizedKey = normalizeRouteId(routeKey)
    const canonical = mapHighspeedToCanonicalRoute(normalizedKey ?? routeKey)
    if (canonical === groupId) {
      return route
    }
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

const getNaikoSenPassengerFare = (categoryId: PassengerCategoryId): string => {
  switch (categoryId) {
    case 'adult':
      return formatCurrency(innerIslandFare.value?.adult || 300)
    case 'child':
      return formatCurrency(innerIslandFare.value?.child || 100)
    case 'disabledAdult':
      return formatCurrency(150)
    case 'disabledChild':
      return formatCurrency(50)
    default:
      return '—'
  }
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
const getSeatClassBaseFareValue = (groupId: string, seatClass: SeatClassKey): number | null => {
  const route = findOkiKisenRoute(groupId)
  if (!route) return null
  const rawFare = route?.fares?.seatClass?.[seatClass]
  return pickNumber(rawFare)
}

const applySeatClassPassengerCategory = (base: number | null, categoryId: PassengerCategoryId): number | null => {
  if (base === null) return null
  if (categoryId === 'adult') {
    return base
  }

  const discounted = calculateDiscountedFare(base)
  if (categoryId === 'child' || categoryId === 'disabledAdult') {
    return discounted
  }

  if (categoryId === 'disabledChild') {
    return calculateDiscountedFare(discounted)
  }

  return base
}

const getSeatClassFareForCategory = (groupId: string, seatClass: SeatClassKey, categoryId: PassengerCategoryId): string => {
  const baseFare = getSeatClassBaseFareValue(groupId, seatClass)
  const value = applySeatClassPassengerCategory(baseFare, categoryId)
  return value !== null ? formatCurrency(value) : '—'
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

  const rainbowJet = highspeedRoutes

  return {
    okiKisen,
    naikoSen,
    rainbowJet
  }
}

// Toggle vehicle notes accordion
const toggleVehicleNotes = () => {
  showVehicleNotes.value = !showVehicleNotes.value
}

// Load fare data
onMounted(async () => {
  const fares = await getAllFares()
  console.log('All fares:', fares)
  console.log('Highspeed fares:', fares.filter(route => route?.vesselType === 'highspeed'))
  const grouped = groupFaresByShipType(fares)
  console.log('Grouped fares:', grouped)
  console.log('RainbowJet fares:', grouped.rainbowJet)

  okiKisenFares.value = grouped.okiKisen
  naikoSenFares.value = grouped.naikoSen
  rainbowJetFares.value = grouped.rainbowJet

  // Ensure fareStore is loaded
  if (fareStore) {
    await fareStore.loadFareMaster()

    if (fareStore.fareMaster) {
      innerIslandFare.value = fareStore.fareMaster.innerIslandFare
      innerIslandVehicleFare.value = fareStore.fareMaster.innerIslandVehicleFare
    }
  }
})

// Page metadata
useHead({
  title: `${useNuxtApp().$i18n.t('FARE_TABLE')} - ${useNuxtApp().$i18n.t('TITLE')}`
})
</script>
