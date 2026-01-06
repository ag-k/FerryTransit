<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 transform scale-95"
    enter-to-class="opacity-100 transform scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 transform scale-100"
    leave-to-class="opacity-0 transform scale-95"
  >
    <div
      v-if="!isDeleted"
      class="favorite-route-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <svg
            class="w-5 h-5 text-blue-700 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('favorites.route') }}</span>
        </div>
        <FavoriteButton :type="'route'" :route="{ departure, arrival }" />
      </div>

    <div class="flex items-center justify-between mb-2">
      <div class="flex-1">
        <div class="flex items-center space-x-2">
          <span class="text-lg font-semibold dark:text-white">{{ getDeparturePortName(departure) }}</span>
          <svg
            class="w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span class="text-lg font-semibold dark:text-white">{{ getArrivalPortName(arrival) }}</span>
        </div>
      </div>
    </div>

    <div v-if="lastSearchDate" class="text-sm text-gray-500 dark:text-gray-400 mb-3">
      {{ $t('favorites.lastSearched') }}: {{ formatDate(lastSearchDate) }}
    </div>

    <div class="flex space-x-2">
      <NuxtLink
        :to="{
          path: localePath('/'),
          query: {
            departure: departure,
            arrival: arrival
          }
        }"
        class="flex-1 px-3 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 text-sm font-medium text-center"
      >
        {{ $t('TIMETABLE') }}
      </NuxtLink>
      <NuxtLink
        :to="{
          path: localePath('/transit'),
          query: {
            departure: departure,
            arrival: arrival
          }
        }"
        class="flex-1 px-3 py-2 bg-blue-700 dark:bg-blue-800 text-white rounded-md hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors duration-200 text-sm font-medium text-center"
      >
        {{ $t('TRANSIT') }}
      </NuxtLink>
      <button
        @click="showDeleteConfirm"
        class="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200 text-sm"
      >
        {{ $t('favorites.remove') }}
      </button>
    </div>
    
    <!-- 削除確認ダイアログ -->
    <ConfirmDialog
      :is-open="isConfirmOpen"
      :title="$t('favorites.deleteConfirmTitle')"
      :message="$t('favorites.deleteRouteConfirmMessage')"
      :confirm-text="$t('favorites.delete')"
      :cancel-text="$t('CANCEL')"
      confirm-type="danger"
      @confirm="handleDelete"
      @cancel="isConfirmOpen = false"
    />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFerryStore } from '~/stores/ferry'
import { useFavoriteStore } from '~/stores/favorite'
import { useI18n } from 'vue-i18n'
import FavoriteButton from './FavoriteButton.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import { createLogger } from '~/utils/logger'

interface Props {
  departure: string
  arrival: string
  lastSearchDate?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  remove: []
}>()

const router = useRouter()
const ferryStore = process.client ? useFerryStore() : null
const favoriteStore = process.client ? useFavoriteStore() : null
const { locale, t } = useI18n()
const localePath = useLocalePath()
const logger = createLogger('FavoriteRouteCard')

// State
const isConfirmOpen = ref(false)
const isDeleted = ref(false)
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

const getDeparturePortName = (portId: string) => {
  if (!portId) return ''
  const translated = String(t(portId))
  if (!isMounted.value || !ferryStore || !ferryStore.ports || !Array.isArray(ferryStore.ports)) return translated || portId
  try {
    const port = ferryStore.ports.find(p => p.PORT_ID === portId)
    return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : (translated || portId)
  } catch (e) {
    logger.error('Error getting departure port name', e)
    return translated || portId
  }
}

const getArrivalPortName = (portId: string) => {
  if (!portId) return ''
  const translated = String(t(portId))
  if (!isMounted.value || !ferryStore || !ferryStore.ports || !Array.isArray(ferryStore.ports)) return translated || portId
  try {
    const port = ferryStore.ports.find(p => p.PORT_ID === portId)
    return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : (translated || portId)
  } catch (e) {
    logger.error('Error getting arrival port name', e)
    return translated || portId
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const showDeleteConfirm = () => {
  isConfirmOpen.value = true
}

const handleDelete = async () => {
  if (!favoriteStore) return
  
  // お気に入りルートを検索
  const favoriteRoute = favoriteStore.routes.find(r => 
    r.departure === props.departure && r.arrival === props.arrival
  )
  
  if (favoriteRoute) {
    // アニメーション用のフラグを設定
    isDeleted.value = true
    
    // アニメーションが完了してから削除
    setTimeout(() => {
      favoriteStore.removeFavoriteRoute(favoriteRoute.id)
      emit('remove')
    }, 200)
  }
  
  isConfirmOpen.value = false
}
</script>
