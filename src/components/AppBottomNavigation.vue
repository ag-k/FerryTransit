<template>
  <nav
    aria-label="Global navigation"
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-app-surface/80 backdrop-blur border-t border-app-border/70 z-50"
    :style="bottomNavStyle"
  >
    <div class="mx-auto max-w-screen-lg px-2">
      <div class="grid grid-cols-5">
        <NuxtLink 
          v-for="item in navItems" 
          :key="item.path"
          :to="item.path"
          class="group relative flex flex-col items-center justify-center min-w-0 flex-1 touch-manipulation transition-colors duration-200 py-2"
          :class="[
            isActive(item.path)
              ? 'text-app-primary dark:text-white'
              : 'text-app-muted hover:text-app-fg'
          ]"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          :data-testid="`bottom-nav-item-${item.label}`"
        >
          <span
            class="relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-200"
            :class="isActive(item.path)
              ? 'bg-app-surface-2/80'
              : 'bg-transparent group-active:bg-app-surface-2/80'"
          >
            <svg 
              class="w-6 h-6 flex-shrink-0" 
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
          </span>

          <span class="mt-0.5 flex min-h-7 w-full items-start justify-center whitespace-normal px-0.5 text-center text-[10px] leading-tight font-medium sm:text-[11px]">
            {{ $t(item.label) }}
          </span>

          <span
            v-if="isActive(item.path)"
            class="absolute -top-px left-1/2 -translate-x-1/2 h-1 w-8 rounded-b bg-app-primary-2"
            aria-hidden="true"
          ></span>
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()

const bottomNavStyle = {
  transform: 'translateZ(0)',
  WebkitTransform: 'translateZ(0)',
  paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--android-bottom-offset, 0px)) + 8px)'
}

// Navigation items for bottom tab
const navItems = computed(() => [
  {
    path: localePath('/'),
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
    path: localePath('/favorites'),
    label: 'favorites.title',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
  },
  {
    path: localePath('/settings'),
    label: 'SETTINGS',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  }
])

// Check if current route is active
const isActive = (path: string) => {
  const normalize = (p: string) => {
    let s = p
    // strip locale prefix: /en, /en/, /ja, /ja/ ...
    s = s.replace(/^\/[a-z]{2}(?=\/|$)/, '')
    if (s === '') s = '/'
    // normalize trailing slash
    if (s.length > 1) s = s.replace(/\/$/, '')
    return s
  }

  return normalize(route.path) === normalize(path)
}
</script>
