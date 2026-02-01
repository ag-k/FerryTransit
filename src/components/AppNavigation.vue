<template>
  <nav
    class="bg-gradient-to-r from-app-nav-from to-app-nav-to text-white relative border-b border-white/10 safe-area-top sticky top-0 z-50"
    :style="{ paddingTop: `${totalTopPadding}px` }">
    <!-- Mobile menu overlay -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobile && menuOpen"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-[2px]"
        @click="closeMenu"
      ></div>
    </transition>

    <div
      class="w-full pl-[calc(16px+env(safe-area-inset-left))] pr-[env(safe-area-inset-right)] lg:pr-[calc(16px+env(safe-area-inset-right))]">
      <div class="flex items-center justify-between h-[44px] lg:h-auto lg:py-4">
        <div class="flex items-center">
          <NuxtLink
            class="text-base sm:text-xl font-medium hover:opacity-80 transition-opacity flex items-center h-full py-0 flex-1 lg:flex-none lg:py-2"
            :to="localePath('/')">
            <span class="hidden lg:inline font-bold">{{ $t('TITLE') }}</span>
            <span class="lg:hidden flex items-center">
              <span class="text-sm font-bold">{{ $t('TITLE') }}</span>
              <span v-if="currentPageTitle" class="ml-1 text-xs opacity-80">/ {{ currentPageTitle }}</span>
            </span>
          </NuxtLink>
        </div>

        <button
          class="lg:hidden relative min-w-[44px] min-h-[44px] p-2 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-colors z-50 touch-manipulation flex items-center justify-center ml-auto"
          type="button"
          aria-controls="navbarNav"
          :aria-expanded="menuOpen"
          aria-label="メニューを開閉"
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

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-show="!isMobile || menuOpen"
            id="navbarNav"
            class="fixed lg:static inset-x-0 lg:inset-auto bg-app-surface text-app-fg lg:bg-transparent lg:text-white w-full lg:w-auto lg:flex lg:items-center pl-[max(env(safe-area-inset-left),1rem)] pr-[max(env(safe-area-inset-right),1rem)] lg:px-0 pb-4 lg:pb-0 shadow-xl lg:shadow-none z-40 lg:z-auto border-b border-app-border/70 lg:border-none overflow-y-auto overscroll-contain"
            :style="{
              top: `${mobileMenuTop}px`,
              maxHeight: mobileMenuMaxHeight
            }"
            data-testid="app-navigation-mobile-panel"
          >
            <ul class="lg:flex lg:items-center lg:space-x-1 space-y-1 lg:space-y-0 pt-2 lg:pt-0">
            <li v-for="item in menuItems" :key="item.matchPath">
              <NuxtLink
                class="block px-4 py-3 lg:py-2 rounded-lg transition-colors text-base lg:text-sm font-bold touch-manipulation"
                 :class="isRouteActive(item.matchPath)
                   ? 'bg-app-surface-2 text-app-primary dark:text-white lg:bg-white/10 lg:text-white'
                   : 'hover:bg-app-surface-2 lg:hover:bg-white/10'"
                :to="item.to"
                :aria-label="item.label === 'SETTINGS' ? $t(item.label) : undefined"
                :data-testid="`app-nav-item-${item.label}`"
                @click="closeMenu"
              >
                <span class="flex items-center gap-3 lg:gap-0 xl:gap-3">
                  <svg
                    v-if="isMobile || item.label === 'SETTINGS'"
                    class="w-5 h-5 opacity-90 flex-shrink-0"
                    :class="{ 'lg:block xl:hidden': item.label === 'SETTINGS' }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    :data-testid="`app-nav-icon-${item.label}`"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      :d="item.icon"
                    />
                  </svg>
                  <span :class="{ 'lg:hidden xl:inline': item.label === 'SETTINGS' }">{{ $t(item.label) }}</span>
                </span>
              </NuxtLink>
            </li>
          </ul>

          <!-- Language switcher (Mobile only) -->
          <div class="lg:hidden mt-3 px-4">
            <div
              class="w-full inline-flex rounded-lg bg-app-surface-2/80 p-1"
              role="group"
              aria-label="Language"
              data-testid="app-nav-language-segment"
            >
              <button
                v-for="lng in locales"
                :key="lng.code"
                type="button"
                class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors touch-manipulation"
                :class="lng.code === locale
                  ? 'bg-app-surface text-app-primary dark:text-white shadow'
                  : 'text-app-muted hover:bg-app-surface/60'"
                :aria-pressed="lng.code === locale"
                :data-testid="`app-nav-lang-${lng.code}`"
                @click="switchLocale(lng.code)"
              >
                {{ lng.name }}
              </button>
            </div>
          </div>

          <!-- Language switcher (Desktop only - at end of menu) -->
          <div class="hidden lg:flex lg:items-center lg:ml-4 relative">
            <button
              class="flex items-center px-3 py-2 rounded-lg transition-colors text-sm hover:bg-white/10"
              type="button"
              :aria-expanded="langMenuOpen"
              aria-haspopup="listbox"
              :aria-label="currentLocaleName"
              @click="toggleLangMenu"
            >
              <svg class="w-5 h-5 xl:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
              </svg>
              <span class="hidden xl:inline">{{ currentLocaleName }}</span>
              <svg class="hidden xl:block w-4 h-4 ml-1.5 transition-transform" :class="{ 'rotate-180': langMenuOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <ul
              v-if="langMenuOpen"
              class="fixed right-4 bg-app-surface text-app-fg rounded-lg shadow-xl min-w-[150px] z-50 border border-app-border overflow-hidden py-1"
              :style="{ top: `${mobileMenuTop + 8}px` }"
              role="listbox"
              :aria-activedescendant="`lang-option-desktop-${locale}`"
            >
              <li v-for="loc in locales" :key="loc.code">
                <button
                  :id="`lang-option-desktop-${loc.code}`"
                  class="flex items-center justify-between w-full text-left px-4 py-2.5 hover:bg-app-surface-2 transition-colors text-sm"
                  :class="loc.code === locale
                    ? 'bg-app-surface-2 text-app-primary dark:text-white font-medium'
                    : 'text-app-muted'"
                  role="option"
                  :aria-selected="loc.code === locale"
                  @click="switchLocale(loc.code)"
                >
                  <span>{{ loc.name }}</span>
                  <svg v-if="loc.code === locale" class="w-4 h-4 text-app-primary-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </button>
              </li>
            </ul>
          </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- News Section -->
    <div v-if="latestNews.length > 0"
      class="bg-yellow-50 dark:bg-gray-800 border-b border-yellow-200 dark:border-gray-700">
      <div
        class="container mx-auto pl-[max(env(safe-area-inset-left),0.5rem)] pr-[max(env(safe-area-inset-right),0.5rem)] sm:pl-[max(env(safe-area-inset-left),1rem)] sm:pr-[max(env(safe-area-inset-right),1rem)] py-2 sm:py-3">
        <!-- Latest News -->
        <div class="flex items-start space-x-2 sm:space-x-3">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" fill="none"
            stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <NuxtLink :to="localePath(`/news/${latestNews[0].id}`)"
                class="group flex items-center space-x-2 flex-1 min-w-0">
                <span class="text-xs text-gray-500 dark:text-gray-300 flex-shrink-0">
                  {{ formatDate(latestNews[0].publishDate) }}
                </span>
                <h3
                  class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                  {{ latestNews[0].title[locale] || latestNews[0].title.ja || latestNews[0].title }}
                </h3>
              </NuxtLink>

              <!-- Accordion button on the same line -->
              <button v-if="latestNews.length > 1" @click="newsExpanded = !newsExpanded"
                class="flex items-center text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors ml-2 flex-shrink-0">
                <svg class="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1 transform transition-transform"
                  :class="{ 'rotate-90': newsExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
                <span class="hidden sm:inline">{{ newsExpanded ? $t('news.hideOlder') : $t('news.showOlder') }}</span>
                <span class="sm:hidden">{{ newsExpanded ? '-' : '+' }}</span>
              </button>
            </div>


            <!-- Older news items -->
            <div v-show="newsExpanded"
              class="mt-1 sm:mt-2 space-y-1 border-t border-yellow-200 dark:border-gray-700 pt-1 sm:pt-2">
              <NuxtLink v-for="item in latestNews.slice(1, 4)" :key="item.id" :to="localePath(`/news/${item.id}`)"
                class="block group">
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500 dark:text-gray-300 flex-shrink-0">
                    {{ formatDate(item.publishDate) }}
                  </span>
                  <h4
                    class="text-xs font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                    {{ item.title[locale] || item.title.ja || item.title }}
                  </h4>
                </div>
              </NuxtLink>

              <!-- Link to all news -->
              <NuxtLink :to="localePath('/news')"
                class="inline-flex items-center text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors mt-1 sm:mt-2">
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
import { useAndroidNavigation } from '~/composables/useAndroidNavigation'

