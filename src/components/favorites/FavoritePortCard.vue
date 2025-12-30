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
      class="favorite-port-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <svg
            class="w-5 h-5 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('favorites.port') }}</span>
        </div>
        <FavoriteButton :type="'port'" :port="portCode" />
      </div>

    <div class="mb-3">
      <h3 class="text-lg font-semibold dark:text-white">{{ getPortName(portId) }}</h3>
      <p v-if="portInfo" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {{ locale === 'ja' ? portInfo.island_ja : portInfo.island_en }}
      </p>
    </div>

    <div v-if="nextDepartures.length > 0" class="mb-3">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">{{ $t('favorites.nextDepartures') }}:</p>
      <ul class="space-y-1">
        <li
          v-for="(departure, index) in nextDepartures.slice(0, 3)"
          :key="index"
          class="text-sm dark:text-gray-100"
        >
          <span class="font-medium dark:text-white">{{ departure.time }}</span>
          <span class="text-gray-600 dark:text-gray-400 ml-1">→ {{ getPortName(departure.arrival) }}</span>
        </li>
      </ul>
    </div>

    <div class="flex space-x-2">
      <button
        @click="viewTimetable"
        class="flex-1 px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-200 text-sm font-medium"
      >
        {{ $t('favorites.viewTimetable') }}
      </button>
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
      :message="$t('favorites.deletePortConfirmMessage')"
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFerryStore } from '~/stores/ferry'
import { useFavoriteStore } from '~/stores/favorite'
import { useI18n } from 'vue-i18n'
import FavoriteButton from './FavoriteButton.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import { createLogger } from '~/utils/logger'

interface Props {
  portId: string
  portCode?: string
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
const logger = createLogger('FavoritePortCard')

// State
const isConfirmOpen = ref(false)
const isDeleted = ref(false)
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

// Use a simple value instead of computed for portCode
const portCode = props.portCode || props.portId

const portInfo = computed(() => {
  if (!isMounted.value || !ferryStore || !ferryStore.ports || !Array.isArray(ferryStore.ports)) return null
  try {
    return ferryStore.ports.find(p => p.PORT_ID === props.portId)
  } catch (e) {
    logger.error('Error getting port info', e)
    return null
  }
})

const getPortName = (portId: string) => {
  if (!portId) return ''

  // i18n キーがある場合（例: HONDO/SAIGO/...）はそれを優先して表示できるようにする
  // NOTE: i18n にキーが無い場合はデフォルトでキー文字列が返ることが多い
  const translated = String(t(portId))

  // store がまだ準備できていない/SSR 等の場合でも、最低限 i18n で表示できるようにする
  if (!isMounted.value || !ferryStore || !ferryStore.ports || !Array.isArray(ferryStore.ports)) {
    return translated || portId
  }

  try {
    const port = ferryStore.ports.find(p => p.PORT_ID === portId)
    return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : (translated || portId)
  } catch (e) {
    logger.error('Error getting port name', e)
    return translated || portId
  }
}

const nextDepartures = computed(() => {
  // TODO: 実際の出発便情報を取得する実装が必要
  return []
})

const viewTimetable = () => {
  router.push({
    path: localePath('/'),
    query: {
      departure: props.portId
    }
  })
}

const showDeleteConfirm = () => {
  isConfirmOpen.value = true
}

const handleDelete = async () => {
  if (!favoriteStore) return
  
  // お気に入り港を検索
  const favoritePort = favoriteStore.ports.find(p => p.portCode === portCode)
  
  if (favoritePort) {
    // アニメーション用のフラグを設定
    isDeleted.value = true
    
    // アニメーションが完了してから削除
    setTimeout(() => {
      favoriteStore.removeFavoritePort(favoritePort.id)
      emit('remove')
    }, 200)
  }
  
  isConfirmOpen.value = false
}
</script>
