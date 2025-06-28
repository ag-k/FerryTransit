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
      class="favorite-port-card bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <svg
            class="w-5 h-5 text-green-600"
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
          <span class="text-sm text-gray-600">{{ $t('favorites.port') }}</span>
        </div>
        <FavoriteButton :type="'port'" :port="portCode" />
      </div>

    <div class="mb-3">
      <h3 class="text-lg font-semibold">{{ getPortName(portId) }}</h3>
      <p v-if="portInfo" class="text-sm text-gray-600 mt-1">
        {{ locale === 'ja' ? portInfo.island_ja : portInfo.island_en }}
      </p>
    </div>

    <div v-if="nextDepartures.length > 0" class="mb-3">
      <p class="text-sm text-gray-600 mb-1">{{ $t('favorites.nextDepartures') }}:</p>
      <ul class="space-y-1">
        <li
          v-for="(departure, index) in nextDepartures.slice(0, 3)"
          :key="index"
          class="text-sm"
        >
          <span class="font-medium">{{ departure.time }}</span>
          <span class="text-gray-600 ml-1">→ {{ getPortName(departure.arrival) }}</span>
        </li>
      </ul>
    </div>

    <div class="flex space-x-2">
      <button
        @click="viewTimetable"
        class="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
      >
        {{ $t('favorites.viewTimetable') }}
      </button>
      <button
        @click="showDeleteConfirm"
        class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200 text-sm"
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

interface Props {
  portId: string
  portCode?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  remove: []
}>()

const router = useRouter()
const ferryStore = useFerryStore()
const favoriteStore = useFavoriteStore()
const { locale } = useI18n()

// State
const isConfirmOpen = ref(false)
const isDeleted = ref(false)

// Use a simple value instead of computed for portCode
const portCode = props.portCode || props.portId

const portInfo = computed(() => {
  return ferryStore.ports.find(p => p.PORT_ID === props.portId)
})

const getPortName = (portId: string) => {
  const port = ferryStore.ports.find(p => p.PORT_ID === portId)
  return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : portId
}

const nextDepartures = computed(() => {
  // TODO: 実際の出発便情報を取得する実装が必要
  return []
})

const viewTimetable = () => {
  router.push({
    path: '/timetable',
    query: {
      departure: props.portId
    }
  })
}

const showDeleteConfirm = () => {
  isConfirmOpen.value = true
}

const handleDelete = async () => {
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