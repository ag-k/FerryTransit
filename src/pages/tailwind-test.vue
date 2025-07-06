<template>
  <div class="min-h-screen p-8">
    <h1 class="text-3xl font-bold mb-8">Tailwind Dark Mode Test</h1>
    
    <!-- Force dark mode classes to be included -->
    <div class="hidden dark:bg-gray-900 dark:bg-gray-800 dark:bg-gray-700 dark:bg-slate-900 dark:bg-slate-800 dark:text-white dark:text-gray-100"></div>
    
    <div class="space-y-6">
      <!-- Test 1: Basic dark mode -->
      <section>
        <h2 class="text-xl font-semibold mb-2">Test 1: Basic Dark Mode</h2>
        <div class="p-4 border rounded bg-white dark:bg-gray-900 text-black dark:text-white">
          This should have dark background in dark mode
        </div>
      </section>
      
      <!-- Test 2: Navigation colors -->
      <section>
        <h2 class="text-xl font-semibold mb-2">Test 2: Navigation Colors</h2>
        <div class="p-4 border rounded bg-blue-600 dark:bg-gray-900 text-white">
          Navigation: Blue in light, Gray in dark
        </div>
        <div class="mt-2 p-4 border rounded bg-blue-600 dark:bg-slate-800 text-white">
          Alternative: Blue in light, Slate in dark
        </div>
      </section>
      
      <!-- Test 3: CSS variable approach -->
      <section>
        <h2 class="text-xl font-semibold mb-2">Test 3: CSS Variables</h2>
        <div class="p-4 border rounded" style="background-color: var(--tw-bg-opacity, 1) rgb(17 24 39 / var(--tw-bg-opacity)); color: white;">
          Direct gray-900 RGB values
        </div>
      </section>
      
      <!-- Test 4: All gray shades -->
      <section>
        <h2 class="text-xl font-semibold mb-2">Test 4: Gray Shades</h2>
        <div class="grid grid-cols-3 gap-2">
          <div class="p-2 bg-gray-50 dark:bg-gray-950 text-center">50/950</div>
          <div class="p-2 bg-gray-100 dark:bg-gray-900 text-center">100/900</div>
          <div class="p-2 bg-gray-200 dark:bg-gray-800 text-center">200/800</div>
          <div class="p-2 bg-gray-300 dark:bg-gray-700 text-center">300/700</div>
          <div class="p-2 bg-gray-400 dark:bg-gray-600 text-center">400/600</div>
          <div class="p-2 bg-gray-500 dark:bg-gray-500 text-center">500/500</div>
        </div>
      </section>
      
      <!-- Test 5: Check computed styles -->
      <section>
        <h2 class="text-xl font-semibold mb-2">Test 5: Runtime Check</h2>
        <div ref="testElement" class="p-4 border rounded bg-white dark:bg-gray-900">
          <p>Background color: {{ computedBgColor }}</p>
          <p>Dark class on HTML: {{ hasDarkClass }}</p>
        </div>
      </section>
      
      <!-- Test 6: Force generate classes -->
      <section>
        <h2 class="text-xl font-semibold mb-2">Test 6: Force Classes</h2>
        <div :class="dynamicClasses" class="p-4 border rounded">
          Dynamic classes based on isDark
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const testElement = ref<HTMLElement>()
const computedBgColor = ref('')
const hasDarkClass = ref(false)

const dynamicClasses = computed(() => {
  return uiStore.isDark 
    ? 'bg-gray-900 text-white' 
    : 'bg-white text-black'
})

const checkStyles = () => {
  if (process.client && testElement.value) {
    const style = window.getComputedStyle(testElement.value)
    computedBgColor.value = style.backgroundColor
    hasDarkClass.value = document.documentElement.classList.contains('dark')
  }
}

onMounted(() => {
  checkStyles()
  const interval = setInterval(checkStyles, 1000)
  onUnmounted(() => clearInterval(interval))
})

watch(() => uiStore.isDark, () => {
  nextTick(checkStyles)
})
</script>

<style>
/* Force dark mode styles to be included */
.dark\:bg-gray-900 { }
.dark\:bg-gray-800 { }
.dark\:bg-slate-900 { }
.dark\:bg-slate-800 { }
</style>