<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-bottom">
    <div class="flex justify-around">
      <NuxtLink 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center py-2 px-2 min-w-0 flex-1 text-xs touch-manipulation transition-colors duration-200"
        :class="[
          isActive(item.path) 
            ? 'text-blue-600' 
            : 'text-gray-600'
        ]"
      >
        <svg 
          class="w-6 h-6 mb-1 flex-shrink-0" 
          fill="none"
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            :d="item.icon"
          />
        </svg>
        <span class="truncate w-full text-center font-medium">{{ $t(item.label) }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()

// Navigation items for bottom tab
const navItems = computed(() => [
  {
    path: localePath('/timetable'),
    label: 'TIMETABLE',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    path: localePath('/transit'),
    label: 'TRANSIT',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
  },
  {
    path: localePath('/status'),
    label: 'STATUS',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    path: localePath('/settings'),
    label: 'SETTINGS',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  }
])

// Check if current route is active
const isActive = (path: string) => {
  return route.path === path || route.path.endsWith(path.split('/').pop() || '')
}
</script>