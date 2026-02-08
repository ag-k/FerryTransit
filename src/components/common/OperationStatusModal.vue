<template>
  <Teleport to="body">
    <!-- Modal Overlay -->
    <Transition name="modal-fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black bg-opacity-50 z-40"
        @click="handleClose"
      ></div>
    </Transition>

    <!-- Modal Content -->
    <Transition name="modal-slide">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
        @click.self="handleClose"
      >
        <div
          class="bg-app-surface text-app-fg border border-app-border/70 rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] sm:max-h-[90vh] sm:h-auto overflow-hidden"
          @click.stop
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between p-4 border-b"
            :class="headerClass"
          >
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-semibold">{{ $t('OPERATION_STATUS') }}</h3>
            </div>
            <button
              type="button"
              class="p-3 -m-3 sm:p-2 sm:-m-2 hover:bg-black/10 rounded-lg transition-colors touch-manipulation"
              :aria-label="$t('CLOSE')"
              @click="handleClose"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-4 sm:p-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
            <!-- Loading state -->
            <div v-if="isLoading" class="text-center py-6">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
            </div>

            <!-- Content -->
            <div v-else>
              <!-- Ferry (Oki Kisen) -->
              <template v-if="isFerryShip">
                <div class="space-y-4">
                  <!-- Ferry status -->
                  <div
                    v-if="showFerryStatus"
                    class="rounded-lg border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {{ $t('OKI_KISEN_FERRY_FLEET_LABEL') }}
                      </h4>
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                        :class="getOperationBadgeClass(shipStatus?.ferry?.ferryState)"
                      >
                        {{ shipStatus?.ferry?.ferryState || $t('UNKNOWN') }}
                      </span>
                    </div>
                    <div
                      v-if="shipStatus?.ferry?.ferryComment"
                      class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30"
                    >
                      <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {{ shipStatus.ferry.ferryComment }}
                      </p>
                      <a
                        :href="buildGoogleTranslateUrl(shipStatus.ferry.ferryComment)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mt-2 inline-flex text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        {{ $t('OPEN_IN_GOOGLE_TRANSLATE') }}
                      </a>
                    </div>
                  </div>

                  <!-- RainbowJet status -->
                  <div
                    v-if="showRainbowJetStatus"
                    class="rounded-lg border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {{ $t('RAINBOWJET') }}
                      </h4>
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                        :class="getOperationBadgeClass(shipStatus?.ferry?.fastFerryState)"
                      >
                        {{ shipStatus?.ferry?.fastFerryState || $t('UNKNOWN') }}
                      </span>
                    </div>
                    <div
                      v-if="shipStatus?.ferry?.fastFerryComment"
                      class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30"
                    >
                      <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {{ shipStatus.ferry.fastFerryComment }}
                      </p>
                      <a
                        :href="buildGoogleTranslateUrl(shipStatus.ferry.fastFerryComment)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mt-2 inline-flex text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        {{ $t('OPEN_IN_GOOGLE_TRANSLATE') }}
                      </a>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Isokaze -->
              <template v-else-if="shipName === 'ISOKAZE'">
                <div
                  class="rounded-lg border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div class="flex items-start justify-between gap-3">
                    <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {{ $t('ISOKAZE') }}
                    </h4>
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                      :class="getLocalShipBadgeClass(shipStatus?.isokaze?.status)"
                    >
                      {{ getStatusText(shipStatus?.isokaze?.status, 'isokaze') }}
                    </span>
                  </div>

                  <div
                    v-if="shipStatus?.isokaze?.summary"
                    class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30"
                  >
                    <p class="text-xs font-semibold text-slate-600 dark:text-slate-200">
                      {{ $t('SUMMARY') }}
                    </p>
                    <p class="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {{ shipStatus.isokaze.summary }}
                    </p>
                  </div>

                  <div
                    v-if="shipStatus?.isokaze?.comment"
                    class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30"
                  >
                    <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {{ shipStatus.isokaze.comment }}
                    </p>
                  </div>

                  <!-- Detail section -->
                  <LocalShipDetailSection
                    v-if="shouldShowDetailBlock(shipStatus?.isokaze, 'isokaze')"
                    :ship="shipStatus?.isokaze"
                    :ship-type="'isokaze'"
                  />
                </div>
              </template>

              <!-- Ferry Dozen -->
              <template v-else-if="shipName === 'FERRY_DOZEN'">
                <div
                  class="rounded-lg border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div class="flex items-start justify-between gap-3">
                    <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {{ $t('FERRY_DOZEN') }}
                    </h4>
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                      :class="getLocalShipBadgeClass(shipStatus?.dozen?.status)"
                    >
                      {{ getStatusText(shipStatus?.dozen?.status, 'dozen') }}
                    </span>
                  </div>

                  <div
                    v-if="shipStatus?.dozen?.summary"
                    class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30"
                  >
                    <p class="text-xs font-semibold text-slate-600 dark:text-slate-200">
                      {{ $t('SUMMARY') }}
                    </p>
                    <p class="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {{ shipStatus.dozen.summary }}
                    </p>
                  </div>

                  <div
                    v-if="shipStatus?.dozen?.comment"
                    class="mt-3 rounded-md border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/30"
                  >
                    <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {{ shipStatus.dozen.comment }}
                    </p>
                  </div>

                  <!-- Detail section -->
                  <LocalShipDetailSection
                    v-if="shouldShowDetailBlock(shipStatus?.dozen, 'dozen')"
                    :ship="shipStatus?.dozen"
                    :ship-type="'dozen'"
                  />
                </div>
              </template>

              <!-- No status info -->
              <div v-else class="text-center py-6 text-gray-500 dark:text-gray-300">
                <p>{{ $t('NO_STATUS_INFO') }}</p>
              </div>

              <!-- Last update time -->
              <div v-if="lastUpdateTime" class="mt-4 text-center text-xs text-app-muted">
                {{ $t('LAST_UPDATE') }}: {{ formatDateTime(lastUpdateTime) }}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-4 border-t border-app-border">
            <div class="flex gap-3">
              <SecondaryButton class="flex-1" @click="navigateToStatus">
                {{ $t('VIEW_ALL_STATUS') }}
              </SecondaryButton>
              <PrimaryButton class="flex-1" @click="handleClose">
                {{ $t('CLOSE') }}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useFerryStore } from '@/stores/ferry'
