<template>
  <div>
    <!-- モバイル用オーバーレイ -->
    <transition
      enter-active-class="transition-opacity ease-linear duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity ease-linear duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && isMobile"
        @click="$emit('close')"
        class="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
      />
    </transition>
    
    <!-- サイドバー -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition ease-in duration-300"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <nav
        v-show="open || !isMobile"
        class="fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform lg:translate-x-0 lg:static lg:inset-0"
      >
        <div class="h-full flex flex-col">
          <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav class="mt-5 flex-1 px-2 space-y-1">
              <NuxtLink
                v-for="item in navigationItems"
                :key="item.name"
                :to="item.href"
                :class="[
                  isActive(item.href)
                    ? 'bg-blue-50 dark:bg-gray-700 text-blue-800 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                ]"
                @click="handleNavClick"
              >
                <component
                  :is="item.icon"
                  :class="[
                    isActive(item.href)
                      ? 'text-blue-500 dark:text-blue-300'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400',
                    'mr-3 h-5 w-5'
                  ]"
                />
                {{ item.name }}
              </NuxtLink>
            </nav>
          </div>
        </div>
      </nav>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { 
  HomeIcon,
  ClockIcon,
  CurrencyYenIcon,
  MegaphoneIcon,
  UsersIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  CogIcon,
  MapIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const { hasPermission } = useAdminPermissions()

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const isMobile = ref(false)

const baseNavigationItems = [
  { name: 'ダッシュボード', href: '/admin', icon: HomeIcon, permission: null },
  { name: '時刻表管理', href: '/admin/timetable', icon: ClockIcon, permission: 'MANAGE_TIMETABLE' },
  { name: '料金管理', href: '/admin/fare', icon: CurrencyYenIcon, permission: 'MANAGE_FARE' },
  { name: '航路データ管理', href: '/admin/routes', icon: MapIcon, permission: 'MANAGE_TIMETABLE' },
  { name: 'お知らせ管理', href: '/admin/news', icon: MegaphoneIcon, permission: 'MANAGE_ANNOUNCEMENTS' },
  { name: 'ユーザー分析', href: '/admin/users', icon: UsersIcon, permission: 'VIEW_ANALYTICS' },
  { name: 'データ管理', href: '/admin/data-management', icon: DocumentArrowDownIcon, permission: 'EXPORT_DATA' },
  { name: '統計情報', href: '/admin/analytics', icon: ChartBarIcon, permission: 'VIEW_ANALYTICS' },
  { name: 'システム設定', href: '/admin/settings', icon: CogIcon, permission: 'SYSTEM_SETTINGS' }
]

// 権限に基づいてナビゲーション項目をフィルタリング
const navigationItems = computed(() => {
  return baseNavigationItems.filter(item => {
    if (!item.permission) return true
    return hasPermission(item.permission as any)
  })
})

const isActive = (href: string) => {
  return route.path === href
}

const handleNavClick = () => {
  if (isMobile.value) {
    emit('close')
  }
}

onMounted(() => {
  isMobile.value = window.innerWidth < 1024
  
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 1024
  })
})
</script>
