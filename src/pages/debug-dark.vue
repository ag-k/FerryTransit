<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-4">Dark Mode Debug</h1>
    
    <div class="space-y-4">
      <!-- Test with standard Tailwind classes -->
      <div class="p-4 bg-white dark:bg-gray-900 text-black dark:text-white border rounded">
        <p>Standard Tailwind: bg-white dark:bg-gray-900</p>
      </div>
      
      <!-- Test with simpler dark mode class -->
      <div class="p-4 bg-blue-500 dark:bg-red-500 text-white rounded">
        <p>Simple color test: bg-blue-500 dark:bg-red-500</p>
      </div>
      
      <!-- Test with inline styles -->
      <div class="p-4 border rounded" :style="{ backgroundColor: isDark ? '#111827' : '#ffffff', color: isDark ? '#ffffff' : '#000000' }">
        <p>Inline style test (should work)</p>
      </div>
      
      <!-- Navigation simulation -->
      <nav class="bg-blue-700 dark:bg-gray-900 text-white p-4 rounded">
        <p>Navigation test: bg-blue-700 dark:bg-gray-900</p>
      </nav>
      
      <!-- Test with different gray shades -->
      <div class="grid grid-cols-2 gap-4">
        <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <p class="text-gray-900 dark:text-gray-100">gray-100 / gray-800</p>
        </div>
        <div class="p-4 bg-gray-200 dark:bg-gray-700 rounded">
          <p class="text-gray-900 dark:text-gray-100">gray-200 / gray-700</p>
        </div>
      </div>
      
      <!-- Current theme info -->
      <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <p>Theme: {{ theme }}</p>
        <p>Is Dark: {{ isDark }}</p>
        <p>HTML has dark class: {{ htmlHasDarkClass }}</p>
      </div>
      
      <!-- Theme switcher -->
      <div class="flex gap-4">
        <button 
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded" 
          :class="{ 'ring-2 ring-blue-500': theme === 'light' }"
          @click="setTheme('light')"
        >
          Light
        </button>
        <button 
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded" 
          :class="{ 'ring-2 ring-blue-500': theme === 'dark' }"
          @click="setTheme('dark')"
        >
          Dark
        </button>
        <button 
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded" 
          :class="{ 'ring-2 ring-blue-500': theme === 'system' }"
          @click="setTheme('system')"
        >
          System
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const theme = computed(() => uiStore.theme)
const isDark = computed(() => uiStore.isDark)
const htmlHasDarkClass = ref(false)

const checkHtmlClass = () => {
  if (process.client) {
    htmlHasDarkClass.value = document.documentElement.classList.contains('dark')
  }
}

const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
  uiStore.setTheme(newTheme)
  // Check HTML class after a small delay
  setTimeout(checkHtmlClass, 100)
}

onMounted(() => {
  checkHtmlClass()
  // Check periodically
  const interval = setInterval(checkHtmlClass, 1000)
  onUnmounted(() => clearInterval(interval))
})

// Page metadata
useHead({
  title: 'Dark Mode Debug'
})
</script>