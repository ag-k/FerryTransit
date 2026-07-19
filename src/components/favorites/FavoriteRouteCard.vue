<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 transform scale-95"
    enter-to-class="opacity-100 transform scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 transform scale-100"
    leave-to-class="opacity-0 transform scale-95"
  >
    <div
      v-if="!isDeleted"
      class="favorite-route-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <svg
            class="w-5 h-5 text-blue-700 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('favorites.route') }}</span>
        </div>
      </div>

    <div class="flex items-center justify-between mb-2">
      <div class="flex-1">
        <div class="flex items-center space-x-2">
          <div class="space-y-1">
            <div
              v-for="(line, index) in getPortLabelLines(departure)"
              :key="`departure-${index}`"
              class="flex items-center gap-2"
            >
              <span class="text-lg font-semibold dark:text-white">{{ line.name }}</span>
              <PortBadges :badges="line.municipality ? [line.municipality] : []" />
            </div>
          </div>
          <svg
            class="w-4 h-4 text-gray-400 dark:text-gray-500 self-center"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <div class="space-y-1">
            <div
              v-for="(line, index) in getPortLabelLines(arrival)"
              :key="`arrival-${index}`"
              class="flex items-center gap-2"
            >
              <span class="text-lg font-semibold dark:text-white">{{ line.name }}</span>
              <PortBadges :badges="line.municipality ? [line.municipality] : []" />
            </div>
          </div>
        </div>
        <p
          v-if="routeDetailText"
          data-testid="favorite-route-detail"
          class="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400"
        >
          {{ routeDetailText }}
        </p>
        <p
          v-if="withCar"
          data-testid="favorite-vehicle-condition"
          class="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400"
        >
          {{ $t('VIA_CAR') }} / {{ vehicleLengthLabel }}
        </p>
      </div>
    </div>

    <div v-if="lastSearchDate" class="text-sm text-gray-500 dark:text-gray-400 mb-3">
      {{ $t('favorites.lastSearched') }}: {{ formatDate(lastSearchDate) }}
    </div>

    <div class="flex space-x-2">
      <PrimaryButton
        size="sm"
        class="flex-1"
        :to="{
          path: localePath('/'),
          query: favoriteSearchQuery
        }"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{{ $t('TIMETABLE') }}</span>
      </PrimaryButton>
      <PrimaryButton
        size="sm"
        class="flex-1"
        :to="{
          path: localePath('/transit'),
          query: favoriteSearchQuery
        }"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
        <span>{{ $t('TRANSIT') }}</span>
      </PrimaryButton>
      <button
        class="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200 text-sm flex items-center justify-center"
        :aria-label="$t('favorites.remove')"
        @click="showDeleteConfirm"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-6 0a1 1 0 011-1h4a1 1 0 011 1m-6 0H6m9 0h3"
          />
        </svg>
        <span class="sr-only">{{ $t('favorites.remove') }}</span>
      </button>
    </div>
    
    <!-- 削除確認ダイアログ -->
    <ConfirmDialog
      :is-open="isConfirmOpen"
      :title="$t('favorites.deleteConfirmTitle')"
      :message="$t('favorites.deleteRouteConfirmMessage')"
      :confirm-text="$t('favorites.delete')"
      :cancel-text="$t('CANCEL')"
      confirm-type="danger"
      @confirm="handleDelete"
      @cancel="isConfirmOpen = false"
    />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFerryStore } from '~/stores/ferry'
import { useFavoriteStore } from '~/stores/favorite'
import PrimaryButton from '~/components/common/PrimaryButton.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import { createLogger } from '~/utils/logger'
import PortBadges from '@/components/common/PortBadges.vue'
import { loadBusRouteLabelsForStops, type BusRouteLabel } from '@/utils/gtfsBusTimetable'
import {
  DEFAULT_VEHICLE_LENGTH_METERS,
  getVehicleLengthLabelKey,
  normalizeVehicleLengthMeters
} from '@/utils/vehicleFare'

interface Props {
  departure: string
  arrival: string
  withCar?: boolean
  vehicleLengthMeters?: number
  lastSearchDate?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  remove: []
}>()

const ferryStore = process.client ? useFerryStore() : null
const favoriteStore = process.client ? useFavoriteStore() : null
const { locale, t } = useI18n()
const localePath = useLocalePath()
const logger = createLogger('FavoriteRouteCard')

// State
const isConfirmOpen = ref(false)
const isDeleted = ref(false)
const isMounted = ref(false)
const routeLabels = ref<BusRouteLabel[]>([])

onMounted(async () => {
  isMounted.value = true
  if (ferryStore?.ensureBusStopsLoaded) {
    await ferryStore.ensureBusStopsLoaded().catch(error => logger.warn('Failed to load bus stop labels', error))
  }
  await loadRouteLabels()
})

