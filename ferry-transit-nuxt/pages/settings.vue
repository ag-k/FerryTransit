<template>
  <div class="container mx-auto px-4 py-6 pb-20 lg:pb-6">
    <h1 class="text-2xl font-bold mb-6">{{ $t('SETTINGS') }}</h1>
    
    <div class="space-y-6">
      <!-- Language Setting -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="text-lg font-semibold mb-3">{{ $t('LANGUAGE') }}</h2>
        <div class="space-y-2">
          <label 
            v-for="locale in availableLocales" 
            :key="locale.code"
            class="flex items-center p-3 rounded border hover:bg-gray-50 cursor-pointer touch-manipulation"
          >
            <input 
              type="radio" 
              :value="locale.code" 
              :checked="$i18n.locale === locale.code"
              @change="switchLocale(locale.code)"
              class="mr-3"
            >
            <span>{{ locale.name }}</span>
          </label>
        </div>
      </div>
      
      <!-- App Information -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="text-lg font-semibold mb-3">{{ $t('APP_INFO') }}</h2>
        <div class="space-y-2 text-sm text-gray-600">
          <p><strong>{{ $t('VERSION') }}:</strong> 1.0.0</p>
          <p><strong>{{ $t('FRAMEWORK') }}:</strong> Nuxt 3</p>
          <p><strong>{{ $t('LAST_UPDATED') }}:</strong> 2025-06-23</p>
        </div>
      </div>
      
      <!-- Links -->
      <div class="bg-white rounded-lg shadow p-4">
        <h2 class="text-lg font-semibold mb-3">{{ $t('LINKS') }}</h2>
        <div class="space-y-2">
          <a 
            href="https://oki-digilab.com/" 
            target="_blank"
            class="block p-3 rounded border hover:bg-gray-50 transition-colors text-blue-600 hover:text-blue-800 touch-manipulation"
          >
            {{ $t('DEVELOPER_SITE') }} ↗
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

// Available locales
const availableLocales = computed(() => {
  return locales.value
})

// Switch locale
const switchLocale = (code: string) => {
  navigateTo(switchLocalePath(code))
}

// Set page meta
definePageMeta({
  title: 'SETTINGS'
})
</script>