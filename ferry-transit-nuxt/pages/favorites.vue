<template>
  <div class="container mx-auto px-4 py-8">
    <FavoritesManager />
  </div>
</template>

<script setup lang="ts">
import FavoritesManager from '~/components/favorites/FavoritesManager.vue'

definePageMeta({
  title: 'favorites.title'
})
</script>