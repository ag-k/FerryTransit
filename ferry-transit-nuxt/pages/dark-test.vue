<template>
  <div class="min-h-screen p-8">
    <h1 class="text-3xl font-bold mb-8">ダークモードテスト</h1>
    
    <!-- デバッグ情報 -->
    <div class="mb-8 p-4 border rounded">
      <p class="mb-2">HTML要素のクラス: <code id="html-class"></code></p>
      <p class="mb-2">現在のテーマ: {{ uiStore.theme }}</p>
      <p>実効テーマ: {{ uiStore.currentTheme }}</p>
    </div>
    
    <!-- テーマ切り替え -->
    <div class="mb-8 flex gap-4">
      <button @click="setTheme('light')" class="px-4 py-2 border rounded">
        ライト
      </button>
      <button @click="setTheme('dark')" class="px-4 py-2 border rounded">
        ダーク
      </button>
      <button @click="setTheme('system')" class="px-4 py-2 border rounded">
        システム
      </button>
    </div>
    
    <!-- インラインスタイルテスト -->
    <div class="mb-8">
      <h2 class="text-xl font-bold mb-4">インラインスタイルテスト</h2>
      <div class="p-4 border rounded" :style="{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#f9fafb' : '#111827' }">
        このボックスはインラインスタイルを使用しています。
      </div>
    </div>
    
    <!-- Tailwindクラステスト -->
    <div class="mb-8">
      <h2 class="text-xl font-bold mb-4">Tailwindクラステスト</h2>
      <div style="background-color: white; color: black;">
        <p>この要素は常に白背景・黒文字です。</p>
      </div>
      <div class="mt-4 p-4 border rounded" style="background-color: rgb(243, 244, 246);">
        <div class="dark:hidden">
          <p>ライトモード時のみ表示されます。</p>
        </div>
        <div class="hidden dark:block">
          <p>ダークモード時のみ表示されます。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const isDark = computed(() => {
  return uiStore.currentTheme === 'dark'
})

const setTheme = (theme: 'light' | 'dark' | 'system') => {
  uiStore.setTheme(theme)
  updateHtmlClass()
}

const updateHtmlClass = () => {
  if (process.client) {
    nextTick(() => {
      const htmlClass = document.documentElement.className
      const element = document.getElementById('html-class')
      if (element) {
        element.textContent = htmlClass || '(なし)'
      }
    })
  }
}

onMounted(() => {
  updateHtmlClass()
})

watch(() => uiStore.theme, () => {
  updateHtmlClass()
})
</script>

<style scoped>
/* テスト用のカスタムダークモードスタイル */
:global(.dark) .dark\:hidden {
  display: none !important;
}

:global(.dark) .dark\:block {
  display: block !important;
}
</style>