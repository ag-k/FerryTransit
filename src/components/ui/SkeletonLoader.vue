<template>
  <div class="animate-pulse">
    <!-- Timetable Skeleton -->
    <div v-if="type === 'timetable'" class="space-y-4">
      <div v-for="i in rows" :key="i" class="border border-app-border rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="h-6 bg-app-surface-2 rounded w-24"></div>
          <div class="h-6 bg-app-surface-2 rounded w-20"></div>
        </div>
        <div class="space-y-2">
          <div class="h-4 bg-app-surface-2 rounded w-3/4"></div>
          <div class="h-4 bg-app-surface-2 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <!-- Route Search Skeleton -->
    <div v-else-if="type === 'route'" class="space-y-4">
      <div v-for="i in rows" :key="i" class="border border-app-border rounded-lg">
        <div class="bg-app-surface-2 h-10 rounded-t-lg"></div>
        <div class="p-4 space-y-3">
          <div class="flex justify-between">
            <div class="h-4 bg-app-surface-2 rounded w-24"></div>
            <div class="h-4 bg-app-surface-2 rounded w-32"></div>
          </div>
          <div class="flex justify-between">
            <div class="h-4 bg-app-surface-2 rounded w-24"></div>
            <div class="h-4 bg-app-surface-2 rounded w-32"></div>
          </div>
          <div class="h-4 bg-app-surface-2 rounded w-full mt-4"></div>
        </div>
      </div>
    </div>

    <!-- Card Skeleton -->
    <div v-else-if="type === 'card'" class="space-y-4">
      <div v-for="i in rows" :key="i" class="border border-app-border rounded-lg p-4">
        <div class="h-6 bg-app-surface-2 rounded w-1/3 mb-3"></div>
        <div class="space-y-2">
          <div class="h-4 bg-app-surface-2 rounded w-full"></div>
          <div class="h-4 bg-app-surface-2 rounded w-5/6"></div>
          <div class="h-4 bg-app-surface-2 rounded w-4/6"></div>
        </div>
      </div>
    </div>

    <!-- List Skeleton -->
    <div v-else class="space-y-3">
      <div v-for="i in rows" :key="i" class="flex items-center space-x-3">
        <div class="h-10 w-10 bg-app-surface-2 rounded-full"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-app-surface-2 rounded w-1/3"></div>
          <div class="h-3 bg-app-surface-2 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'timetable' | 'route' | 'card' | 'list'
  rows?: number
}

withDefaults(defineProps<Props>(), {
  type: 'list',
  rows: 3
})
</script>
