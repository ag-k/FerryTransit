<template>
  <div
    class="rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800"
    data-testid="route-endpoints-selector"
  >
    <!-- From -->
    <div class="flex items-stretch">
      <div
        class="w-20 shrink-0 bg-green-600 text-white flex items-center justify-center text-sm font-semibold border-r border-gray-300 dark:border-gray-600"
        data-testid="route-endpoints-from-label"
      >
        {{ $t('_FROM') }}
      </div>
      <div class="flex-1 min-w-0">
        <PortSelector
          v-model="departureProxy"
          class="route-endpoints__selector"
          :placeholder="$t('DEPARTURE')"
          :disabled="disabled"
          :disabled-ports="disabledDeparturePorts"
          :hondo-ports="hondoPorts"
          :dozen-ports="dozenPorts"
          :dogo-ports="dogoPorts"
          margin="none"
        />
      </div>
    </div>

    <!-- Middle row: +via + swap -->
    <div class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        class="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-200 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="disabled"
        data-testid="route-endpoints-add-via"
        @click="$emit('addVia')"
      >
        +{{ $t('VIA') }}
      </button>

      <button
        type="button"
        class="p-3 text-base text-blue-600 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors touch-manipulation"
        title="出発地と到着地を入れ替え"
        aria-label="Reverse route"
        :disabled="disabled"
        @click="$emit('reverse')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5z"
          />
        </svg>
      </button>
    </div>

    <!-- To -->
    <div class="flex items-stretch border-t border-gray-200 dark:border-gray-700">
      <div
        class="w-20 shrink-0 bg-green-600 text-white flex items-center justify-center text-sm font-semibold border-r border-gray-300 dark:border-gray-600"
        data-testid="route-endpoints-to-label"
      >
        {{ $t('_TO') }}
      </div>
      <div class="flex-1 min-w-0">
        <PortSelector
          v-model="arrivalProxy"
          class="route-endpoints__selector"
          :placeholder="$t('ARRIVAL')"
          :disabled="disabled"
          :disabled-ports="disabledArrivalPorts"
          :hondo-ports="hondoPorts"
          :dozen-ports="dozenPorts"
          :dogo-ports="dogoPorts"
          margin="none"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PortSelector from '@/components/common/PortSelector.vue'

type Props = {
  departure: string
  arrival: string
  disabled?: boolean
  hondoPorts?: string[]
  dozenPorts?: string[]
  dogoPorts?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:departure': [value: string]
  'update:arrival': [value: string]
  'reverse': []
  'addVia': []
}>()

const departureProxy = computed({
  get: () => props.departure,
  set: (value: string) => emit('update:departure', value)
})

const arrivalProxy = computed({
  get: () => props.arrival,
  set: (value: string) => emit('update:arrival', value)
})

const disabledDeparturePorts = computed(() => (props.arrival ? [props.arrival] : []))
const disabledArrivalPorts = computed(() => (props.departure ? [props.departure] : []))

const disabled = computed(() => Boolean(props.disabled))
</script>

<style scoped>
.route-endpoints__selector :deep([data-testid="port-selector-button"]) {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  padding: 0.75rem 0.75rem !important;
  min-height: 44px;
}

.route-endpoints__selector :deep([data-testid="port-selector-button"] svg) {
  display: none !important;
}
</style>
