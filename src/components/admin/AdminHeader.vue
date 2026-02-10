<template>
  <header class="bg-white dark:bg-gray-800 shadow-sm">
    <div class="mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <button
            @click="$emit('toggle-sidebar')"
            class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 class="ml-2 lg:ml-0 text-xl font-semibold text-gray-900 dark:text-white">
            隠岐航路管理システム
          </h1>
        </div>
        
        <div class="flex items-center space-x-4">
          <!-- 通知アイコン -->
          <button class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          
          <!-- ユーザーメニュー -->
          <div class="relative">
            <button
              @click="userMenuOpen = !userMenuOpen"
              class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <div class="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <svg class="h-5 w-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
              </div>
            </button>
            
            <!-- ドロップダウンメニュー -->
            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div
                v-if="userMenuOpen"
                v-click-outside="() => userMenuOpen = false"
                class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-600"
              >
                <div class="px-4 py-3">
                  <p class="text-sm text-gray-900 dark:text-white">{{ userEmail }}</p>
                  <p class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {{ userRole }}
                  </p>
                </div>
                <div class="py-1">
                  <button
                    @click="handleLogout"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const userMenuOpen = ref(false)

const userEmail = computed(() => authStore.user?.email || '')
const userRole = computed(() => {
  const role = authStore.user?.customClaims?.role
  return role === 'super' ? 'スーパー管理者' : '一般管理者'
})

const handleLogout = async () => {
  userMenuOpen.value = false
  await authStore.logout()
}

// クリック外部の検出用ディレクティブ
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el.clickOutsideEvent = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: any) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}

defineEmits<{
  'toggle-sidebar': []
}>()
</script>