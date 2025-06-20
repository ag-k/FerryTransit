<template>
  <nav class="bg-blue-600 text-white relative">
    <!-- Mobile menu overlay -->
    <div 
      v-if="menuOpen" 
      class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
      @click="closeMenu"
    ></div>
    
    <div class="container mx-auto px-4">
      <div class="flex flex-wrap items-center justify-between py-4">
        <NuxtLink class="text-xl font-medium hover:opacity-80 transition-opacity" to="/">
          {{ $t('TITLE') }}
        </NuxtLink>
        
        <button 
          class="lg:hidden p-2 rounded hover:bg-blue-700 transition-colors z-50" 
          type="button" 
          aria-controls="navbarNav" 
          :aria-expanded="menuOpen" 
          aria-label="Toggle navigation"
          @click="toggleMenu"
        >
          <svg v-if="!menuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <div 
          class="fixed lg:static inset-x-0 top-[73px] lg:top-auto bg-blue-600 lg:bg-transparent w-full lg:w-auto lg:flex lg:items-center px-4 lg:px-0 pb-4 lg:pb-0 shadow-lg lg:shadow-none z-50 lg:z-auto" 
          :class="{ 'hidden': !menuOpen }" 
          id="navbarNav"
        >
          <ul class="lg:flex lg:items-center lg:space-x-1 space-y-1 lg:space-y-0">
            <li>
              <NuxtLink 
                class="block px-4 py-3 lg:py-2 rounded hover:bg-blue-700 transition-colors" 
                :class="{ 'bg-blue-700 font-medium': $route.path === '/' }"
                to="/"
                @click="closeMenu"
              >
                {{ $t('HOME') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink 
                class="block px-4 py-3 lg:py-2 rounded hover:bg-blue-700 transition-colors" 
                :class="{ 'bg-blue-700 font-medium': $route.path === '/timetable' }"
                to="/timetable"
                @click="closeMenu"
              >
                {{ $t('TIMETABLE') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink 
                class="block px-4 py-3 lg:py-2 rounded hover:bg-blue-700 transition-colors" 
                :class="{ 'bg-blue-700 font-medium': $route.path === '/transit' }"
                to="/transit"
                @click="closeMenu"
              >
                {{ $t('TRANSIT') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink 
                class="block px-4 py-3 lg:py-2 rounded hover:bg-blue-700 transition-colors" 
                :class="{ 'bg-blue-700 font-medium': $route.path === '/status' }"
                to="/status"
                @click="closeMenu"
              >
                {{ $t('STATUS') }}
              </NuxtLink>
            </li>
          </ul>
          
          <!-- Language switcher -->
          <div class="lg:ml-6 mt-3 lg:mt-0 relative">
            <button 
              class="flex items-center px-4 py-3 lg:py-2 rounded hover:bg-blue-700 transition-colors w-full lg:w-auto justify-between"
              type="button"
              :aria-expanded="langMenuOpen"
              @click="toggleLangMenu"
            >
              <span>{{ currentLocaleName }}</span>
              <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <ul 
              v-if="langMenuOpen" 
              class="absolute left-0 right-0 lg:left-auto lg:right-0 mt-2 bg-white text-gray-800 rounded shadow-lg lg:min-w-[150px] z-50"
            >
              <li v-for="locale in availableLocales" :key="locale.code">
                <button 
                  class="block w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                  :class="{ 'bg-gray-100 font-medium': locale.code === $i18n.locale }"
                  @click="switchLocale(locale.code)"
                >
                  {{ locale.name }}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const route = useRoute()
const switchLocalePath = useSwitchLocalePath()

// Menu states
const menuOpen = ref(false)
const langMenuOpen = ref(false)

// Current locale name
const currentLocaleName = computed(() => {
  const currentLocale = locales.value.find(l => l.code === locale.value)
  return currentLocale?.name || locale.value
})

// Available locales
const availableLocales = computed(() => {
  return locales.value.filter(l => l.code !== locale.value)
})

// Toggle menu
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
  langMenuOpen.value = false
  
  // Control body scroll when mobile menu is open
  if (menuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

// Close menu
const closeMenu = () => {
  menuOpen.value = false
  langMenuOpen.value = false
  document.body.style.overflow = ''
}

// Toggle language menu
const toggleLangMenu = () => {
  langMenuOpen.value = !langMenuOpen.value
}

// Switch locale
const switchLocale = (code: string) => {
  navigateTo(switchLocalePath(code))
  langMenuOpen.value = false
  menuOpen.value = false
  document.body.style.overflow = ''
}

// Close menus on route change
watch(route, () => {
  closeMenu()
})

// Close menus on click outside
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('nav')) {
      closeMenu()
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    // Ensure body scroll is restored
    document.body.style.overflow = ''
  })
})

// Clean up on component unmount
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>