const { locale, locales, t } = useI18n()
const route = useRoute()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()
const runtimeConfig = useRuntimeConfig()
const isCalendarEnabled = computed(() => runtimeConfig.public?.features?.calendar ?? false)
const { isAndroid } = useAndroidNavigation()

// Androidステータスバーの高さを検出
const statusBarHeight = ref(0)
const envSafeAreaTop = ref(0)

// 画面サイズを判定
const isMobile = ref(true)

// 総合的な上部パディングを計算
const totalTopPadding = computed(() => {
  const safeArea = envSafeAreaTop.value || 0
  const androidStatus = isAndroid.value ? Math.max(statusBarHeight.value, 24) : 0 // Androidは最低24pxを確保
  // モバイルでは「上に被る」事故を避けるため、最小でも safe-area/status を尊重する
  if (isMobile.value) {
    return Math.max(safeArea, androidStatus)
  }
  return Math.max(safeArea, androidStatus, 8) // デスクトップでは最低8pxを確保
})

const mobileHeaderHeight = 44
const mobileMenuTop = computed(() => mobileHeaderHeight + totalTopPadding.value)
const mobileMenuMaxHeight = computed(() => `calc(100dvh - ${mobileMenuTop.value}px)`)

const menuItems = computed(() => {
  const items: Array<{ to: string, matchPath: string, label: string, icon: string }> = [
    {
      to: localePath('/'),
      matchPath: '/',
      label: 'TIMETABLE',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      to: localePath('/transit'),
      matchPath: '/transit',
      label: 'TRANSIT',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
    },
    {
      to: localePath('/status'),
      matchPath: '/status',
      label: 'STATUS',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      to: localePath('/fare'),
      matchPath: '/fare',
      label: 'FARE_TABLE',
      icon: 'M4 6h16M4 10h16M9 14h6M9 18h6'
    }
  ]

  if (isCalendarEnabled.value) {
    items.push({
      to: localePath('/calendar'),
      matchPath: '/calendar',
      label: 'CALENDAR',
      icon: 'M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    })
  }

  items.push(
    {
      to: localePath('/favorites'),
      matchPath: '/favorites',
      label: 'favorites.title',
      icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
    },
    {
      to: localePath('/history'),
      matchPath: '/history',
      label: 'history.title',
      icon: 'M12 8v4l3 3M3 12a9 9 0 101.8-5.4L3 8m0-5v5h5'
    },
    {
      to: localePath('/about'),
      matchPath: '/about',
      label: 'ABOUT_APP',
      icon: 'M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 110-16 8 8 0 010 16z'
    },
    {
      to: localePath('/settings'),
      matchPath: '/settings',
      label: 'SETTINGS',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    }
  )

  return items
})

const normalizePath = (p: string) => {
  let s = p
  // strip locale prefix: /en, /en/, /ja, /ja/ ...
  s = s.replace(/^\/[a-z]{2}(?=\/|$)/, '')
  if (s === '') s = '/'
  // normalize trailing slash
  if (s.length > 1) s = s.replace(/\/$/, '')
  return s
}

const isRouteActive = (rawPath: string) => {
  return normalizePath(route.path) === normalizePath(rawPath)
}

// 画面サイズを判定する関数
const updateIsMobile = () => {
  if (process.client) {
    isMobile.value = window.innerWidth < 1024 // lgブレークポイント
  }
}

onMounted(() => {
  // 画面サイズを判定
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)

  // iOS safe areaの値を取得
  const updateSafeArea = () => {
    const rootStyles = getComputedStyle(document.documentElement)
    const safeAreaTop = rootStyles.getPropertyValue('env(safe-area-inset-top)')
    envSafeAreaTop.value = safeAreaTop ? parseInt(safeAreaTop) : 0
  }

  updateSafeArea()

  // Androidステータスバーの高さを検出
  if (isAndroid.value) {
    const calculateStatusBarHeight = () => {
      let detectedHeight = 24 // デフォルト値

      // 方法1: スクリーンサイズとウィンドウサイズの差を計算
      const screenHeight = screen.height
      const windowHeight = window.innerHeight
      const availHeight = screen.availHeight
      const heightDiff = availHeight - windowHeight

      if (heightDiff > 0 && heightDiff < 100) {
        detectedHeight = heightDiff
      }

      // 方法2: デバイスピクセル比率を考慮
      const pixelRatio = window.devicePixelRatio || 1
      if (pixelRatio > 2) {
        // 高解像度デバイスではステータスバーが高くなる傾向
        detectedHeight = Math.max(detectedHeight, 28)
      }

      // 方法3: CSS変数から取得（フォールバック）
      const rootStyles = getComputedStyle(document.documentElement)
      const cssStatusHeight = rootStyles.getPropertyValue('--android-status-bar-height')
      if (cssStatusHeight) {
        const cssHeight = parseInt(cssStatusHeight)
        if (cssHeight > 0) {
          detectedHeight = Math.max(detectedHeight, cssHeight)
        }
      }

      // 最低でも24px、最大でも80pxに制限
      statusBarHeight.value = Math.max(24, Math.min(detectedHeight, 80))
    }

    // 初回計算
    setTimeout(calculateStatusBarHeight, 100)

    // 画面サイズ変更時に再計算
    window.addEventListener('resize', calculateStatusBarHeight)

    // 画面の向き変更時に再計算
    window.addEventListener('orientationchange', () => {
      setTimeout(calculateStatusBarHeight, 500)
    })
  }

  // 画面の向き変更時にiOS safe areaも再計算
  window.addEventListener('orientationchange', () => {
    setTimeout(updateSafeArea, 100)
  })

  // Visual Viewport APIが利用可能な場合
  if ((window as any).visualViewport) {
    ; (window as any).visualViewport.addEventListener('resize', updateSafeArea)
  }
})

// Current page title for mobile header
const currentPageTitle = computed(() => {
  const path = normalizePath(route.path)

  if (path === '/') return t('TIMETABLE')
  if (path === '/transit') return t('TRANSIT')
  if (path === '/status') return t('STATUS')
  if (path === '/fare') return t('FARE_TABLE')
  if (path === '/calendar') return t('CALENDAR')
  if (path === '/favorites') return t('favorites.title')
  if (path === '/history') return t('history.title')
  if (path === '/about') return t('ABOUT_APP')
  if (path === '/settings') return t('SETTINGS')
  return ''
})

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

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeMenu()
  }
}

watch(menuOpen, (open) => {
  if (!process.client) return
  if (open) {
    window.addEventListener('keydown', onKeydown)
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
})

// Watch locale changes (news content is already reactive via computed)

// Close menus on click outside
let handleClickOutside: ((e: MouseEvent | TouchEvent) => void) | null = null

onMounted(async () => {
  // お知らせデータを取得
  await fetchNews()

  handleClickOutside = (event: MouseEvent | TouchEvent) => {
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
})

// Clean up on component unmount
onUnmounted(() => {
  if (handleClickOutside) {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('touchstart', handleClickOutside)
  }
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateIsMobile)
  // Ensure body scroll is restored
  document.body.style.overflow = ''
})
</script>
