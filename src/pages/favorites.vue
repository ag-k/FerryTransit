<template>
  <div class="container mx-auto px-4 py-8">
    <ClientOnly>
      <FavoritesManager />
      <template #fallback>
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import FavoritesManager from '~/components/favorites/FavoritesManager.vue'

definePageMeta({
  title: 'favorites.title'
})
</script>