<template>
  <div class="favorites-list">
    <!-- お気に入りルート -->
    <section v-if="favoriteRoutes.length > 0" class="mb-8">
      <h2 class="text-xl font-semibold mb-4 dark:text-white">{{ $t('favorites.favoriteRoutes') }}</h2>
      <div 
        v-if="editMode"
        class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <Draggable
          v-model="favoriteRoutes"
          @update="updateRouteOrder"
          item-key="id"
          handle=".drag-handle"
          animation="200"
        >
          <template #item="{ element, index }">
            <div class="relative">
              <div class="absolute -left-2 top-1/2 -translate-y-1/2 drag-handle cursor-move p-1">
                <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </div>
              <FavoriteRouteCard
                :departure="element.departure"
                :arrival="element.arrival"
                :last-search-date="element.lastSearchDate"
              />
            </div>
          </template>
        </Draggable>
      </div>
      <div 
        v-else
        class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <FavoriteRouteCard
          v-for="route in favoriteRoutes"
          :key="route.id"
          :departure="route.departure"
          :arrival="route.arrival"
          :last-search-date="route.lastSearchDate"
        />
      </div>
    </section>

    <!-- お気に入り港 -->
    <section v-if="favoritePorts.length > 0">
      <h2 class="text-xl font-semibold mb-4 dark:text-white">{{ $t('favorites.favoritePorts') }}</h2>
      <div 
        v-if="editMode"
        class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <Draggable
          v-model="favoritePorts"
          @update="updatePortOrder"
          item-key="id"
          handle=".drag-handle"
          animation="200"
        >
          <template #item="{ element, index }">
            <div class="relative">
              <div class="absolute -left-2 top-1/2 -translate-y-1/2 drag-handle cursor-move p-1">
                <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </div>
              <FavoritePortCard
                :port-id="element.portCode"
                :port-code="element.portCode"
              />
            </div>
          </template>
        </Draggable>
      </div>
      <div 
        v-else
        class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <FavoritePortCard
          v-for="port in favoritePorts"
          :key="port.id"
          :port-id="port.portCode"
          :port-code="port.portCode"
        />
      </div>
    </section>

    <!-- 空の状態 -->
    <div
      v-if="favoriteRoutes.length === 0 && favoritePorts.length === 0"
      class="text-center py-12"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        {{ $t('favorites.noFavorites') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('favorites.addFavoritesHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFavoriteStore } from '~/stores/favorite'
import draggable from 'vuedraggable'
import FavoriteRouteCard from './FavoriteRouteCard.vue'
import FavoritePortCard from './FavoritePortCard.vue'

// draggable をコンポーネントとして登録
const Draggable = draggable

interface Props {
  editMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editMode: false
})

const favoriteStore = process.client ? useFavoriteStore() : null

// リアクティブにストアの変更を反映
const favoriteRoutes = computed({
  get: () => {
    if (!favoriteStore) return []
    return props.editMode ? [...favoriteStore.routes] : favoriteStore.routes
  },
  set: (value) => {
    if (props.editMode && favoriteStore) {
      const ids = value.map(r => r.id)
      favoriteStore.reorderFavoriteRoutes(ids)
    }
  }
})

const favoritePorts = computed({
  get: () => {
    if (!favoriteStore) return []
    return props.editMode ? [...favoriteStore.ports] : favoriteStore.ports
  },
  set: (value) => {
    if (props.editMode && favoriteStore) {
      const ids = value.map(p => p.id)
      favoriteStore.reorderFavoritePorts(ids)
    }
  }
})

const updateRouteOrder = () => {
  if (!favoriteStore) return
  const ids = favoriteRoutes.value.map(r => r.id)
  favoriteStore.reorderRoutes(ids)
}

const updatePortOrder = () => {
  if (!favoriteStore) return
  const ids = favoritePorts.value.map(p => p.id)
  favoriteStore.reorderPorts(ids)
}
</script>