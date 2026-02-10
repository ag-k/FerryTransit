<template>
  <div class="min-h-screen bg-app-bg text-app-fg">
    <AdminHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <div class="flex">
      <!-- サイドバー -->
      <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

      <!-- メインコンテンツ -->
      <main class="flex-1 ml-0 min-w-0 overflow-x-hidden">
        <div class="py-6 px-4 sm:px-6 lg:px-8 min-w-0">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const sidebarOpen = ref(false)

// 画面サイズに応じてサイドバーの初期状態を設定
onMounted(() => {
  sidebarOpen.value = window.innerWidth >= 1024

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      sidebarOpen.value = true
    }
  })
})
</script>