import type { ShipStatus } from '~/types'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import SecondaryButton from '@/components/common/SecondaryButton.vue'
import LocalShipDetailSection from '@/components/status/LocalShipDetailSection.vue'

interface Props {
  visible: boolean
  shipName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const ferryStore = process.client ? useFerryStore() : null

const isLoading = computed(() => !ferryStore?.shipStatus)
const shipStatus = computed(() => ferryStore?.shipStatus || {})

// Check if this is a ferry ship (Oki Kisen fleet)
const isFerryShip = computed(() => {
  return ['FERRY_OKI', 'FERRY_SHIRASHIMA', 'FERRY_KUNIGA', 'RAINBOWJET'].includes(props.shipName)
})

// Show ferry status section
const showFerryStatus = computed(() => {
  return ['FERRY_OKI', 'FERRY_SHIRASHIMA', 'FERRY_KUNIGA'].includes(props.shipName)
})

// Show RainbowJet status section
const showRainbowJetStatus = computed(() => {
  return props.shipName === 'RAINBOWJET'
})

// Last update time
const lastUpdateTime = computed(() => {
  if (isFerryShip.value) {
    return shipStatus.value?.ferry?.updated_at || null
  }
  if (props.shipName === 'ISOKAZE') {
    return shipStatus.value?.isokaze?.updated_at || shipStatus.value?.isokaze?.updated || null
  }
  if (props.shipName === 'FERRY_DOZEN') {
    return shipStatus.value?.dozen?.updated_at || shipStatus.value?.dozen?.updated || null
  }
  return null
})

// Header class based on status severity
const headerClass = computed(() => {
  const severity = getStatusSeverity()
  switch (severity) {
    case 'danger':
      return 'border-red-600 bg-gradient-to-r from-red-600 to-red-700 text-white'
    case 'warning':
      return 'border-yellow-400 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900'
    case 'info':
      return 'border-blue-800 bg-gradient-to-r from-blue-700 to-blue-800 text-white'
    default:
      return 'border-app-border bg-app-surface-2 text-app-fg'
  }
})

const getStatusSeverity = (): 'danger' | 'warning' | 'info' | 'default' => {
  if (isFerryShip.value) {
    const state = showRainbowJetStatus.value
      ? shipStatus.value?.ferry?.fastFerryState
      : shipStatus.value?.ferry?.ferryState
    return getFerrySeverity(state)
  }
  if (props.shipName === 'ISOKAZE') {
    return getLocalShipSeverity(shipStatus.value?.isokaze?.status)
  }
  if (props.shipName === 'FERRY_DOZEN') {
    return getLocalShipSeverity(shipStatus.value?.dozen?.status)
  }
  return 'default'
}

const getFerrySeverity = (state?: string | null): 'danger' | 'warning' | 'info' | 'default' => {
  if (!state) return 'default'
  const normalized = state.trim().toLowerCase()
  if (normalized.includes('欠航') || normalized.includes('休航') || normalized.includes('cancel')) return 'danger'
  if (normalized.includes('条件') || normalized.includes('conditional') || normalized.includes('変更')) return 'warning'
  if (normalized.includes('定期') || normalized.includes('通常') || normalized.includes('平常') || normalized.includes('normal') || normalized.includes('operation')) return 'info'
  return 'warning'
}

const getLocalShipSeverity = (status?: number | null): 'danger' | 'warning' | 'info' | 'default' => {
  if (status === null || status === undefined) return 'default'
  if (status === 0 || status === 4) return 'info'
  if (status === 1) return 'danger'
  return 'warning'
}

const buildGoogleTranslateUrl = (text?: string | null) => {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (!raw) return 'https://translate.google.com/'
  const params = new URLSearchParams({
    sl: 'ja',
    tl: 'en',
    text: raw,
    op: 'translate'
  })
  return `https://translate.google.com/?${params.toString()}`
}

// Badge classes
const getOperationBadgeClass = (state?: string | null) => {
  if (!state) {
    return 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-200 dark:ring-slate-700'
  }
  const normalized = state.trim().toLowerCase()
  if (normalized.includes('通常') || normalized.includes('平常') || normalized.includes('定期') || normalized.includes('normal') || normalized.includes('operation')) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
  }
  if (normalized.includes('欠航') || normalized.includes('cancel')) {
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800'
  }
  return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800'
}

