<template>
  <div class="language-selector">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      {{ $t('LANGUAGE') }}
    </label>
    <div class="space-y-2">
      <button
        v-for="locale in locales"
        :key="locale.code"
        @click="switchLocale(locale.code)"
        class="w-full text-left px-4 py-3 rounded-lg border transition-colors duration-200"
        :class="[
          currentLocale === locale.code 
            ? 'bg-blue-50 border-blue-500 text-blue-700' 
            : 'bg-white border-gray-300 hover:bg-gray-50'
        ]"
      >
        <div class="flex items-center justify-between">
          <span>{{ locale.name }}</span>
          <svg
            v-if="currentLocale === locale.code"
            class="w-5 h-5 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
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