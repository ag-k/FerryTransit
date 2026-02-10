<template>
  <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
    <div class="p-5">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <component
            :is="icon"
            class="h-6 w-6 text-gray-400 dark:text-gray-500"
          />
        </div>
        <div class="ml-5 w-0 flex-1">
          <dl>
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              {{ title }}
            </dt>
            <dd class="flex items-baseline">
              <div class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ value }}
              </div>
              <div
                v-if="change"
                :class="[
                  changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                  'ml-2 flex items-baseline text-sm font-semibold'
                ]"
              >
                <svg
                  v-if="changeType === 'increase'"
                  class="self-center flex-shrink-0 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
                <svg
                  v-else
                  class="self-center flex-shrink-0 h-5 w-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span class="sr-only">
                  {{ changeType === 'increase' ? '増加' : '減少' }}
                </span>
                {{ change }}
              </div>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  value: string
  change?: string
  changeType?: 'increase' | 'decrease'
  icon: Component
}>()
</script>