const getLocalShipBadgeClass = (status?: number | null) => {
  if (status === null || status === undefined) {
    return 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-200 dark:ring-slate-700'
  }
  if (status === 0 || status === 4) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
  }
  if (status === 1) {
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800'
  }
  return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800'
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
    return t('UNKNOWN')
  }
  const key = statusLabelKeyMap[shipType][status]
  return key ? t(key) : t('UNKNOWN')
}

const getShipTrips = (trips: any[] | null | undefined) => (Array.isArray(trips) ? trips : [])

const hasOperationInfo = (ship?: ShipStatus | null) => {
  if (!ship) return false
  const startTime = ship.startTime || ship.start_time
  return Boolean(ship.departure || ship.arrival || startTime)
}

const shouldShowReason = (ship: ShipStatus | null | undefined, shipType: ShipType) => {
  if (!ship?.reason) return false
  if (shipType === 'isokaze') {
    return ship.status === 1 || ship.status === 2
  }
  if (shipType === 'dozen') {
    return ship.status !== undefined && ship.status >= 1 && ship.status <= 3
  }
  return ship.status !== 0
}

const shouldShowDetailBlock = (ship: ShipStatus | null | undefined, shipType: ShipType) => {
  if (!ship || ship.status === 0) return false
  if (hasOperationInfo(ship)) return true
  if (shouldShowReason(ship, shipType)) return true
  if (ship.comment) return true
  if (getShipTrips(ship.extraShips).length > 0) return true
  if (!getShipTrips(ship.extraShips).length && getShipTrips(ship.lastShips).length > 0) return true
  return false
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

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const navigateToStatus = () => {
  handleClose()
  router.push(localePath('/status'))
}

// Handle ESC key
onMounted(() => {
  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.visible) {
      handleClose()
    }
  }
  document.addEventListener('keydown', handleEsc)

  onUnmounted(() => {
    document.removeEventListener('keydown', handleEsc)
  })
})

// Prevent body scroll when modal is open
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-slide-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.modal-slide-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
