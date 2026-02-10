<template>
  <div
    v-if="ship && shouldShow"
    class="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700"
  >
    <!-- Operation info (cancelled from service) -->
    <div v-if="hasOperationInfo" class="space-y-2">
      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {{ $t('CANCELLED_FROM_SERVICE') }}
      </h4>
      <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
              <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
              <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t border-gray-200 dark:border-gray-700">
              <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(ship.departure) }}</td>
              <td class="px-3 py-2 dark:text-gray-200">{{ formatShipTime(startTimeValue) }}</td>
              <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(ship.arrival) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Reason -->
    <div v-if="showReason" class="text-sm dark:text-gray-300">
      <strong class="text-gray-700 dark:text-gray-200">{{ $t('REASON') }}:</strong>
      <span class="ml-1">{{ formatReason(ship.reason) }}</span>
    </div>

    <!-- Extra ships -->
    <div v-if="extraShips.length > 0" class="space-y-2">
      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ $t('EXTRA_SHIPS') }}</h4>
      <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
              <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
              <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(trip, index) in extraShips"
              :key="`extra-${index}`"
              class="border-t border-gray-200 dark:border-gray-700"
            >
              <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(trip?.departure) }}</td>
              <td class="px-3 py-2 dark:text-gray-200">{{ getTripDepartureTime(trip) }}</td>
              <td class="px-3 py-2 dark:text-gray-200">{{ formatTripArrival(trip) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Last ships (only when no extra ships) -->
    <div v-else-if="lastShips.length > 0" class="space-y-2">
      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ $t('LAST_SHIPS') }}</h4>
      <div class="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-gray-700 dark:bg-slate-700 dark:text-gray-200">
            <tr>
              <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE') }}</th>
              <th class="px-3 py-2 text-left font-medium">{{ $t('DEPARTURE_TIME') }}</th>
              <th class="px-3 py-2 text-left font-medium">{{ $t('ARRIVAL') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(trip, index) in lastShips"
              :key="`last-${index}`"
              class="border-t border-gray-200 dark:border-gray-700"
            >
              <td class="px-3 py-2 dark:text-gray-200">{{ formatPortLabel(trip?.departure) }}</td>
              <td class="px-3 py-2 dark:text-gray-200">{{ getTripDepartureTime(trip) }}</td>
              <td class="px-3 py-2 dark:text-gray-200">{{ formatTripArrival(trip) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ShipStatus } from '~/types'

type ShipType = 'isokaze' | 'dozen'

interface Props {
  ship?: ShipStatus | null
  shipType: ShipType
}

const props = defineProps<Props>()

const { t } = useI18n()

const startTimeValue = computed(() => props.ship?.startTime || props.ship?.start_time || null)

const hasOperationInfo = computed(() => {
  if (!props.ship) return false
  return Boolean(props.ship.departure || props.ship.arrival || startTimeValue.value)
})

const extraShips = computed(() => {
  return Array.isArray(props.ship?.extraShips) ? props.ship!.extraShips : []
})

const lastShips = computed(() => {
  return Array.isArray(props.ship?.lastShips) ? props.ship!.lastShips : []
})

const showReason = computed(() => {
  if (!props.ship?.reason) return false
  if (props.shipType === 'isokaze') {
    return props.ship.status === 1 || props.ship.status === 2
  }
  if (props.shipType === 'dozen') {
    return props.ship.status !== undefined && props.ship.status >= 1 && props.ship.status <= 3
  }
  return props.ship.status !== 0
})

const shouldShow = computed(() => {
  if (!props.ship || props.ship.status === 0) return false
  if (hasOperationInfo.value) return true
  if (showReason.value) return true
  if (props.ship.comment) return true
  if (extraShips.value.length > 0) return true
  if (lastShips.value.length > 0) return true
  return false
})

const formatPortLabel = (port?: string | null) => {
  if (!port) return '-'
  const translated = t(port)
  return translated !== port ? translated : port
}

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

const formatReason = (reason?: string | null) => {
  if (!reason) return ''
  const translated = t(reason)
  return translated !== reason ? translated : reason
}

const formatTripArrival = (trip: any) => {
  if (!trip) return '-'
  const arrival = formatPortLabel(trip.arrival)
  const viaValue = formatPortLabel(trip.via)
  if (!trip.via || viaValue === '-') return arrival
  const viaLabel = t('VIA')
  const { locale } = useI18n()
  const isJapanese = locale.value === 'ja'
  return isJapanese ? `${viaValue}${viaLabel}${arrival}` : `${arrival} ${viaLabel} ${viaValue}`
}

const getTripDepartureTime = (trip: any) => formatShipTime(trip?.departure_time || trip?.departureTime)
</script>
