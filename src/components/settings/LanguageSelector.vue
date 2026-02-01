<template>
  <div class="language-selector">
    <label class="block text-sm font-medium text-app-fg mb-2">
      {{ $t('LANGUAGE') }}
    </label>
    <div class="space-y-2">
      <button v-for="locale in locales" :key="locale.code" @click="switchLocale(locale.code)"
        class="w-full text-left px-4 py-3 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-app-primary-2 focus:ring-offset-2 focus:ring-offset-app-bg" :class="[
          currentLocale === locale.code
            ? 'bg-app-surface-2 border-app-primary-2 text-app-primary dark:text-white'
            : 'bg-app-surface border-app-border hover:bg-app-surface-2 text-app-fg'
        ]">
        <div class="flex items-center justify-between">
          <span>{{ locale.name }}</span>
          <svg v-if="currentLocale === locale.code" class="w-5 h-5 text-app-primary-2" fill="currentColor"
            viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd" />
          </svg>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale: currentLocale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const switchLocale = (code: string) => {
  navigateTo(switchLocalePath(code))
}
</script>
