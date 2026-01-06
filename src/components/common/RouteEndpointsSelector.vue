<template>
  <div
    class="rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800"
    data-testid="route-endpoints-selector"
  >
    <!-- From -->
    <div class="flex items-stretch">
      <div
        class="w-20 shrink-0 bg-blue-700 text-white flex items-center justify-center text-sm font-semibold border-r border-gray-300 dark:border-gray-600"
        data-testid="route-endpoints-from-label"
      >
        {{ $t('_FROM') }}
      </div>
      <div class="flex-1 min-w-0 relative">
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
        <button
          v-if="departureProxy && !disabled"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors touch-manipulation"
          :aria-label="$t('CLEAR')"
          :title="$t('CLEAR')"
          data-testid="route-endpoints-clear-departure"
          @click.stop.prevent="clearDeparture"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Middle row: +via + swap -->
    <div
      class="flex items-center border-t border-gray-200 dark:border-gray-700"
      :class="showVia ? 'justify-between' : 'justify-end'"
    >
      <button
        v-if="showVia"
        type="button"
        class="px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-200 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="disabled"
        data-testid="route-endpoints-add-via"
        @click="$emit('addVia')"
      >
        +{{ $t('VIA') }}
      </button>

      <button
        type="button"
        class="p-3 text-base text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors touch-manipulation"
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
        class="w-20 shrink-0 bg-blue-700 text-white flex items-center justify-center text-sm font-semibold border-r border-gray-300 dark:border-gray-600"
        data-testid="route-endpoints-to-label"
      >
        {{ $t('_TO') }}
      </div>
      <div class="flex-1 min-w-0 relative">
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
        <button
          v-if="arrivalProxy && !disabled"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors touch-manipulation"
          :aria-label="$t('CLEAR')"
          :title="$t('CLEAR')"
          data-testid="route-endpoints-clear-arrival"
          @click.stop.prevent="clearArrival"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PortSelector from '@/components/common/PortSelector.vue'

type Props = {
  departure: string
  arrival: string
  showVia?: boolean
  disabled?: boolean
  hondoPorts?: string[]
  dozenPorts?: string[]
  dogoPorts?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  // 経由は未実装のためデフォルトでは非表示（必要になったら呼び出し側で showVia を明示的に true にする）
  showVia: false,
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

const defaultMainlandPorts = ['HONDO', 'HONDO_SHICHIRUI', 'HONDO_SAKAIMINATO']
const mainlandPorts = computed(() => {
  const ports = Array.isArray(props.hondoPorts) && props.hondoPorts.length > 0 ? props.hondoPorts : defaultMainlandPorts
  return ports
})

const isMainlandPort = (port: string | undefined): boolean => {
  if (!port) return false
  return mainlandPorts.value.includes(port)
}

const disabledDeparturePorts = computed(() => {
  const disabledPorts = new Set<string>()
  if (props.arrival) disabledPorts.add(props.arrival)
  // 本土港同士の組み合わせを禁止: 目的地が本土港なら、出発地側は本土港を選べない
  if (isMainlandPort(props.arrival)) {
    for (const p of mainlandPorts.value) disabledPorts.add(p)
  }
  return Array.from(disabledPorts)
})

const disabledArrivalPorts = computed(() => {
  const disabledPorts = new Set<string>()
  if (props.departure) disabledPorts.add(props.departure)
  // 本土港同士の組み合わせを禁止: 出発地が本土港なら、目的地側は本土港を選べない
  if (isMainlandPort(props.departure)) {
    for (const p of mainlandPorts.value) disabledPorts.add(p)
  }
  return Array.from(disabledPorts)
})

const disabled = computed(() => Boolean(props.disabled))
const showVia = computed(() => Boolean(props.showVia))

const clearDeparture = () => {
  departureProxy.value = ''
}

const clearArrival = () => {
  arrivalProxy.value = ''
}

// 既に本土港同士になっている状態（URL/地図/履歴など経由）を補正
watch(
  () => [props.departure, props.arrival] as const,
  ([dep, arr]) => {
    // SSRでは window が無いので何もしない（CSR/テスト環境のみ補正）
    if (typeof window === 'undefined') return
    if (!dep || !arr) return
    if (isMainlandPort(dep) && isMainlandPort(arr)) {
      // ルール違反時は目的地側を優先的にクリア
      emit('update:arrival', '')
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.route-endpoints__selector :deep([data-testid="port-selector-button"]) {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  /* 右側にクリア(✗)ボタン領域を確保 */
  padding: 0.75rem 2.75rem 0.75rem 0.75rem !important;
  min-height: 44px;
}

.route-endpoints__selector :deep([data-testid="port-selector-button"] svg) {
  display: none !important;
}
</style>
