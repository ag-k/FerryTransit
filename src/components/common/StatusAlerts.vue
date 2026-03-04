<template>
  <div v-if="hasAlerts" class="mb-6">
    <Alert :visible="true" type="warning" :title="$t('OPERATION_ALERTS')" :dismissible="false" message="">
      <template #default>
        <div class="space-y-2">
          <div v-if="shipStatus.isokaze?.hasAlert">
            <strong>{{ $t('ISOKAZE') }}:</strong> {{ shipStatus.isokaze.summary || $t('CHECK_DETAILS') }}
          </div>
          <div v-if="shipStatus.dozen?.hasAlert">
            <strong>{{ $t('FERRY_DOZEN') }}:</strong> {{ shipStatus.dozen.summary || $t('CHECK_DETAILS') }}
          </div>
          <div v-if="shipStatus.ferry?.hasAlert">
            <strong>{{ $t('OKI_KISEN_FERRY') }}:</strong>
            <span v-if="hasFerryStateAlert">
              {{ $t('FERRY') }}: {{ ferryStateLabel }}
            </span>
            <span v-if="hasFerryStateAlert && hasFastFerryStateAlert"> / </span>
            <span v-if="hasFastFerryStateAlert">
              {{ $t('RAINBOWJET') }}: {{ fastFerryStateLabel }}
            </span>
          </div>
        </div>

        <div class="mt-3">
          <SecondaryButton :to="localePath('/status')" size="sm">
            {{ $t('VIEW_DETAILS') }}
          </SecondaryButton>
        </div>
      </template>
    </Alert>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useFerryStore } from '@/stores/ferry'
import { useFerryData } from '@/composables/useFerryData'
import type { ShipStatusStoreState } from '@/types'
import Alert from '@/components/common/Alert.vue'
import SecondaryButton from '@/components/common/SecondaryButton.vue'

const localePath = useLocalePath()

// Initialize store only on client side
const ferryStore = process.client ? useFerryStore() : null
const { initializeData } = useFerryData()

// Store data
const emptyShipStatus: ShipStatusStoreState = {
  isokaze: null,
  dozen: null,
  ferry: null,
  kunigaKankou: null
}
const shipStatus = computed<ShipStatusStoreState>(() => ferryStore?.shipStatus ?? emptyShipStatus)
const NORMAL_FERRY_OPERATION_STATES = new Set(['定期運航', '通常運航'])
const isNormalFerryState = (state?: string | null) => {
  if (!state) return false
  return NORMAL_FERRY_OPERATION_STATES.has(state.trim())
}
const ferryStateLabel = computed(() => shipStatus.value.ferry?.ferryState || shipStatus.value.ferry?.ferry_state || '')
const fastFerryStateLabel = computed(() => shipStatus.value.ferry?.fastFerryState || shipStatus.value.ferry?.fast_ferry_state || '')
const hasFerryStateAlert = computed(() => !isNormalFerryState(ferryStateLabel.value))
const hasFastFerryStateAlert = computed(() => !isNormalFerryState(fastFerryStateLabel.value))

// Computed
const hasAlerts = computed(() => {
  const status = shipStatus.value
  return status.isokaze?.hasAlert ||
    status.dozen?.hasAlert ||
    status.ferry?.hasAlert
})

// Initialize data on mount
onMounted(async () => {
  if (ferryStore && ferryStore.timetableData.length === 0) {
    await initializeData()
  }
})
</script>
