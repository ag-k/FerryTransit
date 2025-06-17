<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <div class="container">
      <NuxtLink class="navbar-brand" to="/">
        {{ $t('TITLE') }}
      </NuxtLink>
      
      <button 
        class="navbar-toggler" 
        type="button" 
        data-bs-toggle="collapse" 
        data-bs-target="#navbarNav"
        aria-controls="navbarNav" 
        aria-expanded="false" 
        aria-label="Toggle navigation"
        @click="toggleMenu"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      
      <div class="collapse navbar-collapse" :class="{ show: menuOpen }" id="navbarNav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <NuxtLink 
              class="nav-link" 
              :class="{ active: $route.path === '/' }"
              to="/"
              @click="closeMenu"
            >
              {{ $t('HOME') }}
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink 
              class="nav-link" 
              :class="{ active: $route.path === '/timetable' }"
              to="/timetable"
              @click="closeMenu"
            >
              {{ $t('TIMETABLE') }}
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink 
              class="nav-link" 
              :class="{ active: $route.path === '/transit' }"
              to="/transit"
              @click="closeMenu"
            >
              {{ $t('TRANSIT') }}
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink 
              class="nav-link" 
              :class="{ active: $route.path === '/status' }"
              to="/status"
              @click="closeMenu"
            >
              {{ $t('STATUS') }}
            </NuxtLink>
          </li>
        </ul>
        
        <!-- Language switcher -->
        <div class="navbar-nav">
          <div class="nav-item dropdown">
            <button 
              class="nav-link dropdown-toggle btn btn-link"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              @click="toggleLangMenu"
            >
              {{ currentLocaleName }}
            </button>
            <ul class="dropdown-menu dropdown-menu-end" :class="{ show: langMenuOpen }">
              <li v-for="locale in availableLocales" :key="locale.code">
                <button 
                  class="dropdown-item"
                  :class="{ active: locale.code === $i18n.locale }"
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
}

// Close menu
const closeMenu = () => {
  menuOpen.value = false
  langMenuOpen.value = false
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
}

// Close menus on route change
watch(route, () => {
  closeMenu()
})

// Close menus on click outside
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.navbar')) {
      closeMenu()
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<style scoped>
.navbar-brand {
  font-weight: 500;
}

.nav-link {
  cursor: pointer;
  transition: opacity 0.2s;
}

.nav-link:hover {
  opacity: 0.8;
}

.nav-link.active {
  font-weight: 500;
}

.dropdown-toggle {
  text-decoration: none;
  border: none;
  background: none;
  color: inherit;
  padding: 0.5rem 1rem;
}

.dropdown-toggle:focus {
  box-shadow: none;
}

@media (max-width: 991px) {
  .navbar-collapse {
    margin-top: 1rem;
  }
  
  .dropdown-menu {
    position: static !important;
    margin-top: 0.5rem;
  }
}
</style>