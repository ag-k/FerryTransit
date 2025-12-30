<template>
  <div>
    <!-- Mobile/PC: 添付デザインに合わせた独自UIに統一 -->
    <div class="mb-4">
      <RouteEndpointsSelector
        :departure="departure"
        :arrival="arrival"
        :hondo-ports="hondoPorts"
        :dozen-ports="dozenPorts"
        :dogo-ports="dogoPorts"
        @update:departure="$emit('update:departure', $event)"
        @update:arrival="$emit('update:arrival', $event)"
        @reverse="$emit('reverse')"
      />
    </div>

    <!-- Desktop: Horizontal layout -->
  </div>
</template>

<script setup lang="ts">
import RouteEndpointsSelector from '@/components/common/RouteEndpointsSelector.vue'

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
