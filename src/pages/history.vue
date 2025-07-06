<template>
  <div class="container mx-auto px-4 py-8">
    <HistoryManager />
  </div>
</template>

<script setup lang="ts">
import HistoryManager from '~/components/history/HistoryManager.vue'

definePageMeta({
  title: 'history.title'
})
</script>