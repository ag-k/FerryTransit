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
          <div class="space-y-1">
            <div
              v-for="(line, index) in getPortLabelLines(departure)"
              :key="`departure-${index}`"
              class="flex items-center gap-2"
            >
              <span class="text-lg font-semibold dark:text-white">{{ line.name }}</span>
              <span
                v-if="line.municipality"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset"
                :class="getPortBadgeClass(line.municipality)"
              >
                {{ line.municipality }}
              </span>
            </div>
          </div>
          <svg
            class="w-4 h-4 text-gray-400 dark:text-gray-500 self-center"
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
          <div class="space-y-1">
            <div
              v-for="(line, index) in getPortLabelLines(arrival)"
              :key="`arrival-${index}`"
              class="flex items-center gap-2"
            >
              <span class="text-lg font-semibold dark:text-white">{{ line.name }}</span>
              <span
                v-if="line.municipality"
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset"
                :class="getPortBadgeClass(line.municipality)"
              >
                {{ line.municipality }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="lastSearchDate" class="text-sm text-gray-500 dark:text-gray-400 mb-3">
      {{ $t('favorites.lastSearched') }}: {{ formatDate(lastSearchDate) }}
    </div>

    <div class="flex space-x-2">
      <PrimaryButton
        size="sm"
        class="flex-1"
        :to="{
          path: localePath('/'),
          query: {
            departure: departure,
            arrival: arrival
          }
        }"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{{ $t('TIMETABLE') }}</span>
      </PrimaryButton>
      <PrimaryButton
        size="sm"
        class="flex-1"
        :to="{
          path: localePath('/transit'),
          query: {
            departure: departure,
            arrival: arrival
          }
        }"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
        <span>{{ $t('TRANSIT') }}</span>
      </PrimaryButton>
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
import PrimaryButton from '~/components/common/PrimaryButton.vue'
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

type PortLabelLine = {
  name: string
  municipality?: string
}

const getPortLabel = (portId: string) => {
  if (!portId) return ''
  const translated = String(t(portId))
  const hasTranslation = translated && translated !== portId
  if (hasTranslation) return translated
  if (!isMounted.value || !ferryStore || !ferryStore.ports || !Array.isArray(ferryStore.ports)) return translated || portId
  try {
    const port = ferryStore.ports.find(p => p.PORT_ID === portId)
    return port ? (locale.value === 'ja' ? port.PLACE_NAME_JA : port.PLACE_NAME_EN) : (translated || portId)
  } catch (e) {
    logger.error('Error getting port label', e)
    return translated || portId
  }
}

const parsePortLabel = (label: string): PortLabelLine[] => {
  const parts = label
    .split(/(?:\s*または\s*|\s+or\s+)/i)
    .map(part => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return []
  return parts.map((part) => {
    const match = part.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    if (match) {
      return { name: match[1], municipality: match[2] }
    }
    return { name: part }
  })
}

const getPortLabelLines = (portId: string) => {
  const label = getPortLabel(portId)
  const lines = parsePortLabel(label)
  return lines.length > 0 ? lines : [{ name: label || portId }]
}

const getPortBadgeClass = (badge: string) => {
  switch (badge) {
    case '西ノ島町':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
    case '海士町':
      return 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-800'
    case '知夫村':
      return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800'
    case '隠岐の島町':
      return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800'
    default:
      return 'bg-app-surface-2 text-app-muted ring-app-border/70'
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
