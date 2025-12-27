<template>
  <div>
    <!-- Mobile: Vertical layout with button on the right -->
    <div class="md:hidden mb-4">
      <div class="flex items-start gap-2">
        <div class="flex-grow space-y-4">
          <div>
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <label class="block text-base font-medium text-gray-700 dark:text-gray-100 mb-2">{{ $t('_FROM') }}</label>
                <PortSelector
                  :model-value="departure"
                  :placeholder="$t('DEPARTURE')"
                  :disabled-ports="arrival ? [arrival] : []"
                  :hondo-ports="hondoPorts"
                  :dozen-ports="dozenPorts"
                  :dogo-ports="dogoPorts"
                  @update:model-value="$emit('update:departure', $event)"
                />
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <label class="block text-base font-medium text-gray-700 dark:text-gray-100 mb-2">{{ $t('_TO') }}</label>
                <PortSelector
                  :model-value="arrival"
                  :placeholder="$t('ARRIVAL')"
                  :disabled-ports="departure ? [departure] : []"
                  :hondo-ports="hondoPorts"
                  :dozen-ports="dozenPorts"
                  :dogo-ports="dogoPorts"
                  @update:model-value="$emit('update:arrival', $event)"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center self-center">
          <button type="button"
            class="p-3 text-base border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0 touch-manipulation"
            @click="$emit('reverse')" title="出発地と到着地を入れ替え">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd"
                d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Desktop: Horizontal layout -->
    <div class="hidden md:block mb-4">
      <div class="flex items-end gap-4">
        <div class="flex-1">
          <div class="flex items-start gap-2">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">{{ $t('_FROM') }}</label>
              <PortSelector
                :model-value="departure"
                :placeholder="$t('DEPARTURE')"
                :disabled-ports="arrival ? [arrival] : []"
                :hondo-ports="hondoPorts"
                :dozen-ports="dozenPorts"
                :dogo-ports="dogoPorts"
                @update:model-value="$emit('update:departure', $event)"
              />
            </div>
          </div>
        </div>

        <div class="px-2">
          <button type="button"
            class="px-4 py-2 border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            @click="$emit('reverse')" title="出発地と到着地を入れ替え">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd"
                d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z" />
            </svg>
          </button>
        </div>

        <div class="flex-1">
          <div class="flex items-start gap-2">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">{{ $t('_TO') }}</label>
              <PortSelector
                :model-value="arrival"
                :placeholder="$t('ARRIVAL')"
                :disabled-ports="departure ? [departure] : []"
                :hondo-ports="hondoPorts"
                :dozen-ports="dozenPorts"
                :dogo-ports="dogoPorts"
                @update:model-value="$emit('update:arrival', $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PortSelector from '@/components/common/PortSelector.vue'

defineProps<{
  departure: string
  arrival: string
  hondoPorts: string[]
  dozenPorts: string[]
  dogoPorts: string[]
}>()

defineEmits<{
  'update:departure': [value: string]
  'update:arrival': [value: string]
  'reverse': []
}>()
</script>