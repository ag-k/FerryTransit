<template>
  <button
    @click="toggleFavorite"
    :class="[
      'p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
      'transition-all duration-200',
      isFavorite
        ? 'text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300'
        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400'
    ]"
    :aria-label="
      isFavorite
        ? $t('favorites.removeFromFavorites')
        : $t('favorites.addToFavorites')
    "
  >
    <svg
      class="w-6 h-6"
      :fill="isFavorite ? 'currentColor' : 'none'"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFavoriteStore } from '~/stores/favorite'
import type { FavoriteRoute, FavoritePort } from '~/types/favorite'

interface Props {
  type: 'route' | 'port'
  route?: {
    departure: string
    arrival: string
  }
  port?: string
}

const props = defineProps<Props>()
const favoriteStore = process.client ? useFavoriteStore() : null

const isFavorite = computed(() => {
  if (!favoriteStore) return false
  
  if (props.type === 'route' && props.route) {
    return favoriteStore.isRouteFavorited(props.route.departure, props.route.arrival)
  }
  if (props.type === 'port' && props.port) {
    return favoriteStore.isPortFavorited(props.port)
  }
  return false
})

const toggleFavorite = () => {
  if (!favoriteStore) return
  
  if (props.type === 'route' && props.route) {
    if (isFavorite.value) {
      // お気に入りから削除する場合は、まず該当するルートを見つける
      const favoriteRoute = favoriteStore.routes.find(r => 
        r.departure === props.route!.departure && r.arrival === props.route!.arrival
      )
      if (favoriteRoute) {
        favoriteStore.removeFavoriteRoute(favoriteRoute.id)
      }
    } else {
      favoriteStore.addFavoriteRoute({
        departure: props.route.departure,
        arrival: props.route.arrival
      })
    }
  } else if (props.type === 'port' && props.port) {
    if (isFavorite.value) {
      // お気に入りから削除する場合は、まず該当する港を見つける
      const favoritePort = favoriteStore.ports.find(p => p.portCode === props.port)
      if (favoritePort) {
        favoriteStore.removeFavoritePort(favoritePort.id)
      }
    } else {
      favoriteStore.addFavoritePort({
        portCode: props.port
      })
    }
  }
}
</script>