watch(
  () => [props.departure, props.arrival] as const,
  () => {
    if (!isMounted.value) return
    loadRouteLabels().catch(error => logger.warn('Failed to refresh favorite route labels', error))
  }
)

type PortLabelLine = {
  name: string
  municipality?: string
}

const getPortLabel = (portId: string) => {
  if (!portId) return ''
  const locationLabel = ferryStore?.getLocationLabel?.(portId)
  if (locationLabel) return locationLabel

  const translated = String(t(portId))
  const hasTranslation = translated && translated !== portId
  if (hasTranslation) return translated
  if (!isMounted.value || !ferryStore || !ferryStore.ports || !Array.isArray(ferryStore.ports)) return translated || portId
  try {
    const port = ferryStore.ports.find(p => p.PORT_ID === portId)
    return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : (translated || portId)
  } catch (e) {
    logger.error('Error getting port label', e)
    return translated || portId
  }
}

const parsePortLabel = (label: string): PortLabelLine[] => {
  const parts = label
    .split(/(?:\s*または\s*|\s+or\s+)/i)
    .map(part => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return []
  return parts.map((part) => {
    const match = part.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    if (match) {
      return { name: match[1], municipality: match[2] }
    }
    return { name: part }
  })
}

const getPortLabelLines = (portId: string) => {
  const label = getPortLabel(portId)
  const lines = parsePortLabel(label)
  return lines.length > 0 ? lines : [{ name: label || portId }]
}

const getBusTransportName = (name: string) => {
  const translated = String(t(name))
  if (translated !== name) return translated
  if (name === 'AMA_TOWN_BUS') return '海士町路線バス'
  if (name === 'NISHINOSHIMA_TOWN_BUS') return '西ノ島町営バス'
  if (name === 'CHIBU_VILLAGE_BUS') return '知夫村営バス'
  if (name === 'OKI_ICHIBATA_BUS') return '隠岐一畑交通'
  if (name === 'OKINOSHIMA_TOWN_BUS') return '隠岐の島町営バス'
  if (name === 'ICHIBATA_BUS_CONNECTION') return '一畑バス 隠岐汽船接続バス'
  if (name === 'OKI_AIRPORT_BUS') return '隠岐空港連絡バス'
  return translated
}

const formatRouteLabel = (label: BusRouteLabel) => {
  const transportName = getBusTransportName(label.tripName)
  return label.routeName ? `${transportName}（${label.routeName}）` : transportName
}

const routeDetailText = computed(() => routeLabels.value
  .map(formatRouteLabel)
  .filter(Boolean)
  .join(' / '))

const normalizedVehicleLength = computed(() => normalizeVehicleLengthMeters(
  props.vehicleLengthMeters ?? DEFAULT_VEHICLE_LENGTH_METERS
))

const vehicleLengthLabel = computed(() => {
  const key = getVehicleLengthLabelKey(normalizedVehicleLength.value)
  return key
    ? t(key)
    : t('VEHICLE_LENGTH_METERS', { meters: normalizedVehicleLength.value })
})

const favoriteSearchQuery = computed(() => ({
  departure: props.departure,
  arrival: props.arrival,
  ...(props.withCar
    ? {
        withCar: '1',
        vehicleLengthMeters: String(normalizedVehicleLength.value)
      }
    : {})
}))

const loadRouteLabels = async () => {
  if (!ferryStore?.isStopLocation?.(props.departure) || !ferryStore?.isStopLocation?.(props.arrival)) {
    routeLabels.value = []
    return
  }

  try {
    routeLabels.value = await loadBusRouteLabelsForStops(props.departure, props.arrival)
  } catch (error) {
    routeLabels.value = []
    logger.warn('Failed to load favorite route labels', error)
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const showDeleteConfirm = () => {
  isConfirmOpen.value = true
}

const handleDelete = () => {
  if (!favoriteStore) return
  
  // お気に入りルートを検索
  const favoriteRoute = favoriteStore.routes.find(r => 
    r.departure === props.departure &&
    r.arrival === props.arrival &&
    Boolean(r.withCar) === Boolean(props.withCar) &&
    (!props.withCar || (r.vehicleLengthMeters ?? 5) === normalizedVehicleLength.value)
  )
  
  if (favoriteRoute) {
    // アニメーション用のフラグを設定
    isDeleted.value = true
    
    // アニメーションが完了してから削除
    setTimeout(() => {
      favoriteStore.removeFavoriteRoute(favoriteRoute.id)
      emit('remove')
    }, 200)
  }
  
  isConfirmOpen.value = false
}
</script>
