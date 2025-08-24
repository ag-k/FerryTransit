<template>
  <nav class="bg-blue-600 dark:bg-gray-900 text-white relative border-b border-transparent dark:border-gray-700">
    <!-- Mobile menu overlay -->
    <div v-if="menuOpen" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40 lg:hidden"
      @click="closeMenu"></div>

    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between py-3 sm:py-4">
        <NuxtLink class="text-lg sm:text-xl font-medium hover:opacity-80 transition-opacity py-2 flex-1 lg:flex-none"
          :to="localePath('/')">
          {{ $t('TITLE') }}
        </NuxtLink>

        <button
          class="lg:hidden relative min-w-[44px] min-h-[44px] p-2 rounded hover:bg-blue-700 dark:hover:bg-slate-800 transition-colors z-50 touch-manipulation flex items-center justify-center"
          type="button" aria-controls="navbarNav" :aria-expanded="menuOpen" aria-label="Toggle navigation"
          style="user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;" @click.stop="toggleMenu"
          @touchstart.passive="() => { }">
          <svg v-if="!menuOpen" class="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <svg v-else class="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div
          class="fixed lg:static inset-x-0 top-[68px] sm:top-[73px] lg:top-auto bg-blue-600 dark:bg-gray-900 lg:bg-transparent lg:dark:bg-transparent w-full lg:w-auto lg:flex lg:items-center px-4 lg:px-0 pb-4 lg:pb-0 shadow-lg lg:shadow-none z-40 lg:z-auto"
          :class="{ 'hidden': !menuOpen }" id="navbarNav">
          <ul class="lg:flex lg:items-center lg:space-x-1 space-y-2 lg:space-y-0">
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/' }" :to="localePath('/')"
                @click="closeMenu">
                {{ $t('TIMETABLE') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/transit' }"
                :to="localePath('/transit')" @click="closeMenu">
                {{ $t('TRANSIT') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/status' }"
                :to="localePath('/status')" @click="closeMenu">
                {{ $t('STATUS') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/fare' }"
                :to="localePath('/fare')" @click="closeMenu">
                {{ $t('FARE_TABLE') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/calendar' }"
                :to="localePath('/calendar')" @click="closeMenu">
                {{ $t('CALENDAR') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/favorites' }"
                :to="localePath('/favorites')" @click="closeMenu">
                {{ $t('favorites.title') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/history' }"
                :to="localePath('/history')" @click="closeMenu">
                {{ $t('history.title') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/about' }"
                :to="localePath('/about')" @click="closeMenu">
                {{ $t('ABOUT_APP') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                class="block px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors text-base lg:text-sm touch-manipulation"
                :class="{ 'bg-blue-700 dark:bg-gray-700 font-medium': $route.path === '/settings' }"
                :to="localePath('/settings')" @click="closeMenu">
                {{ $t('SETTINGS') }}
              </NuxtLink>
            </li>
          </ul>

          <!-- Language switcher -->
          <div class="lg:ml-6 mt-4 lg:mt-0 relative">
            <button
              class="flex items-center px-4 py-4 lg:py-2 rounded hover:bg-blue-700 dark:hover:bg-gray-700 transition-colors w-full lg:w-auto justify-between text-base lg:text-sm touch-manipulation"
              type="button" :aria-expanded="langMenuOpen" @click="toggleLangMenu">
              <span>{{ currentLocaleName }}</span>
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <ul v-if="langMenuOpen"
              class="absolute left-0 right-0 lg:left-auto lg:right-0 mt-2 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded shadow-lg lg:min-w-[150px] z-50 border border-gray-200 dark:border-gray-600">
              <li v-for="locale in availableLocales" :key="locale.code">
                <!-- Language switcher button -->
                <button
                  class="block w-full text-left px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base touch-manipulation dark:text-white"
                  :class="{ 'bg-gray-100 dark:bg-gray-900 dark:text-white font-medium': locale.code === $i18n.locale }"
                  @click="switchLocale(locale.code)">
                  {{ locale.name }}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <!-- News Section -->
    <div v-if="latestNews.length > 0" class="bg-yellow-50 dark:bg-gray-800 border-b border-yellow-200 dark:border-gray-700">
      <div class="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <!-- Latest News -->
        <div class="flex items-start space-x-2 sm:space-x-3">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <NuxtLink :to="localePath(`/news/${latestNews[0].id}`)" class="group flex items-center space-x-2 flex-1 min-w-0">
                <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {{ formatDate(latestNews[0].publishDate) }}
                </span>
                <h3 class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {{ latestNews[0].title[locale] || latestNews[0].title.ja || latestNews[0].title }}
                </h3>
              </NuxtLink>
              
              <!-- Accordion button on the same line -->
              <button 
                v-if="latestNews.length > 1"
                @click="newsExpanded = !newsExpanded"
                class="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors ml-2 flex-shrink-0"
              >
                <svg 
                  class="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1 transform transition-transform" 
                  :class="{ 'rotate-90': newsExpanded }"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
                <span class="hidden sm:inline">{{ newsExpanded ? $t('news.hideOlder') : $t('news.showOlder') }}</span>
                <span class="sm:hidden">{{ newsExpanded ? '-' : '+' }}</span>
              </button>
            </div>
              
            
            <!-- Older news items -->
            <div v-show="newsExpanded" class="mt-1 sm:mt-2 space-y-1 border-t border-yellow-200 dark:border-gray-700 pt-1 sm:pt-2">
              <NuxtLink 
                v-for="item in latestNews.slice(1, 4)" 
                :key="item.id"
                :to="localePath(`/news/${item.id}`)"
                class="block group"
              >
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
                    {{ formatDate(item.publishDate) }}
                  </span>
                  <h4 class="text-xs font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {{ item.title[locale] || item.title.ja || item.title }}
                  </h4>
                </div>
              </NuxtLink>
              
              <!-- Link to all news -->
              <NuxtLink 
                :to="localePath('/news')"
                class="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-1 sm:mt-2"
              >
                {{ $t('news.viewAll') }}
                <svg class="w-3 h-3 ml-0.5 sm:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useNews } from '~/composables/useNews'

const { locale, locales } = useI18n()
const route = useRoute()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()

// Menu states
const menuOpen = ref(false)
const langMenuOpen = ref(false)
const newsExpanded = ref(false)

// News composable
const { publishedNews, fetchNews } = useNews()

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
const toggleMenu = (event?: Event) => {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }

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

// Format date helper (compact format)
const formatDate = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  // Compact format: MM/DD or MM月DD日
  if (locale.value === 'ja') {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  } else {
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
}

// Latest news (top 4)
const latestNews = computed(() => {
  return publishedNews.value.slice(0, 4)
})

// Close menus on route change
watch(route, () => {
  closeMenu()
})

// Watch locale changes (news content is already reactive via computed)

// Close menus on click outside
onMounted(async () => {
  // お知らせデータを取得
  await fetchNews()
  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    const target = event.target as HTMLElement
    const nav = target.closest('nav')
    const hamburger = target.closest('button[aria-controls="navbarNav"]')

    // Don't close if clicking on the hamburger button or inside nav
    if (!nav && !hamburger) {
      closeMenu()
    }
  }

  // Add both click and touch event listeners
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('touchstart', handleClickOutside, { passive: true })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('touchstart', handleClickOutside)
    // Ensure body scroll is restored
    document.body.style.overflow = ''
  })
})

// Clean up on component unmount
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>