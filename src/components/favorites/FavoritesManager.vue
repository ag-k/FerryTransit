<template>
  <div class="favorites-manager">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold dark:text-white">{{ $t('favorites.title') }}</h1>
      <button
        @click="editMode = !editMode"
        class="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200 flex items-center space-x-2"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <span>{{ editMode ? $t('favorites.done') : $t('favorites.edit') }}</span>
      </button>
    </div>

    <FavoritesList :edit-mode="editMode" />

    <div v-if="favoriteStore.routes.length > 0 || favoriteStore.ports.length > 0" class="mt-8 text-sm text-gray-600 dark:text-gray-400">
      <p>{{ $t('favorites.hint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFavoriteStore } from '~/stores/favorite'
import FavoritesList from './FavoritesList.vue'

const favoriteStore = useFavoriteStore()
const editMode = ref(false)
</script>